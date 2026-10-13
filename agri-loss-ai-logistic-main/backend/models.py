"""
models.py — SQLAlchemy ORM Models
All database tables for the Post-Harvest Loss Prediction system.
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime,
    ForeignKey, Enum as SAEnum, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


# ─────────────────────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────────────────────
class UserRole(str, enum.Enum):
    farmer = "farmer"
    warehouse_manager = "warehouse_manager"
    admin = "admin"


class ShipmentStatus(str, enum.Enum):
    in_transit = "In Transit"
    in_storage = "In Storage"
    listed_accelerated = "Listed (Accelerated)"
    listed_standard = "Listed (Standard Mandi)"
    awaiting_pickup = "Awaiting Buyer Pickup Confirmation"
    redirected = "Redirected"
    delivered = "Delivered"


class NotificationType(str, enum.Enum):
    dispatch_alert = "dispatch_alert"
    arrival_alert = "arrival_alert"
    spoilage_warning = "spoilage_warning"
    booking_confirmed = "booking_confirmed"
    system_alert = "system_alert"


# ─────────────────────────────────────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(15), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.farmer, nullable=False)
    district = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    otp_code = Column(String(10), nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    predictions = relationship("Prediction", back_populates="user", lazy="dynamic")
    shipments = relationship("Shipment", back_populates="user", lazy="dynamic")
    notifications = relationship("Notification", back_populates="user", lazy="dynamic")


# ─────────────────────────────────────────────────────────────────────────────
# PREDICTIONS
# ─────────────────────────────────────────────────────────────────────────────
class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Input parameters
    crop = Column(String(50), nullable=False)
    district = Column(String(100), nullable=False)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    road_condition = Column(String(50), nullable=False)
    actual_transit_days = Column(Float, nullable=False)
    expected_transit_days = Column(Float, nullable=False)
    storage_days = Column(Integer, nullable=False)
    quantity_tons = Column(Float, nullable=False)
    arrival_volume = Column(Float, default=180.0)
    avg_market_volume = Column(Float, default=90.0)

    # Output results
    spoilage_probability = Column(Float, nullable=False)
    image_data = Column(Text, nullable=True)
    shelf_life_days = Column(Float, nullable=False)
    loss_percentage = Column(Float, nullable=False)
    financial_loss = Column(Float, nullable=False)
    risk_level = Column(String(10), nullable=False)  # HIGH, MEDIUM, LOW
    recommended_facility = Column(String(200), nullable=True)
    facility_distance_km = Column(Float, nullable=True)
    mandi_price_per_kg = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="predictions")
    shipment = relationship("Shipment", back_populates="prediction", uselist=False)

    @property
    def confidence(self):
        return max(self.spoilage_probability, 1.0 - self.spoilage_probability) * 100.0

    __table_args__ = (
        Index("ix_predictions_user_created", "user_id", "created_at"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# SHIPMENTS
# ─────────────────────────────────────────────────────────────────────────────
class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)

    booking_id = Column(String(20), unique=True, nullable=False, index=True)
    crop = Column(String(50), nullable=False)
    tonnage = Column(Float, nullable=False)
    destination = Column(String(200), nullable=False)
    route_quality = Column(String(50), nullable=False)
    eta_hours = Column(String(20), nullable=False)
    risk_status = Column(String(20), nullable=False)
    shelf_days_calculated = Column(Float, nullable=False)
    status = Column(
        SAEnum(ShipmentStatus),
        default=ShipmentStatus.in_transit,
        nullable=False,
    )

    farmer_name = Column(String(150), nullable=True)
    farmer_phone = Column(String(15), nullable=True)
    vehicle_reg_number = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="shipments")
    prediction = relationship("Prediction", back_populates="shipment")
    notifications = relationship("Notification", back_populates="shipment", lazy="dynamic")

    __table_args__ = (
        Index("ix_shipments_destination_status", "destination", "status"),
    )


# ─────────────────────────────────────────────────────────────────────────────
# COLD STORAGES
# ─────────────────────────────────────────────────────────────────────────────
class ColdStorage(Base):
    __tablename__ = "cold_storages"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(String(20), unique=True, nullable=False)
    facility_name = Column(String(200), nullable=False)
    district = Column(String(100), nullable=False)
    taluk = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_mt = Column(Integer, nullable=False)
    temperature_min_c = Column(Float, nullable=True)
    temperature_max_c = Column(Float, nullable=True)
    commodities_stored = Column(Text, nullable=True)
    operator_type = Column(String(50), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    contact_email = Column(String(255), nullable=True)
    operational_status = Column(String(20), default="Active")
    nwrda_registered = Column(String(5), default="No")
    year_established = Column(Integer, nullable=True)
    occupancy_pct = Column(Float, default=65.0)
    price_per_ton_day = Column(Float, default=180.0)
    base_temp_c = Column(Float, default=4.0)

    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)


# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shipment_id = Column(Integer, ForeignKey("shipments.id"), nullable=True)
    type = Column(SAEnum(NotificationType), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")
    shipment = relationship("Shipment", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "is_read"),
    )
