"""Admin-only user management and model artifact metadata endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.auth import require_role
from backend.database import get_db
from backend.models import ColdStorage, Notification, Prediction, Shipment, User, UserRole
from backend.routers.predictions import _load_artifacts
from backend.schemas import AdminUserResponse, AdminUserUpdate

router = APIRouter(prefix="/api/admin", tags=["Administration"])


def _user_response(user: User, db: Session) -> AdminUserResponse:
    facilities = db.query(ColdStorage).filter(ColdStorage.manager_id == user.id).order_by(
        ColdStorage.district, ColdStorage.facility_name
    ).all() if user.role == UserRole.warehouse_manager else []
    response_data = {
        "id": user.id,
        "full_name": user.full_name,
        "phone": user.phone,
        "email": user.email,
        "role": user.role.value,
        "district": user.district,
        "created_at": user.created_at,
    }
    response_data["assigned_facilities"] = [
        {"id": facility.id, "facility_id": facility.facility_id, "facility_name": facility.facility_name,
         "district": facility.district}
        for facility in facilities
    ]
    return AdminUserResponse.model_validate(response_data)


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_user_response(user, db) for user in users]


@router.put("/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    target_role = payload.role or user.role.value
    target_district = payload.district or user.district
    if user.id == current_user.id and target_role != UserRole.admin.value:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role.")

    warehouse_ids = payload.assigned_warehouse_ids
    if target_role == UserRole.admin.value:
        if warehouse_ids:
            raise HTTPException(status_code=400, detail="Admin has global access; facility assignment is not applicable.")
        # Ensure any existing facility assignment is cleared for Admin
        db.query(ColdStorage).filter(ColdStorage.manager_id == user.id).update(
            {ColdStorage.manager_id: None}, synchronize_session="fetch"
        )
    elif target_role != UserRole.warehouse_manager.value and warehouse_ids:
        raise HTTPException(status_code=400, detail="Only warehouse managers can be assigned facilities.")

    if warehouse_ids is not None:
        if len(set(warehouse_ids)) != len(warehouse_ids):
            raise HTTPException(status_code=400, detail="Facility assignments must be unique.")
        facilities = db.query(ColdStorage).filter(ColdStorage.id.in_(warehouse_ids)).all()
        if len(facilities) != len(warehouse_ids):
            raise HTTPException(status_code=400, detail="One or more facilities were not found.")
        if not target_district or any(facility.district.casefold() != target_district.casefold() for facility in facilities):
            raise HTTPException(status_code=400, detail="Manager facilities must match the manager's profile district.")
        occupied = [facility for facility in facilities if facility.manager_id not in (None, user.id)]
        if occupied:
            raise HTTPException(status_code=409, detail="A selected facility is already assigned to another manager.")
        db.query(ColdStorage).filter(ColdStorage.manager_id == user.id).update(
            {ColdStorage.manager_id: None}, synchronize_session="fetch"
        )
        for facility in facilities:
            facility.manager_id = user.id
    elif user.role == UserRole.warehouse_manager and target_role != UserRole.warehouse_manager.value:
        db.query(ColdStorage).filter(ColdStorage.manager_id == user.id).update(
            {ColdStorage.manager_id: None}, synchronize_session="fetch"
        )

    elif target_role == UserRole.warehouse_manager.value and target_district != user.district:
        assigned = db.query(ColdStorage).filter(ColdStorage.manager_id == user.id).all()
        if any(facility.district.casefold() != target_district.casefold() for facility in assigned):
            raise HTTPException(status_code=400, detail="Update facility assignments to match the new manager district.")

    user.role = UserRole(target_role)
    user.district = target_district
    db.commit()
    db.refresh(user)
    return _user_response(user, db)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    db.query(ColdStorage).filter(ColdStorage.manager_id == user.id).update(
        {ColdStorage.manager_id: None}, synchronize_session=False
    )
    shipment_ids = [row[0] for row in db.query(Shipment.id).filter(Shipment.user_id == user.id).all()]
    notification_filter = Notification.user_id == user.id
    if shipment_ids:
        notification_filter = or_(notification_filter, Notification.shipment_id.in_(shipment_ids))
    db.query(Notification).filter(notification_filter).delete(synchronize_session=False)
    db.query(Shipment).filter(Shipment.user_id == user.id).delete(synchronize_session=False)
    db.query(Prediction).filter(Prediction.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()
    return {"message": "User account deleted."}


@router.get("/model-performance")
def model_performance(
    current_user: User = Depends(require_role("admin")),
):
    artifacts = _load_artifacts()
    if not isinstance(artifacts, dict):
        return {
            "artifact_status": "unavailable",
            "artifact_error": "Model artifacts could not be loaded.",
            "trained_at": None,
            "classifier": None,
            "regressors": [],
            "features": [],
            "evaluation_metrics": {"status": "unavailable", "reason": "No evaluation metrics are stored in the artifacts."},
        }

    classifier = artifacts.get("ensemble_clf")
    regressors = [
        {"name": key, "type": type(artifacts[key]).__name__,
         "input_features": getattr(artifacts[key], "n_features_in_", None)}
        for key in ("loss_regressor", "shelf_regressor") if key in artifacts
    ]
    return {
        "artifact_status": "loaded",
        "trained_at": artifacts.get("trained_at"),
        "classifier": {
            "type": type(classifier).__name__ if classifier is not None else None,
            "classes": [str(value) for value in getattr(classifier, "classes_", [])],
            "input_features": getattr(classifier, "n_features_in_", None),
        },
        "regressors": regressors,
        "features": list(artifacts.get("feature_cols", [])),
        "evaluation_metrics": {
            "status": "unavailable",
            "reason": "Validation labels, predictions, and evaluation scores are not stored in the model artifacts.",
            "accuracy": None,
            "precision": None,
            "recall": None,
            "f1": None,
        },
    }