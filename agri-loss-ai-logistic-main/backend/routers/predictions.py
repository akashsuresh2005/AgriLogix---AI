"""
routers/predictions.py — ML Prediction Endpoints
Run spoilage predictions and view history.
"""

import math
import io
import base64
from pathlib import Path

import numpy as np
import requests
import joblib
from gtts import gTTS
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from backend.config import settings
from backend.database import get_db
from backend.models import Prediction, User, ColdStorage
from backend.schemas import (
    PredictionCreate,
    PredictionResponse,
    PredictionListResponse,
    ImageQualityRequest,
    ImageQualityResponse,
    AdvisoryRequest,
    AdvisoryResponse,
    TTSRequest,
)
from backend.auth import get_current_user
from backend.routers.telemetry import fetch_mandi_price

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])

# ── Load ML artifacts once ────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ARTIFACTS_PATH = BASE_DIR / "artifacts_v2.pkl"

_artifacts_cache = None


def _load_artifacts():
    global _artifacts_cache
    if _artifacts_cache is not None:
        return _artifacts_cache
    if not ARTIFACTS_PATH.exists():
        return f"Error: Artifacts path does not exist: {ARTIFACTS_PATH}"
    try:
        import sys
        try:
            import sklearn._loss._loss as sklearn_loss_ext
            sys.modules.setdefault('_loss', sklearn_loss_ext)
        except Exception:
            pass
        _artifacts_cache = joblib.load(ARTIFACTS_PATH)
        return _artifacts_cache
    except Exception as e:
        import traceback
        return f"Error loading artifacts: {type(e).__name__}: {e}\n{traceback.format_exc()}"


# ── Constants (mirrored from ML prediction page) ─────────────────────────────
CROP_MASTER = {
    "Tomato": (7, 25, 1.00, 2.5), "Onion": (60, 10, 0.15, 1.8),
    "Potato": (90, 8, 0.12, 1.7), "Banana": (10, 20, 0.95, 2.2),
    "Mango": (14, 18, 0.80, 2.4), "Grapes": (14, 15, 0.75, 2.3),
    "Pomegranate": (30, 12, 0.55, 2.0), "Cabbage": (5, 35, 1.05, 2.5),
    "Capsicum": (14, 20, 0.85, 2.2), "Cauliflower": (5, 30, 1.05, 2.5),
    "Brinjal": (7, 25, 0.90, 2.3), "Okra": (3, 40, 1.10, 2.7),
    "Spinach": (3, 45, 1.20, 3.0), "Coconut": (60, 5, 0.10, 1.5),
    "Cucumber": (14, 20, 0.90, 2.0),
}

DISTRICT_COORDS = {
    "Bagalkot": (16.18, 75.70), "Ballari": (15.15, 76.92),
    "Belagavi": (15.85, 74.50), "Bengaluru Rural": (13.20, 77.46),
    "Bengaluru Urban": (12.87, 77.68), "Bidar": (17.91, 77.52),
    "Chamarajanagar": (11.93, 76.94), "Chikkaballapur": (13.40, 78.05),
    "Chikkamagaluru": (13.32, 75.77),
    "Chitradurga": (14.23, 76.40), "Dakshina Kannada": (12.88, 74.88),
    "Davangere": (14.46, 75.92), "Dharwad": (15.41, 75.07),
    "Gadag": (15.42, 75.62), "Hassan": (13.01, 76.10),
    "Haveri": (14.80, 75.40), "Kalaburagi": (17.33, 76.82),
    "Kodagu": (12.42, 75.74), "Kolar": (13.14, 78.22),
    "Koppal": (15.35, 76.16), "Mandya": (12.52, 76.90),
    "Mysuru": (12.30, 76.65), "Raichur": (16.20, 77.36),
    "Ramanagara": (12.72, 77.28), "Shivamogga": (13.93, 75.57),
    "Tumakuru": (13.48, 77.04), "Udupi": (13.34, 74.74),
    "Uttara Kannada": (14.81, 74.13), "Vijayanagar": (15.27, 76.39),
    "Vijayapura": (16.83, 75.72), "Yadgir": (16.77, 77.13),
}

SRI_MONTHLY = {
    1: 0.40, 2: 0.45, 3: 0.50, 4: 0.55, 5: 0.60, 6: 0.80,
    7: 0.85, 8: 0.82, 9: 0.78, 10: 0.65, 11: 0.55, 12: 0.42,
}


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _find_nearest_facility(f_lat: float, f_lng: float, db: Session):
    """Find the nearest cold storage facility with available capacity."""
    storages = db.query(ColdStorage).filter(
        ColdStorage.occupancy_pct < 95.0,
        ColdStorage.operational_status == "Active",
    ).all()

    if not storages:
        return None, 0.0

    best = None
    best_dist = float("inf")
    for s in storages:
        d = haversine(f_lat, f_lng, s.latitude, s.longitude)
        if d < best_dist:
            best_dist = d
            best = s

    return best, best_dist


@router.post("/", response_model=PredictionResponse, status_code=201)
def create_prediction(
    payload: PredictionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run the ML spoilage prediction model and store the result."""
    district = current_user.district
    if not district:
        raise HTTPException(status_code=400, detail="Set your farm district in your profile before predicting.")
    if district not in DISTRICT_COORDS:
        raise HTTPException(status_code=400, detail=f"Unknown registered district: {district}")

    artifacts = _load_artifacts()
    if not artifacts:
        raise HTTPException(status_code=500, detail="ML model artifacts not found.")
    if isinstance(artifacts, str):
        raise HTTPException(status_code=500, detail=artifacts)

    crop = next((name for name in CROP_MASTER if name.casefold() == payload.crop.strip().casefold()), None)
    if crop is None:
        raise HTTPException(status_code=400, detail=f"Unknown crop: {payload.crop}")
    supported_crops = {str(name).casefold() for name in artifacts["le_crop"].classes_}
    if crop.casefold() not in supported_crops:
        raise HTTPException(status_code=400, detail=f"The prediction model does not support {crop}.")
    f_lat, f_lng = DISTRICT_COORDS[district]

    # Find facility distance using real database records only
    facility = None
    if payload.recommended_facility and payload.recommended_facility.strip() and payload.recommended_facility.strip() != "Optimized Facility":
        req_name = payload.recommended_facility.strip()
        facility = db.query(ColdStorage).filter(
            ColdStorage.facility_name.ilike(req_name),
            ColdStorage.operational_status == "Active",
        ).first()
        if facility:
            facility_name = facility.facility_name
            dist_km = haversine(f_lat, f_lng, facility.latitude, facility.longitude)
        else:
            facility_name = req_name
            dist_km = float(payload.facility_distance_km) if payload.facility_distance_km and payload.facility_distance_km > 0 else 35.0
    else:
        facility, nearest_dist = _find_nearest_facility(f_lat, f_lng, db)
        if facility:
            facility_name = facility.facility_name
            dist_km = nearest_dist
        else:
            facility_name = None
            dist_km = float(payload.facility_distance_km) if payload.facility_distance_km and payload.facility_distance_km > 0 else 35.0

    mandi_price_raw, mandi_source, _mandi_date = fetch_mandi_price(crop, district)
    mandi_price = float(mandi_price_raw or 25.0)

    # Compute derived features (same logic as the Streamlit page)
    from datetime import datetime
    month = datetime.now().month
    q10 = CROP_MASTER[crop][3]
    respiration_acc = q10 ** ((payload.temperature - 20.0) / 10.0)

    speed_map = {"National Highway": 60.0, "State Highway": 40.0, "Rural / Unpaved Road": 20.0}
    vibration_map = {"National Highway": 1.0, "State Highway": 1.3, "Rural / Unpaved Road": 2.5}

    current_speed = speed_map.get(payload.road_condition, 40.0)
    vibration_idx = vibration_map.get(payload.road_condition, 1.0)

    hei = (payload.temperature * (
        payload.storage_days + (payload.actual_transit_days * (vibration_idx - 1.0))
    )) * respiration_acc
    hl = payload.humidity * payload.storage_days
    tdr = payload.actual_transit_days / payload.expected_transit_days
    mci = payload.arrival_volume / payload.avg_market_volume
    sri = SRI_MONTHLY.get(month, 0.5)

    est_transit_hours = dist_km / current_speed if current_speed > 0 else 1.0
    total_shelf_hours = CROP_MASTER[crop][0] * 24.0
    time_window_index = total_shelf_hours / (est_transit_hours + 1e-5)
    price_vol_index = 1.0

    try:
        try:
            c_enc = artifacts['le_crop'].transform([crop])[0]
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"The prediction model does not support {crop}.") from exc
            
        d_enc = artifacts['le_district'].transform([district])[0]
        X_raw = np.array([[
            c_enc, d_enc, payload.storage_days, hei, hl, tdr, mci, sri,
            dist_km, time_window_index, vibration_idx, price_vol_index
        ]])
        X_scaled = artifacts['scaler'].transform(X_raw)
        prob_val = float(artifacts['ensemble_clf'].predict_proba(X_scaled)[0][1])
        loss_val = max(0.0, float(artifacts['loss_regressor'].predict(X_scaled)[0]))
        shelf_val = max(0.0, float(artifacts['shelf_regressor'].predict(X_scaled)[0]))
        
        if payload.picture_spoilage_prob is not None:
            # Ensure the final probability reflects visible spoilage if it's high
            prob_val = max(prob_val, payload.picture_spoilage_prob)
            prob_val = max(0.0, min(1.0, prob_val))
            
    except Exception as exc:
        raise HTTPException(status_code=500, detail="ML prediction inference failed.") from exc

    risk_level = "HIGH" if prob_val > 0.6 else "MEDIUM" if prob_val > 0.3 else "LOW"
    financial_loss = round((loss_val / 100.0) * payload.quantity_tons * (mandi_price * 1000.0), 2)

    prediction = Prediction(
        user_id=current_user.id,
        crop=crop,
        district=district,
        temperature=payload.temperature,
        humidity=payload.humidity,
        road_condition=payload.road_condition,
        actual_transit_days=payload.actual_transit_days,
        expected_transit_days=payload.expected_transit_days,
        storage_days=payload.storage_days,
        quantity_tons=payload.quantity_tons,
        arrival_volume=payload.arrival_volume,
        avg_market_volume=payload.avg_market_volume,
        spoilage_probability=prob_val,
        image_data=payload.image_data,
        shelf_life_days=shelf_val,
        loss_percentage=loss_val,
        financial_loss=financial_loss,
        risk_level=risk_level,
        recommended_facility=facility_name,
        facility_distance_km=round(dist_km, 1) if facility_name else None,
        mandi_price_per_kg=mandi_price,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    resp = PredictionResponse.model_validate(prediction)
    resp.market_data_source = mandi_source
    return resp


@router.get("/", response_model=PredictionListResponse)
def list_predictions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    crop: str = Query(None),
    district: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated prediction history for the current user."""
    query = db.query(Prediction).filter(Prediction.user_id == current_user.id)

    if crop:
        query = query.filter(Prediction.crop == crop)
    if district:
        query = query.filter(Prediction.district == district)

    total = query.count()
    predictions = (
        query.order_by(Prediction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PredictionListResponse(
        predictions=[PredictionResponse.model_validate(p) for p in predictions],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction(
    prediction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single prediction by ID."""
    prediction = db.query(Prediction).filter(
        Prediction.id == prediction_id,
        Prediction.user_id == current_user.id,
    ).first()

    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found.")

    return PredictionResponse.model_validate(prediction)


@router.post("/image-quality", response_model=ImageQualityResponse)
def check_image_quality(payload: ImageQualityRequest):
    """
    Inspects produce image using MobileNetV2 and returns quality, confidence, and spoilage metrics.
    """
    try:
        import sys
        proj_root = str(Path(__file__).resolve().parent.parent.parent)
        if proj_root not in sys.path:
            sys.path.insert(0, proj_root)

        from utils.quality_predictor import predict_quality
        raw_b64 = payload.image_data.strip()
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(raw_b64)
        buf = io.BytesIO(img_bytes)

        detected_crop, quality, confidence, fresh_pct, rotten_pct = predict_quality(buf)

        if quality == "Fresh":
            spoilage_prob = max(0.0, min(1.0, 1.0 - (confidence / 100.0)))
        else:
            spoilage_prob = max(0.0, min(1.0, confidence / 100.0))

        return ImageQualityResponse(
            crop=detected_crop,
            quality=quality,
            confidence=round(confidence, 1),
            fresh_pct=round(fresh_pct, 1),
            rotten_pct=round(rotten_pct, 1),
            picture_spoilage_prob=round(spoilage_prob, 3),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image quality inference failed: {str(e)}")


@router.post("/advisory", response_model=AdvisoryResponse)
def generate_advisory(payload: AdvisoryRequest):
    """
    Generates a personalized 5-part agronomist spoken broadcast advisory script
    in English or Kannada using Google Gemini or the verified agronomic fallback engine.
    """
    gemini_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY
    lang = payload.language.lower()

    fac_kn = payload.recommended_facility or "ಹತ್ತಿರದ ಕೋಲ್ಡ್ ಸ್ಟೋರೇಜ್"
    fac_hi = payload.recommended_facility or "निकटतम शीतगृह"
    fac_en = payload.recommended_facility or "the designated regional cold storage facility"

    # Visual inspection context from MobileNetV2
    qual_info_kn = ""
    qual_text_kn = ""
    qual_info_hi = ""
    qual_text_hi = ""
    qual_info_en = ""
    qual_text_en = ""

    if payload.quality:
        conf_str = f"{payload.quality_confidence:.1f}%" if payload.quality_confidence is not None else ""
        fresh_str = f"{payload.fresh_pct:.1f}%" if payload.fresh_pct is not None else ""
        rotten_str = f"{payload.rotten_pct:.1f}%" if payload.rotten_pct is not None else ""

        qual_info_kn = f"* ಮೊಬೈಲ್‌ನೆಟ್ ದೃಶ್ಯ ತಪಾಸಣೆ: {payload.quality}" + (f" (ವಿಶ್ವಾಸಾರ್ಹತೆ: {conf_str}, ತಾಜಾತನ: {fresh_str}, ದೋಷ: {rotten_str})\n" if conf_str else "\n")
        qual_text_kn = f"ಮೊಬೈಲ್‌ನೆಟ್ ಕಂಪ್ಯೂಟರ್ ದೃಷ್ಟಿ ವಿಶ್ಲೇಷಣೆಯು ಮಾದರಿ ಗುಣಮಟ್ಟವನ್ನು {payload.quality}" + (f" ಎಂದು ಶೇಕಡಾ {conf_str} ವಿಶ್ವಾಸಾರ್ಹತೆಯೊಂದಿಗೆ ದೃಢಪಡಿಸಿದೆ. " if conf_str else " ಎಂದು ದೃಢಪಡಿಸಿದೆ. ")

        qual_info_hi = f"दृश्य गुणवत्ता (MobileNetV2): {payload.quality}" + (f" (सटीकता: {conf_str}, ताजगी: {fresh_str}, दोष: {rotten_str}); " if conf_str else "; ")
        qual_text_hi = f"कंप्यूटर विज़न गुणवत्ता विश्लेषण (MobileNetV2) ने उपज को {payload.quality}" + (f" (सटीकता: {conf_str}, ताजगी: {fresh_str}) पाया है। " if conf_str else " पाया है। ")

        qual_info_en = f"* Visual Quality Assessment (MobileNetV2): {payload.quality}" + (f" (Confidence: {conf_str}, Freshness: {fresh_str}, Surface Defect: {rotten_str})\n" if conf_str else "\n")
        qual_text_en = f"Prior computer vision inspection with MobileNetV2 verified produce quality as {payload.quality}" + (f" ({conf_str} confidence, {fresh_str} freshness score). " if conf_str else ". ")

    if lang == "kn":
        rec_decision_kn = (
            f"ಬೆಳೆಯ ಉಳಿದ ಜೀವಿತಾವಧಿ {payload.shelf_life_days:.1f} ದಿನಗಳು ಮಾತ್ರ ಇರುವುದರಿಂದ ಮಂಡಿಯಲ್ಲಿ ತಕ್ಷಣವೇ ಮಾರಾಟ ಮಾಡುವುದು ಆರ್ಥಿಕ ನಷ್ಟವನ್ನು ತಪ್ಪಿಸಲು ಸೂಕ್ತವಾದ ಮಾರ್ಗವಾಗಿದೆ"
            if payload.shelf_life_days <= 1.5 or payload.spoilage_probability > 0.55
            else f"ಪ್ರತಿ ಕೆಜಿಗೆ {payload.mandi_price_per_kg:.2f} ರೂಪಾಯಿಗಳ ಮಾರುಕಟ್ಟೆ ಧಾರಣೆಯನ್ನು ಪಡೆಯಲು ಹಾಗೂ ಶೇಕಡಾ {payload.loss_percentage:.1f} ರಷ್ಟು ನಷ್ಟವನ್ನು ತಡೆಯಲು {fac_kn}ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ದಾಸ್ತಾನು ಇಡುವುದು ಹೆಚ್ಚು ಲಾಭದಾಯಕವಾಗಿದೆ"
        )
        fallback_script = (
            f"ಗೌರವಾನ್ವಿತ ರೈತ ಬಾಂಧವರಿಗೆ ನಮಸ್ಕಾರಗಳು. {payload.district} ಕೃಷಿ ವಲಯದಿಂದ ಹೊರಡುತ್ತಿರುವ ನಿಮ್ಮ {payload.quantity_tons} ಟನ್ {payload.crop} ಬೆಳೆಯ ಸಾಗಣೆಯ ಸ್ವಯಂಚಾಲಿತ ಟೆಲಿಮೆಟ್ರಿ ದತ್ತಾಂಶ ಪರಿಶೀಲನೆಯನ್ನು ನಾವು ಯಶಸ್ವಿಯಾಗಿ ಪ್ರಾರಂಭಿಸಿದ್ದೇವೆ. {qual_text_kn}"
            f"ಪ್ರಸ್ತುತ ಸಾರಿಗೆ ಮಾರ್ಗದಲ್ಲಿ {payload.temperature} ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್ ತಾಪಮಾನ ಮತ್ತು {payload.humidity} ಪ್ರತಿಶತ ಆರ್ದ್ರತೆ ದಾಖಲಾಗಿದೆ. {payload.road_condition} ರಸ್ತೆಯಲ್ಲಿ ನಿರೀಕ್ಷಿತ {payload.expected_transit_days} ದಿನಗಳ ಬದಲಿಗೆ {payload.actual_transit_days} ದಿನಗಳ ಸಾಗಣೆಯು ಹೆಚ್ಚಿನ ತಾಪಮಾನದಿಂದಾಗಿ ಬೆಳೆಯ ಉಸಿರಾಟದ ಪ್ರಕ್ರಿಯೆ ಮತ್ತು ಅಂಗಾಂಶಗಳ ಕ್ಷೀಣತೆಯನ್ನು ತ್ವರಿತಗೊಳಿಸುತ್ತದೆ. ನಮ್ಮ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಮುನ್ಸೂಚನೆಯ ಪ್ರಕಾರ ಈ {payload.crop} ಬೆಳೆಯಲ್ಲಿ ಶೇಕಡಾ {payload.spoilage_probability*100:.1f} ರಷ್ಟು ಕೊಳೆಯುವ ಸಾಧ್ಯತೆ ಇದ್ದು, ಉಳಿದಿರುವ ನಿಖರ ಜೀವಿತಾವಧಿ {payload.shelf_life_days:.1f} ದಿನಗಳು ಮಾತ್ರವಾಗಿದೆ. "
            f"ಬೆಳೆಯ ಗುಣಮಟ್ಟವನ್ನು ಕಾಪಾಡಲು ವಾಹನದಲ್ಲಿ ಕ್ರೇಟ್ಗಳನ್ನು ಸಮರ್ಪಕವಾಗಿ ಜೋಡಿಸಿ ಮೇಲ್ಭಾಗದಲ್ಲಿ ಗಾಳಿಯಾಡುವ ವ್ಯವಸ್ಥೆಯನ್ನು ಕಡ್ಡಾಯವಾಗಿ ಕಲ್ಪಿಸಿ. {payload.road_condition} ರಸ್ತೆಯಲ್ಲಿ ಉಂಟಾಗುವ ಕಂಪನದಿಂದ ಬೆಳೆ ಜಜ್ಜುವುದನ್ನು ತಪ್ಪಿಸಲು ವಾಹನದ ವೇಗವನ್ನು ಹಿತಮಿತವಾಗಿ ನಿಯಂತ್ರಿಸಿ. ನಂತರ ನೇರವಾಗಿ {fac_kn} ದಾಸ್ತಾನು ಕೇಂದ್ರಕ್ಕೆ ತಲುಪಿ ಸುರಕ್ಷಿತವಾಗಿ ವಾಹನವನ್ನು ಡಾಕ್ ಮಾಡಿ. "
            f"ಆರ್ಥಿಕ ಮುನ್ಸೂಚನೆಯ ಪ್ರಕಾರ ಪ್ರಸ್ತುತ ಮಂಡಿ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಪ್ರತಿ ಕೆಜಿಗೆ {payload.mandi_price_per_kg:.2f} ರೂಪಾಯಿಗಳಾಗಿದ್ದು, ಅಂದಾಜು ನಷ್ಟದ ಪ್ರಮಾಣ ಶೇಕಡಾ {payload.loss_percentage:.1f} ರಷ್ಟಿದೆ. ಆದ್ದರಿಂದ {rec_decision_kn}. "
            f"ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪರದೆಯ ಮೇಲಿರುವ ಮಾರ್ಗ ನಕ್ಷೆಯನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಕೆಳಗಿನ ಬುಕಿಂಗ್ ಬಟನ್ ಒತ್ತುವ ಮೂಲಕ ನಿಮ್ಮ ವಾಹನದ ಸ್ಲಾಟ್ ದೃಢೀಕರಿಸಿ. ನಿಮಗೆ ಸುರಕ್ಷಿತ ಪ್ರಯಾಣ ಮತ್ತು ಲಾಭದಾಯಕ ಮಾರುಕಟ್ಟೆ ಆದಾಯವನ್ನು ಹಾರೈಸುತ್ತೇವೆ."
        )
        prompt = (
            f"ನೀವು ಕರ್ನಾಟಕ ಕೃಷಿ ಇಂಟೆಲಿಜೆನ್ಸ್ ವ್ಯವಸ್ಥೆಯ ಹಿರಿಯ ಕೃಷಿ ಸರಬರಾಜು ಸರಪಳಿ ತಜ್ಞರು ಹಾಗೂ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ನಿರ್ದೇಶಕರಾಗಿದ್ದೀರಿ.\n"
            f"ಕೆಳಗಿನ ನಿಖರವಾದ ಲೈವ್ ಡೇಟಾ ಆಧರಿಸಿ ರೈತನಿಗೆ ನೇರವಾಗಿ ಮಾತನಾಡುವ ಶೈಲಿಯಲ್ಲಿ ಸಂಪೂರ್ಣ, ವೃತ್ತಿಪರ ಮತ್ತು ಕ್ರಿಯಾತ್ಮಕ ಕನ್ನಡ ಕೃಷಿ ಸಲಹಾ ಸ್ಕ್ರಿಪ್ಟ್ ರಚಿಸಿ.\n\n"
            f"* ಬೆಳೆ: {payload.crop}\n"
            f"* ಮೂಲ ಜಿಲ್ಲೆ: {payload.district}\n"
            f"* ರಸ್ತೆ ಗುಣಮಟ್ಟ: {payload.road_condition}\n"
            f"* ದಾಸ್ತಾನು ಕೇಂದ್ರ: {fac_kn}\n"
            f"* ಪ್ರಮಾಣ: {payload.quantity_tons} ಟನ್\n"
            f"* ತಾಪಮಾನ: {payload.temperature}°C\n"
            f"* ಆರ್ದ್ರತೆ: {payload.humidity}%\n"
            f"* ನಿಜವಾದ ಸಾರಿಗೆ: {payload.actual_transit_days} ದಿನಗಳು\n"
            f"* ನಿರೀಕ್ಷಿತ ಸಾರಿಗೆ: {payload.expected_transit_days} ದಿನಗಳು\n"
            f"* ಕೊಳೆಯುವ ಸಾಧ್ಯತೆ: {payload.spoilage_probability*100:.1f}%\n"
            f"* ಉಳಿದ ಜೀವಿತಾವಧಿ: {payload.shelf_life_days:.1f} ದಿನಗಳು\n"
            f"* ಮಂಡಿ ಬೆಲೆ: ₹{payload.mandi_price_per_kg:.2f}/ಕೆಜಿ\n"
            f"* ಅಂದಾಜು ನಷ್ಟ: {payload.loss_percentage:.1f}%\n"
            f"{qual_info_kn}\n"
            f"೫ ಪ್ರಮುಖ ಭಾಗಗಳು: ೧. ವೃತ್ತಿಪರ ನಮಸ್ಕಾರ ೨. ಜೈವಿಕ-ಭೌತಿಕ ವಿಶ್ಲೇಷಣೆ ೩. ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಮಾರ್ಗದರ್ಶನ ೪. ಆರ್ಥಿಕ ಮುನ್ಸೂಚನೆ ೫. ಮುಕ್ತಾಯ.\n"
            f"ನಿರಂತರ ವಾಕ್ಯಗಳಲ್ಲಿ ಬರೆಯಿರಿ. ಯಾವುದೇ markdown, bold, bullets ಬಳಸಬೇಡಿ."
        )
    elif lang == "hi":
        rec_decision_hi = (
            f"शेष भंडारण अवधि केवल {payload.shelf_life_days:.1f} दिन है और खराब होने का जोखिम अधिक है, इसलिए भंडारण के बजाय स्थानीय मंडी में तुरंत थोक बिक्री करें।"
            if payload.shelf_life_days <= 1.5 or payload.spoilage_probability > 0.55
            else f"{payload.loss_percentage:.1f}% अनुमानित नुकसान कम करने और ₹{payload.mandi_price_per_kg:.2f} प्रति किलो मंडी भाव पाने के लिए उपज को {fac_hi} के तापमान-नियंत्रित भंडारण में रखें।"
        )
        fallback_script = (
            f"नमस्कार किसान भाई और बहनों। {payload.district} से भेजी जा रही {payload.quantity_tons} टन {payload.crop} खेप के लिए उपलब्ध परिवहन और भंडारण जानकारी का आकलन किया गया है। {qual_text_hi}"
            f"दर्ज तापमान {payload.temperature} डिग्री सेल्सियस और आर्द्रता {payload.humidity} प्रतिशत है। {payload.road_condition} मार्ग पर वास्तविक यात्रा में {payload.actual_transit_days} दिन और अपेक्षित यात्रा में {payload.expected_transit_days} दिन लगते हैं। "
            f"मॉडल के अनुसार खराब होने की संभावना {payload.spoilage_probability * 100:.1f} प्रतिशत है और अनुमानित शेष अवधि {payload.shelf_life_days:.1f} दिन है। "
            f"उपज को हवादार क्रेटों में रखें और यात्रा के दौरान झटकों तथा गर्मी से बचाएं। पहुँचने पर खेप को {fac_hi} में शीघ्र उतारें। "
            f"अनुमानित मात्रा-हानि {payload.loss_percentage:.1f} प्रतिशत और मंडी भाव ₹{payload.mandi_price_per_kg:.2f} प्रति किलो है। {rec_decision_hi}"
        )
        prompt = (
            "आप कर्नाटक के किसानों के लिए कृषि और शीत-श्रृंखला विशेषज्ञ हैं। नीचे दिए गए वास्तविक मॉडल और खेप के आंकड़ों के आधार पर "
            "पूरी सलाह सरल, स्वाभाविक हिंदी में लिखें। किसी अन्य भाषा में उत्तर न दें। कोई आंकड़ा न बदलें।\n"
            f"फसल: {payload.crop}; जिला: {payload.district}; मात्रा: {payload.quantity_tons} टन; तापमान: {payload.temperature}°C; "
            f"आर्द्रता: {payload.humidity}%; मार्ग: {payload.road_condition}; वास्तविक/अपेक्षित यात्रा: {payload.actual_transit_days}/{payload.expected_transit_days} दिन; "
            f"खराब होने की संभावना: {payload.spoilage_probability * 100:.1f}%; शेष अवधि: {payload.shelf_life_days:.1f} दिन; "
            f"अनुमानित नुकसान: {payload.loss_percentage:.1f}%; मंडी भाव: ₹{payload.mandi_price_per_kg:.2f}/किलो; भंडारण: {fac_hi}. "
            f"{qual_info_hi}"
            "सलाह में स्थिति, तुरंत की जाने वाली कार्रवाई, तापमान/पैकिंग, परिवहन और बिक्री-बनाम-भंडारण निर्णय शामिल करें।"
        )
    else:
        rec_decision_en = (
            f"Immediate wholesale sale at the local mandi is advised over storage holding because your remaining shelf life of {payload.shelf_life_days:.1f} days is critically compressed"
            if payload.shelf_life_days <= 1.5 or payload.spoilage_probability > 0.55
            else f"Allocating your produce directly into climate-controlled storage at {fac_en} is strongly advised to capture the ₹{payload.mandi_price_per_kg:.2f} per kg mandi rate while preventing the {payload.loss_percentage:.1f}% projected volume loss"
        )
        fallback_script = (
            f"Namaste and warm greetings to our esteemed agricultural producer. We are opening the automated telemetry data verification link for your harvest dispatch of {payload.quantity_tons} tons of {payload.crop} originating from the {payload.district} agricultural distribution zone. {qual_text_en}"
            f"Our synchronized biophysical sensors confirm an ambient routing temperature of {payload.temperature} degrees Celsius and relative humidity at {payload.humidity} percent. Under your current logistics transit duration of {payload.actual_transit_days} days versus the expected schedule of {payload.expected_transit_days} days across {payload.road_condition} infrastructure, elevated thermal exposure accelerates cellular respiration, tissue breakdown, and moisture evaporation across this {payload.crop} consignment. Consequently, our predictive machine learning ensemble models calculate a spoilage probability of {payload.spoilage_probability*100:.1f} percent, leaving an operational remaining shelf life of {payload.shelf_life_days:.1f} days. "
            f"To maintain produce freshness and prevent mechanical damage, your transport team must ensure proper crate stacking with unobstructed top-layer air ventilation tarpaulins. Maintain disciplined transit speeds consistent with {payload.road_condition} conditions to dampen road vibration stress and prevent internal crop bruising. Upon arrival, proceed directly to the designated receiving bay at {fac_en} for immediate pre-cooling and intake inspection. "
            f"From a financial outlook, the prevailing regional mandi market rate stands at {payload.mandi_price_per_kg:.2f} rupees per kilogram against a projected volume loss of {payload.loss_percentage:.1f} percent. {rec_decision_en}. "
            f"Please inspect the optimized transit corridor on your interactive dashboard map and proceed with dispatch confirmation to secure your reserved bay. We wish you a safe journey on the roads and a prosperous market return."
        )
        prompt = (
            f"You are a senior agricultural supply chain agronomist and logistics optimization director in Karnataka.\n"
            f"Generate a comprehensive, highly customized operational spoken broadcast script for a farmer dispatching "
            f"{payload.quantity_tons} tons of {payload.crop} from {payload.district} to {fac_en}.\n\n"
            f"* Crop: {payload.crop}, Quantity: {payload.quantity_tons} Tons, District: {payload.district}\n"
            f"* Road: {payload.road_condition}, Temperature: {payload.temperature}°C, Humidity: {payload.humidity}%\n"
            f"* Actual Transit: {payload.actual_transit_days} days, Expected: {payload.expected_transit_days} days\n"
            f"* Spoilage Probability: {payload.spoilage_probability*100:.1f}%, Shelf Life: {payload.shelf_life_days:.1f} Days\n"
            f"* Mandi Rate: ₹{payload.mandi_price_per_kg:.2f}/kg, Loss: {payload.loss_percentage:.1f}%\n"
            f"{qual_info_en}\n"
            f"Follow 5 parts: 1. GREETING 2. BIOPHYSICAL ANALYSIS 3. LOGISTICS GUIDANCE 4. FINANCIAL RECOMMENDATION 5. SIGN-OFF.\n"
            f"Approximately 330-400 words. Continuous flowing spoken text. No markdown, no bullet points, no asterisks."
        )

    script = fallback_script
    if gemini_key:
        MODELS = [
            "gemini-3.6-flash",
            "gemini-flash-latest",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
        ]
        for model in MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
                body = {"contents": [{"parts": [{"text": prompt}]}]}
                r = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=15)
                if r.status_code == 200:
                    cand = r.json().get("candidates", [])
                    if cand:
                        text = cand[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if text:
                            cleaned = text.replace("**", "").replace("*", "").replace("#", "").replace("`", "").strip()
                            script = cleaned
                            break
            except Exception:
                pass

    if lang == "kn":
        diagnosis = f"{payload.district} ವಲಯದಲ್ಲಿ {payload.crop} ಬೆಳೆಯಲ್ಲಿ {payload.temperature}°C ತಾಪಮಾನ ಹಾಗೂ {payload.humidity}% ಆರ್ದ್ರತೆಯಿಂದಾಗಿ ಕೊಳೆಯುವ ಸಾಧ್ಯತೆ {payload.spoilage_probability*100:.1f}% ರಷ್ಟಿದೆ."
        if payload.quality:
            diagnosis += f" ಮೊಬೈಲ್‌ನೆಟ್ ದೃಶ್ಯ ತಪಾಸಣೆಯು ಬೆಳೆಯನ್ನು {payload.quality} ಎಂದು ದೃಢಪಡಿಸಿದೆ."
        priority_action = f"ಉಳಿದಿರುವ ಜೀವಿತಾವಧಿ {payload.shelf_life_days:.1f} ದಿನಗಳು ಮಾತ್ರ. ತಕ್ಷಣವೇ {payload.recommended_facility} ದಾಸ್ತಾನು ಕೇಂದ್ರಕ್ಕೆ ರವಾನಿಸಿ."
        storage_protocols = "ವಾಹನದಲ್ಲಿ ಕ್ರೇಟ್ಗಳನ್ನು ಸಮರ್ಪಕವಾಗಿ ಜೋಡಿಸಿ ಮೇಲ್ಭಾಗದಲ್ಲಿ ಗಾಳಿಯಾಡುವ ವ್ಯವಸ್ಥೆಯನ್ನು ಕಲ್ಪಿಸಿ. ಉಷ್ಣತೆ ಏರಿಕೆಯನ್ನು ತಡೆಗಟ್ಟಿ."
        route_logistics = f"{payload.road_condition} ರಸ್ತೆಯಲ್ಲಿ ಕಂಪನದಿಂದ ಬೆಳೆ ಜಜ್ಜುವುದನ್ನು ತಪ್ಪಿಸಲು ವೇಗವನ್ನು ನಿಯಂತ್ರಿಸಿ. ಸುರಕ್ಷಿತವಾಗಿ ತಲುಪಿ."
        economic_decision = rec_decision_kn
    elif lang == "hi":
        diagnosis = f"{payload.district} से {payload.crop} की खेप में {payload.temperature}°C तापमान और {payload.humidity}% आर्द्रता के साथ खराब होने की अनुमानित संभावना {payload.spoilage_probability * 100:.1f}% है।"
        if payload.quality:
            diagnosis += f" MobileNetV2 दृश्य निरीक्षण ने उपज को {payload.quality} पाया है।"
        priority_action = f"अनुमानित शेष अवधि {payload.shelf_life_days:.1f} दिन है। खेप को {payload.recommended_facility} भेजें।"
        storage_protocols = "क्रेटों के बीच हवा का प्रवाह बनाए रखें, अधिक ऊंचाई तक न जमाएं और तापमान बढ़ने से बचाएं।"
        route_logistics = f"{payload.road_condition} मार्ग पर झटकों से बचाने के लिए नियंत्रित गति रखें और खेप सुरक्षित पहुंचाएं।"
        economic_decision = rec_decision_hi
    else:
        diagnosis = f"Consignment of {payload.crop} in {payload.district} exposed to {payload.temperature}°C ambient thermal conditions and {payload.humidity}% relative humidity, yielding {payload.spoilage_probability*100:.1f}% spoilage vulnerability."
        if payload.quality:
            diagnosis += f" MobileNetV2 visual inspection confirms {payload.quality.lower()} produce status."
        priority_action = f"Operational remaining shelf life is compressed to {payload.shelf_life_days:.1f} days. Immediate dispatch to {payload.recommended_facility} is warranted."
        storage_protocols = "Maintain cross-crate ventilation and avoid over-stacking. Keep covered with breathable tarpaulin to prevent thermal buildup."
        route_logistics = f"Maintain controlled transit velocity along {payload.road_condition} corridors to prevent internal mechanical bruising and vibration shock."
        economic_decision = rec_decision_en

    return AdvisoryResponse(
        script=script,
        spoken_advisory=script,
        diagnosis=diagnosis,
        priority_action=priority_action,
        storage_protocols=storage_protocols,
        route_logistics=route_logistics,
        economic_decision=economic_decision,
        language=lang,
    )


@router.post("/tts")
def synthesize_tts(payload: TTSRequest):
    """
    Synthesizes text into high-fidelity MP3 speech stream using gTTS.
    """
    try:
        lang = payload.language if payload.language in {"en", "hi", "kn"} else "en"
        tts = gTTS(text=payload.text, lang=lang, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return Response(content=buf.read(), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS synthesis error: {str(e)}")
