"""
schemas.py — Pydantic Request / Response Models
"""

from datetime import datetime, timezone
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, field_serializer


# ─────────────────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=10, max_length=15)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default="farmer", pattern="^farmer$")
    district: str = Field(..., min_length=1, max_length=100)
    otp: str = Field(..., min_length=6, max_length=6)


class UserLogin(BaseModel):
    login_id: str
    password: str

class OTPRequest(BaseModel):
    login_id: str

class OTPVerifyLogin(BaseModel):
    login_id: str
    otp: str

class ForgotPasswordRequest(BaseModel):
    login_id: str

class ResetPasswordRequest(BaseModel):
    login_id: str
    otp: str
    new_password: str = Field(..., min_length=6)

class RegisterOTPRequest(BaseModel):
    email: EmailStr


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    district: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    full_name: str
    phone: str
    email: str
    role: str
    district: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserResponse(UserResponse):
    assigned_facilities: List[dict]


class AdminUserUpdate(BaseModel):
    role: Optional[str] = Field(None, pattern="^(farmer|warehouse_manager|admin)$")
    district: Optional[str] = Field(None, min_length=1, max_length=100)
    assigned_warehouse_ids: Optional[List[int]] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─────────────────────────────────────────────────────────────────────────────
# PREDICTIONS
# ─────────────────────────────────────────────────────────────────────────────
class PredictionCreate(BaseModel):
    crop: str
    district: Optional[str] = None
    temperature: float
    humidity: float
    road_condition: str = Field(..., pattern="^(National Highway|State Highway|Rural / Unpaved Road)$")
    actual_transit_days: float = Field(..., gt=0)
    expected_transit_days: float = Field(..., gt=0)
    storage_days: int = Field(..., ge=0)
    quantity_tons: float = Field(..., gt=0)
    arrival_volume: float = 180.0
    avg_market_volume: float = 90.0
    facility_distance_km: Optional[float] = None
    recommended_facility: Optional[str] = None
    picture_spoilage_prob: Optional[float] = None
    image_data: Optional[str] = None



class PredictionResponse(BaseModel):
    id: int
    crop: str
    district: str
    temperature: float
    humidity: float
    road_condition: str
    actual_transit_days: float
    expected_transit_days: float
    storage_days: int
    quantity_tons: float
    spoilage_probability: float
    confidence: float
    shelf_life_days: float
    loss_percentage: float
    financial_loss: float
    risk_level: str
    recommended_facility: Optional[str]
    facility_distance_km: Optional[float]
    mandi_price_per_kg: Optional[float]
    market_data_source: Optional[str] = None
    image_data: Optional[str] = None
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime, _info):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    class Config:
        from_attributes = True


class PredictionListResponse(BaseModel):
    predictions: List[PredictionResponse]
    total: int
    page: int
    page_size: int


# ─────────────────────────────────────────────────────────────────────────────
# SHIPMENTS
# ─────────────────────────────────────────────────────────────────────────────
class ShipmentCreate(BaseModel):
    prediction_id: Optional[int] = None
    booking_id: str
    crop: str
    tonnage: float
    destination: str
    route_quality: str
    eta_hours: str
    risk_status: str
    shelf_days_calculated: float
    farmer_name: Optional[str] = None
    farmer_phone: Optional[str] = None


class ShipmentUpdate(BaseModel):
    status: Optional[str] = None
    risk_status: Optional[str] = None
    shelf_days_calculated: Optional[float] = None


class ShipmentResponse(BaseModel):
    id: int
    booking_id: str
    crop: str
    tonnage: float
    destination: str
    route_quality: str
    eta_hours: str
    risk_status: str
    shelf_days_calculated: float
    status: str
    farmer_name: Optional[str]
    farmer_phone: Optional[str]
    vehicle_reg_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# WAREHOUSES
# ─────────────────────────────────────────────────────────────────────────────
class WarehouseUpdate(BaseModel):
    occupancy_pct: Optional[float] = Field(None, ge=0, le=100)
    price_per_ton_day: Optional[float] = Field(None, ge=50, le=500)
    base_temp_c: Optional[float] = None
    capacity_mt: Optional[int] = Field(None, ge=1)
    facility_id: Optional[str] = None
    facility_name: Optional[str] = None
    district: Optional[str] = None
    taluk: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    temperature_min_c: Optional[float] = None
    temperature_max_c: Optional[float] = None
    commodities_stored: Optional[str] = None
    operator_type: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    operational_status: Optional[str] = None
    nwrda_registered: Optional[str] = None
    year_established: Optional[int] = None


class WarehouseResponse(BaseModel):
    id: int
    facility_id: str
    facility_name: str
    district: str
    latitude: float
    longitude: float
    capacity_mt: int
    occupancy_pct: float
    price_per_ton_day: float
    base_temp_c: float
    operational_status: str
    contact_phone: Optional[str]
    manager_id: Optional[int]
    taluk: Optional[str] = None
    address: Optional[str] = None
    temperature_min_c: Optional[float] = None
    temperature_max_c: Optional[float] = None
    commodities_stored: Optional[str] = None
    operator_type: Optional[str] = None
    contact_email: Optional[str] = None
    nwrda_registered: Optional[str] = None
    year_established: Optional[int] = None

    class Config:
        from_attributes = True


class InspectionForm(BaseModel):
    shipment_booking_id: str
    bruising: str = Field(..., pattern="^(None|Slight|Severe)$")
    ripeness: str = Field(..., pattern="^(Unripe|Optimal Balance|Overripe / Soft)$")
    core_temp: float = Field(..., ge=0, le=40)


# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCount(BaseModel):
    unread: int


# ─────────────────────────────────────────────────────────────────────────────
# FARMER DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────
class FarmerDashboardResponse(BaseModel):
    user: UserResponse
    total_predictions: int
    total_shipments: int
    total_tons_shipped: float
    avg_spoilage_rate: float
    active_shipments: List[ShipmentResponse]
    recent_predictions: List[PredictionResponse]


class MarketRegisterForm(BaseModel):
    full_name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=10, max_length=15)
    email: EmailStr
    password: str = Field(..., min_length=6)
    district: str
    crop_type: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# QUALITY / CV / TELEMETRY / GENAI SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class ImageQualityRequest(BaseModel):
    image_data: str  # Base64 data URL or raw base64 string

class ImageQualityResponse(BaseModel):
    crop: str
    quality: str  # "Fresh" or "Rotten"
    confidence: float
    fresh_pct: float
    rotten_pct: float
    picture_spoilage_prob: float

class WeatherResponse(BaseModel):
    district: str
    temperature: float
    humidity: float
    wind_speed: float
    rain: float = 0.0
    clouds: int = 0
    description: str
    status_msg: str
    live: bool = True
    updated_at: str

class MarketPriceResponse(BaseModel):
    crop: str
    district: str
    mandi_price_per_kg: float
    price_source: str
    as_of_date: Optional[str] = None

class AdvisoryRequest(BaseModel):
    crop: str
    district: str
    temperature: float
    humidity: float
    road_condition: str
    storage_days: int
    quantity_tons: float
    actual_transit_days: float
    expected_transit_days: float
    spoilage_probability: float
    spoilage_risk: Optional[str] = None
    shelf_life_days: float
    loss_percentage: float
    financial_loss: float
    mandi_price_per_kg: float
    recommended_facility: str
    quality: Optional[str] = None
    quality_confidence: Optional[float] = None
    fresh_pct: Optional[float] = None
    rotten_pct: Optional[float] = None
    language: str = Field("en", pattern="^(en|hi|kn)$")

class AdvisoryResponse(BaseModel):
    script: str
    spoken_advisory: str
    diagnosis: str
    priority_action: str
    storage_protocols: str
    route_logistics: str
    economic_decision: str
    language: str

class TTSRequest(BaseModel):
    text: str
    language: str = "en"  # "en" or "kn"

