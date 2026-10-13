"""
pages/3_🧑‍🌾_Farmer_Dashboard.py — Farmer Portal
Account details, active shipments, prediction stats, market form.
"""

import streamlit as st
import pandas as pd
from utils.api_client import (
    require_auth, api_farmer_dashboard, api_update_profile,
    api_list_notifications, api_mark_all_read, api_unread_count,
    is_authenticated, get_user_role,
)

st.set_page_config(page_title="Dashboard", page_icon="🧑‍🌾", layout="wide")
from utils.ui import set_page_style
from utils.translator import t
set_page_style()
from utils.ui import render_top_bar
render_top_bar()


# ── Auth Check ────────────────────────────────────────────────────────────────
require_auth()

# ── Header ────────────────────────────────────────────────────────────────────
user = st.session_state.get("user", {})
role = user.get("role")
if role == "admin":
    role_title = t("Admin")
elif role == "warehouse_manager":
    role_title = t("Warehouse Manager")
else:
    role_title = t("Farmer")
st.markdown(f"""
<div class="main-header">
    <h1>🧑‍🌾 {role_title} {t('Dashboard')}</h1>
    <p>{t('Welcome')}, {user.get('full_name', role_title)} — {user.get('district', 'Karnataka')}</p>
</div>
""", unsafe_allow_html=True)

# ── Load dashboard data ──────────────────────────────────────────────────────
try:
    resp = api_farmer_dashboard()
    if resp.status_code == 200:
        dashboard = resp.json()
    else:
        st.error(t("Failed to load dashboard data. Is the backend running?"))
        st.stop()
except Exception as e:
    st.error(t("Could not connect to the backend API") + f": {e}")
    st.info(t("Make sure the FastAPI server is running") + ": `uvicorn backend.main:app --reload --port 8000`")
    st.stop()

# ── KPI Stats ─────────────────────────────────────────────────────────────────
if user.get("role") not in ["warehouse_manager", "admin"]:
    st.markdown(f"### 📊 {t('Your Farm Analytics')}")
    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-val">{dashboard['total_predictions']}</div>
            <div class="stat-lbl">{t('Total Predictions')}</div>
        </div>
        """, unsafe_allow_html=True)

    with c2:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-val">{dashboard['total_shipments']}</div>
            <div class="stat-lbl">{t('Total Shipments')}</div>
        </div>
        """, unsafe_allow_html=True)

    with c3:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-val">{dashboard['total_tons_shipped']:.1f}</div>
            <div class="stat-lbl">{t('Tons Shipped')}</div>
        </div>
        """, unsafe_allow_html=True)

    with c4:
        spoilage_color = "#dc3545" if dashboard['avg_spoilage_rate'] > 60 else "#fd7e14" if dashboard['avg_spoilage_rate'] > 30 else "#28a745"
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-val" style="color: {spoilage_color}">{dashboard['avg_spoilage_rate']:.1f}%</div>
            <div class="stat-lbl">{t('Avg Spoilage Rate')}</div>
        </div>
        """, unsafe_allow_html=True)

    st.divider()
else:
    st.markdown(f"### 📊 {t('Manager Analytics')}")
    from utils.api_client import api_list_shipments, api_list_warehouses
    try:
        wh_resp = api_list_warehouses()
        wh_list = wh_resp.json() if wh_resp.status_code == 200 else []
        
        if user.get("role") == "admin":
            wh_names = [w["facility_name"] for w in wh_list]
            # Use session state to remember admin's choice across pages
            if "admin_selected_warehouse" not in st.session_state and wh_names:
                st.session_state["admin_selected_warehouse"] = wh_names[0]
            
            # Find the index of the previously selected warehouse
            try:
                default_idx = wh_names.index(st.session_state.get("admin_selected_warehouse", ""))
            except ValueError:
                default_idx = 0
                
            selected_name = st.selectbox(
                t("Select Managing Warehouse Node"), 
                wh_names, 
                index=default_idx if wh_names else 0,
                key="dashboard_admin_wh_select"
            )
            st.session_state["admin_selected_warehouse"] = selected_name
        else:
            selected_wh = next((w for w in wh_list if w.get("manager_id") == user.get("id")), None)
            selected_name = selected_wh["facility_name"] if selected_wh else None

        all_ship_resp = api_list_shipments(destination=selected_name) if selected_name else api_list_shipments()
        all_shipments = all_ship_resp.json() if all_ship_resp.status_code == 200 else []
    except Exception:
        all_shipments = []

    in_storage_count = sum(1 for s in all_shipments if s.get("status") == "In Storage")
    in_transit_count = sum(1 for s in all_shipments if s.get("status") == "In Transit")
    dispatched_count = sum(1 for s in all_shipments if s.get("status") in ["Listed (Standard Mandi)", "Listed (Accelerated)", "Redirected"])
    
    simulate_fault = st.session_state.get("simulate_fault", False)
    refrig_status = "⚠️ FAULT" if simulate_fault else "✅ NORMAL"
    refrig_color = "#dc3545" if simulate_fault else "#28a745"

    c1, c2, c3, c4 = st.columns(4)

    with c1:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-val" style="color: {refrig_color}">{refrig_status}</div>
            <div class="stat-lbl">⚡ {t('Refrigeration')}</div>
        </div>
        """, unsafe_allow_html=True)

    with c2:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-val">{in_storage_count}</div>
            <div class="stat-lbl">📦 {t('In Storage (Vault)')}</div>
        </div>
        """, unsafe_allow_html=True)

    with c3:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-val">{in_transit_count}</div>
            <div class="stat-lbl">🔬 {t('Pending Inspection')}</div>
        </div>
        """, unsafe_allow_html=True)

    with c4:
        st.markdown(f"""
        <div class="stat-card">
            <div class="stat-val">{dispatched_count}</div>
            <div class="stat-lbl">🚚 {t('Dispatched/Shipped')}</div>
        </div>
        """, unsafe_allow_html=True)

    st.divider()

# ── Two column layout: Profile + Notifications ───────────────────────────────
col_profile, col_notif = st.columns([1, 1], gap="large")

# ── Account Details ───────────────────────────────────────────────────────────
with col_profile:
    st.markdown(f"### 👤 {t('Account Details')}")
    st.markdown('<div class="profile-card">', unsafe_allow_html=True)

    with st.form("profile_form"):
        edit_name = st.text_input(t("Full Name"), value=user.get("full_name", ""))
        edit_phone = st.text_input(t("Phone Number"), value=user.get("phone", ""))
        edit_email = st.text_input(t("Email (read-only)"), value=user.get("email", ""), disabled=True)
        edit_role = st.text_input(t("Role (read-only)"), value=user.get("role", "farmer"), disabled=True)

        DISTRICT_LIST = sorted([
            "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban",
            "Bidar", "Chamarajanagar", "Chikkaballapur", "Chitradurga", "Dakshina Kannada",
            "Davangere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu",
            "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
            "Tumakuru", "Udupi", "Uttara Kannada", "Vijayanagar", "Vijayapura", "Yadgir",
        ])
        current_dist = user.get("district", "Kolar")
        dist_idx = DISTRICT_LIST.index(current_dist) if current_dist in DISTRICT_LIST else 0
        edit_district = st.selectbox(t("District"), DISTRICT_LIST, index=dist_idx)

        save_btn = st.form_submit_button(f"💾 {t('Update Profile')}", type="primary", use_container_width=True)

        if save_btn:
            with st.spinner("Updating..."):
                resp = api_update_profile(
                    full_name=edit_name,
                    phone=edit_phone,
                    district=edit_district,
                )
                if resp.status_code == 200:
                    updated_user = resp.json()
                    st.session_state["user"] = updated_user
                    st.success(t("✅ Profile updated!"))
                    st.rerun()
                else:
                    st.error(t("Failed to update profile."))

    st.markdown("</div>", unsafe_allow_html=True)

# ── Notifications ─────────────────────────────────────────────────────────────
with col_notif:
    unread = api_unread_count()
    st.markdown(f"### 🔔 {t('Notifications')} {'🔴' if unread > 0 else ''}")

    if unread > 0:
        st.warning(t("You have") + f" **{unread}** " + t("unread notification(s)."))
        if st.button(f"✅ {t('Mark All as Read')}", use_container_width=True):
            api_mark_all_read()
            st.rerun()

    try:
        notif_resp = api_list_notifications()
        if notif_resp.status_code == 200:
            notifications = notif_resp.json()
            if notifications:
                for notif in notifications[:15]:
                    border_class = "notif-unread" if not notif["is_read"] else ""
                    icon = "🟢" if notif["is_read"] else "🔵"
                    st.markdown(f"""
                    <div class="notif-item {border_class}">
                        {icon} <strong>{notif['title']}</strong><br>
                        <small style="color: #666;">{notif['message']}</small><br>
                        <small style="color: #999;">{notif['created_at'][:16]}</small>
                    </div>
                    """, unsafe_allow_html=True)
            else:
                st.info(t("No notifications yet. Predictions and shipment updates will appear here."))
    except Exception:
        st.info(t("No notifications available."))

st.divider()

if user.get("role") not in ["warehouse_manager", "admin"]:
    # ── Active Shipments Table ────────────────────────────────────────────────────
    st.markdown(f"### 🚚 {t('Active Shipments')}")
    
    active_shipments = dashboard.get("active_shipments", [])
    if active_shipments:
        df_shipments = pd.DataFrame(active_shipments)
        display_cols = ["booking_id", "crop", "tonnage", "destination", "risk_status", "status", "eta_hours"]
            
        available_cols = [c for c in display_cols if c in df_shipments.columns]
        st.dataframe(
            df_shipments[available_cols].rename(columns={
                "booking_id": t("Vehicle ID"),
                "crop": t("Crop"),
                "tonnage": t("Tons"),
                "destination": t("Destination"),
                "risk_status": t("Risk"),
                "status": t("Status"),
                "eta_hours": t("ETA"),
            }),
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info(t("No active shipments."))
    
    st.divider()

if user.get("role") not in ["warehouse_manager", "admin"]:
    # ── Recent Predictions ────────────────────────────────────────────────────────
    st.markdown(f"### 📈 {t('Recent Predictions')}")

    recent_preds = dashboard.get("recent_predictions", [])
    if recent_preds:
        df_preds = pd.DataFrame(recent_preds)
        display_cols = ["crop", "district", "spoilage_probability", "shelf_life_days", "loss_percentage", "financial_loss", "risk_level", "created_at"]
        available_cols = [c for c in display_cols if c in df_preds.columns]
        df_display = df_preds[available_cols].copy()

        if "spoilage_probability" in df_display.columns:
            df_display["spoilage_probability"] = df_display["spoilage_probability"].apply(lambda x: f"{x*100:.1f}%")
        if "loss_percentage" in df_display.columns:
            df_display["loss_percentage"] = df_display["loss_percentage"].apply(lambda x: f"{x:.1f}%")
        if "financial_loss" in df_display.columns:
            df_display["financial_loss"] = df_display["financial_loss"].apply(lambda x: f"₹{x:,.0f}")
        if "created_at" in df_display.columns:
            df_display["created_at"] = df_display["created_at"].apply(lambda x: x[:16] if x else "")

        st.dataframe(
            df_display.rename(columns={
                "crop": t("Crop"),
                "district": t("District"),
                "spoilage_probability": t("Spoilage %"),
                "shelf_life_days": t("Shelf Life (Days)"),
                "loss_percentage": t("Loss %"),
                "financial_loss": t("Financial Loss"),
                "risk_level": t("Risk"),
                "created_at": t("Date"),
            }),
            use_container_width=True,
            hide_index=True,
        )
        st.info(t("View full history on the Prediction History page."))
    else:
        st.info(t("No predictions yet. Go to the ML Prediction page to analyze your first crop batch."))

    st.divider()
st.caption(t("© 2026 BIT Bangalore — Farmer Intelligence Portal"))
