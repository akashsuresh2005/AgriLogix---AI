"""
routers/shipments.py — Shipment Tracking Endpoints
Create, list, and update shipment bookings.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.database import get_db
from backend.models import ColdStorage, Shipment, ShipmentStatus, User, Notification, NotificationType
from backend.schemas import ShipmentCreate, ShipmentUpdate, ShipmentResponse
from backend.auth import get_current_user
from backend.communications import send_email_notification

router = APIRouter(prefix="/api/shipments", tags=["Shipments"])


def _manager_facility_names(user: User, db: Session):
    if not user.district:
        return []
    facilities = db.query(ColdStorage).filter(ColdStorage.district.ilike(user.district)).all()
    return [value for facility in facilities for value in (facility.facility_name, facility.facility_id)]


def _scope_manager_shipments(query, user: User, db: Session):
    destinations = _manager_facility_names(user, db)
    if not destinations:
        return query.filter(Shipment.id == -1)
    return query.filter(or_(*(Shipment.destination.ilike(value) for value in destinations)))


def _manager_can_access_shipment(shipment: Shipment, user: User, db: Session) -> bool:
    return (shipment.destination or "").casefold() in {
        value.casefold() for value in _manager_facility_names(user, db)
    }


@router.post("/", response_model=ShipmentResponse, status_code=201)
def create_shipment(
    payload: ShipmentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new shipment booking."""
    # Check for duplicate booking ID
    existing = db.query(Shipment).filter(Shipment.booking_id == payload.booking_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Booking ID already exists.")

    try:
        shipment = Shipment(
            user_id=current_user.id,
            prediction_id=payload.prediction_id,
            booking_id=payload.booking_id,
            crop=payload.crop,
            tonnage=payload.tonnage,
            destination=payload.destination,
            route_quality=payload.route_quality,
            eta_hours=payload.eta_hours,
            risk_status=payload.risk_status,
            shelf_days_calculated=payload.shelf_days_calculated,
            status=ShipmentStatus.in_transit,
            farmer_name=payload.farmer_name or current_user.full_name,
            farmer_phone=payload.farmer_phone or current_user.phone,
        )
        db.add(shipment)
        db.commit()
        db.refresh(shipment)

        # Create a booking confirmed notification
        detailed_message = (
            f"Booking ID: {shipment.booking_id}\n"
            f"Crop: {shipment.crop}\n"
            f"Volume: {shipment.tonnage} Tons\n"
            f"Destination Facility: {shipment.destination}\n"
            f"Estimated Transit Time (ETA): {shipment.eta_hours} hours\n"
            f"Route Infrastructure: {shipment.route_quality}\n"
            f"Transit Risk Level: {shipment.risk_status}\n"
            f"Calculated Remaining Shelf Life: {shipment.shelf_days_calculated or 'N/A'} days\n\n"
            f"Your shipment booking has been recorded. The destination facility team has been notified to prepare your unloading bay."
        )
        notif = Notification(
            user_id=current_user.id,
            shipment_id=shipment.id,
            type=NotificationType.booking_confirmed,
            title=f"Booking Confirmed: {shipment.booking_id}",
            message=detailed_message,
        )
        db.add(notif)
        db.commit()

        if current_user.email:
            background_tasks.add_task(send_email_notification, current_user.email, notif.title, notif.message)

        return ShipmentResponse.model_validate(shipment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")


@router.get("/", response_model=list[ShipmentResponse])
def list_shipments(
    status: str = Query(None),
    destination: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List shipments for the current user (or all for warehouse managers)."""
    query = db.query(Shipment)

    # Farmers see their own; managers are scoped to their assigned facilities.
    if current_user.role.value == "farmer":
        query = query.filter(Shipment.user_id == current_user.id)
    elif current_user.role.value == "warehouse_manager":
        query = _scope_manager_shipments(query, current_user, db)

    if status:
        query = query.filter(Shipment.status == status)
    if destination:
        query = query.filter(Shipment.destination.ilike(f"%{destination}%"))

    return [
        ShipmentResponse.model_validate(s)
        for s in query.order_by(Shipment.created_at.desc()).limit(100).all()
    ]


@router.get("/active", response_model=list[ShipmentResponse])
def list_active_shipments(
    destination: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List active (in-transit) shipments, optionally filtered by destination."""
    query = db.query(Shipment).filter(Shipment.status == ShipmentStatus.in_transit)

    if current_user.role.value == "warehouse_manager":
        query = _scope_manager_shipments(query, current_user, db)

    if destination:
        query = query.filter(Shipment.destination.ilike(f"%{destination}%"))

    return [
        ShipmentResponse.model_validate(s)
        for s in query.order_by(Shipment.created_at.desc()).all()
    ]


@router.put("/{shipment_id}", response_model=ShipmentResponse)
def update_shipment(
    shipment_id: int,
    payload: ShipmentUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a shipment's status, risk, or shelf life."""
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found.")
    if current_user.role.value == "farmer":
        raise HTTPException(status_code=403, detail="Farmers cannot edit shipment operations.")
    if current_user.role.value == "warehouse_manager" and not _manager_can_access_shipment(shipment, current_user, db):
        raise HTTPException(status_code=403, detail="Shipment is outside your assigned facilities.")

    old_status = shipment.status.value if shipment.status else ""

    if payload.status is not None:
        try:
            shipment.status = ShipmentStatus(payload.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")
    if payload.risk_status is not None:
        shipment.risk_status = payload.risk_status
    if payload.shelf_days_calculated is not None:
        shipment.shelf_days_calculated = payload.shelf_days_calculated

    db.commit()
    db.refresh(shipment)

    # Create notification for status changes
    new_status = shipment.status.value if shipment.status else ""
    if old_status != new_status:
        # Notify the farmer (shipment owner)
        notif = Notification(
            user_id=shipment.user_id,
            shipment_id=shipment.id,
            type=NotificationType.dispatch_alert,
            title=f"Shipment Status: {new_status}",
            message=f"Your shipment {shipment.booking_id} ({shipment.crop}, "
                    f"{shipment.tonnage} tons) status changed from '{old_status}' "
                    f"to '{new_status}' at {shipment.destination}.",
        )
        db.add(notif)
        db.commit()
        
        farmer = db.query(User).filter(User.id == shipment.user_id).first()
        if farmer and farmer.email:
            background_tasks.add_task(send_email_notification, farmer.email, notif.title, notif.message)

    return ShipmentResponse.model_validate(shipment)


@router.get("/{shipment_id}", response_model=ShipmentResponse)
def get_shipment(
    shipment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single shipment by ID."""
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found.")
    if current_user.role.value == "warehouse_manager" and not _manager_can_access_shipment(shipment, current_user, db):
        raise HTTPException(status_code=403, detail="Shipment is outside your assigned facilities.")
    return ShipmentResponse.model_validate(shipment)
