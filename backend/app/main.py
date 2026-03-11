from flask import Flask, request, jsonify
from dotenv import load_dotenv
import numpy as np

from app.services.assembly_ai import analyze_audio
from app.services.deepface_service import analyze_video
from app.utils.safety_check import check_trigger_words
from app.utils.load_symptom_overlap_mapping import SYMPTOM_OVERLAP_DF
from app.utils.questionnaire_handler import \
    get_question_data, \
    get_questionnaire_score_range, append_question_to_unanswered_list, \
    mark_question_answered, get_overlapping_updates, \
    QUESTION_TRACKER
from app.services.openai_client import update_rolling_info_and_get_reply, get_current_question_score
from flask_cors import CORS

load_dotenv()
app = Flask(__name__)
CORS(app)

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

@app.route("/")
def home():
    return "Capstone API is running!"

@app.route("/analyze_turn", methods=["POST"])
def analyze_turn():
    """
    @input JSON payload from Firestore.
        {
            "video_file": <video file>,
            "session_status": <active/resumed>,
            "user_answers": < [ {Q_ID: user answer} ] >,
            "rolling summary": <summary of user answers for context>,
            "diagnostic_scores": < ASSESSMENT_QID: { score: 0 } >
        }

    @return JSON payload to be stored in Firestore.
        {
            "text": <chatbot reply>,
            "diagnostic_scores": < ASSESSMENT_QID: { score: 0 } >,
            "metadata": {
                "conversation_type": <diagnostic/free talk/crisis>,
                "crisis_detected": <true/false>,
                "audio_video_alignment": <aligned/mismatched>,
                "confidence_level": <low/medium/high>
            },
            "user_answers": < [ {Q_ID: user answer} ] >,
            "rolling_summary": <summary of user answers for context>,
            "assemblyAI_output": <transcript, emotions detected>,
            "deepface_output": <emotion scores>,
            "diagnostic_match": <true/false>,
            "emergency": <true/false>,
            "triggered word": <word> [optional]
            "trauma_detected": <true/false>,
        }
    """
    # TODO: check if QUESTION_TRACKER["current_qs_index"] is none then handle questionnaire over scenario

    # TODO: (nice to have) add a JSON Scehma to make sure we always return the above formatted JSON payload
    data = request.get_json()

    # ARCHITECTURE v2: need to instead get the following
    # - video file
    # - rolling summary
    # - user answers (Q_ID, question, brief answer)
    # - session_status (active / resumed)
    video_file = data.get("video_url", "")
    rolling_summary = data.get("rolling_summary", "")
    user_answers = data.get("user_answers", [])
    session_status = data.get("session_status", "active")

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
                "confidence_level": "high"
            },
            "user_answers": None,
            "rolling_summary": None,
            "assemblyAI_output": assembly_data,
            "deepface_output": deepface_data,
            "diagnostic_match": False,
            "emergency": True,
            "triggered_word": word,
            "trauma_detected": False
        }
        return jsonify(emergency_response), 200

    # Step 2: Get current and nextion questions
    current_question_text = get_question_data(QUESTION_TRACKER["current_qs_id"])
    next_question_text = get_question_data(QUESTION_TRACKER["next_qs_id"])

    # Step 3a: Update rolling summary and user answers
    model_output = update_rolling_info_and_get_reply(
        assembly_data, deepface_data, rolling_summary,
        user_answers, QUESTION_TRACKER["current_qs_id"],
        current_question_text, next_question_text, session_status)

    # TODO: print output and check if updated rolling summary includes previous
    # rolling summary or if it is just what we append to previous rolling summmary,
    # same for answered questions.
    rolling_summary += model_output.get("updated_summary", "")
    user_answers.extend(model_output.get("updated_user_answers", []))
    bot_reply = model_output.get("bot_reply", "")
    contradictions = model_output.get("contradictions")

    if contradictions and contradictions.get("contradicting_question_ids"):
        for q in contradictions.get("contradicting_question_ids"):
            # TODO: here we are assuming openai returns the "question_id" in the formatting
            # we provided it in. If it hallucenates, this might be a weird formatting so needs
            # to be error checked and worked around before appending.
            append_question_to_unanswered_list(q)
            # TODO: do we just add the questions openai returns or also add the ones from symptom
            # overlap map?
    
    # Step 3b: Get score for current question
    if session_status != "resumed":
        score_output = get_current_question_score(
            transcript, current_question_text, get_questionnaire_score_range(QUESTION_TRACKER["current_qs_id"]))

        if score_output.get("is_question_answered"):
            current_question_score = score_output.get("score")
            current_question_score_reasoning = score_output.get("reasoning")
            mark_question_answered(QUESTION_TRACKER["current_qs_id"])
        else:
            append_question_to_unanswered_list(QUESTION_TRACKER["current_qs_id"])

    # Step 4: Update saved scores based on symptom overlap map
    overlapping_qs_scores = get_overlapping_updates(QUESTION_TRACKER["current_qs_id"], current_question_score)

    # Step 5: TODO: send updates to firestore
    if session_status == "resumed":
        mode_indicator = "free talk"
        print("[DEBUG] Using FREE-TALK mode")
    else:
        mode_indicator = "diagnostic"
        print("[DEBUG] Using DIAGNOSTIC mode")

    """
    rolling_summary = data.get("rolling_summary", {})
    user_answers = data.get("user_answers", {})
    scores = data.get("scores", {})
    question_queue = data.get("question_queue", {})
    current_question_index = data.get("current_question_index", {})
    mode = data.get("mode", {})
    """

    # Step 6: update current and next question ids
    QUESTION_TRACKER["current_qs_index"] = QUESTION_TRACKER["current_qs_index"] + 1
    QUESTION_TRACKER["next_qs_index"] = QUESTION_TRACKER["next_qs_index"] + 1

    # Step 7: Format response for Firestore
    diagnostic_scores = data.get("diagnostic_scores") or []
    diagnostic_scores.append({QUESTION_TRACKER["current_qs_id"] : current_question_score})
    diagnostic_scores.extend(overlapping_qs_scores)
    
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
    has_pcl5_questionnaire = True
    
    # Log trauma detection
    if trauma_detected and not has_pcl5_questionnaire:
        print("\n" + "="*80)
        print("TRAUMA DETECTED - PCL-5 should be enabled")
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

    response_payload = {
        "text": bot_reply,
        "diagnostic_scores": diagnostic_scores,
        "metadata": {
            "conversation_type": mode_indicator,
            "crisis_detected": False,
            "audio_video_alignment": alignment,
            "confidence_level": confidence_level
        },
        "user_answers": user_answers,
        "rolling_summary": rolling_summary,
        "assemblyAI_output": assembly_data,
        "deepface_output": deepface_data,
        "diagnostic_match": len(diagnostic_scores) > 0,
        "emergency": False,
        "trauma_detected": trauma_detected,
    }

    return jsonify(response_payload), 200

if __name__ == "__main__":
    app.run(debug=True, port=8000)