import sys
import joblib

try:
    try:
        import sklearn._loss._loss as sklearn_loss_ext
        sys.modules.setdefault('_loss', sklearn_loss_ext)
    except Exception:
        pass
    obj = joblib.load("artifacts_v2.pkl")
    print("SUCCESS")
    print(type(obj))

    if isinstance(obj, dict):
        print("Keys:", obj.keys())

except Exception as e:
    print("ERROR:")
    print(type(e))
    print(e)