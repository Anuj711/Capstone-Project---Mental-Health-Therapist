from flask import Flask, request, jsonify
from dotenv import load_dotenv
import numpy as np
import re

from app.services.assembly_ai import analyze_audio
from app.services.deepface_service import analyze_video
from app.utils.safety_check import check_trigger_words
from app.utils.load_symptom_overlap_mapping import SYMPTOM_OVERLAP_DF
from app.utils.questionnaire_handler import \
    get_question_data, \
    get_questionnaire_score_range, append_question_to_unanswered_list, \
    mark_question_answered, get_overlapping_updates, \
    update_question_tracker, deduplicate_user_answers
from app.services.openai_client import update_rolling_info_and_get_reply, get_current_question_score
from app.utils.response_guardrails import get_natural_question
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
            "diagnostic_scores": < ASSESSMENT_QID: { score: 0 } >,
            "sufficientDataCollected": False/True
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
            "triggered word": <word> [optional],
            "trauma_detected": <true/false>,
            "sufficientDataCollected": True/False
        }
    """

    # TODO: (nice to have) add a JSON Scehma to make sure we always return the above formatted JSON payload
    data = request.get_json()
    video_file = data.get("video_url", "")
    rolling_summary = data.get("rolling_summary") or ""
    user_answers = data.get("user_answers") or []
    existing_scores = data.get("diagnostic_scores") or {}
    session_status = data.get("session_status", "active")
    last_bot_reply = data.get("last_bot_reply", None)

    # Retrieval of session-specific state from payload
    incoming_tracker = data.get("question_tracker") or {}
    incoming_unanswered = data.get("unanswered_question_ids") or []

    print("\n" + "="*80)
    print(f"[DEBUG] PROCESSING CURRENT QS ID: {incoming_tracker.get('current_qs_id')}")
    print("="*80 + "\n")

    if not video_file:
        return jsonify({"error": "Missing video url"}), 400

    # Analyze audio and video
    assembly_data = prepare_data_for_json(analyze_audio(video_file))
    deepface_data = prepare_data_for_json(analyze_video(video_file))

    transcript = assembly_data.get("transcript")
    if not transcript:
        return jsonify({"error": "Missing transcript"}), 400

    # Step 2: Get current and next questions
    current_qid = incoming_tracker.get("current_qs_id")
    next_qid = incoming_tracker.get("next_qs_id")
    current_question_text = get_question_data(current_qid)
    next_question_text = get_question_data(incoming_tracker.get("next_qs_id"))

    # Step 3a: Update rolling summary and user answers
    model_output = update_rolling_info_and_get_reply(
        assembly_data, deepface_data, rolling_summary,
        user_answers, current_qid, get_questionnaire_score_range(current_qid),
        current_question_text, next_question_text, 
        previous_bot_reply=last_bot_reply,
        session_status=session_status)
    
    is_emergency = model_output.get("is_emergency") or False
    trigger_word = model_output.get("trigger_word") or ""
    if is_emergency:
        emergency_response = {
            "text": "It sounds like you might be in distress. Please reach out to immediate help:\n\nNational Suicide Prevention Lifeline: 988 (US)\nCrisis Text Line: Text HOME to 741741\n\nYou're not alone.",
            "diagnostic_scores": {},
            "metadata": {
                "conversation_type": "crisis",
                "crisis_detected": True,
                "audio_video_alignment": "aligned",
                "confidence_level": "high"
            },
            "user_answers": user_answers,
            "rolling_summary": rolling_summary,
            "assemblyAI_output": assembly_data,
            "deepface_output": deepface_data,
            "diagnostic_match": False,
            "emergency": True,
            "triggered_word": trigger_word,
            "trauma_detected": False,
            "session_status": "ended-complete",
            "sufficientDataCollected": True,
            "question_tracker": incoming_tracker,
            "unanswered_question_ids": incoming_unanswered
        }
        return jsonify(emergency_response), 200

    updated_summary = model_output.get("updated_summary") or ""
    updated_answers = model_output.get("updated_user_answers") or []
    
    rolling_summary = updated_summary
    user_answers = deduplicate_user_answers(user_answers, updated_answers)

    bot_reply = model_output.get("bot_reply", "")

    contradictions = model_output.get("contradictions") or {}
    is_contradictory = contradictions.get("contradictory") or False
    contradicting_ids = contradictions.get("contradicting_question_ids") or []

    # Step 3b: Get score for current question
    needs_followup = model_output.get("needs_followup", False)
    is_answered = False
    current_score = 0
    score_output = {}
    if not needs_followup and not is_contradictory:
        score_output = get_current_question_score(
            transcript, 
            updated_summary,
            current_question_text, 
            get_questionnaire_score_range(current_qid)
        )
        is_answered = score_output.get("is_question_answered", False)
        current_score = score_output.get("score", 0)
    else:
        print(f"[DEBUG] Skipping scoring because needs_followup or contradiction is TRUE")

    # Step 4: update scores
    score_updates_for_firestore = {}
    current_unanswered = list(incoming_unanswered)
    current_tracker = dict(incoming_tracker)

    # RULE 1: Progress only if answered, NO follow-up needed, AND NO contradictions detected.
    if is_answered and not needs_followup and not is_contradictory:
        current_unanswered = mark_question_answered(current_qid, current_unanswered)
        score_updates_for_firestore[current_qid] = current_score
    
        # Handle overlaps
        overlaps, current_unanswered = get_overlapping_updates(current_qid, current_score, current_unanswered)
        if isinstance(overlaps, dict):
            score_updates_for_firestore.update(overlaps)       
        current_tracker = update_question_tracker(current_unanswered)
        print(f"[DEBUG] Question {current_qid} marked as answered. Moving to next.")
    else:
        # RULE 2: If unanswered, contradictory, or needs follow-up, stay on current question.
        print(f"[DEBUG] STAYING ON QUESTION {current_qid} FOR FOLLOW-UP/CONTRADICTION")

    # RULE 3: Handle contradictory question IDs
    for q_id in contradicting_ids:
        # If it's the current question, we've already handled staying on it via RULE 2.
        # If it's a DIFFERENT question that was contradicted, move it to the unanswered queue.
        if q_id != current_qid:
            current_unanswered = append_question_to_unanswered_list(q_id, current_unanswered)
            print(f"[DEBUG] Question {q_id} was contradicted. Moving back to unanswered queue.")
            
            # Reset existing score in Firestore for the contradicted question
            prev_val = existing_scores.get(q_id, 0)
            if prev_val != 0:
                score_updates_for_firestore[q_id] = -prev_val

    # Final Check: Are we out of questions?
    current_qid = current_tracker.get("current_qs_id")
    if not current_qid and session_status != "resumed" and (len(incoming_unanswered)-1) <= 0:
        final_session_status = "ended-complete"
        sufficient_data = True
        bot_reply = "We've covered all the specific areas I wanted to check on today. Thank you for being so open with me. You can now view your session summary."
    else:
        final_session_status = session_status
        sufficient_data = data.get("sufficientDataCollected", False)

    # Step 5: Mode indicator
    mode_indicator = "free talk" if session_status == "resumed" else "diagnostic"

    #TODO: Need to use openAI to check this, the hard-coded trauma keywords are missing a lot of loopholes and it's dangerous.
    # Step 7: Format response for Firestore
    # Trauma detection logic
    transcript_lower = transcript.lower()
    trauma_keywords = [
        'died', 'death', 'passed away', 'funeral', 'lost my', 'lost a', 'killed', 'kill myself'
        'abuse', 'abused', 'assault', 'assaulted', 'rape', 'raped', 'molest',
        'accident', 'crash', 'injured', 'hurt badly', 'hospitalized',
        'attacked', 'violence', 'witnessed', 'saw someone die', 'saw someone get',
        'war', 'combat', 'deployed', 'shot at', 'explosion',
        'disaster', 'hurricane', 'earthquake', 'fire', 'flood', 'tornado',
        'trauma', 'traumatic', 'ptsd', 'traumatized',
        'overdose', 'suicide attempt', 'tried to kill', 'attempted suicide'
    ]
    
    trauma_mentioned = any(keyword in transcript_lower for keyword in trauma_keywords)
    has_pcl5_scores = any('PCL5' in key for key in score_updates_for_firestore.keys())
    trauma_detected = trauma_mentioned or has_pcl5_scores

    # Sentiment and Alignment
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
    else:
        alignment = "neutral" if audio_sentiment == "neutral" else "mismatched"
    
    confidence_level = "high" if audio_confidence >= 0.8 else "medium" if audio_confidence >= 0.6 else "low"

    # GUARDRAIL AGAINST BOT HALLUCINATION REPLIES
    # When to force the next question
    # If needs_followup is False and it's not the end of the session, we MUST have a question.
    if not needs_followup and not is_contradictory and final_session_status != "ended-complete":
        bot_reply_lower = bot_reply.lower()
        # 1.Get the core symptom text and split into words longer than 3 chars
        raw_symptom_text = next_question_text.split(":")[-1].strip().lower()
        keywords = [word for word in re.sub(r'[^\w\s]', '', raw_symptom_text).split() if len(word) > 3]
        
        # 2. Check how many keywords matched (Need at least 2 for a 'Positive Match')
        match_count = sum(1 for word in keywords if word in bot_reply_lower)
        
        # 3. Identify stalling phrases
        stalling_phrases = ["explore this further", "clear picture", "ensure we have", "understand better"]
        has_stalling_phrase = any(p in bot_reply_lower for p in stalling_phrases)

        # 4. Only override if:
        # -The bot didn't mention the core topic (low match_count)
        # -OR it used a known stalling phrase
        # -OR it didn't end with a question mark
        ends_with_question = bot_reply.strip().endswith("?")
        if (match_count < 2 and len(keywords) >= 2) or has_stalling_phrase or not ends_with_question:
            print(f"[GUARDRAIL] Intervention needed. Keywords found: {match_count}/{len(keywords)}")

            perfect_question = get_natural_question(next_qid, next_question_text)
            if next_qid == None:
                final_session_status = "ended-complete"
                sufficient_data = True
            sentences = re.split(r'(?<=[.!?]) +', bot_reply)
            empathy_part = sentences[0] if sentences else "I understand."
            bot_reply = f"{empathy_part} {perfect_question}"
        else:
            print(f"[GUARDRAIL] Pass. AI correctly transitioned.")

    if is_contradictory:
        # If the bot tried to move on during a contradiction, force it back
        if next_question_text.lower() in bot_reply_lower:
            print(f"[GUARDRAIL] Bot tried to move on during contradiction. Forcing resolution.")
            bot_reply = f"I want to make sure I'm following you correctly. {model_output.get('contradictions', {}).get('reason', 'Earlier we discussed something different.')} Which of these feels more accurate for you lately?"

    response_payload = {
        "text": bot_reply,
        "diagnostic_scores": score_updates_for_firestore,
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
        "diagnostic_match": len(score_updates_for_firestore) > 0,
        "emergency": False,
        "trauma_detected": trauma_detected,
        "session_status": final_session_status,
        "sufficientDataCollected": sufficient_data,
        "question_tracker": current_tracker,
        "unanswered_question_ids": current_unanswered
    }

    print("\n" + "."*80)
    print("[DEBUG] RETURNING FINAL PAYLOAD:")
    print(response_payload)
    print("."*80 + "\n")

    return jsonify(response_payload), 200

if __name__ == "__main__":
    app.run(debug=True, port=8000)
