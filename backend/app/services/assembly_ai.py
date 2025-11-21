import os
import assemblyai as aai

# Set API key
aai.settings.api_key = os.getenv("ASSEMBLYAI_API_KEY")

def analyze_audio(video_url):
    try:
        config = aai.TranscriptionConfig(
            sentiment_analysis=True
        )
        
        transcriber = aai.Transcriber(config=config)
        assembly_result = transcriber.transcribe(video_url)
        
        # Wait for completion
        if assembly_result.status == aai.TranscriptStatus.error:
            raise Exception(f"Transcription failed: {assembly_result.error}")
        
        # Build sentiment analysis list
        sentiment_list = []
        if assembly_result.sentiment_analysis is not None:
            for sentiment_result in assembly_result.sentiment_analysis:
                sentiment_list.append({
                    "text": sentiment_result.text,
                    "sentiment": sentiment_result.sentiment,
                    "confidence": sentiment_result.confidence
                })
        
        # Calculate overall sentiment
        if sentiment_list:
            overall_sentiment = max(sentiment_list, key=lambda x: x["confidence"])
            sentiment = overall_sentiment["sentiment"]
            sentiment_confidence = overall_sentiment["confidence"]
        else:
            sentiment = "NEUTRAL"
            sentiment_confidence = 0.0
        
        return {
            "transcript": assembly_result.text or "",
            "sentiment": sentiment,
            "sentiment_confidence": sentiment_confidence,
            "sentiment_analysis": sentiment_list
        }
        
    except Exception as e:
        print(f"[ERROR] AssemblyAI failed: {e}")
        return {
            "transcript": "",
            "sentiment": "NEUTRAL", 
            "sentiment_confidence": 0.0,
            "sentiment_analysis": []
        }