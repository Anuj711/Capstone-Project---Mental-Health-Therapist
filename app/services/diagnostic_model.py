import joblib
import numpy as np
from app.config import MODEL_PATH

# Load model once at startup
model = joblib.load(MODEL_PATH)

def get_diagnostic_prediction(audio_features, video_features):
    sentiment = audio_features.get("sentiment", 0.5)
    emotion_values = list(video_features.get("emotions", {}).values())
    mean_emotion_score = np.mean(emotion_values) if emotion_values else 0.5

    features = np.array([[sentiment, mean_emotion_score]])
    prediction = model.predict_proba(features)[0][1]  # probability of "positive" diagnosis
    return {"score": float(prediction)}
