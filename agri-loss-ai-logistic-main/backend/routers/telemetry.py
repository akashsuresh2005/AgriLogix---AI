"""
routers/telemetry.py — Live Environmental Weather & CEDA Market Price Endpoints
Bangalore Institute of Technology | CSE Dept | Major Project 2023-27
"""

import time
from datetime import datetime, date
from typing import Optional
import requests
from fastapi import APIRouter, Query, HTTPException, Depends

from backend.config import settings
from backend.models import User
from backend.auth import get_current_user
from backend.schemas import WeatherResponse, MarketPriceResponse

router = APIRouter(prefix="/api", tags=["Telemetry & Market"])

# ─────────────────────────────────────────────────────────────────────────────
# DISTRICT GEOGRAPHIC COORDINATES (KARNATAKA)
# ─────────────────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────────────
# CEDA AGMARKNET MAPS (KARNATAKA STATE ID: 29)
# ─────────────────────────────────────────────────────────────────────────────
COMMODITY_ID_MAP = {
    "Tomato": 78, "Onion": 23, "Potato": 24, "Banana": 19, "Mango": 20,
    "Grapes": 22, "Pomegranate": 190, "Cabbage": 154, "Capsicum": 164,
    "Cauliflower": 34, "Brinjal": 35, "Okra": 85, "Spinach": 342, "Coconut": 138,
    "Cucumber": 78,  # Fallback to tomato/general vegetable basket ID
}

DISTRICT_ID_MAP = {
    "Bagalkot": 556, "Ballari": 565, "Belagavi": 555, "Bengaluru Rural": 583,
    "Bengaluru Urban": 572, "Bidar": 558, "Chamarajanagar": 578,
    "Chikkaballapur": 582, "Chitradurga": 566, "Dakshina Kannada": 575,
    "Davangere": 567, "Dharwad": 562, "Gadag": 561, "Hassan": 574,
    "Haveri": 564, "Kalaburagi": 579, "Kodagu": 576, "Kolar": 581,
    "Koppal": 560, "Mandya": 573, "Mysuru": 577, "Raichur": 559,
    "Ramanagara": 584, "Shivamogga": 568, "Tumakuru": 571, "Udupi": 569,
    "Uttara Kannada": 563, "Vijayapura": 557, "Yadgir": 580,
    "Vijayanagar": 565,
}

FALLBACK_MANDI_MAP = {
    "Bagalkot": 26.50, "Gadag": 24.20, "Koppal": 23.80, "Kolar": 30.00,
    "Belagavi": 24.00, "Shivamogga": 28.00, "Chitradurga": 22.00,
    "Haveri": 25.00, "Mysuru": 32.00, "Bengaluru Urban": 34.00,
    "Bengaluru Rural": 29.00, "Tumakuru": 26.00, "Mandya": 28.00,
}

_market_cache = {}
_weather_cache = {}

# ─────────────────────────────────────────────────────────────────────────────
# 1. LIVE WEATHER TELEMETRY
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/weather", response_model=WeatherResponse)
def get_weather(
    district: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch live environmental weather telemetry for a Karnataka district
    using OpenWeatherMap API and geographic coordinates.
    """
    registered_district = current_user.district
    if not registered_district:
        raise HTTPException(status_code=400, detail="Set your registered farm district before requesting weather.")
    if district and district.casefold() != registered_district.casefold():
        raise HTTPException(status_code=403, detail="Weather district must match your registered farm district.")
    district = registered_district
    now = time.time()
    cache_entry = _weather_cache.get(district)
    if cache_entry and (now - cache_entry["timestamp"] < 900):  # 15 min cache
        return cache_entry["data"]

    coords = DISTRICT_COORDS.get(district)
    if not coords:
        raise HTTPException(status_code=400, detail=f"Weather coordinates are unavailable for registered district: {district}.")
    lat, lng = coords

    weather_key = settings.WEATHER_API_KEY
    if not weather_key:
        raise HTTPException(status_code=503, detail="Live weather is unavailable because the weather API is not configured.")

    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&units=metric&appid={weather_key}"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        res = response.json()

        if res.get("cod") == 200:
            temp = float(res["main"]["temp"])
            humidity = float(res["main"]["humidity"])
            wind = float(res.get("wind", {}).get("speed", 0.0)) * 3.6  # m/s -> km/h
            rain = float(res.get("rain", {}).get("1h", res.get("rain", {}).get("3h", 0.0)))
            clouds = int(res.get("clouds", {}).get("all", 0))
            desc = res.get("weather", [{}])[0].get("description", "Clear").title()

            resp = WeatherResponse(
                district=district,
                temperature=temp,
                humidity=humidity,
                wind_speed=round(wind, 1),
                rain=round(rain, 2),
                clouds=clouds,
                description=desc,
                status_msg=f"Live Telemetry Synchronized: {temp:.1f}°C, {humidity:.0f}% RH",
                live=True,
                updated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            )
            _weather_cache[district] = {"timestamp": now, "data": resp}
            return resp
        raise HTTPException(status_code=502, detail=f"Weather provider returned an error: {res.get('message', 'invalid response')}.")
    except HTTPException:
        raise
    except (requests.RequestException, ValueError, KeyError, TypeError, IndexError) as exc:
        raise HTTPException(status_code=502, detail="Live weather provider is unavailable or returned invalid data.") from exc


# ─────────────────────────────────────────────────────────────────────────────
# 2. CEDA AGMARKNET LIVE MARKET PRICE
# ─────────────────────────────────────────────────────────────────────────────
def fetch_mandi_price(crop: str, district: str) -> tuple[float, str, Optional[str]]:
    """
    Fetch real market price from CEDA Agmarknet or fallback.
    Returns (price_per_kg, price_source, as_of_date).
    """
    cache_key = f"{crop}_{district}"
    now = time.time()
    if cache_key in _market_cache:
        c = _market_cache[cache_key]
        if now - c["timestamp"] < 21600:  # 6 hours cache
            return c["price"], c["source"], c["date"]

    comp_id = COMMODITY_ID_MAP.get(crop)
    dist_id = DISTRICT_ID_MAP.get(district)
    api_key = settings.MARKET_API_KEY

    if comp_id and dist_id and api_key:
        try:
            url = "https://api.ceda.ashoka.edu.in/v1/agmarknet/prices"
            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
            payload = {
                "commodity_id": comp_id,
                "state_id": 29,  # Karnataka
                "district_id": [dist_id],
                "market_id": [],
                "from_date": "2023-01-01",
                "to_date": date.today().strftime("%Y-%m-%d"),
            }
            res = requests.post(url, json=payload, headers=headers, timeout=8)
            if res.status_code == 200:
                data = res.json().get("output", {}).get("data", [])
                if data:
                    latest = max(data, key=lambda d: d.get("date", ""))
                    modal_price = float(latest.get("modal_price", 0))
                    if modal_price > 0:
                        p_kg = round(modal_price / 100.0, 2)
                        p_date = latest.get("date", "")[:10]
                        source = f"CEDA Agmarknet (as of {p_date})"
                        _market_cache[cache_key] = {"timestamp": now, "price": p_kg, "source": source, "date": p_date}
                        return p_kg, source, p_date
        except Exception:
            pass

    # Fallback to regional price matrix
    fallback_p = FALLBACK_MANDI_MAP.get(district, 25.00)
    source = "Regional Benchmark Average"
    _market_cache[cache_key] = {"timestamp": now, "price": fallback_p, "source": source, "date": None}
    return fallback_p, source, None


@router.get("/market/price", response_model=MarketPriceResponse)
def get_market_price(crop: str = Query(...), district: str = Query("Mysuru")):
    """Get live or regional benchmark Mandi wholesale price for a crop and district."""
    price_kg, source, p_date = fetch_mandi_price(crop, district)
    return MarketPriceResponse(
        crop=crop,
        district=district,
        mandi_price_per_kg=price_kg,
        price_source=source,
        as_of_date=p_date,
    )
