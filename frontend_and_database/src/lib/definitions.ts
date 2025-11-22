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
  mediaUrl?: string; // for displaying on the client
  mediaMimeType?: string; // for displaying on the client
  timestamp: any; // Allow serverTimestamp
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

// Add these types at the end
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