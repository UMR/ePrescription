/**
 * Canonical API request/response models matching backend contracts
 */

// ============ Interactive Conversation Models ============

export interface FollowUpAnswer {
  Question: string;
  Answer: string;
}

export interface SymptomRequest {
  Symptom: string;
  Age?: number;
  Gender?: string;
  Temperature?: number;
  BloodPressure?: string;
  HeartRate?: number;
  Answers?: FollowUpAnswer[];
  SkippedQuestions?: string[];
  // Frontend-only flags (not sent to backend if undefined)
  summaryOnly?: boolean;
  requestedAdditionalQuestions?: number;
}

export interface QuestionResponse {
  type: 'question';
  question: string;
  options?: string[];
}

export interface SummaryResponse {
  type: 'summary';
  Symptom?: string;
  Answers?: FollowUpAnswer[];
  summaryText?: string;
  SummaryText?: string; // Handle both camelCase and PascalCase
}

export interface ErrorResponse {
  type: 'error';
  errorCode: string;
  message: string;
}

export type InteractiveResponse = QuestionResponse | SummaryResponse | ErrorResponse;

// ============ Final Diagnosis Models ============

export interface DiagnosisRequest {
  Symptom: string;
  Answers: FollowUpAnswer[];
  Age: number;
  Gender: string;
  Temperature?: number;
  BloodPressure?: string;
  HeartRate?: number;
  Summary?: string;
}

export interface DiagnosisCondition {
  label: string;
  score: number;
  icd: string;
  details: string;
  physician: string;
  reasoning: string;
  isEmergency: boolean;
}

export interface DiagnosisResponse {
  conditions: DiagnosisCondition[];
}

// ============ Condition Details Model ============

export interface ConditionDetailResponse {
  Id: string;
  Name: string;
  Specialties: string[];
  Description: string;
  CommonCauses: string[];
  RedFlags: string[];
  Investigations: string[];
  Disclaimer: string;
}
