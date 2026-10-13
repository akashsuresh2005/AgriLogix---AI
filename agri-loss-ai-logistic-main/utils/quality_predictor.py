from pathlib import Path
import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model


# ============================================================
# LOAD V5 VEGETABLE QUALITY MODEL
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "vegetable_quality_v5_model.keras"

_model = None


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Quality model file not found at: {MODEL_PATH}")
        _model = load_model(str(MODEL_PATH), compile=False)
    return _model


# ============================================================
# CLASS NAMES
# ============================================================

# IMPORTANT:
# This order MUST match the order used during V5 training.
class_names_8 = [
    "freshcucumber",
    "freshonion",
    "freshpotato",
    "freshtomato",
    "rottencucumber",
    "rottenonion",
    "rottenpotato",
    "rottentomato"
]


# ============================================================
# OLD 20-CLASS MODEL CLASSES
# Kept here only in case other parts of the project use them.
# ============================================================

class_names_20 = [
    "freshapples",
    "freshbanana",
    "freshbittergroud",
    "freshcapsicum",
    "freshcucumber",
    "freshokra",
    "freshonion",
    "freshoranges",
    "freshpotato",
    "freshtomato",

    "rottenapples",
    "rottenbanana",
    "rottenbittergroud",
    "rottencapsicum",
    "rottencucumber",
    "rottenokra",
    "rottenonion",
    "rottenoranges",
    "rottenpotato",
    "rottentomato"
]


# ============================================================
# IMAGE SIZE
# ============================================================

IMG_SIZE = (224, 224)


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict_quality(uploaded_file):

    # --------------------------------------------------------
    # 1. Open uploaded image
    # --------------------------------------------------------

    img = Image.open(uploaded_file).convert("RGB")


    # --------------------------------------------------------
    # 2. Resize to MobileNetV2 input size
    # --------------------------------------------------------

    img = img.resize(IMG_SIZE)


    # --------------------------------------------------------
    # 3. Convert image to NumPy array
    # --------------------------------------------------------

    img_array = np.array(
        img,
        dtype=np.float32
    )


    # --------------------------------------------------------
    # 4. Add batch dimension
    #
    # Shape:
    # (224, 224, 3)
    #       ↓
    # (1, 224, 224, 3)
    # --------------------------------------------------------

    img_array = np.expand_dims(
        img_array,
        axis=0
    )


    # --------------------------------------------------------
    # 5. Make prediction
    #
    # The V5 model already contains its Rescaling layer,
    # so DO NOT manually divide the image by 255 here.
    # --------------------------------------------------------

    model_instance = get_model()
    prediction = model_instance.predict(
        img_array,
        verbose=0
    )


    # --------------------------------------------------------
    # 6. Find predicted class
    # --------------------------------------------------------

    predicted_index = int(
        np.argmax(prediction[0])
    )


    # --------------------------------------------------------
    # 7. Select class list
    # --------------------------------------------------------

    num_classes = prediction.shape[1]

    if num_classes == 8:

        class_list = class_names_8

    elif num_classes == 20:

        class_list = class_names_20

    else:

        raise ValueError(
            f"Unexpected number of model classes: {num_classes}"
        )


    # --------------------------------------------------------
    # 8. Get predicted class
    # --------------------------------------------------------

    predicted_class = class_list[predicted_index]


    # --------------------------------------------------------
    # 9. Confidence
    # --------------------------------------------------------

    confidence = float(
        prediction[0][predicted_index] * 100
    )


    # --------------------------------------------------------
    # 10. Determine Fresh / Rotten
    # --------------------------------------------------------

    if predicted_class.startswith("fresh"):

        quality = "Fresh"

        crop = predicted_class.replace(
            "fresh",
            "",
            1
        )

    else:

        quality = "Rotten"

        crop = predicted_class.replace(
            "rotten",
            "",
            1
        )


    # --------------------------------------------------------
    # 11. Format crop name
    # --------------------------------------------------------

    crop = crop.capitalize()


    # --------------------------------------------------------
    # 12. Calculate Fresh / Rotten percentages
    #     for the same crop
    # --------------------------------------------------------

    fresh_class_name = f"fresh{crop.lower()}"

    rotten_class_name = f"rotten{crop.lower()}"


    try:

        fresh_idx = class_list.index(
            fresh_class_name
        )

        rotten_idx = class_list.index(
            rotten_class_name
        )

        fresh_pct = float(
            prediction[0][fresh_idx] * 100
        )

        rotten_pct = float(
            prediction[0][rotten_idx] * 100
        )


    except ValueError:

        # Fallback
        if quality == "Fresh":

            fresh_pct = confidence
            rotten_pct = 0.0

        else:

            fresh_pct = 0.0
            rotten_pct = confidence


    # --------------------------------------------------------
    # 13. Return results
    # --------------------------------------------------------

    return (
        crop,
        quality,
        confidence,
        fresh_pct,
        rotten_pct
    )