import os
from openai import OpenAI
from app.utils.open_ai_prompt_3a import OPENAI_PROMPT_3A
from app.utils.open_ai_prompt_3b import GET_QS_SCORE
from app.utils.free_talk_prompt import OPENAI_PROMPT_FREE_TALK
from dotenv import load_dotenv
import re
import json
from json_repair import repair_json

load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def update_rolling_info_and_get_reply(
        assembly_data, deepface_data, rolling_summary, user_answers,
        current_qs_id, current_question, next_question, session_status="active"):
    """
    @return
    {
        "bot_reply": "...",
        "updated_summary": "...",
        "updated_user_answers": [
            {
                "question_id": "...",
                "answer": "...",
                "contradictory": false
            },
        ],
        "contradictions": {
            "contradicting_question_ids": ["..."],
            "reason": "..."
        }
    }
    """

    print(f"\n{'='*80}")
    print(f"[DEBUG] SESSION STATUS RECEIVED: '{session_status}'")
    print(f"{'='*80}\n")
    
    user_transcript = assembly_data.get("transcript", "")
    sentiment = assembly_data.get("sentiment", "")
    sentiment_confidence = assembly_data.get("sentiment_confidence", "")
    
    # Handle deepface_data safely
    if isinstance(deepface_data, dict):
        emotions = deepface_data
        dominant_emotion = max(emotions.items(), key=lambda x: x[1])[0] if emotions else "neutral"
    else:
        dominant_emotion = "neutral"

    # Build task instructions based on mode
    if session_status == "resumed":
        main_prompt = OPENAI_PROMPT_FREE_TALK
        message = f"""
            === CURRENT USER MESSAGE ===
            User just said: "{user_transcript}"

            Audio: {sentiment} ({sentiment_confidence} confidence)
            Video: {dominant_emotion}

            CURRENT ROLLING SUMMARY:
            {rolling_summary}

            Return JSON in this format:
            {{
                "updated_summary": "...",
                "bot_reply": "..."
            }}
        """
    else: # active
        main_prompt = OPENAI_PROMPT_3A
        message = f"""
            === CURRENT USER MESSAGE ===
            User just said: "{user_transcript}"

            Audio: {sentiment} ({sentiment_confidence} confidence)
            Video: {dominant_emotion}

            CURRENT ROLLING SUMMARY:
            {rolling_summary}

            USER ANSWERS SO FAR:
            {user_answers}

            CURRENT QUESTION ID:
            {current_qs_id}

            CURRENT QUESTION BEING ASKED:
            {current_question}

            NEXT QUESTION TO BE ASKED:
            {next_question}

            Return JSON in this format:

            {{
                "bot_reply": "...",
                "updated_summary": "...",
                "updated_user_answers": [
                    {{
                        "question_id": "...",
                        "answer": "...",
                        "contradictory": false
                    }}
                ],
                "contradictions": {{
                    "contradicting_question_ids": ["..."],
                    "reason": "..."
                }}
            }}
            """

    try:
        print(f"[DEBUG] Calling OpenAI with transcript: {user_transcript[:100]}...")
        
        # TODO: determine right temperature for 3a + remove max_tokens?
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.5,
            messages=[
                {"role": "system", "content": main_prompt},
                {"role": "user", "content": message}
            ]
        )

        # CLEAN DATA
        raw = response.choices[0].message.content.strip()
        print("\n" + "="*80)
        print("[DEBUG] FULL RAW RESPONSE:")
        print(raw)
        print("="*80 + "\n")

        # Remove markdown code blocks if present
        cleaned = raw
        if "```json" in raw or "```" in raw:
            print("[DEBUG] Removing markdown code blocks...")
            cleaned = re.sub(r'```json\s*', '', raw)
            cleaned = re.sub(r'```\s*', '', cleaned)
            cleaned = cleaned.strip()

        # Try to extract JSON
        match = re.search(r'\{[\s\S]*\}', cleaned)

        if match:
            json_str = match.group(0)
            print(f"[DEBUG] Extracted JSON length: {len(json_str)} chars")
            
            try:
                parsed = json.loads(json_str)
                print("[DEBUG] JSON parsed successfully")
                
                # Validate structure
                if not parsed.get("bot_reply"):
                    print("[WARNING] Missing bot_reply field")
                    if session_status == "resumed":
                        parsed["bot_reply"] = "I'm here to listen. What's on your mind?"
                    else:
                        parsed["bot_reply"] = "Can you tell me more about how you've been feeling?"

                if not parsed.get("updated_summary"):
                    print("[WARNING] Missing updated summary, appending transcript as backup")
                    parsed["updated_summary"] = user_transcript
                
                if session_status != "resumed":
                    if not parsed.get("updated_user_answers"):
                        print("[WARNING] Missing updated user answers, skipping for now")
                        parsed["updated_user_answers"] = None
                    
                    if not parsed.get("contradictions"):
                        print("[WARNING] Missing contradictions, skipping for now")
                        parsed["contradictions"] = None

                return parsed
                
            except json.JSONDecodeError as e:
                print(f"[DEBUG] JSON parse failed: {e}")
                print(f"[DEBUG] Attempting json_repair...")
                
                try:
                    repaired = repair_json(json_str)
                    parsed = json.loads(repaired)
                    print("[DEBUG] JSON repaired successfully")

                    return parsed

                except Exception as repair_error:
                    print(f"[DEBUG] Repair failed: {repair_error}")
        else:
            print("[DEBUG] NO JSON found in response")
        
        # Fallback based on mode
        print("[WARNING] Using fallback response")
        if session_status == "resumed":
            return {
                "bot_reply": "I'm here to listen. What would you like to talk about?",
                "updated_summary": None,
                "updated_user_answers": None
            }
        else:
            return {
                "bot_reply": "How's your sleep been lately?",
                "updated_summary": None,
                "updated_user_answers": None
            }
        
    except Exception as e:
        print(f"[ERROR] OpenAI API exception: {e}")
        
        if session_status == "resumed":
            return {
                "bot_reply": "I'm here for you. What's been on your mind?",
                "updated_summary": None,
                "updated_user_answers": None
            }
        else:
            return {
                "bot_reply": "What about your energy levels?",
                "updated_summary": None,
                "updated_user_answers": None
            }

def get_current_question_score(transcript, current_question, score_range):
    """
    @return
    {
        "score": ...,
        "is_question_answered": True/False,
        "reasoning": "..."
    }
    """

    try:
        message = f"""
            QUESTION:
            {current_question}

            USER RESPONSE:
            {transcript}

            SCORE RANGE:
            {score_range}

            Return JSON:

            {{
                "score": ...,
                "is_question_answered": True/False,
                "reasoning": "short explanation"
            }}
        """
        
        # TODO: determine right temperature for 3b + remove max_tokens?
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.0,
            messages=[
                {"role": "system", "content": GET_QS_SCORE},
                {"role": "user", "content": message}
            ]
        )

        # CLEAN DATA
        raw = response.choices[0].message.content.strip()
        print("\n" + "="*80)
        print("[DEBUG] FULL RAW RESPONSE:")
        print(raw)
        print("="*80 + "\n")

        # Remove markdown code blocks if present
        cleaned = raw
        if "```json" in raw or "```" in raw:
            print("[DEBUG] Removing markdown code blocks...")
            cleaned = re.sub(r'```json\s*', '', raw)
            cleaned = re.sub(r'```\s*', '', cleaned)
            cleaned = cleaned.strip()

        # Try to extract JSON
        match = re.search(r'\{[\s\S]*\}', cleaned)

        if match:
            json_str = match.group(0)
            print(f"[DEBUG] Extracted JSON length: {len(json_str)} chars")
            
            try:
                parsed = json.loads(json_str)
                print("[DEBUG] JSON parsed successfully")
                
                # Validate structure
                if not parsed.get("score"):
                    print("[WARNING] Missing score field")
                    parsed["score"] = 0

                if not parsed.get("is_question_answered"):
                    print("[WARNING] Missing is_question_answered field")
                    parsed["is_question_answered"] = False
                
                if not parsed.get("reasoning"):
                    print("[WARNING] Missing reasoning field")
                    parsed["reasoning"] = ""

                return parsed
                
            except json.JSONDecodeError as e:
                print(f"[DEBUG] JSON parse failed: {e}")
                print(f"[DEBUG] Attempting json_repair...")
                
                try:
                    repaired = repair_json(json_str)
                    parsed = json.loads(repaired)
                    print("[DEBUG] JSON repaired successfully")
                    
                    return parsed
                except Exception as repair_error:
                    print(f"[DEBUG] Repair failed: {repair_error}")
        else:
            print("[DEBUG] NO JSON found in response")
        
        # Fallback based on mode
        print("[WARNING] Using fallback response")
        return {
            "score": 0,
            "is_question_answered": False,
            "reasoning": ""
        }
        
    except Exception as e:
        print(f"[ERROR] OpenAI API exception: {e}")
        
        return {
            "score": 0,
            "is_question_answered": False,
            "reasoning": ""
        }
