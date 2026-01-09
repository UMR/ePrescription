import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  ConversationState,
  ConversationPhase,
  INITIAL_CONVERSATION_STATE,
  QUESTION_LIMITS,
} from '../models/conversation.models';

/**
 * Manages conversation state machine and transitions
 * Frontend-only; controls the interactive conversation flow
 */
@Injectable({
  providedIn: 'root',
})
export class ConversationStateService {
  private stateSubject = new BehaviorSubject<ConversationState>(INITIAL_CONVERSATION_STATE);
  public state$: Observable<ConversationState> = this.stateSubject.asObservable();

  constructor() {}

  getState(): ConversationState {
    return this.stateSubject.value;
  }

  setState(newState: ConversationState): void {
    this.stateSubject.next(newState);
  }

  /**
   * Start conversation with initial symptom
   */
  startConversation(initialSymptom: string): void {
    this.setState({
      ...INITIAL_CONVERSATION_STATE,
      phase: 'asking-questions',
      initialSymptom,
    });
  }

  /**
   * Increment question count and return whether we've hit the initial limit
   */
  incrementQuestionCount(): boolean {
    const current = this.getState();
    const newTotal = current.totalQuestionsAsked + 1;

    // If in additional questions phase, decrement remaining
    let newRemaining = current.remainingAdditionalQuestions;
    if (newRemaining > 0) {
      newRemaining--;
    }

    this.setState({
      ...current,
      totalQuestionsAsked: newTotal,
      remainingAdditionalQuestions: newRemaining,
    });

    // Return true if we've just completed the initial 5
    return newTotal === QUESTION_LIMITS.INITIAL_LIMIT && current.remainingAdditionalQuestions === 0;
  }

  /**
   * User declined more questions - move to complete
   */
  completeConversation(): void {
    const current = this.getState();
    this.setState({
      ...current,
      phase: 'complete',
      conversationComplete: true,
    });
  }

  /**
   * Ask user if they want more questions
   */
  askForMoreQuestions(): void {
    const current = this.getState();
    this.setState({
      ...current,
      phase: 'more-questions-prompt',
    });
  }

  /**
   * User said yes - ask for number
   */
  askForQuestionCount(): void {
    const current = this.getState();
    this.setState({
      ...current,
      phase: 'more-questions-count',
    });
  }

  /**
   * User provided a count - validate and set remaining
   */
  requestMoreQuestions(requestedCount: number): boolean {
    const current = this.getState();

    // Validate count
    if (requestedCount < 1 || requestedCount > 10) {
      return false;
    }

    // Calculate actual count respecting session cap
    const questionsAlreadyAsked = QUESTION_LIMITS.INITIAL_LIMIT;
    const remainingCapacity = QUESTION_LIMITS.SESSION_CAP - questionsAlreadyAsked;
    const actualCount = Math.min(requestedCount, remainingCapacity);

    this.setState({
      ...current,
      phase: 'asking-additional',
      additionalQuestionsRequested: actualCount,
      remainingAdditionalQuestions: actualCount,
    });

    return true;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.setState(INITIAL_CONVERSATION_STATE);
  }
}
