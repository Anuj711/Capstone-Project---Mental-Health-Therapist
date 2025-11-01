from fastapi import APIRouter
from pydantic import BaseModel
from app.services.deepface_service import analyze_video
from app.services.assembly_ai import analyze_audio
from app.services.diagnostic_model import get_diagnostic_prediction

router = APIRouter()

class AnalyzeRequest(BaseModel):
    user_id: str
    audio_url: str
    video_url: str

@router.post("/analyze")
def analyze(request: AnalyzeRequest):
    # Audio features
    audio_features = analyze_audio(request.audio_url)
    
    # Video features
    video_emotions = analyze_video(request.video_url)
    
    # Diagnostic classifier (example uses audio sentiment + video happiness)
    features = [
        audio_features.get("sentiment", 0.5),
        video_emotions.get("happy", 0.0)
    ]
    diagnosis = get_diagnostic_prediction(features)

    return {
        "user_id": request.user_id,
        "audio_features": audio_features,
        "video_features": video_emotions,
        "diagnosis": diagnosis
    }
