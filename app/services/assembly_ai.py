import assemblyai as aai
from app.config import ASSEMBLYAI_API_KEY

# Set API key
aai.settings.api_key = ASSEMBLYAI_API_KEY

def analyze_audio(audio_url: str):
    """
    Sends audio URL to AssemblyAI, returns sentiment + transcript.
    """
    # Configure transcription (using universal speech model)
    config = aai.TranscriptionConfig(
        speech_model=aai.SpeechModel.universal,
        sentiment_analysis=True   # enable sentiment analysis if supported
    )

    transcriber = aai.Transcriber(config=config)

    transcript = transcriber.transcribe(audio_url)

    if transcript.status == "error":
        raise RuntimeError(f"AssemblyAI transcription failed: {transcript.error}")

    # Extract sentiment if available
    sentiment_score = getattr(transcript, "sentiment", 0.5)  # fallback to 0.5 if not present

    return {
        "transcript": transcript.text,
        "sentiment": sentiment_score
    }
