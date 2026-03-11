import json
from pathlib import Path
import pandas as pd
from app.utils.load_symptom_overlap_mapping import SYMPTOM_OVERLAP_DF

UNANSWERED_QUESTION_IDS = (
    [f'PHQ-9_Q{i}' for i in range(1, 10)] +
    [f'GAD-7_Q{i}' for i in range(1, 8)] +
    [f'PCL-5_Q{i}' for i in range(1, 21)]
)

#TODO: Pass both QUESTION_TRACKER struct and UNANSWERED_QUESTION_IDS struct to firestore and retrieve from firestore, to know what question we are on. This will
#ensure we don't overwrite other users' answers due to these structs being global variable 
QUESTION_TRACKER = {
    "current_qs_index": 0,
    "next_qs_index": 1,
    "current_qs_id": UNANSWERED_QUESTION_IDS[0],
    "next_qs_id": UNANSWERED_QUESTION_IDS[1]
}

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "static" / "questionnaires"
QUESTIONNAIRES = {
    "PHQ-9": json.load(open(f'{CSV_PATH}/phq9.json')),
    "GAD-7": json.load(open(f'{CSV_PATH}/gad7.json')),
    "PCL-5": json.load(open(f'{CSV_PATH}/pcl5.json'))
}

def get_questionnaire_score_range(qid):
    """ Example
    Input: 'PHQ-9_Q3'
    Returns: 
        { "label": "Not at all", "value": 0 },
        { "label": "Several days", "value": 1 },
        { "label": "More than half the days", "value": 2 },
        { "label": "Nearly every day", "value": 3 }
    """
    scale_name, q_part = qid.split('_')
    scale = QUESTIONNAIRES.get(scale_name)
    score_range = scale["response_options"]
    return score_range

def get_question_data(qid):
    """ Example
    Input: 'PHQ-9_Q3'
    Returns: The specific question text and response options
    """
    # Split questionnaire name from the question number
    scale_name, q_part = qid.split('_')
    q_index = int(q_part.replace('Q', '')) # Get qs number

    scale = QUESTIONNAIRES.get(scale_name)

    # find qs in questinnaires that matches id
    question = next((q for q in scale['questions'] if q['id'] == q_index), None)

    return f"{scale['time_window']}: {question['text']}"

def append_question_to_unanswered_list(qid):
    UNANSWERED_QUESTION_IDS.append(qid)

def mark_question_answered(qid):
    UNANSWERED_QUESTION_IDS.remove(qid)

def map_score(source_score, source_max, target_max):
    """Maps a score from one range to another proportionally."""
    if source_score is None:
        return None
    return round(source_score * (target_max / source_max))

def get_overlapping_updates(current_qid, current_score):
    """ Example
    Input: 'PHQ-9_Q1', 3
    Returns: [{'PCL-5_Q12': 4}]
    """
    scale_name, q_num = current_qid.split('_')
    updates = []

    # Filter for the row where this specific question exists 
    mask = (SYMPTOM_OVERLAP_DF[scale_name] == q_num) & (SYMPTOM_OVERLAP_DF['Overlap Type'] == 'FULL')
    row = SYMPTOM_OVERLAP_DF[mask]

    if not row.empty:
        # Get the max possible score for current qs scale
        source_max = get_questionnaire_score_range(current_qid)[-1]['value']

        # Check the other columns in the same row for overlaps
        for target_scale in ["PHQ-9", "GAD-7", "PCL-5"]:
            if target_scale != scale_name:
                target_q = row.iloc[0][target_scale]
                
                if pd.notna(target_q):
                    target_qid = f"{target_scale}_{target_q}"
                    target_max = get_questionnaire_score_range(target_qid)[-1]['value']
                    
                    # Map the score proportionally
                    new_score = map_score(current_score, source_max, target_max)
                    updates.append({target_qid: new_score})
                    
    return updates

def update_question_tracker():
    """
    Refreshes the QUESTION_TRACKER based on the current 
    state of UNANSWERED_QUESTION_IDS.
    """
    global QUESTION_TRACKER
    
    # Check if there are any questions left
    count = len(UNANSWERED_QUESTION_IDS)
    
    if count == 0:
        # Handle the end of the questionnaire
        QUESTION_TRACKER = {
            "current_qs_index": None,
            "next_qs_index": None,
            "current_qs_id": None,
            "next_qs_id": None,
            "completed": True
        }
    else:
        # Always grab the first item for "current" 
        # because the previous current was removed
        QUESTION_TRACKER["current_qs_index"] = 0
        QUESTION_TRACKER["current_qs_id"] = UNANSWERED_QUESTION_IDS[0]
        
        # Check if there is a next question available
        if count > 1:
            QUESTION_TRACKER["next_qs_index"] = 1
            QUESTION_TRACKER["next_qs_id"] = UNANSWERED_QUESTION_IDS[1]
        else:
            # This is the last question
            QUESTION_TRACKER["next_qs_index"] = None
            QUESTION_TRACKER["next_qs_id"] = None
            
    return QUESTION_TRACKER