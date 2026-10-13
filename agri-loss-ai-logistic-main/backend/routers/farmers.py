"""
routers/farmers.py — Farmer Dashboard & Market Registration Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from backend.database import get_db
from backend.models import User, UserRole, Prediction, Shipment, ShipmentStatus
from backend.schemas import (
    FarmerDashboardResponse, MarketRegisterForm, UserResponse,
    ShipmentResponse, PredictionResponse, Token,
)
from backend.auth import get_current_user, hash_password, create_access_token

router = APIRouter(prefix="/api/farmers", tags=["Farmers"])


@router.get("/dashboard", response_model=FarmerDashboardResponse)
def farmer_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Farmer's personalized dashboard with aggregated stats,
    active shipments, and recent predictions.
    """
    # Aggregated prediction stats
    total_predictions = db.query(Prediction).filter(
        Prediction.user_id == current_user.id
    ).count()

    avg_spoilage = db.query(sql_func.avg(Prediction.spoilage_probability)).filter(
        Prediction.user_id == current_user.id
    ).scalar() or 0.0

    # Shipment stats
    total_shipments = db.query(Shipment).filter(
        Shipment.user_id == current_user.id
    ).count()

    total_tons = db.query(sql_func.sum(Shipment.tonnage)).filter(
        Shipment.user_id == current_user.id
    ).scalar() or 0.0

    # Active shipments
    active_shipments = db.query(Shipment).filter(
        Shipment.user_id == current_user.id,
        Shipment.status.in_([
            ShipmentStatus.in_transit,
            ShipmentStatus.in_storage,
            ShipmentStatus.listed_accelerated,
            ShipmentStatus.listed_standard,
            ShipmentStatus.awaiting_pickup,
            ShipmentStatus.redirected,
        ]),
    ).order_by(Shipment.created_at.desc()).limit(10).all()

    # Recent predictions
    recent_predictions = db.query(Prediction).filter(
        Prediction.user_id == current_user.id
    ).order_by(Prediction.created_at.desc()).limit(5).all()

    return FarmerDashboardResponse(
        user=UserResponse.model_validate(current_user),
        total_predictions=total_predictions,
        total_shipments=total_shipments,
        total_tons_shipped=float(total_tons),
        avg_spoilage_rate=float(avg_spoilage) * 100,
        active_shipments=[ShipmentResponse.model_validate(s) for s in active_shipments],
        recent_predictions=[PredictionResponse.model_validate(p) for p in recent_predictions],
    )


@router.post("/market-register", response_model=Token, status_code=status.HTTP_201_CREATED)
def market_register(
    payload: MarketRegisterForm,
    db: Session = Depends(get_db),
):
    """
    Simplified farmer registration from market entry point.
    Creates a farmer account directly from the market registration form.
    """
    # Check duplicate email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    # Check duplicate phone
    existing_phone = db.query(User).filter(User.phone == payload.phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this phone number already exists.",
        )

    user = User(
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.farmer,
        district=payload.district,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id})
    return Token(
        access_token=token,
        user=UserResponse.model_validate(user),
    )
