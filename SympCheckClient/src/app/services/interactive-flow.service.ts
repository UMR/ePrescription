import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ConversationStateService } from './conversation-state.service';
import { ConversationService } from './conversation.service';
import {
  SymptomRequest,
  InteractiveResponse,
  QuestionResponse,
  SummaryResponse,
} from '../models/api.models';

export interface InteractiveFlowResult {
  action: 'show-question' | 'show-summary' | 'show-more-prompt' | 'show-count-prompt' | 'error';
  data?: any;
  error?: string;
}

/**
 * Orchestrates interactive conversation flow
 * Coordinates between ConversationStateService, ConversationService, and backend API
 */
@Injectable({
  providedIn: 'root',
})
export class InteractiveFlowService {
  private interactiveUrl = environment.apiBaseUrl + environment.apiEndpoints.interactive;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private conversationState: ConversationStateService,
    private conversation: ConversationService,
    private ngZone: NgZone
  ) {}

  /**
   * Start a new interactive conversation
   */
  startConversation(symptom: string): void {
    this.conversation.reset();
    this.conversationState.startConversation(symptom);
  }

  /**
   * Fetch the first question after initial symptom submission
   */
  async getFirstQuestion(): Promise<InteractiveFlowResult> {
    return await this.fetchNextQuestion();
  }

  /**
   * Handle answer submission - fetch next question or determine flow
   */
  async submitAnswer(answer: string): Promise<InteractiveFlowResult> {
    const state = this.conversationState.getState();

    // Record the answer
    this.conversation.recordAnswer(this.getLastQuestion() || 'Initial', answer);
    this.conversationState.incrementQuestionCount();

    const newState = this.conversationState.getState();
    const totalInteractions = this.conversation.getTotalInteractions();

    // Check if we've completed initial 5 questions and in normal phase
    if (totalInteractions === 5 && state.phase === 'asking-questions') {
      this.conversationState.askForMoreQuestions();
      return {
        action: 'show-more-prompt',
      };
    }

    // If in additional questions phase and no more remaining, complete
    if (
      newState.remainingAdditionalQuestions === 0 &&
      state.phase === 'asking-additional'
    ) {
      this.conversationState.completeConversation();
      return await this.requestSummary();
    }

    // Otherwise, fetch next question
    return await this.fetchNextQuestion();
  }

  /**
   * Handle skip question
   */
  async skipQuestion(): Promise<InteractiveFlowResult> {
    const currentQuestion = this.getLastQuestion();
    if (currentQuestion) {
      this.conversation.recordSkippedQuestion(currentQuestion);
    }

    this.conversationState.incrementQuestionCount();
    const newState = this.conversationState.getState();
    const totalInteractions = this.conversation.getTotalInteractions();

    // Check if we've completed initial 5 questions
    if (totalInteractions === 5 && newState.phase === 'asking-questions') {
      this.conversationState.askForMoreQuestions();
      return {
        action: 'show-more-prompt',
      };
    }

    // If in additional questions phase and no more remaining, complete
    if (
      newState.remainingAdditionalQuestions === 0 &&
      newState.phase === 'asking-additional'
    ) {
      this.conversationState.completeConversation();
      return await this.requestSummary();
    }

    // Otherwise, fetch next question
    return await this.fetchNextQuestion();
  }

  /**
   * User responded to "more questions?" prompt
   */
  async respondToMoreQuestionsPrompt(wantMore: boolean): Promise<InteractiveFlowResult> {
    if (!wantMore) {
      // User said no - request summary from backend
      this.conversationState.completeConversation();
      return await this.requestSummary();
    }

    // User said yes - ask for count
    this.conversationState.askForQuestionCount();
    return {
      action: 'show-count-prompt',
    };
  }

  /**
   * User provided count of additional questions
   */
  async respondToCountPrompt(count: number): Promise<InteractiveFlowResult> {
    if (!this.conversationState.requestMoreQuestions(count)) {
      return {
        action: 'error',
        error: 'Please enter a number between 1 and 10.',
      };
    }

    // Fetch next question for additional phase
    return await this.fetchNextQuestion();
  }

  /**
   * Fetch next question from backend
   */
  private async fetchNextQuestion(depth: number = 0): Promise<InteractiveFlowResult> {
    // Prevent infinite loops if backend repeats the same question
    if (depth > 3) {
      return {
        action: 'error',
        error: 'Unable to fetch a new question. Please try again.',
      };
    }

    this.ngZone.run(() => this.loadingSubject.next(true));
    const request = this.buildRequest();

    try {
      const response = await this.http.post<InteractiveResponse>(this.interactiveUrl, request).toPromise();

      if (!response) {
        throw new Error('No response from server');
      }

      this.ngZone.run(() => this.loadingSubject.next(false));

      if (response.type === 'question') {
        const qResponse = response as QuestionResponse;
        // If we've already seen or skipped this question, attempt to fetch another
        if (this.conversation.hasBeenAsked(qResponse.question)) {
          this.conversation.recordSkippedQuestion(qResponse.question);
          return await this.fetchNextQuestion(depth + 1);
        }

        this.conversation.recordAskedQuestion(qResponse.question);
        return {
          action: 'show-question',
          data: qResponse,
        };
      }

      if (response.type === 'summary') {
        return {
          action: 'show-summary',
          data: response,
        };
      }

      if (response.type === 'error') {
        return {
          action: 'error',
          error: (response as any).message || 'An error occurred',
        };
      }

      throw new Error('Unknown response type: ' + (response as any).type);
    } catch (err) {
      this.logFlowError('Error fetching next question', err);
      this.ngZone.run(() => this.loadingSubject.next(false));
      return {
        action: 'error',
        error: (err as any).message || 'Failed to fetch next question',
      };
    }
  }

  /**
   * Request summary from backend
   */
  private async requestSummary(): Promise<InteractiveFlowResult> {
    this.ngZone.run(() => this.loadingSubject.next(true));
    const request = this.buildRequest(true);

    try {
      const response = await this.http
        .post<InteractiveResponse>(this.interactiveUrl, request)
        .toPromise();

      if (!response) {
        throw new Error('No response from server');
      }

      this.ngZone.run(() => this.loadingSubject.next(false));

      if (response.type === 'summary') {
        return {
          action: 'show-summary',
          data: response,
        };
      }

      // Fallback: if backend doesn't return summary, signal completion
      return {
        action: 'show-summary',
        data: { type: 'summary', Answers: this.conversation.getAnswers() },
      };
    } catch (err) {
      this.ngZone.run(() => this.loadingSubject.next(false));
      return {
        action: 'error',
        error: (err as any).message || 'Failed to fetch summary',
      };
    }
  }

  /**
   * Build SymptomRequest for API call
   */
  private buildRequest(summaryOnly: boolean = false): SymptomRequest {
    const state = this.conversationState.getState();
    return {
      Symptom: state.initialSymptom,
      Answers: this.conversation.getAnswers(),
      SkippedQuestions: this.conversation.getSkippedQuestions(),
      summaryOnly,
      requestedAdditionalQuestions:
        state.remainingAdditionalQuestions > 0
          ? state.remainingAdditionalQuestions
          : state.additionalQuestionsRequested > 0
          ? state.additionalQuestionsRequested
          : undefined,
    };
  }

  /**
   * Get the last asked/skipped question (for context)
   */
  private getLastQuestion(): string | null {
    const asked = this.conversation.getAskedQuestions();
    return asked.length > 0 ? asked[asked.length - 1] : null;
  }

  /**
   * Get current conversation answers
   */
  getAnswers() {
    return this.conversation.getAnswers();
  }

  /**
   * Get skipped questions
   */
  getSkippedQuestions() {
    return this.conversation.getSkippedQuestions();
  }

  /**
   * Reset flow
   */
  reset(): void {
    this.conversation.reset();
    this.conversationState.reset();
    this.loadingSubject.next(false);
  }

  private logFlowError(context: string, err: unknown): void {
    if (!environment.enableVerboseLogging) {
      return;
    }
    console.error(`[InteractiveFlow] ${context}`, err);
  }
}
