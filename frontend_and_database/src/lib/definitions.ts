export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
};

export const MOODS = ['Happy', 'Calm', 'Neutral', 'Sad', 'Anxious'] as const;
export type Mood = (typeof MOODS)[number];

export type JournalEntry = {
  id: string;
  createdAt: any; // Allow serverTimestamp
  mood: Mood;
  content: string;
  summary?: string; // Make summary optional
  userId: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  timestamp: any;
  
  //Audio/Video data (for user messages)
  audio_sentiment?: string;
  audio_confidence?: number;
  video_emotions?: string[];
  
  // Diagnostic data (for assistant messages)
  conversation_type?: 'free_talk' | 'diagnostic' | 'transition' | 'crisis';
  diagnostic_match?: boolean;
  diagnostic_scores?: Record<string, number>; // Flat: {"Q1_PHQ9": 2}
  metadata?: {
    conversation_type: string;
    crisis_detected: boolean;
    audio_video_alignment: string;
    confidence_level: string;
    next_suggested_focus: string | null;
  };
  
  // DEPRECATED: Keeping for backward compatibility
  classification?: {
    ptsdSymptoms: string[];
    gadSymptoms: string[];
    mmdSymptoms: string[];
    summary: string;
  };
  selfHarmWarning?: string;
  sessionId?: string;
};

export type MoodDataItem = {
  mood: Mood;
  count: number;
};

export type SessionStatus = 
  | 'active'
  | 'ended-premature' 
  | 'ended-complete'
  | 'resumed';

  
export interface AssessmentScore {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  severity: string;
  color: string;
}

export interface DetailedSymptom {
  disorder: string;
  likelihood: number;
  symptomsReported: string[];
}

export interface SummaryData {
  assessments: AssessmentScore[];
  clinicalInsight: string;
  detailedSymptoms: DetailedSymptom[];
}

export type Session = {
  id: string;
  name: string;
  status: SessionStatus;
  createdAt: any;
  endedAt?: any;
  resumedAt?: any;
  completionPercentage: number;
  totalQuestions: number;
  answeredQuestions: number;
  summaryData?: SummaryData;
  isTemp?: boolean; 
};

export interface SessionSummaryData {
  sessionId: string;
  timestamp: string;
  assessments: Array<{
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
    severity: string;
    color: string;
  }>;
  comorbidityInsight: string;
  detailedSymptoms: Array<{
    disorder: string;
    likelihood: number;
    symptomsReported: string[];
  }>;
}

type DiagnosticMapping = Record<string, Record<string, { score: number }>>;