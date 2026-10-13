"""
pages/0_🔐_Login.py — Authentication Page
Login, Register, and Market Registration forms.
"""

import streamlit as st
import importlib
import utils.api_client
importlib.reload(utils.api_client)
from utils.api_client import (
    api_login, api_register, api_market_register, is_authenticated,
    api_send_otp, api_verify_otp_login, api_forgot_password, api_reset_password,
    save_session, clear_session
)

st.set_page_config(page_title="Login — Post-Harvest AI", page_icon="🔐", layout="wide")
from utils.ui import set_page_style
from utils.translator import t
set_page_style()
from utils.ui import render_top_bar
render_top_bar()
import os
def route_user(role):
    if role == "farmer":
        st.session_state["redirect_to"] = "dashboard_page"
    elif role == "warehouse_manager":
        st.session_state["redirect_to"] = "wh_mgr_page"
    elif role == "admin":
        st.session_state["redirect_to"] = "dashboard_page"
    
    st.rerun()



# ── Check if already logged in ────────────────────────────────────────────────
if is_authenticated():
    user = st.session_state.get("user", {})
    st.markdown(f"""
    <div class="auth-header">
        <h1>✅ {t("You're Logged In")}</h1>
        <p>{t("Welcome back to the Karnataka Agricultural Intelligence Platform")}</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown(f"""
    <div class="user-badge">
        <strong>👤 {user.get('full_name', 'User')}</strong><br>
        📧 {user.get('email', 'N/A')} &nbsp;|&nbsp; 📱 {user.get('phone', 'N/A')} &nbsp;|&nbsp;
        🏷️ Role: <code>{user.get('role', 'farmer')}</code> &nbsp;|&nbsp;
        📍 {user.get('district', 'Not set')}
    </div>
    """, unsafe_allow_html=True)

    if st.button(f"🚪 {t('Logout')}", type="primary", use_container_width=True):
        st.session_state.pop("auth_token", None)
        st.session_state.pop("user", None)
        clear_session()
        st.success(t("Logged out successfully!"))
        st.rerun()

    st.divider()
    
    with st.expander(f"⚠️ {t('Danger Zone')}"):
        st.warning(t("Deleting your account is permanent. All your history, shipments, and data will be lost."))
        from utils.api_client import api_delete_account
        if st.button(f"🗑️ {t('Delete Account')}", type="primary"):
            with st.spinner("Deleting account..."):
                resp = api_delete_account()
                if resp.status_code == 200:
                    st.session_state.pop("auth_token", None)
                    st.session_state.pop("user", None)
                    clear_session()
                    st.success("Account deleted successfully.")
                    st.rerun()
                else:
                    st.error("Failed to delete account.")

    st.divider()
    st.stop()

# ── Not logged in — show auth forms ──────────────────────────────────────────
st.markdown(f"""
<div class="auth-header">
    <h1>🔐 {t('Login / Register')}</h1>
    <p>{t('Karnataka Agricultural Intelligence Platform — Secure Access Gateway')}</p>
</div>
""", unsafe_allow_html=True)

if "login_mode" not in st.session_state:
    st.session_state.login_mode = "password"

tab_login, tab_register = st.tabs([f"🔑 {t('Login')}", f"📝 {t('Sign Up')}"])

# ── LOGIN TAB ─────────────────────────────────────────────────────────────────
with tab_login:
    if st.session_state.login_mode == "password":
        st.markdown("### Sign In to Your Account")
        with st.form("login_form"):
            login_id = st.text_input("📧 Email or 📱 Phone Number", placeholder="farmer@postharvest.in or 9876543210")
            password = st.text_input("🔒 Password", type="password", placeholder="Enter your password")
            
            submit_login = st.form_submit_button("🔓 Login", type="primary", use_container_width=True)
            if submit_login:
                if not login_id or not password:
                    st.error("Please enter both your Email/Phone and password.")
                else:
                    with st.spinner("Authenticating..."):
                        resp = api_login(login_id, password)
                        if resp.status_code == 200:
                            data = resp.json()
                            st.session_state["auth_token"] = data["access_token"]
                            st.session_state["user"] = data["user"]
                            save_session(data["access_token"], data["user"])
                            st.success(f"✅ Welcome back, {data['user']['full_name']}!")
                            
                            route_user(data["user"].get("role", ""))
                        else:
                            st.error(f"❌ {resp.json().get('detail', 'Login failed.')}")
                            
        col1, col2 = st.columns(2)
        with col1:
            if st.button("📱 Login with OTP", use_container_width=True):
                st.session_state.login_mode = "otp"
                st.rerun()
        with col2:
            if st.button("❓ Forgot Password?", use_container_width=True):
                st.session_state.login_mode = "forgot_password"
                st.rerun()

    elif st.session_state.login_mode == "otp":
        st.markdown("### Login with OTP")
        otp_request_id = st.text_input("📧 Email or 📱 Phone Number", placeholder="farmer@postharvest.in or 9876543210", key="otp_request_id")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("📩 Send OTP", type="primary", use_container_width=True):
                if not otp_request_id:
                    st.error("Please enter your Email or Phone.")
                else:
                    with st.spinner("Sending OTP..."):
                        resp = api_send_otp(otp_request_id)
                        if resp.status_code == 200:
                            st.session_state.otp_login_id = otp_request_id
                            st.session_state.login_mode = "otp_input"
                            st.rerun()
                        else:
                            st.error(resp.json().get("detail", "Failed to send OTP."))
        with col2:
            if st.button("🔙 Back to Password", use_container_width=True):
                st.session_state.login_mode = "password"
                st.rerun()
                
    elif st.session_state.login_mode == "otp_input":
        st.markdown("### Enter OTP")
        st.info(f"An OTP was sent to **{st.session_state.get('otp_login_id', '')}**")
        
        otp_code = st.text_input("🔢 Enter 6-digit OTP", key="otp_code_input")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🔓 Verify & Login", type="primary", use_container_width=True):
                if not otp_code:
                    st.error("Please enter the OTP.")
                else:
                    with st.spinner("Verifying..."):
                        resp = api_verify_otp_login(st.session_state.otp_login_id, otp_code)
                        if resp.status_code == 200:
                            data = resp.json()
                            st.session_state["auth_token"] = data["access_token"]
                            st.session_state["user"] = data["user"]
                            save_session(data["access_token"], data["user"])
                            st.success("✅ Logged in successfully!")
                            
                            route_user(data["user"].get("role", ""))
                        else:
                            st.error(f"❌ {resp.json().get('detail', 'Invalid OTP.')}")
        with col2:
            if st.button("🔙 Back to Password Login", use_container_width=True):
                st.session_state.login_mode = "password"
                st.rerun()

    elif st.session_state.login_mode == "forgot_password":
        st.markdown("### Recover Your Password")
        fp_login_id = st.text_input("📧 Email or 📱 Phone Number", placeholder="farmer@postharvest.in or 9876543210", key="fp_login_id_input")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("📩 Request Reset OTP", type="primary", use_container_width=True):
                if not fp_login_id:
                    st.error("Please enter your Email or Phone.")
                else:
                    with st.spinner("Sending OTP..."):
                        resp = api_forgot_password(fp_login_id)
                        if resp.status_code == 200:
                            st.session_state.fp_login_id = fp_login_id
                            st.session_state.login_mode = "reset_input"
                            st.rerun()
                        else:
                            st.error(resp.json().get("detail", "Account not found."))
        with col2:
            if st.button("🔙 Back to Login", use_container_width=True):
                st.session_state.login_mode = "password"
                st.rerun()

    elif st.session_state.login_mode == "reset_input":
        st.markdown("### Enter Reset OTP & New Password")
        st.info(f"A password reset OTP was sent to **{st.session_state.get('fp_login_id', '')}**")
        
        fp_otp = st.text_input("🔢 Enter 6-digit OTP", key="fp_otp_input")
        fp_new_pass = st.text_input("🔒 New Password", type="password", key="fp_new_pass_input")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🔄 Reset Password", type="primary", use_container_width=True):
                if not fp_otp or not fp_new_pass:
                    st.error("Please fill in all fields.")
                else:
                    with st.spinner("Resetting password..."):
                        resp = api_reset_password(st.session_state.fp_login_id, fp_otp, fp_new_pass)
                        if resp.status_code == 200:
                            st.success("✅ Password updated successfully! You can now log in.")
                            st.session_state.login_mode = "password"
                            st.rerun()
                        else:
                            st.error(f"❌ {resp.json().get('detail', 'Failed to reset password.')}")
        with col2:
            if st.button("🔙 Cancel", use_container_width=True):
                st.session_state.login_mode = "password"
                st.rerun()

    st.divider()
    st.caption("**Demo Credentials:**")
    st.code(
        "Farmer:    farmer@postharvest.in / farmer123\n"
        "Warehouse: warehouse@postharvest.in / warehouse123\n"
        "Admin:     admin@postharvest.in / admin123",
        language=None,
    )

# ── REGISTER TAB ──────────────────────────────────────────────────────────────
with tab_register:
    st.markdown("### Create a New Account")

    reg_role = st.radio(
        "🏷️ Account Type", 
        ["farmer", "warehouse_manager"], 
        format_func=lambda x: "🧑‍🌾 Farmer" if x == "farmer" else "🏢 Warehouse Manager", 
        horizontal=True
    )

    with st.form("register_form"):
        reg_name = st.text_input("👤 Full Name", placeholder="Your full name")
        reg_phone = st.text_input("📱 Phone Number", placeholder="9876543210")
        reg_email = st.text_input("📧 Email", placeholder="your@email.com")
        reg_password = st.text_input("🔒 Password", type="password", placeholder="Min 6 characters")
        
        reg_district = None
        reg_managed_warehouse_id = None
        
        if reg_role == "farmer":
            DISTRICT_LIST = sorted([
                "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban",
                "Bidar", "Chamarajanagar", "Chikkaballapur", "Chitradurga", "Dakshina Kannada",
                "Davangere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu",
                "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
                "Tumakuru", "Udupi", "Uttara Kannada", "Vijayanagar", "Vijayapura", "Yadgir",
            ])
            reg_district = st.selectbox("📍 District", DISTRICT_LIST, index=None, placeholder="Select district")
        else:
            try:
                import requests
                wh_resp = requests.get("http://localhost:8000/api/warehouses", timeout=5)
                wh_list = wh_resp.json() if wh_resp.status_code == 200 else []
                wh_options = {w["facility_name"]: w["id"] for w in wh_list}
            except Exception:
                wh_options = {}
            
            if wh_options:
                selected_wh_name = st.selectbox("🏢 Select Your Assigned Warehouse", list(wh_options.keys()), index=None, placeholder="Select Your Assigned Warehouse")
                reg_managed_warehouse_id = wh_options.get(selected_wh_name)
            else:
                st.warning("⚠️ No warehouses available. Please ensure backend is running.")

        # OTP State Check
        otp_sent = st.session_state.get("reg_otp_sent_to") == reg_email and bool(reg_email)
        
        if otp_sent:
            st.success(f"📧 OTP sent to **{reg_email}**. Check terminal output.")
            reg_otp = st.text_input("🔢 6-Digit OTP", placeholder="123456")
            submit_label = "📝 Verify & Create Account"
        else:
            reg_otp = None
            submit_label = "📩 Send OTP to Email"

        reg_submit = st.form_submit_button(submit_label, type="primary", use_container_width=True)

        if reg_submit:
            if not all([reg_name, reg_phone, reg_email, reg_password]):
                st.error("Please fill all basic fields.")
            elif len(reg_password) < 6:
                st.error("Password must be at least 6 characters.")
            elif reg_role == "farmer" and not reg_district:
                st.error("Please select a district.")
            elif reg_role == "warehouse_manager" and not reg_managed_warehouse_id:
                st.error("Please select an assigned warehouse.")
            elif not otp_sent:
                # User clicked Send OTP
                with st.spinner("Sending OTP..."):
                    from utils.api_client import api_send_registration_otp
                    resp = api_send_registration_otp(reg_email)
                    if resp.status_code == 200:
                        st.session_state["reg_otp_sent_to"] = reg_email
                        st.rerun()
                    else:
                        st.error(f"❌ {resp.json().get('detail', 'Failed to send OTP.')}")
            else:
                # User is submitting the OTP to create the account
                if not reg_otp:
                    st.error("Please enter the 6-digit OTP.")
                else:
                    with st.spinner("Verifying OTP & Creating Account..."):
                        resp = api_register(reg_name, reg_phone, reg_email, reg_password, reg_otp, reg_role, reg_district, reg_managed_warehouse_id)
                        if resp.status_code == 201:
                            data = resp.json()
                            st.session_state["auth_token"] = data["access_token"]
                            st.session_state["user"] = data["user"]
                            save_session(data["access_token"], data["user"])
                            st.session_state.pop("reg_otp_sent_to", None)
                            st.success(f"🎉 Account created! Welcome, {data['user']['full_name']}!")
                            
                            route_user(data["user"].get("role", ""))
                        else:
                            st.error(f"❌ {resp.json().get('detail', 'Registration failed.')}")


st.divider()
st.markdown("<p class='glass-footer'>© 2026 Bangalore Institute of Technology — CSE Dept — Major Project 2023-27</p>", unsafe_allow_html=True)
