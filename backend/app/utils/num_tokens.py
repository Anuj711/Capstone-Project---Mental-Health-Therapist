
import tiktoken
from utils.openai_prompt_templates import CHATBOT_SYSTEM_PROMPT

output_tokens = """{
  "emergency": false,
  "turn_id": "t_03",
  "assemblyAI_output": {
    "transcript": "My day was okay. I woke up, went to work. It was raining today, so it was really gloomy and gray and. " \
              "Yeah, every day is the same. Nothing really different. It's okay.",
    "sentiment": "negative",
    "confidence": 0.90
  },
  "deepface_output": {
    "age": 28,
    "gender": "male",
    "dominant_emotion": "sad"
  },
  "openai_output": {
    "bot_reply": "It sounds like this anxiety has been affecting both your rest and focus. That must be exhausting. Would you say you’ve lost interest in things you usually enjoy?",
    "next_question": "Over the last two weeks, how often have you had little interest or pleasure in doing things?",
    "diagnostic_mapping": {
      "PHQ9": ["Little interest or pleasure in doing things"]
    },
    "send_probabilties": {
      "PHQ9": ["Little interest or pleasure in doing things"]
    },
    "send_probabilties": {
      "PHQ9": ["Little interest or pleasure in doing things"]
    }
  },
  "timestamp": "2025-11-06T21:16:00Z"
}"""

input_tokens = """{
  "session_id": "sess_001",
  "user_id": "abc123",
  "video_url": "https://firebasestorage.googleapis.com/v0/b/app/o/turn3.mp4?alt=media",
  "past_turns": [
    {
      "turn_id": "t_01",
      "user_transcript": "My day was okay. I woke up, went to work. It was raining today, so it was really gloomy and gray and. " \
              "Yeah, every day is the same. Nothing really different. It's okay.",
      "bot_reply": "Thanks for sharing that. It sounds like anxiety has been difficult. When did you first start noticing these feelings?"
    },
    {
      "turn_id": "t_02",
      "user_transcript": "I think it's been about three months now, especially at night when I can’t relax.",
      "bot_reply": "That sounds really tough, especially when it affects your nights. Have these feelings been interfering with your sleep or daily focus?"
    }
  ],
  "questionnaires": {
    "PHQ9": [
      "Little interest or pleasure in doing things",
      "Feeling down, depressed, or hopeless",
      "Trouble falling or staying asleep"
    ],
    "GAD7": [
      "Feeling nervous, anxious, or on edge",
      "Trouble relaxing"
    ],
    "PCL5": [
      "Having upsetting dreams that replay part of a stressful experience",
      "Feeling very upset when something reminds you of a stressful experience"
    ]
  },
  "trigger_words": ["suicide", "kill myself", "hopeless", "end it all"]
}"""

questions = questionnaires_json = """
{
  "questionnaires": {
    "PHQ‑9": {
      "q1": {
        "question_text": "Little interest or pleasure in doing things",
        "score_range": [0,1,2,3]
      },
      "q2": {
        "question_text": "Feeling down, depressed, or hopeless",
        "score_range": [0,1,2,3]
      },
      "q3": {
        "question_text": "Trouble falling or staying asleep, or sleeping too much",
        "score_range": [0,1,2,3]
      },
      "q4": {
        "question_text": "Feeling tired or having little energy",
        "score_range": [0,1,2,3]
      },
      "q5": {
        "question_text": "Poor appetite or overeating",
        "score_range": [0,1,2,3]
      },
      "q6": {
        "question_text": "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
        "score_range": [0,1,2,3]
      },
      "q7": {
        "question_text": "Trouble concentrating on things, such as reading the newspaper or watching television",
        "score_range": [0,1,2,3]
      },
      "q8": {
        "question_text": "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
        "score_range": [0,1,2,3]
      },
      "q9": {
        "question_text": "Thoughts that you would be better off dead or of hurting yourself in some way",
        "score_range": [0,1,2,3]
      },
      "q10": {
        "question_text": "If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
        "score_range": [0,1,2,3]
      }
    },
    "GAD‑7": {
      "q1": {
        "question_text": "Feeling nervous, anxious or on edge",
        "score_range": [0,1,2,3]
      },
      "q2": {
        "question_text": "Not being able to stop or control worrying",
        "score_range": [0,1,2,3]
      },
      "q3": {
        "question_text": "Worrying too much about different things",
        "score_range": [0,1,2,3]
      },
      "q4": {
        "question_text": "Trouble relaxing",
        "score_range": [0,1,2,3]
      },
      "q5": {
        "question_text": "Being so restless that it's hard to sit still",
        "score_range": [0,1,2,3]
      },
      "q6": {
        "question_text": "Becoming easily annoyed or irritable",
        "score_range": [0,1,2,3]
      },
      "q7": {
        "question_text": "Feeling afraid as if something awful might happen",
        "score_range": [0,1,2,3]
      },
      "q8": {
        "question_text": "If you checked any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
        "score_range": [0,1,2,3]
      }
    },
    "PCL‑5": {
      "q1": {
        "question_text": "Repeated, disturbing, and unwanted memories of the stressful experience?",
        "score_range": [0,1,2,3,4]
      },
      "q2": {
        "question_text": "Repeated, disturbing dreams of the stressful experience?",
        "score_range": [0,1,2,3,4]
      },
      "q3": {
        "question_text": "Suddenly feeling or acting as if the stressful experience were happening again (as if you were actually back there)?",
        "score_range": [0,1,2,3,4]
      },
      "q4": {
        "question_text": "Feeling very upset when something reminded you of the stressful experience?",
        "score_range": [0,1,2,3,4]
      },
      "q5": {
        "question_text": "Having strong physical reactions when something reminded you of the stressful experience (for example: heart pounding, trouble breathing, sweating)?",
        "score_range": [0,1,2,3,4]
      },
      "q6": {
        "question_text": "Avoiding memories, thoughts, or feelings related to the stressful experience?",
        "score_range": [0,1,2,3,4]
      },
      "q7": {
        "question_text": "Avoiding external reminders of the stressful experience (for example: people, places, conversations, activities, objects, or situations)?",
        "score_range": [0,1,2,3,4]
      },
      "q8": {
        "question_text": "Trouble remembering important parts of the stressful experience?",
        "score_range": [0,1,2,3,4]
      },
      "q9": {
        "question_text": "Having strong negative beliefs about yourself, other people, or the world (for example: \"I am bad\", \"no one can be trusted\", \"the world is completely dangerous\").",
        "score_range": [0,1,2,3,4]
      },
      "q10": {
        "question_text": "Blaming yourself or someone else for the stressful experience or what happened after it?",
        "score_range": [0,1,2,3,4]
      },
      "q11": {
        "question_text": "Having strong negative feelings such as fear, horror, anger, guilt, or shame?",
        "score_range": [0,1,2,3,4]
      },
      "q12": {
        "question_text": "Loss of interest in activities that you used to enjoy?",
        "score_range": [0,1,2,3,4]
      },
      "q13": {
        "question_text": "Feeling distant or cut off from other people?",
        "score_range": [0,1,2,3,4]
      },
      "q14": {
        "question_text": "Being unable to feel emotionally close to others?",
        "score_range": [0,1,2,3,4]
      },
      "q15": {
        "question_text": "Having a sense of a foreshortened future (for example: you might not expect to have a career, marriage, children, or a normal life span)?",
        "score_range": [0,1,2,3,4]
      },
      "q16": {
        "question_text": "Trouble falling or staying asleep?",
        "score_range": [0,1,2,3,4]
      },
      "q17": {
        "question_text": "Feeling irritable or having angry outbursts?",
        "score_range": [0,1,2,3,4]
      },
      "q18": {
        "question_text": "Having difficulty concentrating?",
        "score_range": [0,1,2,3,4]
      },
      "q19": {
        "question_text": "Being “superalert”, watchful, or on guard?",
        "score_range": [0,1,2,3,4]
      },
      "q20": {
        "question_text": "Feeling jumpy or easily startled?",
        "score_range": [0,1,2,3,4]
      },
      "q21": {
        "question_text": "Having difficulty concentrating because you are thinking about the stressful experience?",
        "score_range": [0,1,2,3,4]
      },
      "q22": {
        "question_text": "Avoiding letting yourself get upset when you think about or are reminded of the stressful experience?",
        "score_range": [0,1,2,3,4]
      },
      "q23": {
        "question_text": "Feeling distant or cut off from others (for example: feeling you don’t matter, that you’re disconnected)?",
        "score_range": [0,1,2,3,4]
      },
      "q24": {
        "question_text": "Experiencing physical reactions (for example: sweating, heart pounding) when reminded of the stressful experience?",
        "score_range": [0,1,2,3,4]
      },
      "q25": {
        "question_text": "How much have these problems bothered you in the past month?",
        "score_range": [0,1,2,3,4]
      }
    }
  }
}
"""


transcript = "My day was okay. I woke up, went to work. It was raining today, so it was really gloomy and gray and. " \
              "Yeah, every day is the same. Nothing really different. It's okay."

test_transcript = CHATBOT_SYSTEM_PROMPT + transcript + output_tokens + input_tokens + questions


def num_tokens_from_string(string: str, encoding_name: str) -> int:
    """Returns the number of tokens in a text string."""
    encoding = tiktoken.get_encoding(encoding_name)
    num_tokens = len(encoding.encode(string))
    return num_tokens

# Example usage
num_tokens = num_tokens_from_string(test_transcript, "cl100k_base")
print(num_tokens)