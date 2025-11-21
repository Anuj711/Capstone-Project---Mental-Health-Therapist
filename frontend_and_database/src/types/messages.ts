export type Message = {
  role: "user" | "assistant";
  text: string;
  timestamp: any;
  userId: string;
  
  // Optional fields for user messages
  audio_sentiment?: string;
  audio_confidence?: number;
  video_emotions?: string[];
  
  // Optional fields for assistant messages
  conversation_type?: "free_talk" | "diagnostic" | "crisis";
  diagnostic_match?: boolean;
  diagnostic_scores?: Record<string, number>;
  metadata?: {
    conversation_type: string;
    crisis_detected: boolean;
    audio_video_alignment: string;
    confidence_level: string;
    next_suggested_focus: string | null;
  };
};