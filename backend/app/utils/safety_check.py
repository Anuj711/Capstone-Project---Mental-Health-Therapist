
TRIGGER_WORDS = [
  "suicide",
  "kill myself",
  "end my life",
  "take my life",
  "want to die",
  "don't want to live",
  "can't go on",
  "give up on life",
  "life isn't worth living",
  "self harm",
  "hurt myself",
  "cut myself",
  "bleed",
  "OD",
  "overdose",
  "hang myself",
  "jump off",
  "drown myself",
  "shoot myself"
]


def check_trigger_words(transcript: str):
    lower_text = transcript.lower()
    for word in TRIGGER_WORDS:
        for trans_word in lower_text.split(" "):
          if word.lower() == trans_word:
              return True, word
    return False, None

