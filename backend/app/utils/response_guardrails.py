import random

def get_natural_question(question_id, raw_text):
    """
    Converts raw diagnostic text into a natural conversational question.
    Handles PHQ-9, GAD-7 (2 weeks) and PCL-5 (1 month).
    """
    if question_id == None:
        # Assume end
        return "We've covered all the specific areas I wanted to check on today. Thank you for being so open with me. You can now view your session summary."

    # Determine the timeframe based on the ID prefix
    print(question_id, raw_text)
    if "PCL" in question_id.upper():
        timeframe = "over the last month"
    elif "GAD" in question_id.upper():
        timeframe = "over the last two weeks"
    else:
        timeframe = "over the last 2 weeks"

    # Clean the raw text
    clean_text = raw_text.split(":")[-1].strip()
    
    # It should end with a question mark correctly
    if not clean_text.endswith("?"):
        clean_text += "?"

    # natural responses
    bridges = [
        f"I'd also like to ask, {timeframe}, have you been experiencing",
        f"Moving on, {timeframe}, how much have you been bothered by",
        f"Checking in on another area: {timeframe}, have you noticed",
        f"Thinking about the {timeframe.replace('over the ', '')}, have you had any"
    ]
    
    # Choose a random natural reponse
    return f"{random.choice(bridges)} {clean_text.lower()}"