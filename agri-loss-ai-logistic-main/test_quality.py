import streamlit as st
from utils.quality_predictor import predict_quality

st.title("Vegetable Quality Test")

uploaded_file = st.file_uploader(
    "Upload a vegetable image",
    type=["jpg", "jpeg", "png"]
)

if uploaded_file:
    st.image(uploaded_file, width=300)

    crop, quality, confidence, fresh_pct, rotten_pct = predict_quality(uploaded_file)
    label = f"{quality} {crop}"

    st.success(f"Prediction: {label}")
    st.info(f"Confidence: {confidence:.2f}%")
    st.write(f"**Fresh:** {fresh_pct:.2f}% | **Rotten:** {rotten_pct:.2f}%")