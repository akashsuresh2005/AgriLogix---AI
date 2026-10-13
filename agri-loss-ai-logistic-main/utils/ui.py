import streamlit as st

def set_page_style():
    """
    Injects the original simple white and red theme uniformly across all pages.
    """
    st.markdown("""
    <style>
        /* Base Streamlit App Background */
        [data-testid="stAppViewContainer"] {
            background-color: white !important;
        }
        
        /* Sidebar */
        [data-testid="stSidebar"] {
            background-color: #f8f9fa !important;
        }

        /* The Original BIT Red Theme Mapping */
        .main-header, .auth-header {
            background: #8B1A1A; 
            color: white; 
            padding: 2rem; 
            border-radius: 10px; 
            margin-bottom: 2rem; 
            text-align: center;
        }
        .main-header h1, .auth-header h1, .main-header p, .auth-header p {
            color: white !important;
        }
        .main-header h2, .auth-header h2, .main-header h3, .auth-header h3 {
            color: white !important;
        }

        .welcome-card, .auth-card {
            background: #f8f9fa; 
            border-left: 5px solid #8B1A1A; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px;
            color: black;
        }

        .stat-box, .stat-container, .agri-card, .metric-card, .env-card, .facility-card {
            background: white; 
            border: 1px solid #ddd; 
            padding: 15px; 
            border-radius: 6px; 
            text-align: center; 
            box-shadow: 1px 1px 4px rgba(0,0,0,0.05);
            margin-bottom: 15px;
            color: black;
        }

        .user-badge {
            background: white;
            border: 1px solid #ddd;
            border-left: 5px solid #8B1A1A;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            color: black;
        }

        .stat-val, .metric-val {
            font-size: 24px;
            font-weight: bold;
            color: #8B1A1A !important;
        }

        .stat-lbl, .metric-lbl {
            font-size: 14px;
            color: #666 !important;
        }
        
        .panel-title {
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 10px;
            color: #8B1A1A !important;
        }
        
        /* General styling for generic divs using old classes */
        .panel-body {
            color: #333 !important;
            font-size: 14px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # ── Native Language Selector ──
    from utils.translator import render_language_selector
    render_language_selector()

def render_top_bar():
    """Renders a top-right logout button across all pages if authenticated."""
    from utils.api_client import is_authenticated, clear_session
    from utils.translator import t
    
    if is_authenticated():
        # Create columns to push the logout button to the far right
        col_spacer, col_logout = st.columns([8, 1])
        with col_logout:
            if st.button(f"🚪 {t('Logout')}", key="global_logout_btn"):
                st.session_state.pop("auth_token", None)
                st.session_state.pop("user", None)
                clear_session()
                st.rerun()
