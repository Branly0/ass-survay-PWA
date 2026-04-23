export type SurveyStatus = 'active' | 'draft' | 'close'  // 'close' not 'closed'

export type QuestionType = 'long_text'

export interface Question {
  id: string
  type: QuestionType
  label: string
  required: boolean
}

export interface Survey {
  id: string
  title: string
  description: string
  status: SurveyStatus
  questions: Question[]
  createdAt: string
  updatedAt: string
}

export interface Answer {
  questionId: string
  value: string
}

export interface Response {
  id: string
  surveyId: string
  answers: Answer[]
  submittedAt: string
  synced: boolean
}

export interface BackupMeta {
  lastBackupAt: string | null
  lastBackupStatus: 'success' | 'failed' | 'pending' | null
}

export interface Owner {
  email: string
  token: string
  refreshToken: string
}