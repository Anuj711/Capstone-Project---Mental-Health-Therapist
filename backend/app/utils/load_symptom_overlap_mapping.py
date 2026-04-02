import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "static" / "questionnaires" / "symptom_overlap_mapping.csv"
SYMPTOM_OVERLAP_DF = pd.read_csv(CSV_PATH)

def get_mapping():
    """Accessor function to get the dataframe."""
    return SYMPTOM_OVERLAP_DF
