import os
from openai import OpenAI
from app.utils.openai_prompt_templates import CHATBOT_SYSTEM_PROMPT
from dotenv import load_dotenv
import re
import json
from json_repair import repair_json

load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Define allowed question IDs
VALID_PHQ9_IDS = [f"Q{i}_PHQ9" for i in range(1, 10)]
VALID_GAD7_IDS = [f"Q{i}_GAD7" for i in range(1, 8)]
VALID_PCL5_IDS = [f"Q{i}_PCL5" for i in range(1, 21)]

def validate_question_ids(diagnostic_mapping):
    """Validate and fix question IDs in diagnostic mapping"""
    if not diagnostic_mapping:
        return {}
    
    cleaned = {}
    
    for assessment, questions in diagnostic_mapping.items():
        if assessment not in ["PHQ-9", "GAD-7", "PCL-5"]:
            print(f"[WARNING] Invalid assessment: {assessment}")
            continue
        
        valid_questions = {}
        
        for question_id, data in questions.items():
            # Check if question ID is valid
            is_valid = False
            
            if assessment == "PHQ-9" and question_id in VALID_PHQ9_IDS:
                is_valid = True
            elif assessment == "GAD-7" and question_id in VALID_GAD7_IDS:
                is_valid = True
            elif assessment == "PCL-5" and question_id in VALID_PCL5_IDS:
                is_valid = True
            
            if is_valid:
                valid_questions[question_id] = data
            else:
                print(f"[ERROR] INVALID QUESTION ID DETECTED: {question_id} in {assessment}")
                print(f"[ERROR] This question does not exist!")
                
                # Try to map to correct question based on context
                # Extract number from invalid ID
                match = re.search(r'Q(\d+)_', question_id)
                if match:
                    num = int(match.group(1))
                    
                    # If number is > max, try to infer correct question
                    if assessment == "PHQ-9" and num > 9:
                        print(f"[FIX] Q{num}_PHQ9 doesn't exist. PHQ-9 only has 9 questions.")
                        print(f"[FIX] Skipping this invalid score.")
                    elif assessment == "GAD-7" and num > 7:
                        print(f"[FIX] Q{num}_GAD7 doesn't exist. GAD-7 only has 7 questions.")
                        print(f"[FIX] Skipping this invalid score.")
        
        if valid_questions:
            cleaned[assessment] = valid_questions
    
    return cleaned

def call_openai_therapy_model(assembly_data, deepface_data, questionnaires, past_turns, session_status="active"):
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
    
    # Format past conversation
    past_conversation = ""
    if past_turns and len(past_turns) > 0:
        recent = past_turns[-10:]
        past_conversation = "\n=== PAST CONVERSATION ===\n"
        past_conversation += "READ THIS CAREFULLY - Don't repeat these questions:\n\n"
        
        for i, turn in enumerate(recent, 1):
            user_msg = turn.get('user_transcript', '')
            bot_msg = turn.get('bot_reply', '')
            past_conversation += f"Turn {i}: User: {user_msg}\nYou: {bot_msg}\n\n"
        
        past_conversation += "=== END PAST CONVERSATION ===\n\n"

    # Choose message format based on session status
    if session_status == "resumed":
        mode_indicator = "MODE: FREE-TALK"
        print("[DEBUG] Using FREE-TALK mode")
    else:
        mode_indicator = "MODE: DIAGNOSTIC"
        print("[DEBUG] Using DIAGNOSTIC mode")

    # Build task instructions based on mode
    if session_status == "resumed":
        task_instructions = "Remember: FREE-TALK mode - be supportive, don't ask diagnostic questions, return empty diagnostic_mapping"
    else:
        task_instructions = """1. Look at PAST CONVERSATION above - what symptoms did you already ask about?
2. Score ALL symptoms in the current user message (including score 0 for "no")
3. Ask about ONE COMPLETELY NEW symptom you haven't asked about yet
4. Return ONLY valid JSON

CRITICAL REMINDER BEFORE YOU OUTPUT:
- PHQ-9 has ONLY 9 questions: Q1_PHQ9 through Q9_PHQ9
- GAD-7 has ONLY 7 questions: Q1_GAD7 through Q7_GAD7  
- PCL-5 has ONLY 20 questions: Q1_PCL5 through Q20_PCL5

DO NOT USE: Q10_PHQ9, Q11_PHQ9, Q12_PHQ9, Q8_GAD7, Q21_PCL5, etc. THEY DO NOT EXIST!

Pick a NEW symptom!"""

    # Build questionnaires section
    questionnaires_section = ""
    if session_status != "resumed":
        questionnaires_section = f"""
=== UNANSWERED QUESTIONS ===
{questionnaires}
"""

    message = f"""
{mode_indicator}

{past_conversation if past_conversation else "No previous conversation yet."}

=== CURRENT USER MESSAGE ===
User just said: "{user_transcript}"

Audio: {sentiment} ({sentiment_confidence} confidence)
Video: {dominant_emotion}

{questionnaires_section}

=== YOUR TASK ===
{task_instructions}
"""

    try:
        print(f"[DEBUG] Calling OpenAI with transcript: {user_transcript[:100]}...")
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.0,  
            messages=[
                {"role": "system", "content": CHATBOT_SYSTEM_PROMPT},
                {"role": "user", "content": message}
            ]
        )

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
                
                if not isinstance(parsed.get("diagnostic_mapping"), dict):
                    print("[WARNING] Invalid diagnostic_mapping")
                    parsed["diagnostic_mapping"] = {}
                
                # VALIDATE AND CLEAN QUESTION IDs
                if parsed.get("diagnostic_mapping"):
                    original_mapping = parsed["diagnostic_mapping"]
                    cleaned_mapping = validate_question_ids(original_mapping)
                    
                    if cleaned_mapping != original_mapping:
                        print("[WARNING] REMOVED INVALID QUESTION IDs!")
                        print(f"[WARNING] Original had {sum(len(q) for q in original_mapping.values())} questions")
                        print(f"[WARNING] Cleaned has {sum(len(q) for q in cleaned_mapping.values())} questions")
                    
                    parsed["diagnostic_mapping"] = cleaned_mapping
                
                # Force conversation_type based on session_status
                if session_status == "resumed":
                    parsed["conversation_type"] = "free_talk"
                    parsed["diagnostic_mapping"] = {}
                    print("[DEBUG] Forced free_talk mode")
                
                if parsed.get("diagnostic_mapping"):
                    print(f"[DEBUG] Scored: {parsed['diagnostic_mapping']}")
                else:
                    print("[DEBUG] No scores in this response")
                
                return parsed
                
            except json.JSONDecodeError as e:
                print(f"[DEBUG] JSON parse failed: {e}")
                print(f"[DEBUG] Attempting json_repair...")
                
                try:
                    repaired = repair_json(json_str)
                    parsed = json.loads(repaired)
                    print("[DEBUG] JSON repaired successfully")
                    
                    # Validate repaired JSON too
                    if parsed.get("diagnostic_mapping"):
                        parsed["diagnostic_mapping"] = validate_question_ids(parsed["diagnostic_mapping"])
                    
                    if session_status == "resumed":
                        parsed["conversation_type"] = "free_talk"
                        parsed["diagnostic_mapping"] = {}
                    
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
                "diagnostic_mapping": {},
                "diagnostic_match": False,
                "conversation_type": "free_talk"
            }
        else:
            return {
                "bot_reply": "How's your sleep been lately?",
                "diagnostic_mapping": {},
                "diagnostic_match": False,
                "conversation_type": "diagnostic"
            }
        
    except Exception as e:
        print(f"[ERROR] OpenAI API exception: {e}")
        
        if session_status == "resumed":
            return {
                "bot_reply": "I'm here for you. What's been on your mind?",
                "diagnostic_mapping": {},
                "diagnostic_match": False,
                "conversation_type": "free_talk"
            }
        else:
            return {
                "bot_reply": "What about your energy levels?",
                "diagnostic_mapping": {},
                "diagnostic_match": False,
                "conversation_type": "diagnostic"
            }
