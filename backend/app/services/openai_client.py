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

def call_openai_therapy_model(assembly_data, deepface_data, questionnaires, past_turns):
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
        recent = past_turns[-5:]
        past_conversation = "\n=== PAST CONVERSATION ===\n"
        past_conversation += "READ THIS CAREFULLY - Don't repeat these questions:\n\n"
        
        for i, turn in enumerate(recent, 1):
            user_msg = turn.get('user_transcript', '')
            bot_msg = turn.get('bot_reply', '')
            past_conversation += f"Turn {i}: User: {user_msg}\nYou: {bot_msg}\n\n"
        
        past_conversation += "=== END PAST CONVERSATION ===\n\n"

    message = f"""
=== CRITICAL: READ THIS FIRST ===
The user will be FRUSTRATED if you repeat questions. Before asking anything, check what you already asked below.

=== PAST CONVERSATION (CHECK WHAT YOU ALREADY ASKED) ===
{past_conversation if past_conversation else "No previous conversation yet."}

=== CURRENT USER MESSAGE ===
User just said: "{user_transcript}"

Audio: {sentiment} ({sentiment_confidence} confidence)
Video: {dominant_emotion}

=== UNANSWERED QUESTIONS ===
{questionnaires}

=== YOUR TASK ===
1. Look at PAST CONVERSATION above - what symptoms did you already ask about?
2. Score ALL symptoms in the current user message
3. Ask about ONE COMPLETELY NEW symptom you haven't asked about yet
4. Return ONLY valid JSON

EXAMPLE OF WHAT NOT TO DO:
- Past conversation shows you asked about sleep → DON'T ask about sleep again
- Past conversation shows you asked about appetite → DON'T ask about appetite again
- Past conversation shows you asked about concentration → DON'T ask about concentration again

Pick a NEW symptom!
"""

    try:
        print(f"[DEBUG] Calling OpenAI with transcript: {user_transcript[:100]}...")
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=500,
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
                print("[DEBUG] ✅ JSON parsed successfully")
                
                # Validate structure
                if not parsed.get("bot_reply"):
                    print("[WARNING] Missing bot_reply field")
                    parsed["bot_reply"] = "Can you tell me more about how you've been feeling?"
                
                if not isinstance(parsed.get("diagnostic_mapping"), dict):
                    print("[WARNING] Invalid diagnostic_mapping")
                    parsed["diagnostic_mapping"] = {}
                
                if parsed.get("diagnostic_mapping"):
                    print(f"[DEBUG] Scored: {parsed['diagnostic_mapping']}")
                
                return parsed
                
            except json.JSONDecodeError as e:
                print(f"[DEBUG] ❌ JSON parse failed: {e}")
                print(f"[DEBUG] Attempting json_repair...")
                
                try:
                    repaired = repair_json(json_str)
                    parsed = json.loads(repaired)
                    print("[DEBUG] ✅ JSON repaired successfully")
                    return parsed
                except Exception as repair_error:
                    print(f"[DEBUG] ❌ Repair failed: {repair_error}")
        else:
            print("[DEBUG] ❌ NO JSON found in response")
        
        # Fallback
        print("[WARNING] Using fallback response")
        return {
            "bot_reply": "How's your sleep been lately?",
            "diagnostic_mapping": {},
            "diagnostic_match": False,
            "conversation_type": "diagnostic"
        }
        
    except Exception as e:
        print(f"[ERROR] ❌ OpenAI API exception: {e}")
        
        return {
            "bot_reply": "What about your energy levels?",
            "diagnostic_mapping": {},
            "diagnostic_match": False,
            "conversation_type": "diagnostic"
        }