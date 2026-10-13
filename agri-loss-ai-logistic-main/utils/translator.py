"""
utils/translator.py — Native Translation Engine
Provides seamless Kannada/Hindi translation that looks like a native feature.
Uses deep-translator (free Google Translate wrapper) with aggressive caching.
"""

import streamlit as st
from deep_translator import GoogleTranslator
import hashlib
import json
import os

# Cache file for persistent translations across restarts
CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".translation_cache.json")

def _load_cache():
    """Load persistent translation cache from disk."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def _save_cache(cache):
    """Save translation cache to disk."""
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def _get_cache():
    """Get or initialize the translation cache in session state."""
    if "translation_cache" not in st.session_state:
        st.session_state.translation_cache = _load_cache()
    return st.session_state.translation_cache

def get_lang():
    """Get the currently selected language code."""
    if "lang" in st.query_params:
        q_lang = st.query_params["lang"]
        if q_lang in ["en", "kn", "hi"]:
            st.session_state["app_language"] = q_lang
            return q_lang
            
    return st.session_state.get("app_language", "en")

def set_lang(lang_code):
    """Set the app language."""
    st.session_state["app_language"] = lang_code
    st.query_params["lang"] = lang_code

def translate_text(text, target_lang):
    """Translate a single string, with caching."""
    if not text or not text.strip():
        return text
    if target_lang == "en":
        return text
    
    cache = _get_cache()
    cache_key = f"{target_lang}:{hashlib.md5(text.encode()).hexdigest()}"
    
    if cache_key in cache:
        return cache[cache_key]
    
    try:
        translated = GoogleTranslator(source='en', target=target_lang).translate(text)
        if translated:
            cache[cache_key] = translated
            _save_cache(cache)
            return translated
    except Exception as e:
        # Silently fall back to English on any error
        pass
    
    return text

def t(text):
    """
    Main translation function. Call this around any user-visible string.
    Usage: t("Hello World") -> returns translated string based on current language.
    """
    lang = get_lang()
    if lang == "en":
        return text
    return translate_text(text, lang)

def render_language_selector():
    """
    Render a clean, native-looking language selector in the sidebar.
    Returns True if language was changed (so caller can rerun).
    """
    st.sidebar.divider()
    
    lang_options = {
        "en": "🇬🇧 English",
        "kn": "🇮🇳 ಕನ್ನಡ (Kannada)", 
        "hi": "🇮🇳 हिन्दी (Hindi)"
    }
    
    current_lang = get_lang()
    current_index = list(lang_options.keys()).index(current_lang) if current_lang in lang_options else 0
    
    selected_label = st.sidebar.selectbox(
        "🌐 Language / ಭಾಷೆ / भाषा",
        options=list(lang_options.values()),
        index=current_index,
        key="lang_selector_widget"
    )
    
    # Reverse map label -> code
    selected_code = [k for k, v in lang_options.items() if v == selected_label][0]
    
    if selected_code != current_lang:
        set_lang(selected_code)
        st.rerun()
