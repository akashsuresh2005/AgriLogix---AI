"""
app.py — Main Entry Gateway Dashboard
Bangalore Institute of Technology | CSE Dept | Major Project 2023-27
"""

import streamlit as st

st.set_page_config(page_title="Post-Harvest Loss AI System", page_icon="🌾", layout="wide")

from utils.ui import set_page_style
from utils.api_client import get_user_role, is_authenticated
from utils.translator import t

def home_page_logic():
    set_page_style()
    from utils.ui import render_top_bar
    render_top_bar()

    st.markdown(f'<div class="main-header"><h1>🌾 {t("AI-Driven Post-Harvest Loss Prediction with BaaS")}</h1><h3>{t("Bangalore Institute of Technology — Department of Computer Science & Engineering")}</h3></div>', unsafe_allow_html=True)

    st.markdown(f"""
    <div class="welcome-card">
        <h2>{t("Agricultural Intelligence System Platform")}</h2>
        <p>{t("This decentralized multi-tiered platform distributes machine learning biophysical forecasting, computer vision quality analysis, and real-time transit logistics evaluation within an integrated Backend-as-a-Service (BaaS) design structure.")}</p>
    </div>
    """, unsafe_allow_html=True)

    st.divider()

    col_specs, col_team = st.columns(2, gap="large")

    with col_specs:
        st.markdown(f"### 🧠 {t('Core Engineering Framework')}")
        st.info(f"""
        * **{t('Project Lifecycle')}:** {t('Batch 2023 - 2027')}
        * **{t('System Architecture Model')}:** {t('Backend-as-a-Service (BaaS) Micro-framework')}
        * **{t('Data Interception Gateway')}:** {t('FastAPI Microservice Router Endpoints')}
        * **{t('Core Applied Models')}:** {t('Tree-Structure Soft Ensembles (XGBoost + RF + GBR)')}
        """)

    with col_team:
        st.markdown(f"### 👥 {t('Operational Subsystems')}")
        st.success(f"""
        * {t('ML Pipeline & Profit Engine')}
        * {t('Deep Learning Computer Vision Systems')}
        * {t('BaaS API Gateway & Microservices Infrastructure')}
        * {t('Database Management Systems & Client Frontend UI')}
        """)

    st.divider()
    st.markdown(f"<p style='text-align: center; color: #666;'>💡 <b>{t('System Navigation Action')}:</b> {t('Expand the left sidebar menu to seamlessly step into the active 12-Feature Machine Learning Spoilage Prediction Engine module page.')}</p>", unsafe_allow_html=True)

# Determine active role
role = get_user_role() if is_authenticated() else None

# ── Dynamic Navigation ────────────────────────────────────────────────────────
if role:
    home_page = st.Page(home_page_logic, title=t("Home"), icon="🏠", default=True)
    login_page = st.Page("pages/0_🔐_Login.py", title=t("Login"), icon="🔐")
else:
    home_page = st.Page(home_page_logic, title=t("Home"), icon="🏠")
    login_page = st.Page("pages/0_🔐_Login.py", title=t("Login"), icon="🔐", default=True)

ml_pred_page = st.Page("pages/1_📊_ML_Prediction.py", title=t("ML Prediction"), icon="📊")
wh_mgr_page = st.Page("pages/2_🗄️_Warehouse_Manager.py", title=t("Warehouse Manager"), icon="🗄️")
dashboard_page = st.Page("pages/3_🧑‍🌾_Dashboard.py", title=t("Dashboard"), icon="🧑‍🌾")
history_page = st.Page("pages/4_📜_Prediction_History.py", title=t("Prediction History"), icon="📜")

# Build allowed pages
pages = [home_page, login_page]

if role == "farmer":
    pages.extend([ml_pred_page, dashboard_page, history_page])
elif role in ["warehouse_manager", "admin"]:
    pages.extend([wh_mgr_page, dashboard_page])

pg = st.navigation(pages)

pg.run()
