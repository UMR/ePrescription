export interface FollowUpAnswer {
  question: string;
  answer: string;
}

export interface SymptomRequest {
  symptom: string;
  age?: number;
  gender?: string;
  temperature?: number;
  bloodPressure?: string;
  heartRate?: number;
  answers?: FollowUpAnswer[];
  skippedQuestions?: string[];
  // When true, backend should return a summary instead of another question
  summaryOnly?: boolean;
  // Number of additional follow-up questions requested by the caller
  requestedAdditionalQuestions?: number;
}

// Response Types
export type InteractiveResponseType = 'question' | 'summary' | 'error';

export interface InteractiveResponseBase {
  type: InteractiveResponseType;
}

export interface QuestionResponse extends InteractiveResponseBase {
  type: 'question';
  question: string;
  options?: string[];
  multiple?: boolean;
  questionType?: 'text' | 'options' | 'yesno' | 'numeric';
  controlFlow?: {
    isControlQuestion: boolean;
    controlType?: 'followUpRequest' | 'followUpCount';
  };
}

export interface SummaryResponse extends InteractiveResponseBase {
  type: 'summary';
  symptom: string;
  answers: FollowUpAnswer[];
  summaryText: string;
}

export interface ErrorResponse extends InteractiveResponseBase {
  type: 'error';
  errorCode: string;
  message: string;
}

export type InteractiveResponse = QuestionResponse | SummaryResponse | ErrorResponse;
