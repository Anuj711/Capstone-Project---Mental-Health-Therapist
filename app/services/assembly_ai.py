import os
import assemblyai as aai

# Set API key
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

def analyze_audio(audio_url: str):
    """
    Sends audio URL to AssemblyAI, returns sentiment + transcript.
    Expects a publicly accessible URL (local files will not work for cloud API).
    """
    # Set up configuration
    config = aai.TranscriptionConfig(
        speech_model=aai.SpeechModel.universal,
        sentiment_analysis=True
    )
    transcriber = aai.Transcriber()

    assembly_result = transcriber.transcribe(audio_url, config)

    if assembly_result.status == "error":
        raise RuntimeError(f"AssemblyAI transcription failed: {assembly_result.error}")

    for sentiment_result in assembly_result.sentiment_analysis:
        # Grab sentiment (POSITIVE/NEGATIVE/NEUTRAL)
        sentiment_score = sentiment_result.sentiment
        # Grab sentiment confidence (percentage)
        sentiment_confidence = sentiment_result.confidence

    # Creates assemblyAI output to send back to main.py
    return {
        "transcript": assembly_result.text,
        "sentiment": sentiment_score,
        "sentiment_confidence": sentiment_confidence*100 # Original output is a fraction out of 1 -- mulitplied it to make it out of 100 which matches DeepFace confidence output
    }
