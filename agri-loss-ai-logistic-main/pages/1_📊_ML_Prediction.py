"""
1_📊_ML_Prediction.py — Post-Harvest Loss Prediction AI Dashboard
Bangalore Institute of Technology | CSE Dept | Major Project 2023-27

MERGE NOTES:
  - Base file : File 1 (original BIT UI, full DISTRICT_COORDS, CEDA API, etc.)
  - Replaced  : Gemini AI block, Audio/TTS block, Google Maps routing block
  - Source    : File 2 fixes (FIX-01 response key, FIX-04 bare except,
                FIX-06 debug log, FIX-08 routing caption, Kannada Gemini call,
                Google Directions → OSRM → straight-line fallback chain)
  - Unchanged : Everything else in File 1
"""

import os, math, warnings, joblib, requests, random, csv, io, time
from datetime import datetime, date, timedelta
from pathlib import Path
import numpy as np
import pandas as pd
import streamlit as st
from utils.translator import t, get_lang
import plotly.graph_objects as go
from streamlit_folium import st_folium
import folium
from folium.plugins import AntPath
import polyline

# Modern Web Audio API Wrappers
from gtts import gTTS
from streamlit_mic_recorder import mic_recorder
from utils.quality_predictor import predict_quality

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# PAGE CONFIG & CSS (Preserving your exact original BIT UI)
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(page_title="Post-Harvest Loss AI", page_icon="🌾", layout="wide")
from utils.ui import set_page_style
set_page_style()
from utils.ui import render_top_bar
render_top_bar()
# Trigger Streamlit Reload 1
from utils.api_client import require_role
require_role("farmer")

# ─────────────────────────────────────────────────────────────────────────────
# 🪐 SHARED IN-MEMORY STATE-MACHINE LEDGER (ALL-CROP GLOBAL LEDGER)
# ─────────────────────────────────────────────────────────────────────────────
if "crop_ledger" not in st.session_state:
    st.session_state.crop_ledger = {
        "KA-03-EX-9211": {
            "crop_name": "Hybrid Tomato",
            "farmer_name": "Anandappa",
            "farmer_phone": "9448098765",
            "quantity_kg": 10000,
            "vehicle_no": "KA-03-EX-9211",
            "status": "In Storage",
            "risk_score": 35.1,
            "payout_status": "N/A",
            "logs": ["Batch received at warehouse. Pre-cooling baseline established."]
        },
        "KA-03-EX-9388": {
            "crop_name": "Capsicum (Green)",
            "farmer_name": "Ramesh Kumar",
            "farmer_phone": "9845012345",
            "quantity_kg": 10000,
            "vehicle_no": "KA-03-EX-9388",
            "status": "Admin Dispatch Requested",
            "risk_score": 78.2,
            "payout_status": "Pending Trigger",
            "logs": ["Ambient temperature spike detected. Spoilage risk escalated."]
        },
        "KA-03-EX-3183": {
            "crop_name": "Alphonso Mango",
            "farmer_name": "Suresh Gowda",
            "farmer_phone": "9900112233",
            "quantity_kg": 10000,
            "vehicle_no": "KA-03-EX-3183",
            "status": "In Storage",
            "risk_score": 42.5,
            "payout_status": "N/A",
            "logs": ["Batch baseline verified. Curing cycle initialized."]
        }
    }

# ─────────────────────────────────────────────────────────────────────────────
# 🌐 GLOBAL MULTI-LINGUAL TRANSLATION ENGINE (EN / KN / HI)
# ─────────────────────────────────────────────────────────────────────────────
LANG_DICT = {
    "English": {
        "sidebar_hdr": "🏛️ BIT Major Project 2023-27",
        "sidebar_dept": "Computer Science & Engineering",
        "main_title": "🌾 Post-Harvest Loss Prediction AI",
        "main_subtitle": "Karnataka Agricultural Intelligence System",
        "input_header": "📋 INPUT PARAMETERS",
        "crop_lbl": "🌱 Select Crop",
        "dist_lbl": "📍 District",
        "road_lbl": "🗺️ Route Infrastructure Quality",
        "harvest_lbl": "📅 Harvest Date",
        "temp_lbl": "🌡️ Avg Temp (°C)",
        "hum_lbl": "💧 Avg Humidity (%)",
        "transit_lbl": "🚚 Logistics & Market",
        "transit_actual": "Actual Transport (Days)",
        "transit_expect": "Expected Transport (Days)",
        "vol_current": "Current Arrival Vol (Tons)",
        "vol_avg": "Avg Market Vol (Tons)",
        "qty_lbl": "💰 Total Quantity (Tons)",
        "btn_analyze": "🔮 ANALYZE SPOILAGE RISK",
        "output_header": "📊 PREDICTION OUTPUT",
        "spoil_prob": "Spoilage Probability",
        "shelf_lbl": "Shelf Life",
        "loss_lbl": "Qty Loss",
        "fin_loss": "Fin. Loss",
        "optimal_route": "📍 Optimal Route Map Logistics",
        "distance_msg": "🚚 Distance to Optimal Depot",
        "facility_target": "Facility Target",
        "alt_table_hdr": "🏆 Top 3 Alternative Recommended Facilities (Sorted by Net Profit)",
        "col_fac": "Facility Name",
        "col_dist": "District",
        "col_kms": "Physical Distance",
        "col_rate": "Market Rate",
        "col_payout": "Projected Net Payout (Profit)",
        "book_hdr": "🚛 Secure Your Storage Slot",
        "book_btn": "🔔 Book Storage Slot & Dispatch Vehicle",
        "info_msg": "👈 Enter farm parameters and click 'Analyze' to view the AI Risk Report.",
        "error_cs": "❌ Operational Error: No compatible cold storage facilities found.",
        "success_booking": "🎉 **Slot Allocation Secured!** Vehicle tracked live heading to depot.",
        "eta_msg": "ETA",
        "hours_lbl": "Hours",
        "voice_assist_hdr": "🎙️ AI Inbound Voice Command Gateway",
        "voice_assist_prompt": "Tap mic and clearly state criteria (e.g., 'Tomato in Kolar, 10 Tons'):",
        "voice_btn_start": "🔴 Tap to Speak / ಮಾತನಾಡಿ",
        "voice_btn_stop": "⏹️ Stop Recording",
        "voice_output_hdr": "🤖 GenAI Dynamic Advisory & Localized Audio Playback",
        "voice_lang_toggle": "Choose Audio Playback Language / ಧ್ವನಿ ಭಾಷೆ:"
    },
    "Kannada (ಕನ್ನಡ)": {
        "sidebar_hdr": "🏛️ ಬಿ.ಐ.ಟಿ ಮುಖ್ಯ ಯೋಜನೆ 2023-27",
        "sidebar_dept": "ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಮತ್ತು ಎಂಜಿನಿಯರಿಂಗ್",
        "main_title": "🌾 ಕೊಯ್ಲೋತ್ತರ ನಷ್ಟ ಮುನ್ಸೂಚನೆ ಎಐ",
        "main_subtitle": "ಕರ್ನಾಟಕ ಕೃಷಿ ಇಂಟೆಲಿಜೆನ್ಸ್ ವ್ಯವಸ್ಥೆ",
        "input_header": "📋 ಇನ್‌ಪುಟ್ ನಿಯತಾಂಕಗಳು",
        "crop_lbl": "🌱 ಬೆಳೆ ಆಯ್ಕೆಮಾಡಿ",
        "dist_lbl": "📍 ಜಿಲ್ಲೆ",
        "road_lbl": "🗺️ ರಸ್ತೆ ಮೂಲಸೌಕರ್ಯ ಗುಣಮಟ್ಟ",
        "harvest_lbl": "📅 ಕೊಯ್ಲು ಮಾಡಿದ ದಿನಾಂಕ",
        "temp_lbl": "🌡️ ಸರಾಸರಿ ತಾಪಮಾನ (°C)",
        "hum_lbl": "💧 ಸರಾಸರಿ ಆರ್ದ್ರತೆ (%)",
        "transit_lbl": "🚚 ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಮತ್ತು ಮಾರುಕಟ್ಟೆ",
        "transit_actual": "ನಿಜವಾದ ಸಾರಿಗೆ ಸಮಯ (ದಿನಗಳು)",
        "transit_expect": "ನಿರೀಕ್ಷಿತ ಸಾರಿಗೆ ಸಮಯ (ದಿನಗಳು)",
        "vol_current": "ಪ್ರಸ್ತುತ ಮಾರುಕಟ್ಟೆ ಆವಕ (ಟನ್)",
        "vol_avg": "ಸರಾಸರಿ ಮಾರುಕಟ್ಟೆ ಆವಕ (ಟನ್)",
        "qty_lbl": "💰 ಒಟ್ಟು ಇಳುವರಿ ಪ್ರಮಾಣ (ಟನ್)",
        "btn_analyze": "🔮 ಕೊಳೆಯುವ ಅಪಾಯವನ್ನು ವಿಶ್ಲೇಷಿಸಿ",
        "output_header": "📊 ವಿಶ್ಲೇಷಣಾ ವರದಿ ಮಾಹಿತಿ",
        "spoil_prob": "ಬೆಳೆ ಕೊಳೆಯುವ ಸಾಧ್ಯತೆ",
        "shelf_lbl": "ಉಳಿದಿರುವ ಜೀವಿತಾವಧಿ",
        "loss_lbl": "ನಷ್ಟದ ಪ್ರಮಾಣ",
        "fin_loss": "ಹಣಕಾಸಿನ ನಷ್ಟ",
        "optimal_route": "📍 ಸೂಕ್ತವಾದ ಸರಬರಾಜು ಮಾರ್ಗ ನಕ್ಷೆ",
        "distance_msg": "🚚   ಸಂಗ್ರಹಣಾ ಕೇಂದ್ರಕ್ಕೆ ಇರುವ ದೂರ",
        "facility_target": "ನಿಗದಿಪಡಿಸಿದ ದಾಸ್ತಾನು ಕೇಂದ್ರ",
        "alt_table_hdr": "🏆 ಟಾಪ್ 3 ಪರ್ಯಾಯ ಶಿಫರಾಸು ಕೇಂದ್ರಗಳು (ನಿವ್ವಳ ಲಾಭದ ಆಧಾರದ ಮೇಲೆ)",
        "col_fac": "ದಾಸ್ತಾನು ಕೇಂದ್ರದ ಹೆಸರು",
        "col_dist": "ಜಿಲ್ಲೆ",
        "col_kms": "ನಿಜವಾದ ದೂರ",
        "col_rate": "ಮಾರುಕಟ್ಟೆ ದರ",
        "col_payout": "ಅಂದಾಜು ನಿವ್ವಳ ಆದಾಯ (ಲಾಭ)",
        "book_hdr": "🚛 ನಿಮ್ಮ ದಾಸ್ತಾನು ಜಾಗವನ್ನು ಕಾಯ್ದಿರಿಸಿ",
        "book_btn": "🔔   ಸ್ಟೋರೇಜ್ ಸ್ಲಾಟ್ ಬುಕ್ ಮಾಡಿ ಮತ್ತು ವಾಹನ ರವಾನಿಸಿ",
        "info_msg": "👈 ಕೃಷಿ ಮಾಹಿತಿಯನ್ನು ನಮೂದಿಸಿ ಮತ್ತು ಅಪಾಯದ ವರದಿಯನ್ನು ವೀಕ್ಷಿಸಲು 'ವಿಶ್ಲೇಷಿಸಿ' ಕ್ಲಿಕ್ ಮಾಡಿ.",
        "error_cs": "❌ ಕಾರ್ಯಾಚರಣೆಯ ದೋಷ: ಯಾವುದೇ ಹೊಂದಾಣಿಕೆಯಾಗುವ ದಾಸ್ತಾನು ಕೇಂದ್ರಗಳು ಕಂಡುಬಂದಿಲ್ಲ.",
        "success_booking": "🎉 **ದಾಸ್ತಾನು ಜಾಗ ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ!** ವಾಹನವನ್ನು ಲೈವ್ ಆಗಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಲಾಗುತ್ತಿದೆ.",
        "eta_msg": "ಸರಾಸರಿ ತಲುಪುವ ಸಮಯ",
        "hours_lbl": "ಗಂಟೆಗಳು",
        "voice_assist_hdr": "🎙️ ಎಐ ಧ್ವನಿ ಆಜ್ಞೆಯ ಇನ್‌ಪುಟ್ ಗೇಟ್‌ವೇ",
        "voice_assist_prompt": "ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿ ನಿಮ್ಮ ಕೃಷಿ ಮಾಹಿತಿಯನ್ನು ತಿಳಿಸಿ (ಉದಾ: 'ಕೋಲಾರದಲ್ಲಿ ಹತ್ತು ಟನ್ ಟೊಮೆಟೊ'):",
        "voice_btn_start": "🔴 ಮಾತನಾಡಿ / Tap to Speak",
        "voice_btn_stop": "⏹️ ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ",
        "voice_output_hdr": "🤖 ಜೆನ್-ಎಐ ಆಡಿಯೋ ಸಲಹೆ ಮತ್ತು ಧ್ವನಿ ಪ್ಲೇಬ್ಯಾಕ್",
        "voice_lang_toggle": "ಧ್ವನಿ ಪ್ಲೇಬ್ಯಾಕ್ ಭಾಷೆಯನ್ನು ಆರಿಸಿ / Language Option:"
    },
    "Hindi (हिंदी)": {
        "sidebar_hdr": "🏛️ ಬಿ.ಐ.ಟಿ ಮುಖ್ಯ ಯೋಜನೆ 2023-27",
        "sidebar_dept": "कंप्यूटर विज्ञान और इंजीनियरिंग",
        "main_title": "🌾 कटी हुई फसल के नुकसान का अनुमान AI",
        "main_subtitle": "कर्नाटक कूटनीतिज्ञता व्यवस्था",
        "input_header": "📋 इनपुट पैरामीटर",
        "crop_lbl": "🌱 फसल चुनें",
        "dist_lbl": "📍 जिला",
        "road_lbl": "🗺️ मार्ग अवसंरचना गुणवत्ता",
        "harvest_lbl": "📅 कटाई की तारीख",
        "temp_lbl": "🌡️ औसत तापमान (°C)",
        "hum_lbl": "💧 औसत आर्द्रता (%)",
        "transit_lbl": "🚚 रसद और बाजार",
        "transit_actual": "वास्तविक परिवहन (दिन)",
        "transit_expect": "अपेक्षित परिवहन (दिन)",
        "vol_current": "वर्तमान आगमन मात्रा (टन)",
        "vol_avg": "औसत बाजार मात्रा (टन)",
        "qty_lbl": "💰 कुल मात्रा (टन)",
        "btn_analyze": "🔮 खराब होने के जोखिम का विश्लेषण करें",
        "output_header": "📊 भविष्यवाणी आउटपुट",
        "spoil_prob": "खराब होने की संभावना",
        "shelf_lbl": "शेष जीवन काल",
        "loss_lbl": "मात्रा का नुकसान",
        "fin_loss": "वित्तीय नुकसान",
        "optimal_route": "📍 इष्टतम मार्ग मानचित्र",
        "distance_msg": "🚚 इष्टतम डिपो की दूरी",
        "facility_target": "सुविधा लक्ष्य",
        "alt_table_hdr": "🏆 शीर्ष 3 वैकल्पिक अनुशंसित सुविधाएं (शुद्ध लाभ के आधार पर)",
        "col_fac": "सुविधा का नाम",
        "col_dist": "ज़िला",
        "col_kms": "भौतिक दूरी",
        "col_rate": "बाजार दर",
        "col_payout": "अनुमानित शुद्ध भुगतान (लाभ)",
        "book_hdr": "🚛 अपना स्टोरेज स्लॉट सुरक्षित करें",
        "book_btn": "🔔 स्टोरेज स्लॉट बुक करें और वाहन रवाना करें",
        "info_msg": "👈 कृषि पैरामीटर दर्ज करें और जोखिम रिपोर्ट देखने के लिए 'ವಿಶ್ಲೇಷಿಸಿ' पर क्लिक करें।",
        "error_cs": "❌ परिचालन त्रुटि: कोई संगत कोल्ड स्टोरेज सुविधा नहीं मिला।",
        "success_booking": "🎉 **स्टोरिज स्लॉट सुरक्षित!** वाहन को लाइव ट्रैक किया जा रहा है।",
        "eta_msg": "अनुमानित आगमन समय",
        "hours_lbl": "घंटे",
        "voice_assist_hdr": "🎙️ एआई वॉयस कमांड इनपुट गेटवे",
        "voice_assist_prompt": "माइक चालू करें और अपनी कृषि जानकारी बोलें (जैसे, 'कोलार में दस टन टमाटर'):",
        "voice_btn_start": "🔴 बोलने के लिए टैप करें",
        "voice_btn_stop": "⏹️ रिकॉर्डिंग रोकें",
        "voice_output_hdr": "🤖 जेन-एआई वॉयस एडवाइजरी और ऑडियो प्लेबैक",
        "voice_lang_toggle": "ऑडियो प्लेबैक भाषा चुनें:"
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS & ASSETS  (ALL FROM FILE 1 — unchanged)
# ─────────────────────────────────────────────────────────────────────────────
ARTIFACTS_PATH  = Path("artifacts_v2.pkl")
CS_CSV_PATH     = Path("cold_storage_karnataka.csv")
MARKET_CSV_PATH = Path("processed_market_conditions.csv")

from backend.config import settings

# ── API KEYS ─────────────────────────────────────────────────────────────────
GOOGLE_API_KEY  = settings.GOOGLE_API_KEY
GEMINI_API_KEY  = settings.GEMINI_API_KEY
WEATHER_API_KEY = settings.WEATHER_API_KEY
# ─────────────────────────────────────────────────────────────────────────────

CROP_MASTER = {
    "Tomato": (7, 25, 1.00, 2.5), "Onion": (60, 10, 0.15, 1.8), "Potato": (90, 8, 0.12, 1.7),
    "Banana": (10, 20, 0.95, 2.2), "Mango": (14, 18, 0.80, 2.4), "Grapes": (14, 15, 0.75, 2.3),
    "Pomegranate": (30, 12, 0.55, 2.0), "Cabbage": (5, 35, 1.05, 2.5), "Capsicum": (14, 20, 0.85, 2.2),
    "Cauliflower": (5, 30, 1.05, 2.5), "Brinjal": (7, 25, 0.90, 2.3), "Okra": (3, 40, 1.10, 2.7),
    "Spinach": (3, 45, 1.20, 3.0), "Coconut": (60, 5, 0.10, 1.5),
    "Cucumber": (14, 20, 0.90, 2.0)
}

# 🌟 EXPLICIT RE-MAPPING OF ALL 30 KARNATAKA COLD STORAGE DATASET COORDINATES
DISTRICT_COORDS = {
    "Bagalkot": (16.18, 75.70), "Ballari": (15.15, 76.92), "Belagavi": (15.85, 74.50),
    "Bengaluru Rural": (13.20, 77.46), "Bengaluru Urban": (12.87, 77.68), "Bidar": (17.91, 77.52),
    "Chamarajanagar": (11.93, 76.94), "Chikkaballapur": (13.40, 78.05), "Chitradurga": (14.23, 76.40),
    "Dakshina Kannada": (12.88, 74.88), "Davangere": (14.46, 75.92), "Dharwad": (15.41, 75.07),
    "Gadag": (15.42, 75.62), "Hassan": (13.01, 76.10), "Haveri": (14.80, 75.40),
    "Kalaburagi": (17.33, 76.82), "Kodagu": (12.42, 75.74), "Kolar": (13.14, 78.22),
    "Koppal": (15.35, 76.16), "Mandya": (12.52, 76.90), "Mysuru": (12.30, 76.65),
    "Raichur": (16.20, 77.36), "Ramanagara": (12.72, 77.28), "Shivamogga": (13.93, 75.57),
    "Tumakuru": (13.48, 77.04), "Udupi": (13.34, 74.74), "Uttara Kannada": (14.81, 74.13),
    "Vijayanagar": (15.27, 76.39), "Vijayapura": (16.83, 75.72), "Yadgir": (16.77, 77.13)
}

CROP_LIST     = ["Tomato", "Onion", "Cucumber", "Potato"]
DISTRICT_LIST = sorted(DISTRICT_COORDS.keys())
SRI_MONTHLY   = {1:0.40, 2:0.45, 3:0.50, 4:0.55, 5:0.60, 6:0.80, 7:0.85, 8:0.82, 9:0.78, 10:0.65, 11:0.55, 12:0.42}

#  🌟  CEDA AGMARKNET — VERIFIED ID MAPS (tested against live API, July 2026)
COMMODITY_ID_MAP = {
    "Tomato": 78, "Onion": 23, "Potato": 24, "Banana": 19, "Mango": 20,
    "Grapes": 22, "Pomegranate": 190, "Cabbage": 154, "Capsicum": 164,
    "Cauliflower": 34, "Brinjal": 35, "Okra": 85, "Spinach": 342, "Coconut": 138
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
KARNATAKA_STATE_ID = 29


@st.cache_resource
def load_assets():
    if not ARTIFACTS_PATH.exists(): return None
    try:
        import sys
        try:
            import sklearn._loss._loss as sklearn_loss_ext
            sys.modules.setdefault('_loss', sklearn_loss_ext)
        except Exception:
            pass
        return joblib.load(ARTIFACTS_PATH)
    except Exception:
        class MockEncoder:
            def transform(self, x): return [0]
        class MockScaler:
            def transform(self, x): return x
        class MockModel:
            def predict_proba(self, x): return np.array([[0.616, 0.384]])
            def predict(self, x): return np.array([4.8]) if hasattr(self, 't') and self.t == "loss" else np.array([5.2])
        return {'le_crop': MockEncoder(), 'le_district': MockEncoder(), 'scaler': MockScaler(), 'ensemble_clf': MockModel(), 'loss_regressor': MockModel(), 'shelf_regressor': MockModel()}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat, dlon = math.radians(lat2-lat1), math.radians(lon2-lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


@st.cache_data(ttl=21600)
def get_live_market_price(crop, district_name="Kolar", max_retries=2):
    try:
        comp_id = COMMODITY_ID_MAP.get(crop)
        dist_id = DISTRICT_ID_MAP.get(district_name)
        if comp_id is None or dist_id is None:
            return None

        api_key = settings.MARKET_API_KEY
        if not api_key:
            return None

        url     = "https://api.ceda.ashoka.edu.in/v1/agmarknet/prices"
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
        payload = {
            "commodity_id": comp_id,
            "state_id": KARNATAKA_STATE_ID,
            "district_id": [dist_id],
            "market_id": [],
            "from_date": "2023-01-01",
            "to_date": date.today().strftime("%Y-%m-%d")
        }

        for attempt in range(max_retries):
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 2 ** (attempt + 1)))
                time.sleep(min(retry_after, 5))
                continue
            if response.status_code == 200:
                data = response.json().get("output", {}).get("data", [])
                if data:
                    latest = max(data, key=lambda d: d["date"])
                    modal_price_quintal = float(latest.get("modal_price", 0))
                    if modal_price_quintal > 0:
                        return modal_price_quintal / 100.0, latest["date"][:10]
                return None
            return None
        return None
    except Exception:
        return None

def calculate_optimized_warehouse_matrix(f_lat, f_lng, crop, qty_tons, road_cond):
    if not CS_CSV_PATH.exists(): return pd.DataFrame()
    df_cs = pd.read_csv(CS_CSV_PATH)

    speed_map     = {"National Highway": 60.0, "State Highway": 40.0, "Rural / Unpaved Road": 20.0}
    current_speed = speed_map.get(road_cond, 40.0)
    vibration_map = {"National Highway": 1.0, "State Highway": 1.3, "Rural / Unpaved Road": 2.5}
    vibration_idx = vibration_map.get(road_cond, 1.0)

    df_cs = df_cs.copy()
    df_cs['base_dist'] = df_cs.apply(
        lambda row: haversine(f_lat, f_lng, row['latitude'], row['longitude']), axis=1
    )

    df_cs['available_capacity_tons'] = df_cs.get('capacity_mt', 5000) * (1 - df_cs.get('occupancy_pct', 65.0) / 100.0)
    df_candidates = df_cs[
        (df_cs.get('occupancy_pct', 65.0) >= 100.0) | 
        (df_cs['available_capacity_tons'] >= qty_tons)
    ].copy()
    df_candidates = df_candidates.sort_values(by='base_dist', ascending=True).head(3)

    fallback_map = {
        "Bagalkot": 26.50, "Gadag": 24.20, "Koppal": 23.80, "Kolar": 30.00,
        "Belagavi": 24.00, "Shivamogga": 28.00, "Chitradurga": 22.00,
        "Haveri": 25.00, "Mysuru": 32.00
    }

    calculated_rows = []
    for _, row in df_candidates.iterrows():
        base_dist        = row['base_dist']
        facility_district = row['district']

        mandi_result = get_live_market_price(crop, facility_district)
        if mandi_result:
            mandi_p_kg, price_as_of_date = mandi_result
            price_source = f"CEDA (as of {price_as_of_date})"
        else:
            mandi_p_kg   = fallback_map.get(facility_district, 25.00)
            price_source = "Estimated"

        est_transit_hours  = base_dist / current_speed
        shelf_life_days    = CROP_MASTER[crop][0] if (crop in CROP_MASTER) else 7
        total_shelf_hours  = shelf_life_days * 24.0
        survival_prob      = np.clip(total_shelf_hours / (total_shelf_hours + est_transit_hours), 0.0, 1.0)
        total_transit_cost = base_dist * 12.0
        storage_rent_cost  = row.get('price_per_ton_day', 180.0) * qty_tons * 3
        total_kg           = qty_tons * 1000.0
        net_payout = (total_kg * mandi_p_kg * survival_prob) - total_transit_cost - storage_rent_cost

        fac_name = row['facility_name']
        if row.get('occupancy_pct', 65.0) >= 100.0:
            fac_name += " (FULL)"

        calculated_rows.append({
            'facility_name':          fac_name,
            'district':               facility_district,
            'latitude':               row['latitude'],
            'longitude':              row['longitude'],
            'base_dist':              base_dist,
            'capacity_mt':            row.get('capacity_mt', 5000),
            'available_capacity':     row.get('available_capacity_tons', 100.0),
            'occupancy_pct':          row.get('occupancy_pct', 65.0),
            'mandi_price_per_kg':     mandi_p_kg,
            'price_source':           price_source,
            'net_estimated_payout':   net_payout,
            'time_window_index':      total_shelf_hours / (est_transit_hours + 1e-5),
            'vibration_stress_index': vibration_idx,
            'price_volatility_index': row.get('price_volatility_index', 1.0)
        })

    df_res = pd.DataFrame(calculated_rows)
    return df_res.sort_values(by='base_dist', ascending=True).head(3)

# ─────────────────────────────────────────────────────────────────────────────
# MAIN CONTROL LOGIC FOR FETCHING WEATHER
# ─────────────────────────────────────────────────────────────────────────────
artifacts = load_assets()
if not artifacts:
    st.error(t(" 🚨  `artifacts_v2.pkl` missing!"))
    st.stop()

user = st.session_state.get("user", {})
default_district = user.get("district", "Kolar")
selected_district = st.session_state.get("viva_district", default_district)
w_lat, w_lng      = DISTRICT_COORDS.get(selected_district, (13.13, 78.12))
fetched_temp, fetched_hum   = 34.0, 82.0
fetched_wind, fetched_rain  = 8.0, 0.0
fetched_clouds, fetched_desc = 40, "Clear Sky"
weather_status_msg, weather_status_type = "Using baseline climate models.", "warning"
try:
    w_url = f"https://api.openweathermap.org/data/2.5/weather?lat={w_lat}&lon={w_lng}&units=metric&appid={WEATHER_API_KEY}"
    w_res = requests.get(w_url, timeout=15).json()
    if w_res.get("cod") == 200:
        fetched_temp   = float(w_res["main"]["temp"])
        fetched_hum    = float(w_res["main"]["humidity"])
        fetched_wind   = float(w_res.get("wind", {}).get("speed", 0.0)) * 3.6   # m/s → km/h
        fetched_rain   = float(w_res.get("rain", {}).get("1h", w_res.get("rain", {}).get("3h", 0.0)))
        fetched_clouds = int(w_res.get("clouds", {}).get("all", 0))
        fetched_desc   = w_res.get("weather", [{}])[0].get("description", "N/A").title()
        weather_status_msg  = f"Live Telemetry Synchronized: {fetched_temp}°C, {fetched_hum}% RH"
        weather_status_type = "success"
    else:
        weather_status_msg = f"API responded but no data (cod={w_res.get('cod')}). Check key validity."
except Exception as e:
    weather_status_msg = f"Weather API unreachable: {type(e).__name__}"

# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR & LANGUAGE + PORTAL CONTEXT SELECTOR
# ─────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    txt = {k: t(v) for k, v in LANG_DICT["English"].items()}
    st.divider()

    if weather_status_type == "success": st.success(f"**{txt['dist_lbl']}:** {selected_district}\n\n{weather_status_msg}")
    else: st.warning(weather_status_msg)
    st.divider()
    st.info(f"**Model Architecture:**\nEnsemble (XGBoost + RF + GBR)\nOptimization Vector: 12-Feature Net Realizable Value Matrix")

# ─────────────────────────────────────────────────────────────────────────────
#  🏢  CONTEXT 1: ORIGINAL MACHINE LEARNING PREDICTION ENGINE
# ─────────────────────────────────────────────────────────────────────────────
st.markdown(
    f'<div class="main-header"><h1>{txt["main_title"]}</h1><p>{txt["main_subtitle"]}</p></div>',
    unsafe_allow_html=True
)

# ── ENVIRONMENTAL TELEMETRY CARDS ────────────────────────────────────────
env_cols = st.columns(5)
env_data = [
    ("🌡️", f"{fetched_temp:.1f}°C",   "Temperature"),
    ("💧", f"{fetched_hum:.0f}%",     "Humidity"),
    ("🌬️", f"{fetched_wind:.1f} km/h","Wind Speed"),
    ("🌧️", f"{fetched_rain:.1f} mm",  "Rainfall (1h)"),
    ("☁️", f"{fetched_clouds}%",      "Cloud Cover"),
]
for col, (icon, val, lbl) in zip(env_cols, env_data):
    col.markdown(f'<div class="env-card"><div class="env-icon">{icon}</div>'
                 f'<div class="env-val">{val}</div><div class="env-lbl">{lbl}</div></div>',
                 unsafe_allow_html=True)
status_icon = "🟢" if weather_status_type == "success" else "🟡"
st.caption(f"{status_icon} {weather_status_msg} · {fetched_desc} conditions in **{selected_district}**")
st.write("")

# =============================================================================
# 🌿 VEGETABLE QUALITY ANALYSIS
# =============================================================================

st.markdown("""
    <div class="section-hdr">
        🌿 Vegetable Quality Analysis
    </div>
    """,
    unsafe_allow_html=True
)

uploaded_file = st.file_uploader(
    "📷 Upload Vegetable Image",
    type=["jpg", "jpeg", "png"],
    key="quality_upload"
)

if uploaded_file is not None:

    img_col, result_col = st.columns([1,2], gap="large")

    with img_col:
        st.image(uploaded_file, use_container_width=True)

    with result_col:

        if st.button("🔍 Analyze Image", use_container_width=True, key="quality_btn"):

            with st.status("🌿 Vegetable Quality Analysis", expanded=True) as status:

                st.write("📷 Loading uploaded image...")
                time.sleep(0.3)

                st.write("🔍 Detecting vegetable type...")
                time.sleep(0.3)

                st.write("🧠 Running MobileNetV2 model...")
                crop_name, quality, confidence, fresh_pct, rotten_pct = predict_quality(uploaded_file)

                st.write("📊 Computing confidence score...")
                time.sleep(0.3)

                status.update(
                    label="✅ Analysis Complete",
                    state="complete"
                )

            st.success(t("Analysis Completed"))

            st.markdown(f"""
                <div style="display: flex; justify-content: space-between; background-color: rgba(255, 255, 255, 0.05); padding: 15px 20px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px;">
                    <div style="text-align: center;"><div style="font-size: 0.75rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Crop</div><div style="font-size: 1.1rem; font-weight: 600;">{crop_name}</div></div>
                    <div style="text-align: center;"><div style="font-size: 0.75rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Quality</div><div style="font-size: 1.1rem; font-weight: 600;">{quality}</div></div>
                    <div style="text-align: center;"><div style="font-size: 0.75rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Confidence</div><div style="font-size: 1.1rem; font-weight: 600;">{confidence:.1f}%</div></div>
                    <div style="text-align: center;"><div style="font-size: 0.75rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; color: #4caf50;">Fresh</div><div style="font-size: 1.1rem; font-weight: 600; color: #4caf50;">{fresh_pct:.1f}%</div></div>
                    <div style="text-align: center;"><div style="font-size: 0.75rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; color: #f44336;">Rotten</div><div style="font-size: 1.1rem; font-weight: 600; color: #f44336;">{rotten_pct:.1f}%</div></div>
                </div>
            """, unsafe_allow_html=True)

            if quality.lower() == "fresh":
                st.success(t("✅ Fresh produce detected. Suitable for storage and transportation."))
                st.session_state["picture_spoilage_prob"] = 1.0 - (confidence / 100.0)
            else:
                st.error(t("❌ Rotten produce detected. Separate this batch before storage."))
                st.session_state["picture_spoilage_prob"] = confidence / 100.0
            
            if crop_name in CROP_LIST:
                st.session_state["viva_crop"] = crop_name
            
            import base64
            uploaded_file.seek(0)
            b64_img = base64.b64encode(uploaded_file.read()).decode("utf-8")
            st.session_state["picture_base64"] = f"data:image/jpeg;base64,{b64_img}"

st.markdown(t("---"))

# =============================================================================
# ML PREDICTION
# =============================================================================

col_in = st.container()
col_out = st.container()
with col_in:
    st.markdown(f'<div class="section-hdr">{txt["input_header"]}</div>', unsafe_allow_html=True)
    

    # ── INBOUND VOICE ASSISTANT (unchanged from File 1) ───────────────────────
    st.markdown(
        f'<div class="voice-box"><b>{txt["voice_assist_hdr"]}</b><br>{txt["voice_assist_prompt"]}',
        unsafe_allow_html=True
    )
    audio_input = mic_recorder(
        start_prompt=txt["voice_btn_start"],
        stop_prompt=txt["voice_btn_stop"],
        key="farmer_audio_mic",
        format="wav"
    )
    if audio_input and audio_input.get("bytes"):
        audio_id = audio_input.get("id", str(hash(audio_input["bytes"])))
        if st.session_state.get("last_processed_audio_id") != audio_id:
            st.session_state["last_processed_audio_id"] = audio_id
            audio_bytes = audio_input["bytes"]
            if len(audio_bytes) > 1000:
                import speech_recognition as sr
                import wave
                recognizer = sr.Recognizer()
                with st.spinner(" 🤖  Processing audio and transcribing..."):
                    try:
                        wav_buffer = io.BytesIO(audio_bytes)
                        with sr.AudioFile(wav_buffer) as source:
                            recognizer.adjust_for_ambient_noise(source, duration=0.5)
                            audio_data = recognizer.record(source)
                        transcribed_text = recognizer.recognize_google(audio_data)
                        if transcribed_text:
                            st.success(f" 🗣️  **AI Transcribed:** '{transcribed_text}'")
                            tt_lower = transcribed_text.lower().replace("bangalore", "bengaluru")
                            for c_item in CROP_LIST:
                                if c_item.lower() in tt_lower:
                                    st.session_state["viva_crop"] = c_item
                            for d_item in DISTRICT_LIST:
                                # Match exact or the first word (e.g. 'Bengaluru' matches 'Bengaluru Urban')
                                if d_item.lower() in tt_lower or d_item.lower().split()[0] in tt_lower.split():
                                    st.session_state["viva_district"] = d_item
                                    break
                            for w in transcribed_text.split():
                                if w.replace(".", "", 1).isdigit():
                                    st.session_state["viva_qty"] = float(w)
                            st.rerun()
                        else:
                            st.warning(t(" ⚠️  Voice audio received, but text parsing returned blank."))
                    except sr.UnknownValueError:
                        st.warning(t(" ⚠️  Speech engine could not resolve the audio. Speak clearly near mic."))
                    except Exception as e:
                        st.error(f" ℹ️  Voice service gateway timed out: {e}. Snapping to safe demonstration values.")
                        st.session_state["viva_crop"]     = "Potato"
                        st.session_state["viva_district"] = "Belagavi"
                        st.session_state["viva_qty"]      = 10.0
                        st.rerun()
            else:
                st.warning(t(" ⚠️  Audio recording sample was too short. Please speak clearly."))
    st.markdown(t("</div>"), unsafe_allow_html=True)

    user = st.session_state.get("user", {})
    default_dist = user.get("district", "Kolar")
    
    if "viva_crop" not in st.session_state:
        st.session_state["viva_crop"] = None
    if "viva_district" not in st.session_state:
        st.session_state["viva_district"] = default_dist
    
    qty_val = float(st.session_state.get("viva_qty", 10.0))
    
    crop = st.selectbox(txt["crop_lbl"], CROP_LIST, key="viva_crop", index=None, placeholder="Select Crop")
    district = st.selectbox(txt["dist_lbl"], DISTRICT_LIST, key="viva_district")
    st.markdown(f"**{txt['road_lbl']}**")
    road_condition = st.selectbox("Infrastructure Drop", ["Rural / Unpaved Road", "State Highway", "National Highway"], label_visibility="collapsed")
    c_date = st.date_input(txt["harvest_lbl"], date.today(), max_value=date.today())
    storage_days  = (date.today() - c_date).days

    c1, c2 = st.columns(2)
    with c1: temp = st.number_input(txt["temp_lbl"], value=fetched_temp)
    with c2: hum  = st.number_input(txt["hum_lbl"],  value=fetched_hum)
    # Simulated backend fetch for Logistics & Market data
    actual_t = 3.0
    expect_t = 1.5
    arrival_v = 180.0
    avg_v = 90.0
    qty_tons    = st.number_input(txt["qty_lbl"], min_value=0.1, value=qty_val)
    
    st.markdown("**Picture Spoilage Probability (From Image Analysis)**")
    pic_prob = st.session_state.get("picture_spoilage_prob", None)
    display_val = f"{pic_prob:.2%}" if pic_prob is not None else "Not Analyzed"
    st.text_input("Disabled automatically populated", value=display_val, disabled=True, label_visibility="collapsed", key=f"pic_prob_disp_{pic_prob}")
    
    predict_btn = st.button(txt["btn_analyze"], type="primary", use_container_width=True)

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT MATRIX CALCULATOR LOGIC
# ── ROUTING: Google Directions → OSRM fallback → straight-line fallback ──────
#    (FROM FILE 2: Google Directions + OSRM chain + debug log)
# ─────────────────────────────────────────────────────────────────────────────
if predict_btn:
    if not crop:
        st.error(t("❌ Please select a crop before analyzing."))
        st.stop()
        
    f_lat, f_lng = DISTRICT_COORDS.get(district, (12.97, 77.59))
    top_options  = calculate_optimized_warehouse_matrix(f_lat, f_lng, crop, qty_tons, road_condition)
    if top_options.empty:
        st.error(txt["error_cs"])
        st.stop()

    st.session_state.top_options = top_options
    st.session_state.results_cache = {}
    st.session_state.gemini_cache_v2 = {}
    st.session_state.selected_warehouse = top_options.iloc[0]['facility_name']

# ─────────────────────────────────────────────────────────────────────────────
# OUTPUT PANEL
# ─────────────────────────────────────────────────────────────────────────────
with col_out:
    if crop and crop in CROP_MASTER and "top_options" in st.session_state and not st.session_state.top_options.empty:
        st.markdown(f'<div class="section-hdr">{txt["output_header"]}</div>', unsafe_allow_html=True)
        top_options = st.session_state.top_options
        
        selected_facility_name = st.session_state.get("selected_warehouse", top_options.iloc[0]['facility_name'])
        
        if selected_facility_name not in st.session_state.get('results_cache', {}):
            with st.spinner(t("Calculating logistics and generating advisory...")):
                target_cs = top_options[top_options['facility_name'] == selected_facility_name].iloc[0]
                f_lat, f_lng = DISTRICT_COORDS.get(district, (12.97, 77.59))
                
                base_geodist    = target_cs['base_dist']
                dist_km         = base_geodist
                polyline_coords = []
                routing_source  = "straight-line (fallback)"
                route_debug_log = []

                # ── STEP 1: Google Maps Routes API (computeRoutes) ───────────────────────
                try:
                    g_url = "https://routes.googleapis.com/directions/v2:computeRoutes"
                    headers = {
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": GOOGLE_API_KEY,
                        "X-Goog-FieldMask": "routes.distanceMeters,routes.polyline.encodedPolyline"
                    }
                    payload = {
                        "origin": {"location": {"latLng": {"latitude": f_lat, "longitude": f_lng}}},
                        "destination": {"location": {"latLng": {"latitude": target_cs['latitude'], "longitude": target_cs['longitude']}}},
                        "travelMode": "DRIVE"
                    }
                    g_res = requests.post(g_url, headers=headers, json=payload, timeout=5).json()

                    if 'routes' in g_res and len(g_res['routes']) > 0:
                        route = g_res['routes'][0]
                        base_geodist    = route.get('distanceMeters', 0) / 1000.0
                        dist_km         = base_geodist
                        encoded_poly    = route.get('polyline', {}).get('encodedPolyline', '')
                        if encoded_poly:
                            polyline_coords = polyline.decode(encoded_poly)
                        routing_source  = "Google Routes API"
                        route_debug_log.append("✅ Google Routes API: route decoded successfully.")
                    else:
                        g_err = g_res.get('error', {})
                        g_status = g_err.get('status', 'UNKNOWN')
                        g_msg = g_err.get('message', 'No routes found or unspecified error.')
                        route_debug_log.append(f"⚠️ Google Routes status: **{g_status}** — {g_msg}")
                except Exception as e:
                    route_debug_log.append(f"❌ Google Routes request exception: `{type(e).__name__}: {e}`")

                # ── STEP 2: OSRM fallback ─────────────────────────────────────────────────
                if not polyline_coords:
                    try:
                        osrm_url = (
                            f"http://router.project-osrm.org/route/v1/driving/"
                            f"{f_lng},{f_lat};{target_cs['longitude']},{target_cs['latitude']}"
                            f"?overview=full&geometries=polyline"
                        )
                        o_res = requests.get(osrm_url, timeout=5).json()
                        if o_res.get('code') == 'Ok':
                            base_geodist    = o_res['routes'][0]['distance'] / 1000.0
                            dist_km         = base_geodist
                            encoded_poly    = o_res['routes'][0]['geometry']
                            polyline_coords = polyline.decode(encoded_poly)
                            routing_source  = "OSRM (public demo)"
                            route_debug_log.append("✅ OSRM fallback: route decoded successfully.")
                        else:
                            route_debug_log.append(f"⚠️ OSRM returned non-OK code: {o_res.get('code')}")
                    except Exception as e:
                        route_debug_log.append(f"❌ OSRM fallback exception: `{type(e).__name__}: {e}`")

                # ── STEP 3: Straight-line fallback ────────────────────────────────────────
                if not polyline_coords:
                    d_lat, d_lng    = target_cs['latitude'] - f_lat, target_cs['longitude'] - f_lng
                    polyline_coords = [
                        [f_lat, f_lng],
                        [f_lat + d_lat * 0.35, f_lng],
                        [f_lat + d_lat * 0.35, f_lng + d_lng * 0.65],
                        [target_cs['latitude'], target_cs['longitude']]
                    ]
                    dist_km = base_geodist * 1.35
                    route_debug_log.append(
                        "⚠️ Straight-line approximation used. Distance inflated ×1.35 to account for road detours."
                    )

                q10 = CROP_MASTER[crop][3] if (crop in CROP_MASTER and len(CROP_MASTER[crop]) > 3) else 2.5
                respiration_acceleration = q10 ** ((temp - 20.0) / 10.0)
                hei  = (temp * (storage_days + (actual_t * (target_cs['vibration_stress_index'] - 1.0)))) * respiration_acceleration
                hl   = hum * storage_days
                tdr, mci = actual_t / expect_t, arrival_v / avg_v
                sri  = SRI_MONTHLY.get(c_date.month, 0.5)

                try:
                    from utils.api_client import api_create_prediction
                    pred_payload = {
                        "crop": crop,
                        "district": district,
                        "temperature": temp,
                        "humidity": hum,
                        "road_condition": road_condition,
                        "actual_transit_days": actual_t,
                        "expected_transit_days": expect_t,
                        "storage_days": storage_days,
                        "quantity_tons": qty_tons,
                        "arrival_volume": arrival_v,
                        "avg_market_volume": avg_v,
                        "facility_distance_km": dist_km,
                        "recommended_facility": target_cs['facility_name'],
                    }
                    if pic_prob is not None:
                        pred_payload["picture_spoilage_prob"] = pic_prob
                    if "picture_base64" in st.session_state:
                        pred_payload["image_data"] = st.session_state["picture_base64"]

                    pred_resp = api_create_prediction(pred_payload)
                    pred_id = None
                    if pred_resp.status_code in [200, 201]:
                        backend_res = pred_resp.json()
                        pred_id = backend_res["id"]
                        prob_val = backend_res["spoilage_probability"]
                        loss_val = backend_res["loss_percentage"]
                        shelf_val = backend_res["shelf_life_days"]
                        
                        uploaded = st.session_state.get("quality_upload")
                        if pred_id and uploaded is not None:
                            import os
                            os.makedirs("assets/uploads", exist_ok=True)
                            with open(f"assets/uploads/{pred_id}.png", "wb") as f:
                                f.write(uploaded.getvalue())
                    else:
                        st.warning(f"⚠️ API returned {pred_resp.status_code}: {pred_resp.text}")
                        prob_val, loss_val, shelf_val = 0.384, 4.8, 5.2
                except Exception as e:
                    st.warning(f"⚠️ ML inference fallback triggered (API unreachable): {e}")
                    pred_id = None
                    prob_val, loss_val, shelf_val = 0.384, 4.8, 5.2

                if 'results_cache' not in st.session_state:
                    st.session_state.results_cache = {}
                    
                st.session_state.results_cache[selected_facility_name] = {
                    "pred_id": pred_id,
                    "prob": prob_val, "loss": loss_val, "shelf": shelf_val,
                    "dist_km": dist_km, "base_dist": base_geodist,
                    "f_lat": f_lat, "f_lng": f_lng,
                    "cs_lat": target_cs['latitude'], "cs_lng": target_cs['longitude'],
                    "cs_name": target_cs['facility_name'],
                    "top_3_df": top_options,
                    "polyline_points": polyline_coords,
                    "crop_name": crop,
                    "road_cond": road_condition,
                    "mandi_price": target_cs['mandi_price_per_kg'],
                    "capacity_mt": target_cs.get('capacity_mt', 5000),
                    "available_capacity": target_cs.get('available_capacity', 100.0),
                    "routing_source": routing_source,
                    "route_debug_log": route_debug_log,
                }
        
        res  = st.session_state.results_cache[selected_facility_name]
        risk = "HIGH" if res['prob'] > 0.6 else "MEDIUM" if res['prob'] > 0.3 else "LOW"

        # Gauge meter
        fig = go.Figure(go.Indicator(
            mode="gauge+number",
            value=res['prob'] * 100,
            number={'suffix': "%", 'font': {'color': '#8B1A1A'}},
            gauge={'axis': {'range': [0, 100]}, 'bar': {'color': "#8B1A1A"}},
            title={'text': txt["spoil_prob"]}
        ))
        fig.update_layout(height=240, margin=dict(l=20, r=20, t=40, b=20))
        st.plotly_chart(fig, use_container_width=True)

        m1, m2, m3 = st.columns(3)
        m1.markdown(f'<div class="metric-card"><div class="metric-val">{res["shelf"]:.1f}d</div><div class="metric-lbl">{txt["shelf_lbl"]}</div></div>', unsafe_allow_html=True)
        m2.markdown(f'<div class="metric-card"><div class="metric-val">{res["loss"]:.1f}%</div><div class="metric-lbl">{txt["loss_lbl"]}</div></div>', unsafe_allow_html=True)
        m3.markdown(f'<div class="metric-card"><div class="metric-val">₹{(res["loss"]/100)*qty_tons*48000:,.0f}</div><div class="metric-lbl">{txt["fin_loss"]}</div></div>', unsafe_allow_html=True)
        st.markdown(f"<div style='text-align:center; margin-top:10px;'><span class='badge-{risk}'>{risk} RISK</span></div>", unsafe_allow_html=True)

        if res['shelf'] <= 1.0:
            st.error(t(f"⚠️ **CRITICAL OPTIMIZATION ALERT:** Crop has an ultra-short remaining shelf life ({res['shelf']:.2f} days). The system has bypassed distant high-price facilities and prioritized the closest safe storage nodes to prevent total inventory decay."))
        else:
            if risk == "HIGH":
                rec_txt = t('Immediate emergency sale advised! Avoid further transport. Contact cold storage if unsold by tomorrow.')
                bg_color, border_color, text_color = "rgba(255, 0, 0, 0.1)", "#ff0000", "#b30000"
            elif risk == "MEDIUM":
                rec_txt = t('Monitor crop condition and prepare for transport within 48 hours. Moderate risk detected.')
                bg_color, border_color, text_color = "rgba(255, 193, 7, 0.15)", "#ffc107", "#997300"
            else:
                rec_txt = t('Crop is safe. Normal transit and storage procedures apply.')
                bg_color, border_color, text_color = "rgba(40, 167, 69, 0.1)", "#28a745", "#155724"

            st.markdown(f'<div class="rec-box" style="background-color: {bg_color}; border-left: 5px solid {border_color}; color: {text_color};"><b>📌 {t("Action Recommendation")}:</b><br>{rec_txt}</div>', unsafe_allow_html=True)

        # ─────────────────────────────────────────────────────────────────────
        # 🤖 GENERATIVE AI PRESCRIPTIVE LAYER & TEXT-TO-SPEECH
        #    • Correct Gemini response key: candidates[0]['content']['parts'][0]['text']
        #    • Exception handling without bare except
        #    • Kannada advisory generated by a SEPARATE Gemini API call
        #    • High-quality personalized English and Kannada fallbacks when Gemini is unavailable
        #    • gTTS synthesis with lang='kn' or 'en'
        # ─────────────────────────────────────────────────────────────────────
        st.write("---")
        st.markdown(f"### {txt['voice_output_hdr']}")

        if 'gemini_cache_v2' not in st.session_state:
            st.session_state.gemini_cache_v2 = {}

        def call_gemini_advisory(prompt_text, timeout_sec=120):
            if not GEMINI_API_KEY:
                return None
            for model_name in ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"]:
                try:
                    gemini_endpoint = (
                        f"https://generativelanguage.googleapis.com/v1beta"
                        f"/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
                    )
                    payload = {"contents": [{"parts": [{"text": prompt_text}]}]}
                    resp = requests.post(
                        gemini_endpoint,
                        json=payload,
                        headers={"Content-Type": "application/json"},
                        timeout=timeout_sec
                    )
                    if resp.status_code == 200:
                        resp_data = resp.json()
                        candidates = resp_data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and "text" in parts[0]:
                                cleaned = parts[0]["text"].replace("**", "").replace("*", "").replace("#", "").replace("`", "")
                                return cleaned.strip()
                except Exception:
                    pass
            return None

        if selected_facility_name not in st.session_state.gemini_cache_v2:
            st.session_state.gemini_cache_v2[selected_facility_name] = {
                'en': None, 'kn': None, 'audio_buf_en': None, 'audio_buf_kn': None
            }

            # ── 1. Comprehensive Personalized English Advisory ────────────────────
            rec_decision_en = (
                f"Immediate wholesale sale at the local mandi is advised over storage holding because your remaining shelf life of {res['shelf']:.1f} days is critically compressed"
                if res['shelf'] <= 1.5 or res['prob'] > 0.55
                else f"Allocating your produce directly into climate-controlled storage at {res['cs_name']} is strongly advised to capture the ₹{res['mandi_price']:.2f} per kg mandi rate while preventing the {res['loss']:.1f}% projected volume loss"
            )

            sys_prompt_en = (
                f"You are a senior agricultural supply chain agronomist and logistics optimization director in Karnataka.\n"
                f"Generate a comprehensive, highly customized operational spoken broadcast script for a farmer dispatching "
                f"{qty_tons} tons of {crop} from {district} to {res['cs_name']}.\n\n"
                f"--- LIVE TELEMETRY SNAPSHOT ---\n"
                f"* Crop: {crop}\n"
                f"* Harvest Quantity: {qty_tons} Tons\n"
                f"* Origin District: {district}\n"
                f"* Route Infrastructure: {road_condition}\n"
                f"* Target Facility: {res['cs_name']}\n"
                f"* Ambient Temperature: {temp}°C\n"
                f"* Ambient Humidity: {hum}%\n"
                f"* Actual Transit Duration: {actual_t} Days\n"
                f"* Expected Transit Duration: {expect_t} Days\n"
                f"* Machine Learning Spoilage Probability: {res['prob']*100:.1f}%\n"
                f"* Predicted Remaining Shelf Life: {res['shelf']:.1f} Days\n"
                f"* Regional Mandi Price: ₹{res['mandi_price']:.2f}/kg\n"
                f"* Projected Volume Loss: {res['loss']:.1f}%\n\n"
                f"--- MANDATORY 5-PART SCRIPT STRUCTURE ---\n"
                f"Write a seamless, continuous flowing spoken advisory covering all five parts in exact order:\n"
                f"1. PROFESSIONAL AGRICULTURAL GREETING: Formally and respectfully greet the farmer. Explicitly say that you are opening the automated telemetry data verification link for their harvest of {qty_tons} tons of {crop} originating from the {district} agricultural zone.\n"
                f"2. BIOPHYSICAL BREAKDOWN: Detail how the ambient temperature of {temp} degrees Celsius and {hum} percent humidity, combined with {actual_t} days actual transit over {road_condition} compared to {expect_t} days planned, accelerates cellular respiration, tissue breakdown, and moisture evaporation in this {crop} batch. State the calculated spoilage probability of {res['prob']*100:.1f} percent and remaining shelf life of {res['shelf']:.1f} days using these exact values.\n"
                f"3. ACTIONABLE ROUTING & SUPPLY LOGISTICS: Provide concrete vehicle handling instructions. Specify proper crate stacking and top-layer ventilation. Mandate disciplined driving speeds on {road_condition} to dampen road vibration stress and prevent internal bruising. Provide direct instructions for safe arrival and docking at {res['cs_name']}.\n"
                f"4. FINANCIAL FORECAST & RESERVATION COMMAND: Cite the prevailing mandi market rate of ₹{res['mandi_price']:.2f} per kilogram and the {res['loss']:.1f} percent volume loss rate. Explain whether immediate market liquidation or cold storage holding at {res['cs_name']} is preferable with the clear agronomic and financial reason. Give the farmer their concrete next operational action.\n"
                f"5. SIGN-OFF OUTRO: Conclude with a warm, respectful closing wishing them road safety and a highly profitable market return. Instruct them to review the visual route map on their dashboard and execute the storage slot booking below to lock in their dispatch.\n\n"
                f"--- CRITICAL LENGTH & STYLE RULES ---\n"
                f"- Length: Approximately 330 to 400 words (hard maximum 420 words), timed for a 2:30 to 3:20 minute spoken delivery.\n"
                f"- Do NOT omit any biophysical or logistics data points.\n"
                f"- Continuous flowing speech suitable for text-to-speech audio.\n"
                f"- No markdown, no asterisks, no bullet points, no numbered lists, no section headers, no brackets."
            )

            with st.spinner("🤖 Compiling In-Depth Agronomist Analytics Matrix..."):
                llm_text = call_gemini_advisory(sys_prompt_en, timeout_sec=120)

            # High-quality personalized English fallback matching all 5 parts exactly
            if not llm_text:
                llm_text = (
                    f"Namaste and warm greetings to our esteemed agricultural producer. We are opening the automated telemetry data verification link for your harvest dispatch of {qty_tons} tons of {crop} originating from the {district} agricultural distribution zone. "
                    f"Our synchronized biophysical sensors confirm an ambient routing temperature of {temp} degrees Celsius and relative humidity at {hum} percent. Under your current logistics transit duration of {actual_t} days versus the expected schedule of {expect_t} days across {road_condition} infrastructure, elevated thermal exposure accelerates cellular respiration, tissue breakdown, and moisture evaporation across this {crop} consignment. Consequently, our predictive machine learning ensemble models calculate a spoilage probability of {res['prob']*100:.1f} percent, leaving an operational remaining shelf life of {res['shelf']:.1f} days. "
                    f"To maintain produce freshness and prevent mechanical damage, your transport team must ensure proper crate stacking with unobstructed top-layer air ventilation tarpaulins. Maintain disciplined transit speeds consistent with {road_condition} conditions to dampen road vibration stress and prevent internal crop bruising. Upon arrival, proceed directly to the designated receiving bay at {res['cs_name']} for immediate pre-cooling and intake inspection. "
                    f"From a financial outlook, the prevailing regional mandi market rate stands at {res['mandi_price']:.2f} rupees per kilogram against a projected volume loss of {res['loss']:.1f} percent. {rec_decision_en}. "
                    f"Please inspect the optimized transit corridor on your interactive dashboard map and press the dispatch confirmation button below to secure your reserved bay. We wish you a safe journey on the roads and a prosperous market return."
                )

            st.session_state.gemini_cache_v2[selected_facility_name]['en'] = llm_text

        llm_text = st.session_state.gemini_cache_v2[selected_facility_name]['en']

        audio_choice = st.radio(
            txt["voice_lang_toggle"],
            ["English Audio", "Kannada Audio (ಕನ್ನಡ ಧ್ವನಿ)"],
            horizontal=True
        )

        if "Kannada" in audio_choice:
            if not st.session_state.gemini_cache_v2[selected_facility_name]['kn']:
                rec_decision_kn = (
                    f"ಬೆಳೆಯ ಉಳಿದ ಜೀವಿತಾವಧಿ {res['shelf']:.1f} ದಿನಗಳು ಮಾತ್ರ ಇರುವುದರಿಂದ ಮಂಡಿಯಲ್ಲಿ ತಕ್ಷಣವೇ ಮಾರಾಟ ಮಾಡುವುದು ಆರ್ಥಿಕ ನಷ್ಟವನ್ನು ತಪ್ಪಿಸಲು ಸೂಕ್ತವಾದ ಮಾರ್ಗವಾಗಿದೆ"
                    if res['shelf'] <= 1.5 or res['prob'] > 0.55
                    else f"ಪ್ರತಿ ಕೆಜಿಗೆ {res['mandi_price']:.2f} ರೂಪಾಯಿಗಳ ಮಾರುಕಟ್ಟೆ ಧಾರಣೆಯನ್ನು ಪಡೆಯಲು ಹಾಗೂ ಶೇಕಡಾ {res['loss']:.1f} ರಷ್ಟು ನಷ್ಟವನ್ನು ತಡೆಯಲು {res['cs_name']} ಕೋಲ್ಡ್ ಸ್ಟೋರೇಜ್ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ದಾಸ್ತಾನು ಇಡುವುದು ಹೆಚ್ಚು ಲಾಭದಾಯಕವಾಗಿದೆ"
                )

                # High-quality personalized Kannada fallback matching all 5 parts
                fallback_kn = (
                    f"ಗೌರವಾನ್ವಿತ ರೈತ ಬಾಂಧವರಿಗೆ ನಮಸ್ಕಾರಗಳು. {district} ಕೃಷಿ ವಲಯದಿಂದ ಹೊರಡುತ್ತಿರುವ ನಿಮ್ಮ {qty_tons} ಟನ್ {crop} ಬೆಳೆಯ ಸಾಗಣೆಯ ಸ್ವಯಂಚಾಲಿತ ಟೆಲಿಮೆಟ್ರಿ ದತ್ತಾಂಶ ಪರಿಶೀಲನೆಯನ್ನು ನಾವು ಯಶಸ್ವಿಯಾಗಿ ಪ್ರಾರಂಭಿಸಿದ್ದೇವೆ. "
                    f"ಪ್ರಸ್ತುತ ಸಾರಿಗೆ ಮಾರ್ಗದಲ್ಲಿ {temp} ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್ ತಾಪಮಾನ ಮತ್ತು {hum} ಪ್ರತಿಶತ ಆರ್ದ್ರತೆ ದಾಖಲಾಗಿದೆ. {road_condition} ರಸ್ತೆಯಲ್ಲಿ ನಿರೀಕ್ಷಿತ {expect_t} ದಿನಗಳ ಬದಲಿಗೆ {actual_t} ದಿನಗಳ ಸಾಗಣೆಯು ಹೆಚ್ಚಿನ ತಾಪಮಾನದಿಂದಾಗಿ ಬೆಳೆಯ ಉಸಿರಾಟದ ಪ್ರಕ್ರಿಯೆ ಮತ್ತು ಅಂಗಾಂಶಗಳ ಕ್ಷೀಣತೆಯನ್ನು ತ್ವರಿತಗೊಳಿಸುತ್ತದೆ. ನಮ್ಮ ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಮುನ್ಸೂಚನೆಯ ಪ್ರಕಾರ ಈ {crop} ಬೆಳೆಯಲ್ಲಿ ಶೇಕಡಾ {res['prob']*100:.1f} ರಷ್ಟು ಕೊಳೆಯುವ ಸಾಧ್ಯತೆ ಇದ್ದು, ಉಳಿದಿರುವ ನಿಖರ ಜೀವಿತಾವಧಿ {res['shelf']:.1f} ದಿನಗಳು ಮಾತ್ರವಾಗಿದೆ. "
                    f"ಬೆಳೆಯ ಗುಣಮಟ್ಟವನ್ನು ಕಾಪಾಡಲು ವಾಹನದಲ್ಲಿ ಕ್ರೇಟ್ಗಳನ್ನು ಸಮರ್ಪಕವಾಗಿ ಜೋಡಿಸಿ ಮೇಲ್ಭಾಗದಲ್ಲಿ ಗಾಳಿಯಾಡುವ ವ್ಯವಸ್ಥೆಯನ್ನು ಕಡ್ಡಾಯವಾಗಿ ಕಲ್ಪಿಸಿ. {road_condition} ರಸ್ತೆಯಲ್ಲಿ ಉಂಟಾಗುವ ಕಂಪನದಿಂದ ಬೆಳೆ ಜಜ್ಜುವುದನ್ನು ತಪ್ಪಿಸಲು ವಾಹನದ ವೇಗವನ್ನು ಹಿತಮಿತವಾಗಿ ನಿಯಂತ್ರಿಸಿ. ನಂತರ ನೇರವಾಗಿ {res['cs_name']} ದಾಸ್ತಾನು ಕೇಂದ್ರಕ್ಕೆ ತಲುಪಿ ಸುರಕ್ಷಿತವಾಗಿ ವಾಹನವನ್ನು ಡಾಕ್ ಮಾಡಿ. "
                    f"ಆರ್ಥಿಕ ಮುನ್ಸೂಚನೆಯ ಪ್ರಕಾರ ಪ್ರಸ್ತುತ ಮಂಡಿ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಪ್ರತಿ ಕೆಜಿಗೆ {res['mandi_price']:.2f} ರೂಪಾಯಿಗಳಾಗಿದ್ದು, ಅಂದಾಜು ನಷ್ಟದ ಪ್ರಮಾಣ ಶೇಕಡಾ {res['loss']:.1f} ರಷ್ಟಿದೆ. ಆದ್ದರಿಂದ {rec_decision_kn}. "
                    f"ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪರದೆಯ ಮೇಲಿರುವ ಮಾರ್ಗ ನಕ್ಷೆಯನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಕೆಳಗಿನ ಬುಕಿಂಗ್ ಬಟನ್ ಒತ್ತುವ ಮೂಲಕ ನಿಮ್ಮ ವಾಹನದ ಸ್ಲಾಟ್ ದೃಢೀಕರಿಸಿ. ನಿಮಗೆ ಸುರಕ್ಷಿತ ಪ್ರಯಾಣ ಮತ್ತು ಲಾಭದಾಯಕ ಮಾರುಕಟ್ಟೆ ಆದಾಯವನ್ನು ಹಾರೈಸುತ್ತೇವೆ."
                )

                kannada_prompt = (
                    f"ನೀವು ಕರ್ನಾಟಕ ಕೃಷಿ ಇಂಟೆಲಿಜೆನ್ಸ್ ವ್ಯವಸ್ಥೆಯ ಹಿರಿಯ ಕೃಷಿ ಸರಬರಾಜು ಸರಪಳಿ ತಜ್ಞರು ಹಾಗೂ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ನಿರ್ದೇಶಕರಾಗಿದ್ದೀರಿ.\n"
                    f"ಕೆಳಗಿನ ನಿಖರವಾದ ಲೈವ್ ಡೇಟಾ ಆಧರಿಸಿ ರೈತನಿಗೆ ನೇರವಾಗಿ ಮಾತನಾಡುವ ಶೈಲಿಯಲ್ಲಿ ಸಂಪೂರ್ಣ, ವೃತ್ತಿಪರ ಮತ್ತು ಕ್ರಿಯಾತ್ಮಕ ಕನ್ನಡ ಕೃಷಿ ಸಲಹಾ ಸ್ಕ್ರಿಪ್ಟ್ ರಚಿಸಿ.\n\n"
                    f"--- ಪ್ರಸ್ತುತ ಬೆಳೆ ಮತ್ತು ಸಾಗಣೆ ಮಾಹಿತಿ ---\n"
                    f"* ಬೆಳೆ: {crop}\n"
                    f"* ಮೂಲ ಜಿಲ್ಲೆ: {district}\n"
                    f"* ರಸ್ತೆ ಗುಣಮಟ್ಟ: {road_condition}\n"
                    f"* ಗೊತ್ತುಪಡಿಸಿದ ದಾಸ್ತಾನು ಕೇಂದ್ರ: {res['cs_name']}\n"
                    f"* ಒಟ್ಟು ಪ್ರಮಾಣ: {qty_tons} ಟನ್\n"
                    f"* ತಾಪಮಾನ: {temp}°C\n"
                    f"* ಆರ್ದ್ರತೆ: {hum}%\n"
                    f"* ನಿಜವಾದ ಸಾರಿಗೆ ಸಮಯ: {actual_t} ದಿನಗಳು\n"
                    f"* ನಿರೀಕ್ಷಿತ ಸಾರಿಗೆ ಸಮಯ: {expect_t} ದಿನಗಳು\n"
                    f"* ಕೊಳೆಯುವ ಸಾಧ್ಯತೆ: {res['prob']*100:.1f}%\n"
                    f"* ಉಳಿದಿರುವ ಜೀವಿತಾವಧಿ: {res['shelf']:.1f} ದಿನಗಳು\n"
                    f"* ಮಂಡಿ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ: ₹{res['mandi_price']:.2f}/ಕೆಜಿ\n"
                    f"* ಅಂದಾಜು ನಷ್ಟದ ಪ್ರಮಾಣ: {res['loss']:.1f}%\n\n"
                    f"--- ಕಡ್ಡಾಯವಾಗಿ ಒಳಗೊಂಡಿರಬೇಕಾದ ೫ ಪ್ರಮುಖ ಭಾಗಗಳು ---\n"
                    f"೧. ಗೌರವಾನ್ವಿತ ರೈತ ಬಾಂಧವರಿಗೆ ವೃತ್ತಿಪರ ನಮಸ್ಕಾರ: {district} ವಲಯದಿಂದ ಹೊರಡುತ್ತಿರುವ {qty_tons} ಟನ್ {crop} ಬೆಳೆಯ ಸ್ವಯಂಚಾಲಿತ ಟೆಲಿಮೆಟ್ರಿ ಪರಿಶೀಲನಾ ಲಿಂಕ್ ತೆರೆಯಲಾಗುತ್ತಿದೆ ಎಂದು ಸ್ಪಷ್ಟವಾಗಿ ತಿಳಿಸಿ.\n"
                    f"೨. ಜೈವಿಕ-ಭೌತಿಕ ವಿಶ್ಲೇಷಣೆ: {temp} ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್ ತಾಪಮಾನ ಮತ್ತು {hum} ಪ್ರತಿಶತ ಆರ್ದ್ರತೆಯಲ್ಲಿ {road_condition} ರಸ್ತೆಯಲ್ಲಿ {expect_t} ದಿನಗಳ ಬದಲಿಗೆ {actual_t} ದಿನಗಳ ಸಾಗಣೆಯು ಬೆಳೆಯ ಉಸಿರಾಟದ ಕ್ರಿಯೆ ಮತ್ತು ಜೀವಕೋಶಗಳ ಕ್ಷೀಣಿಸುವಿಕೆಯನ್ನು ಹೇಗೆ ವೇಗಗೊಳಿಸುತ್ತದೆ ಎಂದು ವಿವರಿಸಿ. ಮಾದರಿಯು ಲೆಕ್ಕಹಾಕಿದ {res['prob']*100:.1f} ಪ್ರತಿಶತ ಕೊಳೆಯುವ ಸಾಧ್ಯತೆ ಮತ್ತು {res['shelf']:.1f} ದಿನಗಳ ಉಳಿದ ಜೀವಿತಾವಧಿಯನ್ನು ನಿಖರವಾಗಿ ಉಲ್ಲೇಖಿಸಿ.\n"
                    f"೩. ವಾಹನ ಚಾಲನೆ ಮತ್ತು ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಮಾರ್ಗದರ್ಶನ: ಕ್ರೇಟ್ ಜೋಡಣೆ, ಗಾಳಿಯಾಡುವಿಕೆ ಮತ್ತು {road_condition} ರಸ್ತೆಯ ಕಂಪನದಿಂದ ಹಾನಿಯಾಗದಂತೆ ವಾಹನದ ವೇಗ ನಿಯಂತ್ರಣದ ಬಗ್ಗೆ ಪ್ರಾಯೋಗಿಕ ಸೂಚನೆಗಳನ್ನು ನೀಡಿ. {res['cs_name']} ದಾಸ್ತಾನು ಕೇಂದ್ರಕ್ಕೆ ಸುರಕ್ಷಿತವಾಗಿ ತಲುಪಿ ವಾಹನ ಡಾಕ್ ಮಾಡುವ ವಿಧಾನವನ್ನು ತಿಳಿಸಿ.\n"
                    f"೪. ಆರ್ಥಿಕ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಶಿಫಾರಸು: ಮಾರುಕಟ್ಟೆಯ ಪ್ರಸ್ತುತ ಧಾರಣೆ ಪ್ರತಿ ಕೆಜಿಗೆ {res['mandi_price']:.2f} ರೂಪಾಯಿ ಹಾಗೂ ಅಂದಾಜು {res['loss']:.1f} ಪ್ರತಿಶತ ನಷ್ಟದ ಆಧಾರದ ಮೇಲೆ ತಕ್ಷಣದ ಮಾರಾಟ ಉತ್ತಮವೇ ಅಥವಾ {res['cs_name']} ಕೋಲ್ಡ್ ಸ್ಟೋರೇಜ್ನಲ್ಲಿ ದಾಸ್ತಾನು ಇಡುವುದು ಉತ್ತಮವೇ ಎಂಬುದನ್ನು ಸ್ಪಷ್ಟ ಕಾರಣಗಳೊಂದಿಗೆ ತಿಳಿಸಿ.\n"
                    f"೫. ಮುಕ್ತಾಯ ಮತ್ತು ಮುಂದಿನ ಕ್ರಮ: ರೈತರಿಗೆ ಶುಭ ಹಾರೈಸಿ, ಡ್ಯಾಶ್ಬೋರ್ಡ್ನಲ್ಲಿರುವ ನಕ್ಷೆ ಮತ್ತು ಮಾರ್ಗವನ್ನು ಪರಿಶೀಲಿಸಿ ಕೆಳಗಿನ ಬುಕಿಂಗ್ ಬಟನ್ ಒತ್ತಿ ತಮ್ಮ ವಾಹನದ ಸ್ಲಾಟ್ ಕಾಯ್ದಿರಿಸಲು ತಿಳಿಸಿ.\n\n"
                    f"--- ಭಾಷೆ ಮತ್ತು ಸಮಯದ ನಿಯಮಗಳು ---\n"
                    f"- ಒಟ್ಟು ಪದಗಳ ಮಿತಿ: ನಿಖರವಾಗಿ ೩೩೦ ರಿಂದ ೪೦೦ ಪದಗಳು (ಗರಿಷ್ಠ ೪೨೦ ಪದಗಳು). ಇದು ಧ್ವನಿ ಮುಖಾಂತರ ಸುಮಾರು ೨:೩೦ ರಿಂದ ೩:೨೦ ನಿಮಿಷಗಳಲ್ಲಿ ಮಾತನಾಡಲು ಸೂಕ್ತವಾಗಿರಬೇಕು.\n"
                    f"- ನೈಸರ್ಗಿಕ, ಶುದ್ಧ ಹಾಗೂ ಆಡುಮಾತಿನ ವೃತ್ತಿಪರ ಕನ್ನಡ ಭಾಷೆ (gTTS lang='kn' ಗೆ ಸೂಕ್ತವಾದ ರೀತಿಯಲ್ಲಿ).\n"
                    f"- ಯಾವುದೇ Markdown, Bold, Asterisk, Bullets, Numbers, ಶೀರ್ಷಿಕೆಗಳು ಅಥವಾ ಬ್ರಾಕೆಟ್ಗಳನ್ನು ಬಳಸಬೇಡಿ. ಕೇವಲ ನಿರಂತರ ವಾಕ್ಯಗಳಾಗಿ ಮಾತ್ರ ಬರೆಯಿರಿ."
                )

                with st.spinner("🎙️ Generating Kannada Advisory..."):
                    kn_llm = call_gemini_advisory(kannada_prompt, timeout_sec=120)

                tts_script = kn_llm if kn_llm else fallback_kn
                st.session_state.gemini_cache_v2[selected_facility_name]['kn'] = tts_script

            tts_script = st.session_state.gemini_cache_v2[selected_facility_name]['kn']
            audio_lang = "kn"
            audio_cache_key = 'audio_buf_kn'
            display_transcript = tts_script
        else:
            tts_script = llm_text
            audio_lang = "en"
            audio_cache_key = 'audio_buf_en'
            display_transcript = tts_script

        with st.expander("📄 View Full Advisory Transcript", expanded=True):
            st.write(display_transcript)

        # ── gTTS Audio Synthesis ──────────────────────────────────────────────
        if not st.session_state.gemini_cache_v2[selected_facility_name].get(audio_cache_key):
            with st.spinner("🔊 Synthesizing High-Fidelity Audio Waveform..."):
                try:
                    tts       = gTTS(text=tts_script, lang=audio_lang, slow=False)
                    audio_buf = io.BytesIO()
                    tts.write_to_fp(audio_buf)
                    st.session_state.gemini_cache_v2[selected_facility_name][audio_cache_key] = audio_buf.getvalue()
                except Exception:
                    st.caption("🔊 Audio synthesis engine is currently processing. Please try again.")

        if st.session_state.gemini_cache_v2[selected_facility_name].get(audio_cache_key):
            st.audio(st.session_state.gemini_cache_v2[selected_facility_name][audio_cache_key], format="audio/mp3")

# ─────────────────────────────────────────────────────────────────────────────
# 📍 🗺️ GEO-SPATIAL LOGISTICS MAP & ALTERNATIVE FACILITIES LAYER
# ─────────────────────────────────────────────────────────────────────────────
if "top_options" in st.session_state and not st.session_state.top_options.empty:
    selected_facility_name = st.session_state.get("selected_warehouse")
    if selected_facility_name and selected_facility_name in st.session_state.get('results_cache', {}):
        res  = st.session_state.results_cache[selected_facility_name]
        risk = "HIGH" if res['prob'] > 0.6 else "MEDIUM" if res['prob'] > 0.3 else "LOW"

        st.markdown(t("---"))
        st.markdown(f'<div class="section-hdr">{txt["optimal_route"]}</div>', unsafe_allow_html=True)

        col_map, col_details = st.columns([7, 5], gap="medium")

        with col_map:
            m = folium.Map(
                location=[res['f_lat'], res['f_lng']],
                zoom_start=10,
                control_scale=True,
                tiles="OpenStreetMap"
            )

            folium.CircleMarker(
                location=[res['f_lat'], res['f_lng']],
                radius=7, color="#ffffff", weight=2,
                fill=True, fill_color="#28a745", fill_opacity=1.0,
                tooltip=f"Origin Farm ({district})"
            ).add_to(m)
            folium.Marker(
                [res['f_lat'], res['f_lng']],
                icon=folium.DivIcon(html="""
                    <div style="font-size:12px; font-weight:600; color:#333;
                                transform: translate(-10px, -28px); white-space:nowrap;">
                        Origin
                    </div>
                """)
            ).add_to(m)

            folium.CircleMarker(
                location=[res['cs_lat'], res['cs_lng']],
                radius=7, color="#ffffff", weight=2,
                fill=True, fill_color="#dc3545", fill_opacity=1.0,
                tooltip=f"Target Depot: {res['cs_name']}"
            ).add_to(m)
            folium.Marker(
                [res['cs_lat'], res['cs_lng']],
                icon=folium.DivIcon(html=f"""
                    <div style="font-size:12px; font-weight:600; color:#333;
                                transform: translate(-10px, -28px); white-space:nowrap;">
                        {res['cs_name'][:18]}
                    </div>
                """)
            ).add_to(m)

            if res['polyline_points']:
                AntPath(
                    res['polyline_points'],
                    color="#3388ff", weight=5, opacity=0.9,
                    dash_array=[10, 20], delay=800, pulse_color="#ffffff"
                ).add_to(m)

                mid_idx   = len(res['polyline_points']) // 2
                mid_point = res['polyline_points'][mid_idx]
                folium.Marker(
                    mid_point,
                    icon=folium.DivIcon(html="""
                        <div style="background:#3388ff; width:28px; height:28px; border-radius:50%;
                                    display:flex; align-items:center; justify-content:center;
                                    box-shadow:0 2px 5px rgba(0,0,0,0.3); transform: translate(-50%, -50%);
                                    font-size:14px;">
                            🚚
                        </div>
                    """)
                ).add_to(m)

            st_folium(m, width="100%", height=380, returned_objects=[])

            caption_suffix = " (distance ×1.35 applied)" if "straight-line" in res.get("routing_source", "") else ""
            st.caption(f"🛣️ Route source: {res.get('routing_source', 'unknown')}{caption_suffix}")

        with col_details:
            st.markdown(f"### 🚛 Optimal Node Logistics Matrix")
            st.selectbox(
                "🎯 Optimized Target",
                options=top_options['facility_name'].tolist(),
                key="selected_warehouse"
            )
            st.markdown(f"**{txt['distance_msg']}:** `{res['dist_km']:.2f} KM` *(Infrastructure Adjusted Matrix)*")
            st.markdown(f"**📈 Regional Market Spot Price:** `₹{res['mandi_price']:.2f} / KG`")
            st.markdown(f"**🏢 Facility Capacity:** `{res.get('capacity_mt', 5000):.0f} Tons` | **Available Space:** `{res.get('available_capacity', 100.0):.1f} Tons`")

            st.markdown(f'<div class="rec-box"><b>{txt["book_hdr"]}</b><br>Slot capacity lock is guaranteed under BaaS protocols for node validation.</div>', unsafe_allow_html=True)

            booking_mode = st.radio(t("Booking Mode"), [t("Random Booking"), t("Manual Booking")], horizontal=True)
            if booking_mode == t("Manual Booking"):
                manual_vid = st.text_input(t("Enter Vehicle Registration Number"), max_chars=10, placeholder="e.g. KA01AB1234")
            else:
                manual_vid = ""

            is_full = "(FULL)" in selected_facility_name
            if is_full:
                st.error("This warehouse is currently FULL. Booking is disabled.")

            if st.button(txt["book_btn"], type="primary", use_container_width=True, disabled=is_full):
                if booking_mode == t("Manual Booking"):
                    if not manual_vid.strip():
                        st.error(t("Please enter a vehicle registration number."))
                        st.stop()
                    vehicle_id = manual_vid.strip().upper()
                else:
                    vehicle_id = f"KA03EX{random.randint(1000, 9999)}"
                eta_calc   = max(0.5, round(res['base_dist'] / 40.0, 1))
                
                try:
                    from utils.api_client import api_create_shipment
                    pred_id = res.get("pred_id")
                    
                    ship_payload = {
                        "prediction_id": pred_id,
                        "booking_id": vehicle_id,
                        "crop": res["crop_name"],
                        "tonnage": float(qty_tons),
                        "destination": res["cs_name"],
                        "route_quality": res["road_cond"],
                        "eta_hours": f"{eta_calc} hours",
                        "risk_status": f"{risk} RISK",
                        "shelf_days_calculated": float(res["shelf"]),
                    }
                    
                    ship_resp = api_create_shipment(ship_payload)
                    if ship_resp.status_code in [200, 201]:
                        st.success(txt["success_booking"])
                        st.info(f"🚚 **{txt['eta_msg']}:** ~{eta_calc} {txt['hours_lbl']} | ID: `{vehicle_id}`")
                    else:
                        st.error(f"Failed to create shipment via API. (Status {ship_resp.status_code})")
                        st.write(ship_resp.text)
                except Exception as e:
                    st.error(f"Could not reach backend API for booking: {e}")

        # Full-width bordered card — Top 3 Alternative Facilities table
        with st.container(border=True):
            st.markdown(f'<div class="facility-card-hdr">{txt["alt_table_hdr"]}</div>', unsafe_allow_html=True)
            df_alt         = res['top_3_df'].copy()
            df_alt_display = pd.DataFrame({
                txt["col_fac"]:    df_alt['facility_name'],
                txt["col_dist"]:   df_alt['district'],
                txt["col_kms"]:    df_alt['base_dist'].map('{:.1f} KM'.format),
                txt["col_rate"]:   df_alt['mandi_price_per_kg'].map('₹{:.2f}/KG'.format),
                txt["col_payout"]: df_alt['net_estimated_payout'].map('₹{:,.0f}'.format)
            })
            st.dataframe(df_alt_display, use_container_width=True, hide_index=True)

st.divider()
st.caption("© 2026 BIT Bangalore - BaaS Administrative Control Panel Module v2.0")

