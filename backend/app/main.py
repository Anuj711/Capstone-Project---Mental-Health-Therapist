from flask import Flask, request, jsonify
from dotenv import load_dotenv
import numpy as np

from app.services.assembly_ai import analyze_audio
from app.services.deepface_service import analyze_video
from app.utils.safety_check import check_trigger_words
from app.services.openai_client import call_openai_therapy_model
from flask_cors import CORS

load_dotenv()
app = Flask(__name__)
CORS(app)

VALID_QUESTION_IDS = {
    'PHQ-9': [f'Q{i}_PHQ9' for i in range(1, 10)],
    'GAD-7': [f'Q{i}_GAD7' for i in range(1, 8)],
    'PCL-5': [f'Q{i}_PCL5' for i in range(1, 21)]
}

def validate_and_clean_diagnostic_mapping(diagnostic_mapping):
    """Remove invalid question IDs from diagnostic mapping"""
    cleaned = {}
    
    for assessment_name, questions in diagnostic_mapping.items():
        if assessment_name not in VALID_QUESTION_IDS:
            print(f"[WARNING] Invalid assessment name: {assessment_name}")
            continue
        
        valid_questions = {}
        for question_id, data in questions.items():
            if question_id in VALID_QUESTION_IDS[assessment_name]:
                valid_questions[question_id] = data
            else:
                print(f"[WARNING] Invalid question ID: {question_id} in {assessment_name}")
                print(f"[WARNING] Valid IDs for {assessment_name}: {VALID_QUESTION_IDS[assessment_name]}")
        
        if valid_questions:
            cleaned[assessment_name] = valid_questions
    
    return cleaned

def prepare_data_for_json(data):
    """Recursively converts NumPy/custom numeric types to standard Python types."""
    if isinstance(data, dict):
        return {k: prepare_data_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [prepare_data_for_json(v) for v in data]
    elif isinstance(data, np.floating):
        return float(data)
    elif isinstance(data, np.integer):
        return int(data)
    elif isinstance(data, np.ndarray):
        return data.tolist()
    return data

def flatten_diagnostic_scores(diagnostic_mapping):
    """
    Convert nested diagnostic_mapping to flat scores for Firestore.
    Input:  {"PHQ-9": {"Q1_PHQ9": {"score": 2}}}
    Output: {"Q1_PHQ9": 2}
    """
    flat_scores = {}
    if not diagnostic_mapping:
        return flat_scores
    
    for assessment, questions in diagnostic_mapping.items():
        for question_id, details in questions.items():
            if isinstance(details, dict) and "score" in details:
                flat_scores[question_id] = details["score"]
            else:
                flat_scores[question_id] = details
    
    return flat_scores

@app.route("/")
def home():
    return "Capstone API is running!"

@app.route("/analyze_turn", methods=["POST"])
def analyze_turn():
    data = request.get_json()

    questionnaires = data.get("questionnaires", {})
    past_turns = data.get("past_turns", [])
    video_file = data.get("video_url", {})
    session_id = data.get("session_id", "")
    user_id = data.get("user_id", "")
    
    # Debug: Show past turns
    print("\n" + "="*80)
    print("DEBUG: PAST TURNS RECEIVED FROM FRONTEND")
    print(f"Number of turns: {len(past_turns)}")
    for i, turn in enumerate(past_turns[-3:], 1):
        print(f"\nTurn {i}:")
        print(f"  user_transcript: {turn.get('user_transcript', 'MISSING')[:100]}")
        print(f"  bot_reply: {turn.get('bot_reply', 'MISSING')[:100]}")
    print("="*80 + "\n")

    if not video_file:
        return jsonify({"error": "Missing video url"}), 400

    # Analyze audio and video
    assembly_data = prepare_data_for_json(analyze_audio(video_file))
    deepface_data = prepare_data_for_json(analyze_video(video_file))

    transcript = assembly_data.get("transcript")
    if not transcript:
        return jsonify({"error": "Missing transcript"}), 400

    # Step 1: Trigger word check
    found_trigger, word = check_trigger_words(transcript)
    if found_trigger:
        emergency_response = {
            "text": "It sounds like you might be in distress. Please reach out to immediate help:\n\nNational Suicide Prevention Lifeline: 988 (US)\nCrisis Text Line: Text HOME to 741741\n\nYou're not alone.",
            "diagnostic_scores": {},
            "metadata": {
                "conversation_type": "crisis",
                "crisis_detected": True,
                "audio_video_alignment": "aligned",
                "confidence_level": "high",
                "next_suggested_focus": None
            },
            "assemblyAI_output": assembly_data,
            "deepface_output": deepface_data,
            "emergency": True,
            "triggered_word": word,
            "trauma_detected": False,
        }
        return jsonify(emergency_response), 200

    # Step 2: Call OpenAI model
    session_status = data.get("session_status", "active")
    print(f"[DEBUG] Session status from frontend: {session_status}")
    
    model_output = call_openai_therapy_model(assembly_data, deepface_data, questionnaires, past_turns, session_status)
    
    # Validate and clean diagnostic mapping (only remove invalid question IDs)
    if model_output.get("diagnostic_mapping"):
        original_mapping = model_output["diagnostic_mapping"]
        cleaned_mapping = validate_and_clean_diagnostic_mapping(original_mapping)
        
        if cleaned_mapping != original_mapping:
            print("[WARNING] Removed invalid question IDs from AI response")
        
        model_output["diagnostic_mapping"] = cleaned_mapping
    
    # Step 3: Format response for Firestore
    diagnostic_scores = flatten_diagnostic_scores(model_output.get("diagnostic_mapping", {}))
    
    # Check if trauma was mentioned in transcript (keyword-based detection)
    transcript_lower = assembly_data.get("transcript", "").lower()
    trauma_keywords = [
        'died', 'death', 'passed away', 'funeral', 'lost my', 'lost a', 'killed',
        'abuse', 'abused', 'assault', 'assaulted', 'rape', 'raped', 'molest',
        'accident', 'crash', 'injured', 'hurt badly', 'hospitalized',
        'attacked', 'violence', 'witnessed', 'saw someone die', 'saw someone get',
        'war', 'combat', 'deployed', 'shot at', 'explosion',
        'disaster', 'hurricane', 'earthquake', 'fire', 'flood', 'tornado',
        'trauma', 'traumatic', 'ptsd', 'traumatized',
        'overdose', 'suicide attempt', 'tried to kill', 'attempted suicide'
    ]
    
    trauma_mentioned = any(keyword in transcript_lower for keyword in trauma_keywords)
    
    # Check if PCL-5 questions were scored
    has_pcl5_scores = any('PCL5' in key for key in diagnostic_scores.keys())
    
    # Trauma is detected if EITHER mentioned OR PCL-5 scored
    trauma_detected = trauma_mentioned or has_pcl5_scores
    
    if trauma_mentioned and not has_pcl5_scores:
        print(f"\n[TRAUMA] Keyword detected in transcript: '{transcript[:100]}'")
        matching_keywords = [k for k in trauma_keywords if k in transcript_lower]
        print(f"[TRAUMA] Matching keywords: {matching_keywords}")
    
    # Check if PCL-5 exists in questionnaires
    has_pcl5_questionnaire = 'PCL-5' in questionnaires or 'PCL-5' in questionnaires
    
    # Log trauma detection
    if trauma_detected and not has_pcl5_questionnaire:
        print("\n" + "="*80)
        print("TRAUMA DETECTED - PCL-5 should be enabled")
        print(f"   Session: {session_id}")
        print(f"   User: {user_id}")
        if trauma_mentioned:
            print(f"   Reason: Trauma keywords in transcript")
            matching_keywords = [k for k in trauma_keywords if k in transcript_lower]
            print(f"   Keywords: {matching_keywords}")
        if has_pcl5_scores:
            print(f"   PCL-5 scores found: {[k for k in diagnostic_scores.keys() if 'PCL5' in k]}")
        print("="*80 + "\n")
    
    # Determine audio/video alignment
    audio_sentiment = assembly_data.get("sentiment", "NEUTRAL").lower()
    audio_confidence = assembly_data.get("sentiment_confidence", 0)
    
    emotions = deepface_data if isinstance(deepface_data, dict) else {}
    dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0] if emotions else "neutral"
    
    negative_emotions = {"sad", "angry", "fear", "disgust"}
    positive_emotions = {"happy", "surprise"}
    
    if audio_confidence < 0.6:
        alignment = "mismatched"
    elif (audio_sentiment == "negative" and dominant_emotion in negative_emotions) or \
         (audio_sentiment == "positive" and dominant_emotion in positive_emotions):
        alignment = "aligned"
    elif audio_sentiment == "neutral":
        alignment = "aligned"
    else:
        alignment = "mismatched"
    
    # Determine confidence level
    if audio_confidence >= 0.8:
        confidence_level = "high"
    elif audio_confidence >= 0.6:
        confidence_level = "medium"
    else:
        confidence_level = "low"
    
    # Determine next focus based on diagnostic_scores
    next_focus = None
    if diagnostic_scores:
        phq9_count = sum(1 for k in diagnostic_scores if 'PHQ9' in k)
        gad7_count = sum(1 for k in diagnostic_scores if 'GAD7' in k)
        pcl5_count = sum(1 for k in diagnostic_scores if 'PCL5' in k)
        
        # Prioritize incomplete assessments
        if phq9_count < 5:
            next_focus = "PHQ-9"
        elif gad7_count < 4:
            next_focus = "GAD-7"
        elif has_pcl5_questionnaire and pcl5_count < 10:
            next_focus = "PCL-5"
    
    # Build response
    response_payload = {
        "text": model_output.get("bot_reply", ""),
        "diagnostic_scores": diagnostic_scores,
        "metadata": {
            "conversation_type": model_output.get("conversation_type", "free_talk"),
            "crisis_detected": False,
            "audio_video_alignment": alignment,
            "confidence_level": confidence_level,
            "next_suggested_focus": next_focus
        },
        "assemblyAI_output": assembly_data,
        "deepface_output": deepface_data,
        "diagnostic_match": len(diagnostic_scores) > 0,
        "emergency": False,
        "trauma_detected": trauma_detected,
    }

    return jsonify(response_payload), 200

if __name__ == "__main__":
    app.run(debug=True, port=8000)