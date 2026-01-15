/**
 * Conversation state machine types and constants
 */

export type ConversationPhase = 
  | 'initial' 
  | 'asking-questions' 
  | 'more-questions-prompt' 
  | 'more-questions-count' 
  | 'asking-additional' 
  | 'complete';

export interface ConversationState {
  phase: ConversationPhase;
  totalQuestionsAsked: number;
  remainingAdditionalQuestions: number;
  additionalQuestionsRequested: number;
  conversationComplete: boolean;
  initialSymptom: string;
}

export const INITIAL_CONVERSATION_STATE: ConversationState = {
  phase: 'initial',
  totalQuestionsAsked: 0,
  remainingAdditionalQuestions: 0,
  additionalQuestionsRequested: 0,
  conversationComplete: false,
  initialSymptom: '',
};

export const QUESTION_LIMITS = {
  INITIAL_LIMIT: 5,
  SESSION_CAP: 15,
};
