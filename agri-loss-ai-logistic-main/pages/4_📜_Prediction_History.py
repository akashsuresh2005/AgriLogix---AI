"""
pages/4_📜_Prediction_History.py — Full Prediction History
Paginated table with filters and trend charts.
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from utils.api_client import require_role, require_auth, api_list_predictions

st.set_page_config(page_title="Prediction History", page_icon="📜", layout="wide")
from utils.ui import set_page_style
from utils.translator import t
set_page_style()
from utils.ui import render_top_bar
render_top_bar()


# ── Auth Check ────────────────────────────────────────────────────────────────
require_role("farmer")

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="main-header">
    <h1>📜 {t('Prediction History')}</h1>
    <p>{t('Complete record of all your crop spoilage analysis runs')}</p>
</div>
""", unsafe_allow_html=True)

# ── Filters ───────────────────────────────────────────────────────────────────
CROP_LIST = ["Tomato", "Onion", "Cucumber", "Potato"]
DISTRICT_LIST = sorted([
    "Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban",
    "Bidar", "Chamarajanagar", "Chikkaballapur", "Chitradurga", "Dakshina Kannada",
    "Davangere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu",
    "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga",
    "Tumakuru", "Udupi", "Uttara Kannada", "Vijayanagar", "Vijayapura", "Yadgir",
])

col_filter1, col_filter2, col_filter3 = st.columns([1, 1, 1])

with col_filter1:
    filter_crop = st.selectbox(f"🌱 {t('Filter by Crop')}", ["All"] + CROP_LIST)
with col_filter2:
    filter_district = st.selectbox(f"📍 {t('Filter by District')}", ["All"] + DISTRICT_LIST)
with col_filter3:
    page = st.number_input(f"📄 {t('Page')}", min_value=1, value=1, step=1)

# ── Fetch Data ────────────────────────────────────────────────────────────────
crop_param = filter_crop if filter_crop != "All" else None
dist_param = filter_district if filter_district != "All" else None

try:
    resp = api_list_predictions(page=page, page_size=25, crop=crop_param, district=dist_param)
    if resp.status_code == 200:
        data = resp.json()
        predictions = data["predictions"]
        total = data["total"]
        page_size = data["page_size"]
    else:
        st.error(t("Failed to fetch prediction history."))
        predictions = []
        total = 0
        page_size = 25
except Exception as e:
    st.error(t("Could not connect to the backend API:") + f" {e}")
    st.info(t("Make sure the FastAPI server is running."))
    predictions = []
    total = 0
    page_size = 25

# ── Summary ───────────────────────────────────────────────────────────────────
total_pages = max(1, (total + page_size - 1) // page_size)
st.caption(t("Showing page") + f" {page} " + t("of") + f" {total_pages} ({total} " + t("total predictions)"))

# ── Results Table ─────────────────────────────────────────────────────────────
if predictions:
    df = pd.DataFrame(predictions)

    # Format columns
    df_display = df[[
        "crop", "district", "temperature", "humidity", "road_condition",
        "spoilage_probability", "shelf_life_days", "loss_percentage",
        "financial_loss", "risk_level", "recommended_facility", "created_at",
    ]].copy()

    df_display["spoilage_probability"] = df_display["spoilage_probability"].apply(lambda x: f"{x*100:.1f}%")
    df_display["loss_percentage"] = df_display["loss_percentage"].apply(lambda x: f"{x:.1f}%")
    df_display["financial_loss"] = df_display["financial_loss"].apply(lambda x: f"₹{x:,.0f}")
    df_display["created_at"] = df_display["created_at"].apply(lambda x: x[:16] if x else "")

    for idx, row in df.iterrows():
        risk = row.get("risk_level", "LOW")
        risk_color = "#dc3545" if risk == "HIGH" else "#ffc107" if risk == "MEDIUM" else "#28a745"
        
        spoil_pct = float(row.get("spoilage_probability", 0)) * 100
        loss_pct = float(row.get("loss_percentage", 0))
        fin_loss = float(row.get("financial_loss", 0))
        created_at = str(row.get("created_at", ""))[:19].replace("T", " ")
        pred_id = row.get("id", idx)
        if isinstance(pred_id, int):
            pred_id_str = f"PRED-{pred_id:04d}"
        else:
            pred_id_str = f"PRED-{pred_id}"
            
        
        crop_emoji = {"Tomato": "🍅", "Onion": "🧅", "Cucumber": "🥒", "Potato": "🥔"}.get(row.get('crop'), "🌾")
        
        card_html = f"""
<div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 5px; background-color: #ffffff;">
<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
<div>
<h3 style="margin-top: 0; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
{crop_emoji} {row.get('crop')}
</h3>
<div style="color: #6c757d; font-size: 0.9em;">
{t('Record ID')}: <span style="color: #28a745;">#{pred_id_str}</span> &nbsp;&nbsp;|&nbsp;&nbsp; {t('Timestamp')}: {created_at}
</div>
</div>
<div style="background-color: {risk_color}; color: white; padding: 5px 15px; border-radius: 4px; font-weight: bold; font-size: 0.85em;">
{risk} RISK
</div>
</div>
<div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 15px; font-size: 0.95em; color: #333;">
<div>
<div style="margin-bottom: 5px;"><strong>{t('Quantity')}:</strong> 10.0 {t('Tons')} &nbsp;&nbsp;|&nbsp;&nbsp; 📍 <strong>{t('District')}:</strong> {row.get('district')}</div>
<div style="margin-bottom: 5px;"><strong>{t('Quality Inspection')}:</strong> {t('AI Assessed')}</div>
<div><strong>{t('Recommended Facility')}:</strong> {row.get('recommended_facility')}</div>
</div>
<div>
<div style="margin-bottom: 5px;"><strong>{t('Spoilage Prob')}:</strong> {spoil_pct:.1f}%</div>
<div><strong>{t('Estimated Loss')}:</strong> {loss_pct:.1f}% (₹{fin_loss:,.0f})</div>
</div>
</div>
</div>
"""
        st.markdown(card_html, unsafe_allow_html=True)
        
        with st.expander(f"📄 {t('View Detailed Telemetry Snapshot')}"):
            t_col1, t_col2 = st.columns(2)
            with t_col1:
                st.markdown(f"""
                * **{t('Ambient Temp')}:** {row.get('temperature')}°C
                * **{t('Humidity')}:** {row.get('humidity')}%
                * **{t('Road Infrastructure')}:** {row.get('road_condition')}
                * **{t('Harvest Date')}:** {created_at.split(' ')[0]}
                """)
            with t_col2:
                st.markdown(f"""
                * **{t('Transit Window (Actual/Expected)')}:** 3.0 / 1.5 {t('Days')}
                * **{t('Arrival Volume')}:** 10.0 {t('Tons')}
                * **{t('Remaining Shelf Life')}:** {row.get('shelf_life_days')} {t('Days')}
                * **{t('Mandi Spot Rate')}:** ₹30.0/kg
                """)
                
            if row.get('image_data'):
                st.markdown("---")
                st.markdown(f"**{t('Uploaded Image')}**")
                
                # Check if it has the data URI scheme, if not prepend it for display (though we save it with the scheme)
                img_data_str = row['image_data']
                if not img_data_str.startswith("data:image"):
                    img_data_str = f"data:image/jpeg;base64,{img_data_str}"
                    
                st.image(img_data_str, width=300)
                
        st.write("")
    # ── Export CSV ────────────────────────────────────────────────────────────
    csv_data = df.to_csv(index=False).encode("utf-8")
    st.download_button(
        f"📥 {t('Export to CSV')}",
        csv_data,
        file_name="prediction_history.csv",
        mime="text/csv",
        use_container_width=True,
    )

    st.divider()

    # ── Trend Charts ──────────────────────────────────────────────────────────
    if len(df) >= 2:
        st.markdown(f"### 📈 {t('Spoilage Trends')}")

        chart_col1, chart_col2 = st.columns(2)

        with chart_col1:
            # Spoilage probability over time
            fig1 = go.Figure()
            fig1.add_trace(go.Scatter(
                x=list(range(len(df))),
                y=df["spoilage_probability"] * 100,
                mode="lines+markers",
                name=t("Spoilage %"),
                line=dict(color="#dc3545", width=2),
                marker=dict(size=6),
            ))
            fig1.update_layout(
                title=t("Spoilage Probability Over Predictions"),
                xaxis_title=t("Prediction #"),
                yaxis_title=t("Spoilage %"),
                height=350,
                margin=dict(l=20, r=20, t=40, b=20),
            )
            st.plotly_chart(fig1, use_container_width=True)

        with chart_col2:
            # Risk level distribution
            risk_counts = df["risk_level"].value_counts()
            
            # Map colors based on the actual labels to ensure correctness
            color_map = {"HIGH": "#dc3545", "MEDIUM": "#ffc107", "LOW": "#28a745"}
            mapped_colors = [color_map.get(label.upper(), "#333") for label in risk_counts.index.tolist()]
            
            fig2 = go.Figure(data=[go.Pie(
                labels=risk_counts.index.tolist(),
                values=risk_counts.values.tolist(),
                hole=0.4,
                marker=dict(colors=mapped_colors),
            )])
            fig2.update_layout(
                title=t("Risk Level Distribution"),
                height=350,
                margin=dict(l=20, r=20, t=40, b=20),
            )
            st.plotly_chart(fig2, use_container_width=True)

        # Financial loss by crop
        if "financial_loss" in df.columns and "crop" in df.columns:
            loss_by_crop = df.groupby("crop")["financial_loss"].sum().sort_values(ascending=False)
            fig3 = go.Figure(data=[go.Bar(
                x=loss_by_crop.index.tolist(),
                y=loss_by_crop.values.tolist(),
                marker=dict(color="#8B1A1A"),
            )])
            fig3.update_layout(
                title=t("Total Financial Loss by Crop"),
                xaxis_title=t("Crop"),
                yaxis_title=t("₹ Total Loss"),
                height=350,
                margin=dict(l=20, r=20, t=40, b=20),
            )
            st.plotly_chart(fig3, use_container_width=True)
else:
    st.info(t("No predictions found. Run some predictions on the **ML Prediction** page to see your history here."))

st.divider()
st.caption(t("© 2026 BIT Bangalore — Prediction Intelligence Analytics"))
