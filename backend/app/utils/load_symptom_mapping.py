import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "static" / "questionnaires" / "symptom_mapping.csv"

def load_mapping():
    """Loads the CSV and returns a cleaned DataFrame."""
    try:
        df = pd.read_csv(CSV_PATH)
        df.set_index("Symptom Concept", inplace=True)
        return df
    except FileNotFoundError:
        print(f"Error: Could not find mapping file at {CSV_PATH}")
        return None

SYMPTOM_MAP = load_mapping()
