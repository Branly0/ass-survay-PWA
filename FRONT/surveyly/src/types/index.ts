export type SurveyStatus = 'active' | 'draft' | 'closed';

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'
  | 'checkbox'
  | 'rating'
  | 'yes_no';

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[];      // for multiple_choice and checkbox
  maxRating?: number;      // for rating
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  status: SurveyStatus;
  questions: Question[];
  createdAt: string;       // ISO date string
  updatedAt: string;
}

export interface Answer {
  questionId: string;
  value: string | string[]; // string[] for checkbox
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: string;     // ISO date string
  synced: boolean;         // false = not yet in backup
}

export interface BackupMeta {
  lastBackupAt: string | null;   // ISO date string
  lastBackupStatus: 'success' | 'failed' | 'pending' | null;
}


export interface Owner {
  email: string;
  token: string;         // JWT
  refreshToken: string;  // refresh token
}