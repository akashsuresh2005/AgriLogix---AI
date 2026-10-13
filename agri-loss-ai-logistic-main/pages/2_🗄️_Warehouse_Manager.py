"""
pages/2_🗄️_Warehouse_Manager.py — Warehouse Operations & Infrastructure Control Portal
"""

import streamlit as st
import pandas as pd
from utils.api_client import (
    require_role, 
    api_list_warehouses, 
    api_update_warehouse, 
    api_list_active_shipments,
    api_list_shipments,
    api_inspect_shipment,
    api_dispatch_shipment
)

st.set_page_config(page_title="Warehouse Manager", page_icon="🗄️", layout="wide")
from utils.ui import set_page_style
from utils.translator import t
set_page_style()
from utils.ui import render_top_bar
render_top_bar()


# ── Auth & Role Check ─────────────────────────────────────────────────────────
require_role("warehouse_manager")

st.markdown(f'<div class="main-header"><h1>🗄️ {t("Cold Storage Infrastructure & Operations Management")}</h1><p>{t("BaaS Administrative Control Unit")}</p></div>', unsafe_allow_html=True)

# ── Fetch Data ────────────────────────────────────────────────────────────────
try:
    wh_resp = api_list_warehouses()
    if wh_resp.status_code == 200:
        warehouses = wh_resp.json()
    else:
        st.error("Failed to load warehouses.")
        st.stop()
except Exception as e:
    st.error(f"Could not connect to the backend API: {e}")
    st.stop()

if not warehouses:
    st.warning("No warehouse facilities found in the database.")
    st.stop()

user = st.session_state.get("user", {})
if user.get("role") == "admin":
    wh_names = [w["facility_name"] for w in warehouses]
    
    if "admin_selected_warehouse" not in st.session_state and wh_names:
        st.session_state["admin_selected_warehouse"] = wh_names[0]
        
    try:
        default_idx = wh_names.index(st.session_state.get("admin_selected_warehouse", ""))
    except ValueError:
        default_idx = 0
        
    selected_name = st.selectbox(
        t("Select Managing Warehouse Node"), 
        wh_names, 
        index=default_idx if wh_names else 0,
        key="wh_admin_select"
    )
    st.session_state["admin_selected_warehouse"] = selected_name
    selected_wh = next((w for w in warehouses if w["facility_name"] == selected_name), None)
else:
    selected_wh = next((w for w in warehouses if w.get("manager_id") == user.get("id")), None)
    if not selected_wh:
        st.error(t("No warehouse is assigned to your account. Please contact an admin."))
        st.stop()
    selected_name = selected_wh["facility_name"]
    st.info(f"🏢 **{t('Assigned Warehouse Node')}:** {selected_name}")

st.divider()

# ── 🚨 COLD CHAIN FAULT MONITORING ───────────────────────────────────────────
st.markdown(f"## 🚨 {t('Cold Chain Cold Room Temperature Monitor')}")
col_alert1, col_alert2 = st.columns([1, 2])

with col_alert1:
    st.markdown('<div class="panel-box">', unsafe_allow_html=True)
    st.markdown(f"### ⚡ {t('Temperature Controller')}")
    simulate_fault = st.toggle(
        f"🚨 {t('Simulate Cooling Plant Malfunction')}", 
        value=st.session_state.get("simulate_fault", False),
        help=t("Simulates a localized HVAC compressor trip, spiking internal storage temps.")
    )
    st.session_state["simulate_fault"] = simulate_fault
    st.markdown('</div>', unsafe_allow_html=True)

with col_alert2:
    if simulate_fault:
        st.markdown(f"""
        <div class="alert-critical">
        <h4>⚠️ {t("CRITICAL ALERT: Warehouse Cooling Failure Detected")}</h4>
        <p>{t("Internal storage room temperatures have drifted from 4.0°C up to")} <b>14.5°C</b>.
        {t("According to the biophysical")} <b>{t("Q10 Respiration Formula")}</b>, {t("crop decay rates have accelerated by")} <b>2.8x</b>.
        {t("The system has put an emergency holding block on incoming perishable loads to prevent immediate rot.")}</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.success(t("✅ Refrigeration systems operating normally. Storage vault temperature stable at a safe 4.0°C baseline."))

st.divider()



# ── 🛠️ FACILITY MANAGEMENT ───────────────────────────────────────────────────
col_left, col_right = st.columns([1, 1], gap="large")

with col_left:
    st.markdown(f"### 🏢 {t('Facility Capacity & Rental Configuration')}")

    if selected_wh:
        st.markdown(f"**{t('District Location')}:** {selected_wh['district']} | **{t('GPS Coordinates')}:** {selected_wh['latitude']:.4f}, {selected_wh['longitude']:.4f}")

        st.markdown('<div class="panel-box">', unsafe_allow_html=True)
        new_capacity = st.number_input(t("Total Storage Quantity (Tons)"), min_value=1.0, value=float(selected_wh.get('capacity_mt', 5000)), step=100.0)
        new_occupancy = st.slider(t("Live Warehouse Storage Space Filled (%)"), min_value=0.0, max_value=100.0, value=float(selected_wh['occupancy_pct']), step=0.1)
        new_rent = st.number_input(t("Storage Rent Price (₹ / Ton / Day)"), min_value=50.0, max_value=500.0, value=float(selected_wh['price_per_ton_day']), step=10.0)

        actual_storage_quantity = new_capacity * (new_occupancy / 100.0)
        st.info(f"**Actual Storage Quantity Filled:** {actual_storage_quantity:.1f} Tons")

        if new_occupancy >= 95.0:
            st.error(t("🔴 **WAREHOUSE CAPACITY FULL:** Farmers cannot route new crop dispatches here until space clears up."))
        elif new_occupancy >= 75.0:
            st.warning(t("🟡 **HIGH OCCUPANCY NOTICE:** Storage space filling up fast. Consider adjusting rental pricing buffers."))

        if st.button(f"💾 {t('COMMIT WAREHOUSE MATRIX TO DATABASE')}", type="primary", use_container_width=True):
            payload = {
                "occupancy_pct": new_occupancy,
                "price_per_ton_day": new_rent,
                "base_temp_c": 14.5 if simulate_fault else 4.0,
                "capacity_mt": int(new_capacity)
            }
            resp = api_update_warehouse(selected_wh["id"], payload)
            if resp.status_code == 200:
                try:
                    from pathlib import Path
                    CS_CSV_PATH = Path("cold_storage_karnataka.csv")
                    if CS_CSV_PATH.exists():
                        df_cs = pd.read_csv(CS_CSV_PATH)
                        mask = df_cs['facility_name'] == selected_name
                        if mask.any():
                            df_cs.loc[mask, 'occupancy_pct'] = new_occupancy
                            df_cs.loc[mask, 'price_per_ton_day'] = new_rent
                            df_cs.loc[mask, 'capacity_mt'] = new_capacity
                            df_cs.to_csv(CS_CSV_PATH, index=False)
                except Exception as e:
                    pass
                st.success(t("🎉 Database Synced! Successfully updated metrics for") + f" {selected_name}.")
                st.rerun()
            else:
                st.error(t("Failed to update warehouse."))
        st.markdown('</div>', unsafe_allow_html=True)

with col_right:
    st.markdown(f"### 📊 {t('Regional Cold Storage Capacity Database')}")
    df_wh = pd.DataFrame(warehouses)
    df_wh['occupancy_pct'] = df_wh['occupancy_pct'].map('{:.1f}%'.format)
    df_wh['price_per_ton_day'] = df_wh['price_per_ton_day'].map('₹{:.0f}/ton'.format)

    st.dataframe(
        df_wh[['facility_name', 'district', 'occupancy_pct', 'price_per_ton_day']],
        use_container_width=True, hide_index=True, height=275
    )

st.divider()

# ── 🚚 INBOUND LOGISTICS QUEUE & INSPECTION ──────────────────────────────────
col_queue, col_inspect = st.columns([4, 3], gap="large")

# Fetch active shipments for this facility
try:
    ship_resp = api_list_active_shipments(destination=selected_name)
    active_shipments = ship_resp.json() if ship_resp.status_code == 200 else []
except Exception:
    active_shipments = []

with col_queue:
    st.markdown(f'<div class="feature-hdr">🚚 {t("Arriving Farmer Vehicles Queue")}</div>', unsafe_allow_html=True)

    if active_shipments:
        df_shipments = pd.DataFrame(active_shipments)
        col_mappings = {
            "booking_id": t("Vehicle ID"),
            "crop": t("Crop Type"),
            "tonnage": t("Weight (Tons)"),
            "route_quality": t("Road Infrastructure"),
            "eta_hours": t("Estimated Arrival"),
            "risk_status": t("AI Spoilage Risk")
        }
        available_cols = [c for c in col_mappings.keys() if c in df_shipments.columns]
        df_display = df_shipments[available_cols].rename(columns=col_mappings)
        
        def style_risk(val):
            if "HIGH" in str(val): return "color: red; font-weight: bold;"
            elif "MEDIUM" in str(val): return "color: orange; font-weight: bold;"
            return "color: green; font-weight: bold;"

        risk_col = col_mappings.get("risk_status", "risk_status")
        if risk_col in df_display.columns:
            st.dataframe(
                df_display.style.map(style_risk, subset=[risk_col]),
                use_container_width=True, hide_index=True, height=230
            )
        else:
            st.dataframe(
                df_display,
                use_container_width=True, hide_index=True, height=230
            )
    else:
        st.info(t("ℹ️ No active farmer vehicles are currently traveling toward") + f" **{selected_name}**.")

with col_inspect:
    st.markdown(f'<div class="feature-hdr">🔬 {t("Quality Gate Arrival Inspection")}</div>', unsafe_allow_html=True)
    st.markdown('<div class="panel-box">', unsafe_allow_html=True)
    
    vehicle_ids = [s["booking_id"] for s in active_shipments]
    
    if vehicle_ids:
        inspect_vid = st.selectbox(t("Select Arrived Vehicle"), vehicle_ids)
        target_shipment = next((s for s in active_shipments if s["booking_id"] == inspect_vid), None)
        
        c_date = st.date_input(t("Actual Arrival Date"))
        actual_temp = st.number_input(t("Sensor Recorded Transit Temp (°C)"), value=10.0)
        
        st.markdown(f"**{t('Declared Crop')}:** {target_shipment['crop']} | **{t('Declared Weight')}:** {target_shipment['tonnage']} {t('Tons')}")
        
        c1, c2 = st.columns(2)
        with c1:
            bruising = st.selectbox(t("Bruising Assessment"), [t("None"), t("Slight"), t("Severe")])
        with c2:
            ripeness = st.selectbox(t("Ripeness Stage"), [t("Unripe"), t("Optimal Balance"), t("Overripe / Soft")])
        
        if st.button(f"✅ {t('Log Inspection & Accept to Vault')}", type="primary", use_container_width=True):
            payload = {
                "shipment_booking_id": inspect_vid,
                "bruising": bruising,
                "ripeness": ripeness,
                "core_temp": actual_temp
            }
            resp = api_inspect_shipment(selected_wh["id"], payload)
            if resp.status_code in [200, 201]:
                st.success(t("Inspection logged. Vehicle") + f" {inspect_vid} " + t("docked successfully."))
                st.rerun()
            else:
                st.error(t("Failed to log inspection. Status:") + f" {resp.status_code}")
    else:
        st.warning(t("No vehicles available for inspection."))
    st.markdown('</div>', unsafe_allow_html=True)

st.divider()

# ── ⏳ SPOILAGE RISK MANAGEMENT & DISPATCH ──────────
st.markdown(f"## ⏳ {t('Spoilage Risk Management & Dispatch')}")
col_fifo, col_mandi = st.columns([1, 1], gap="large")

# Mock industrial buyers registry
df_industrial_buyers = pd.DataFrame([
    {"buyer_name": "ITC Agro (Davanagere Hub)", "target_crop": "Hybrid Tomato", "processing_type": "Tomato Paste & Ketchup Base"},
    {"buyer_name": "Kisan Food Processing (Mysore)", "target_crop": "Capsicum (Green)", "processing_type": "Dehydrated Spices / Pickling"},
    {"buyer_name": "Regional Agro-Processing Cooperative Hub", "target_crop": "Onion", "processing_type": "Standard Food Preservation & Salvage Lines"},
])

try:
    all_ship_resp = api_list_shipments(destination=selected_name)
    all_shipments = all_ship_resp.json() if all_ship_resp.status_code == 200 else []
    
    inventory = [
        s for s in all_shipments 
        if s["status"] in [
            'In Storage', 
            'Listed (Standard Mandi)', 
            'Listed (Accelerated)', 
            'Awaiting Buyer Pickup Confirmation',
            'Redirected'
        ]
    ]
    
    for s in inventory:
        base_shelf = float(s['shelf_days_calculated'])
        hr = max(1.0, base_shelf * 24.0)
        if simulate_fault:
            hr = hr / 2.8
        s['computed_hours_remaining'] = hr
        
    def risk_sort_key(s):
        risk = s.get('risk_status', '')
        if 'HIGH' in risk: return 0
        if 'MEDIUM' in risk: return 1
        return 2

    inventory = sorted(inventory, key=lambda x: (risk_sort_key(x), x['computed_hours_remaining']))
except Exception:
    inventory = []

if inventory:
    for s in inventory:
        hours_remaining = s['computed_hours_remaining']
        
        risk_level = str(s.get('risk_status', '')).upper()
        is_high_risk = "HIGH" in risk_level
        is_med_risk = "MEDIUM" in risk_level
        is_low_risk = "LOW" in risk_level
        
        card_border = "#dc3545" if is_high_risk else "#ffc107" if is_med_risk else "#28a745"
        bg_color = "#fff5f5" if is_high_risk else "#fffdf5" if is_med_risk else "#f5fff5"
        
        with st.container():
            st.markdown(f"""
            <div style="
                border-left: 6px solid {card_border}; 
                border-radius: 12px; 
                padding: 20px; 
                margin-bottom: 20px; 
                background: linear-gradient(145deg, {bg_color}, #ffffff); 
                color: #2c3e50; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.06);
                transition: transform 0.2s ease-in-out;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px; font-family: 'Inter', sans-serif; font-size: 1.3rem;">
                        <span style="background: #f8f9fa; padding: 6px 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">📦 Batch #{s['booking_id']}</span> 
                        <span style="
                            font-size: 0.8rem; 
                            padding: 4px 10px; 
                            border-radius: 20px; 
                            background-color: {card_border}; 
                            color: white; 
                            font-weight: 600;
                            letter-spacing: 0.5px;
                            box-shadow: 0 2px 5px {card_border}80;
                        ">{s['risk_status']}</span>
                    </h3>
                    <div style="font-size: 1.15rem; font-weight: 700; color: {card_border}; display: flex; align-items: center; gap: 6px;">
                        ⏳ <span style="background: rgba(255,255,255,0.8); padding: 4px 10px; border-radius: 6px;">{hours_remaining:.1f} Hours</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 1rem; color: #495057;">
                    <div style="background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 8px;"><strong>🌾 Crop:</strong> <span style="color: #2b2b2b;">{s['crop']}</span></div>
                    <div style="background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 8px;"><strong>⚖️ Tonnage:</strong> <span style="color: #2b2b2b;">{s['tonnage']} Tons</span></div>
                    <div style="background: rgba(255,255,255,0.6); padding: 8px 12px; border-radius: 8px;"><strong>📍 Status:</strong> <span style="color: #2b2b2b;">{s['status']}</span></div>
                </div>
            </div>
            """, unsafe_allow_html=True)
            
            c_empty, c_act1, c_act2 = st.columns([2, 1, 1])
            
            if is_high_risk and s['status'] == 'In Storage':
                current_crop_type = str(s['crop']).strip()
                matching_rows = df_industrial_buyers[df_industrial_buyers['target_crop'].str.strip() == current_crop_type]
                factory_match = matching_rows.iloc[0]['buyer_name'] if not matching_rows.empty else "Regional Agro-Processing Cooperative Hub"
                
                with c_empty:
                    st.error(f"🚨 URGENT: Auto-routing to {factory_match} to prevent total loss.")
                with c_act2:
                    if st.button("✉️ Alert & Dispatch", key=f"email_{s['booking_id']}", use_container_width=True, type="primary"):
                        from utils.api_client import api_dispatch_shipment
                        resp = api_dispatch_shipment(selected_wh["id"], s['id'], action="factory")
                        if resp.status_code == 200:
                            st.success(t("Dispatch triggered successfully. Email alerts have been sent."))
                            st.rerun()
                        else:
                            st.error(t("Failed to dispatch shipment."))
                            
            elif s['status'] == 'In Storage' and s['risk_status'] == 'MEDIUM RISK':
                with c_empty:
                    st.warning(f"⚠️ Batch is degrading. Consider accelerated listing.")
                with c_act1:
                    if st.button("✅ Safely Store", key=f"keep_{s['booking_id']}", use_container_width=True):
                        st.success(f"Shipment {s['booking_id']} maintained in storage.")
                with c_act2:
                    if st.button("⚡ Accelerated List", key=f"med_{s['booking_id']}", use_container_width=True, type="primary"):
                        from utils.api_client import api_update_shipment
                        api_update_shipment(s['id'], {"status": "Listed (Accelerated)"})
                        st.success(t("Listed successfully."))
                        st.rerun()
                        
            elif s['status'] == 'In Storage' and s['risk_status'] == 'LOW RISK':
                with c_empty:
                    st.success(f"✅ Batch is stable and safely stored.")
                with c_act1:
                    if st.button("✅ Log Stored", key=f"keep_{s['booking_id']}", use_container_width=True):
                        st.success(f"Shipment {s['booking_id']} maintained in storage.")
                with c_act2:
                    if st.button("🛒 Standard List", key=f"low_{s['booking_id']}", use_container_width=True):
                        from utils.api_client import api_update_shipment
                        api_update_shipment(s['id'], {"status": "Listed (Standard Mandi)"})
                        st.success(t("Listed successfully."))
                        st.rerun()
                        
            elif str(s['status']).startswith('Listed'):
                with c_empty:
                    st.info(f"📢 Active in Market: {s['status']}")
                        
            elif s['status'] == 'Awaiting Buyer Pickup Confirmation':
                with c_empty:
                    st.info(f"⏳ Waiting for buyer pickup confirmation.")
                with c_act2:
                    if st.button("✅ Force Release", key=f"release_{s['booking_id']}", use_container_width=True):
                        from utils.api_client import api_update_shipment
                        api_update_shipment(s['id'], {"status": "Redirected", "risk_status": "CLEARED"})
                        st.success(t("Shipment released."))
                        st.rerun()
            elif s['status'] == 'Redirected':
                with c_empty:
                    st.info(f"➡️ Shipment diverted to processing pipeline.")
            
            st.write("") # Spacer
else:
    st.info(t("No inventory available."))

st.divider()

# ── 🚚 ACTIVE SHIPMENTS IN MARKET ───────────────────────────────────────────
st.markdown(f"### 🚚 {t('Active Shipments (Market & Factory)')}")

if all_shipments:
    market_shipments = [s for s in all_shipments if s["status"] in ['Listed (Standard Mandi)', 'Listed (Accelerated)', 'Awaiting Buyer Pickup Confirmation', 'Redirected']]
    if market_shipments:
        df_market = pd.DataFrame(market_shipments)
        st.dataframe(
            df_market[["booking_id", "crop", "tonnage", "risk_status", "status"]].rename(columns={
                "booking_id": t("Vehicle ID"),
                "crop": t("Crop"),
                "tonnage": t("Tons"),
                "risk_status": t("Risk"),
                "status": t("Status"),
            }),
            use_container_width=True,
            hide_index=True,
        )
    else:
        st.info(t("No active shipments in the market."))
else:
    st.info(t("No active shipments in the market."))

st.divider()

# ── 📚 LOGS & HISTORY ────────────────────────────────────────────────────────
st.markdown(f"### 📚 {t('Shipment Logs & History')}")

if all_shipments:
    df_history = pd.DataFrame(all_shipments)
    df_history = df_history.sort_values(by="id", ascending=False)
    
    display_cols = ["booking_id", "crop", "tonnage", "status", "risk_status", "eta_hours"]
    available_cols = [c for c in display_cols if c in df_history.columns]
    
    st.dataframe(
        df_history[available_cols].rename(columns={
            "booking_id": t("Vehicle ID"),
            "crop": t("Crop"),
            "tonnage": t("Tons"),
            "status": t("Status"),
            "risk_status": t("Risk"),
            "eta_hours": t("ETA"),
        }),
        use_container_width=True,
        hide_index=True,
    )
else:
    st.info(t("No history logs available."))

st.divider()
st.caption(t("© 2026 BIT Bangalore — Smart Warehouse Infrastructure"))
