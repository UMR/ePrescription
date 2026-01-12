import { Component, OnInit, OnDestroy, ChangeDetectorRef, Input, NgZone, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InteractiveFlowService } from '../../services/interactive-flow.service';
import { ConversationStateService } from '../../services/conversation-state.service';
import { ConversationState } from '../../models/conversation.models';
import { QuestionResponse } from '../../models/api.models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-interactive-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interactive-conversation.component.html',
  styleUrl: './interactive-conversation.component.css',
})
export class InteractiveConversationComponent implements OnInit, OnDestroy, OnChanges {
  @Input() availableSymptoms: string[] = [];
  @Output() completed = new EventEmitter<void>();

  currentQuestion: QuestionResponse | null = null;
  conversationSummary: string = '';
  isLoading: boolean = false;
  error: string | null = null;
  errorStatus: number | null = null; // Capture HTTP status for 429 checks

  userTextAnswer: string = '';
  selectedOption: string = '';
  numericAnswer: number | null = null;
  filteredSymptoms: string[] = [];
  // Store the last submitted answer to display while loading
  lastSubmittedAnswer: string = '';

  state: ConversationState | null = null;
  private destroy$ = new Subject<void>();

  // Track if initial symptom has been submitted
  initialSymptomSubmitted: boolean = false;

  constructor(
    private interactiveFlow: InteractiveFlowService,
    private conversationState: ConversationStateService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  private logFlowError(context: string, err: unknown): void {
    if (!environment.enableVerboseLogging) {
      return;
    }
    console.error(`[InteractiveConversation] ${context}`, err);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // If available symptoms arrive after user started typing, re-run filter so first keystroke shows suggestions
    if (changes['availableSymptoms'] && this.userTextAnswer.trim()) {
      this.filterSymptoms();
    }
  }

  ngOnInit(): void {
    this.conversationState.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      this.state = state;
      // When conversation starts, mark initial symptom as submitted
      if (state.initialSymptom && !this.initialSymptomSubmitted) {
        this.initialSymptomSubmitted = true;
      }
    });

    this.interactiveFlow.loading$.pipe(takeUntil(this.destroy$)).subscribe((loading) => {
      this.isLoading = loading;
      this.cdr.markForCheck();
    });

    // Show first question for initial symptom input
    this.showFirstQuestion();
    // Don't show symptoms by default - only show when user types and matches occur
    this.filteredSymptoms = [];
  }

  /**
   * Filter symptoms based on the current word being typed.
   * Matches any symptom whose word starts with the current fragment (case-insensitive).
   */
  filterSymptoms(): void {
    const rawInput = this.userTextAnswer || '';
    const input = rawInput.toLowerCase();

    // If empty or only whitespace, hide suggestions
    if (!input.trim()) {
      this.filteredSymptoms = [];
      return;
    }

    // Identify the current word (text after the last space)
    const lastSpaceIndex = input.lastIndexOf(' ');
    const currentWord = lastSpaceIndex === -1
      ? input.trim()
      : input.substring(lastSpaceIndex + 1).trim();

    if (!currentWord) {
      this.filteredSymptoms = [];
      return;
    }

    // Match if any word in the symptom starts with the current fragment
    this.filteredSymptoms = this.availableSymptoms
      .filter(symptom => {
        const tokens = symptom.toLowerCase().split(/\s+/);
        return tokens.some(token => token.startsWith(currentWord));
      })
      .slice(0, 8); // Limit to 8 suggestions
  }

  /**
   * Select symptom from autocomplete
   * Replaces only the current word being typed, keeps previous words
   */
  selectSymptom(symptom: string): void {
    const input = this.userTextAnswer.toLowerCase();
    const lastSpaceIndex = input.lastIndexOf(' ');

    // If there's text before the current word, keep it and append the selected symptom
    if (lastSpaceIndex !== -1) {
      this.userTextAnswer = this.userTextAnswer.substring(0, lastSpaceIndex + 1) + symptom;
    } else {
      // No previous words, just set the selected symptom
      this.userTextAnswer = symptom;
    }

    this.filteredSymptoms = [];
  }

  /**
   * Submit answer to current question
   */
  async submitAnswer(): Promise<void> {
    if (this.isLoading) return;

    const answer =
      this.currentQuestion?.options && this.currentQuestion.options.length > 0
        ? this.selectedOption
        : this.userTextAnswer.trim();

    if (!answer) {
      this.error = 'Please provide an answer';
      return;
    }

    this.error = null;

    // Store the answer for display while loading
    this.lastSubmittedAnswer = answer;

    // If this is the initial symptom submission, start the conversation
    if (!this.initialSymptomSubmitted) {
      this.initialSymptomSubmitted = true;
      this.interactiveFlow.startConversation(answer);
      this.userTextAnswer = '';
      this.selectedOption = '';
      this.numericAnswer = null;

      // Fetch first follow-up question
      try {
        const result = await this.interactiveFlow.getFirstQuestion();
        this.handleFlowResult(result);
      } catch (err) {
        this.logFlowError('Error fetching first question', err);
        this.error = 'Failed to fetch question. Please try again.';
        this.initialSymptomSubmitted = false;
      }
      return;
    }

    // Otherwise, submit as normal answer
    this.userTextAnswer = '';
    this.selectedOption = '';
    this.numericAnswer = null;

    try {
      const result = await this.interactiveFlow.submitAnswer(answer);
      this.handleFlowResult(result);
    } catch (err) {
      this.logFlowError('Error submitting answer', err);
      this.error = 'Failed to submit answer. Please try again.';
    }
  }

  /**
   * Skip current question
   */
  async skipQuestion(): Promise<void> {
    if (this.isLoading) return;

    this.error = null;
    this.userTextAnswer = '';
    this.selectedOption = '';
    this.numericAnswer = null;

    const result = await this.interactiveFlow.skipQuestion();
    this.handleFlowResult(result);
  }

  /**
   * User responded to "more questions?" prompt
   */
  async respondToMoreQuestionsPrompt(wantMore: boolean): Promise<void> {
    this.error = null;
    const result = await this.interactiveFlow.respondToMoreQuestionsPrompt(wantMore);
    this.handleFlowResult(result);
  }

  /**
   * User provided count for additional questions
   */
  async respondToCountPrompt(): Promise<void> {
    if (this.numericAnswer === null || this.numericAnswer < 1 || this.numericAnswer > 10) {
      this.error = 'Please enter a number between 1 and 10';
      return;
    }

    this.error = null;
    const result = await this.interactiveFlow.respondToCountPrompt(this.numericAnswer);
    this.numericAnswer = null;
    this.handleFlowResult(result);
  }

  /**
   * Retry the last failed action (fetching question)
   */
  async retry(): Promise<void> {
    if (this.isLoading) return;

    // Clear error state before retrying
    this.error = null;
    this.errorStatus = null;

    try {
      const result = await this.interactiveFlow.retryFetchNextQuestion();
      this.handleFlowResult(result);
    } catch (err) {
      this.logFlowError('Error retrying fetch', err);
      this.error = 'Failed to retry. Please try again.';
    }
  }

  /**
   * Show first question
   */
  private showFirstQuestion(): void {
    this.currentQuestion = {
      type: 'question',
      question: 'Please describe your main symptom or concern:',
    };
  }

  /**
   * Handle flow service results and update UI
   */
  private handleFlowResult(result: any): void {
    if (result.action === 'show-question') {
      this.currentQuestion = result.data;
      this.userTextAnswer = '';
      this.selectedOption = '';
      this.numericAnswer = null;
      this.lastSubmittedAnswer = ''; // Clear after new question loads
      // Mark for check to ensure template updates when question changes
      this.cdr.markForCheck();
    } else if (result.action === 'show-summary') {
      this.isLoading = false; // ensure loader stops when summary arrives
      // Signal completion - parent component should handle moving to next step
      this.currentQuestion = null;
      this.conversationSummary =
        result.data?.SummaryText || result.data?.summaryText || 'Conversation completed';
      // Note: completeConversation is already called in interactive-flow service
      // Just mark for check to update the UI
      this.ngZone.run(() => {
        this.cdr.detectChanges(); // Force immediate change detection
        this.completed.emit();
      });
    } else if (result.action === 'show-more-prompt') {
      // Show more questions prompt - component displays this based on state
      this.currentQuestion = null;
      this.cdr.markForCheck();
    } else if (result.action === 'show-count-prompt') {
      // Show count prompt - component displays this based on state
      this.currentQuestion = null;
      this.numericAnswer = null;
      this.cdr.markForCheck();
    } else if (result.action === 'error') {
      this.error = result.error;
      this.errorStatus = result.errorStatus || null;
      this.currentQuestion = null;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Reset component to initial state
   */
  resetComponent(): void {
    this.currentQuestion = null;
    this.conversationSummary = '';
    this.isLoading = false;
    this.error = null;
    this.userTextAnswer = '';
    this.selectedOption = '';
    this.numericAnswer = null;
    this.filteredSymptoms = [];
    this.initialSymptomSubmitted = false;
    this.state = null;
    // Show first question for initial symptom input
    this.showFirstQuestion();
    this.cdr.detectChanges();
  }
}