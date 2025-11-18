from flask import Flask, request, jsonify
from dotenv import load_dotenv
import numpy as np # Import numpy here

from app.services.assembly_ai import analyze_audio
from app.services.deepface_service import analyze_video
from app.utils.safety_check import check_trigger_words
from app.services.openai_client import call_openai_therapy_model
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

    # Crucial step: Handle NumPy floats (float32, float64, etc.)
    elif isinstance(data, np.floating):
        return float(data)

    # Handle NumPy integers 
    elif isinstance(data, np.integer):
        return int(data)

    # Handle NumPy arrays
    elif isinstance(data, np.ndarray):
        return data.tolist()

    return data

@app.route("/")
def home():
    return "Capstone API is running!"

#Main API that frontend will call -- POST -  does everything in backend (at a high level it takes in user video and sends back the chatbot response)
@app.route("/analyze_turn", methods=["POST"])
def analyze_turn():
    # Get the JSON files from the people who call this API (Frontend dev) 
    # Reference this for details https://docs.google.com/document/d/1puUwAbnJJj2ewmRC75_HooBzAynsvHOO6uR1tnbGAAM/edit?tab=t.0#heading=h.2jed7gsbkiph
    data = request.get_json()

    # Grab the questionnaires and past turn data from the JSON payload
    # For reference of what questionnaires at turn 0 should look like: app\static\questionnaires\*.json
    # Backend WILL EXPECT frontend to send these questionnaires accurately --> passed to OpenAI
    questionnaires = data.get("questionnaires", {})
    past_turns = data.get("past_turns", [])
    # Grab video file from JSON data
    video_file = data.get("video_url", {})
    if not video_file:
        # If video file is missing, return a 400 invalid parameter error
        return jsonify({"error": "Missing video url"}), 400

    # Pass video file to this function to analyze the audio using AssemblyAI
    assembly_data = prepare_data_for_json(analyze_audio(video_file))
    # Pass video file to this function to analyze the video using DeepFace
    deepface_data = prepare_data_for_json(analyze_video(video_file))

    # Grab the transcript from AssemblyAI output
    transcript = assembly_data.get("transcript")
    if not transcript:
        # If AssemblyAI failed and transcript doesn't exist, it errors out
        return jsonify({"error": "Missing transcript"}), 400

    # Step 1: Trigger word check
    found_trigger, word = check_trigger_words(transcript) # TODO: fix this function to consider overlapping words and phrases
    if found_trigger:
        # If it finds a trigger phrase, it exits early with a default chatbot response
        emergency_response = {
            "assemblyAI_output": assembly_data,
            "deepface_output": deepface_data,
            "bot_reply": "It sounds like you might be in distress. Please reach out to immediate help or call a trusted person right now. You're not alone.",
            "diagnostic_match": False,
            "conversation_type": "emergency",
            "diagnostic_mapping": [],
            "emergency": True,
            "triggered_word": word
        }
        return jsonify(emergency_response), 200

    # Step 2: Call OpenAI model --> gives all diagnosis and chatbot response 
    model_output = call_openai_therapy_model(assembly_data, deepface_data, questionnaires, past_turns)

    # Step 3: Return final JSON for Firestore & frontend
    # Reference this for details https://docs.google.com/document/d/1puUwAbnJJj2ewmRC75_HooBzAynsvHOO6uR1tnbGAAM/edit?tab=t.0#heading=h.2jed7gsbkiph ("backend returns:") 
    response_payload = {
        "assemblyAI_output": assembly_data,
        "deepface_output": deepface_data,
        "bot_reply": model_output.get("bot_reply"),
        "diagnostic_match": False if not model_output.get("diagnostic_mapping") else True,
        "conversation_type": model_output.get("conversation_type", "free_talk"),
        "diagnostic_mapping": model_output.get("diagnostic_mapping", {}),
        "emergency": False
    }

    return jsonify(response_payload), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)

