"""
utils/api_client.py — HTTP Client for Streamlit ↔ FastAPI Communication
Provides a clean interface for all API calls from the Streamlit frontend.
"""

import requests
import streamlit as st

import json
import os

API_BASE_URL = "http://localhost:8000"
SESSION_FILE = ".session_cache.json"

def save_session(token, user):
    try:
        with open(SESSION_FILE, "w") as f:
            json.dump({"auth_token": token, "user": user}, f)
    except Exception:
        pass

def load_session():
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return None

def clear_session():
    if os.path.exists(SESSION_FILE):
        try:
            os.remove(SESSION_FILE)
        except Exception:
            pass


def _get_headers():
    """Build authorization headers from session state token."""
    token = st.session_state.get("auth_token")
    if token:
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    return {"Content-Type": "application/json"}


def _handle_response(resp):
    """Common response handler — raises user-friendly errors."""
    if resp.status_code == 401:
        st.session_state.pop("auth_token", None)
        st.session_state.pop("user", None)
        clear_session()
        st.error("🔒 Session expired. Please log in again.")
        st.stop()
    return resp


# ─────────────────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────────────────
def api_register(full_name, phone, email, password, otp, role="farmer", district=None, managed_warehouse_id=None):
    payload = {
        "full_name": full_name,
        "phone": phone,
        "email": email,
        "password": password,
        "otp": otp,
        "role": role,
    }
    if district:
        payload["district"] = district
    if managed_warehouse_id:
        payload["managed_warehouse_id"] = managed_warehouse_id

    resp = requests.post(f"{API_BASE_URL}/api/auth/register", json=payload, timeout=10)
    return resp


def api_send_registration_otp(email: str):
    resp = requests.post(
        f"{API_BASE_URL}/api/auth/register-otp",
        json={"email": email},
        timeout=10,
    )
    return resp


def api_login(login_id, password):
    resp = requests.post(
        f"{API_BASE_URL}/api/auth/login",
        json={"login_id": login_id, "password": password},
        timeout=10,
    )
    return resp


def api_send_otp(login_id: str):
    resp = requests.post(
        f"{API_BASE_URL}/api/auth/send-otp",
        json={"login_id": login_id},
        timeout=10,
    )
    return resp


def api_verify_otp_login(login_id: str, otp: str):
    resp = requests.post(
        f"{API_BASE_URL}/api/auth/verify-otp-login",
        json={"login_id": login_id, "otp": otp},
        timeout=10,
    )
    return resp


def api_forgot_password(login_id: str):
    resp = requests.post(
        f"{API_BASE_URL}/api/auth/forgot-password",
        json={"login_id": login_id},
        timeout=10,
    )
    return resp


def api_reset_password(login_id: str, otp: str, new_password: str):
    resp = requests.post(
        f"{API_BASE_URL}/api/auth/reset-password",
        json={"login_id": login_id, "otp": otp, "new_password": new_password},
        timeout=10,
    )
    return resp


def api_delete_account():
    resp = requests.delete(
        f"{API_BASE_URL}/api/auth/account",
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_get_profile():
    resp = requests.get(f"{API_BASE_URL}/api/auth/me", headers=_get_headers(), timeout=10)
    return _handle_response(resp)


def api_update_profile(full_name=None, phone=None, district=None):
    payload = {}
    if full_name:
        payload["full_name"] = full_name
    if phone:
        payload["phone"] = phone
    if district:
        payload["district"] = district

    resp = requests.put(
        f"{API_BASE_URL}/api/auth/me",
        json=payload,
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


# ─────────────────────────────────────────────────────────────────────────────
# PREDICTIONS
# ─────────────────────────────────────────────────────────────────────────────
def api_create_prediction(data: dict):
    resp = requests.post(
        f"{API_BASE_URL}/api/predictions/",
        json=data,
        headers=_get_headers(),
        timeout=30,
    )
    return _handle_response(resp)


def api_list_predictions(page=1, page_size=20, crop=None, district=None):
    params = {"page": page, "page_size": page_size}
    if crop:
        params["crop"] = crop
    if district:
        params["district"] = district

    resp = requests.get(
        f"{API_BASE_URL}/api/predictions/",
        params=params,
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_get_prediction(prediction_id: int):
    resp = requests.get(
        f"{API_BASE_URL}/api/predictions/{prediction_id}",
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


# ─────────────────────────────────────────────────────────────────────────────
# SHIPMENTS
# ─────────────────────────────────────────────────────────────────────────────
def api_create_shipment(data: dict):
    resp = requests.post(
        f"{API_BASE_URL}/api/shipments/",
        json=data,
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_list_shipments(status=None, destination=None):
    params = {}
    if status:
        params["status"] = status
    if destination:
        params["destination"] = destination

    resp = requests.get(
        f"{API_BASE_URL}/api/shipments/",
        params=params,
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_list_active_shipments(destination=None):
    params = {}
    if destination:
        params["destination"] = destination

    resp = requests.get(
        f"{API_BASE_URL}/api/shipments/active",
        params=params,
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_update_shipment(shipment_id: int, data: dict):
    resp = requests.put(
        f"{API_BASE_URL}/api/shipments/{shipment_id}",
        json=data,
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


# ─────────────────────────────────────────────────────────────────────────────
# WAREHOUSES
# ─────────────────────────────────────────────────────────────────────────────
def api_list_warehouses():
    resp = requests.get(
        f"{API_BASE_URL}/api/warehouses/",
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_update_warehouse(warehouse_id: int, data: dict):
    resp = requests.put(
        f"{API_BASE_URL}/api/warehouses/{warehouse_id}",
        json=data,
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_inspect_shipment(warehouse_id: int, data: dict):
    resp = requests.post(
        f"{API_BASE_URL}/api/warehouses/{warehouse_id}/inspect",
        json=data,
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_dispatch_shipment(warehouse_id: int, shipment_id: int, action="mandi", vehicle_reg_no=None):
    params = {"shipment_id": shipment_id, "action": action}
    if vehicle_reg_no:
        params["vehicle_reg_no"] = vehicle_reg_no
        
    resp = requests.post(
        f"{API_BASE_URL}/api/warehouses/{warehouse_id}/dispatch",
        params=params,
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


# ─────────────────────────────────────────────────────────────────────────────
# FARMERS
# ─────────────────────────────────────────────────────────────────────────────
def api_farmer_dashboard():
    resp = requests.get(
        f"{API_BASE_URL}/api/farmers/dashboard",
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_market_register(data: dict):
    resp = requests.post(
        f"{API_BASE_URL}/api/farmers/market-register",
        json=data,
        timeout=10,
    )
    return resp


# ─────────────────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────
def api_list_notifications():
    resp = requests.get(
        f"{API_BASE_URL}/api/notifications/",
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_unread_count():
    try:
        resp = requests.get(
            f"{API_BASE_URL}/api/notifications/unread-count",
            headers=_get_headers(),
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json().get("unread", 0)
    except Exception:
        pass
    return 0


def api_mark_read(notification_id: int):
    resp = requests.put(
        f"{API_BASE_URL}/api/notifications/{notification_id}/read",
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


def api_mark_all_read():
    resp = requests.put(
        f"{API_BASE_URL}/api/notifications/read-all",
        headers=_get_headers(),
        timeout=10,
    )
    return _handle_response(resp)


# ─────────────────────────────────────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────────────────────────────────────
def is_authenticated():
    """Check if user is currently authenticated."""
    if "auth_token" in st.session_state and st.session_state.auth_token:
        return True
    
    # Check persistent session
    cached = load_session()
    if cached and "auth_token" in cached and "user" in cached:
        st.session_state["auth_token"] = cached["auth_token"]
        st.session_state["user"] = cached["user"]
        return True
        
    return False


def get_user_role():
    """Get the current user's role."""
    user = st.session_state.get("user")
    if user:
        return user.get("role", "farmer")
    return None


def require_auth():
    """Check auth and show login prompt if not authenticated."""
    if not is_authenticated():
        st.warning("🔒 Please log in to access this page.")
        st.info("👈 Go to the **Login** page from the sidebar.")
        st.stop()


def require_role(required_role):
    """Check auth + role."""
    require_auth()
    role = get_user_role()
    if role != required_role and role != "admin":
        st.error(f"🚫 Access denied. This page requires the '{required_role}' role.")
        st.stop()
