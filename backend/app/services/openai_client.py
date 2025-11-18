import os
from openai import OpenAI
from app.utils.openai_prompt_templates import CHATBOT_SYSTEM_PROMPT
from dotenv import load_dotenv
import re, json
from json_repair import repair_json

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def call_openai_therapy_model(assembly_data, deepface_data, questionnaires, past_turns):
    user_transcript = assembly_data.get("transcript", "")
    sentiment = assembly_data.get("sentiment", "")
    sentiment_confidence = assembly_data.get("sentiment_confidence", "")
    emotion = deepface_data.get("dominant_emotion", "")
    # TODO: decide whether to keep demographics or not
    demographics = {k:v for k,v in deepface_data.items() if k in ["age", "gender", "race"]}

    message = f"""
        User transcript: {user_transcript}
        Speech sentiment: {sentiment}
        Speech sentiment confidence: {sentiment_confidence}
        Facial emotion confidence: {emotion}
        Demographics: {demographics}
        Past turns: {past_turns}
        Unanswered Questionnaire items: {questionnaires}
        """

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.7,
        messages=[
            {"role": "system", "content": CHATBOT_SYSTEM_PROMPT},
            {"role": "user", "content": message}
        ]
    )

    # Sometimes model wraps JSON in markdown
    raw = response.choices[0].message.content.strip()
    match = re.search(r'\{[\s\S]*\}', raw)

    if match:
        json_str = match.group(0)
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"[WARN] Invalid JSON, attempting repair: {e}")
            repaired = repair_json(json_str)
            parsed = json.loads(repaired)
    else:
        parsed = {
            "bot_reply": "Sorry, I didn't quite understand that. Can you try recording another video? Here are some tips to make sure I can understand you better:"\
                        " - Make sure your face is visible if recording video" \
                        " - Make sure your microphone is not covered",
            "diagnostic_mapping": None,
            "diagnostic_match": False
        }

    return parsed
