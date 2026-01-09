import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { InteractiveFlowService, InteractiveFlowResult } from './interactive-flow.service';
import { ConversationStateService } from './conversation-state.service';
import { ConversationService } from './conversation.service';
import { environment } from '../../environments/environment';
import {
  InteractiveResponse,
  QuestionResponse,
  SummaryResponse,
} from '../models/api.models';

describe('InteractiveFlowService - Complete Data Flow & State Management', () => {
  let service: InteractiveFlowService;
  let httpMock: HttpTestingController;
  let stateService: ConversationStateService;
  let conversationService: ConversationService;
  const apiUrl = environment.apiBaseUrl + environment.apiEndpoints.interactive;
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [InteractiveFlowService, ConversationStateService, ConversationService],
    });

    service = TestBed.inject(InteractiveFlowService);
    httpMock = TestBed.inject(HttpTestingController);
    stateService = TestBed.inject(ConversationStateService);
    conversationService = TestBed.inject(ConversationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ============================================================================
  // TEST SUITE 1: Initialization & Start Conversation
  // ============================================================================
  describe('1. START CONVERSATION FLOW', () => {
    it('should initialize conversation with symptom', () => {
      const symptom = 'Severe Headache';
      service.startConversation(symptom);

      const state = stateService.getState();
      expect(state.initialSymptom).toBe(symptom);
      expect(state.phase).toBe('asking-questions');
    });

    it('should reset conversation service when starting new conversation', () => {
      vi.spyOn(conversationService, 'reset');
      service.startConversation('Fever');

      expect(conversationService.reset).toHaveBeenCalled();
    });

    it('should reset conversation state when starting new conversation', () => {
      service.startConversation('Initial Symptom');
      let initialState = stateService.getState();
      expect(initialState.initialSymptom).toBe('Initial Symptom');

      // Start new conversation
      service.startConversation('Different Symptom');
      const newState = stateService.getState();
      expect(newState.initialSymptom).toBe('Different Symptom');
    });

    it('should emit loading state during initialization', async () => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe((isLoading) => {
        loadingStates.push(isLoading);
      });

      service.startConversation('Cough');
      const promise = service.getFirstQuestion();

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          const req = httpMock.expectOne(apiUrl);
          expect(loadingStates[loadingStates.length - 1]).toBe(true);

          req.flush({
            type: 'question',
            question: 'How long have you had cough?',
            options: ['Days', 'Weeks', 'Months'],
          } as QuestionResponse);

          promise.then(() => {
            setTimeout(() => {
              expect(loadingStates[loadingStates.length - 1]).toBe(false);
              resolve();
            }, 0);
          });
        }, 0);
      });
    });
  });

  // ============================================================================
  // TEST SUITE 2: First Question Fetching
  // ============================================================================
  describe('2. GET FIRST QUESTION', () => {
    beforeEach(() => {
      service.startConversation('Headache');
    });

    it('should fetch first question after symptom submission', async () => {
      const promise = service.getFirstQuestion();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');

      req.flush({
        type: 'question',
        question: 'Is the headache constant?',
        options: ['Yes', 'No'],
      } as QuestionResponse);

      const result = await promise;
      expect(result.action).toBe('show-question');
      expect(result.data?.question).toBe('Is the headache constant?');
    });

    it('should record asked question in conversation service', async () => {
      const promise = service.getFirstQuestion();

      const req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Duration of headache?',
        options: [],
      } as QuestionResponse);

      await promise;

      const askedQuestions = conversationService.getAskedQuestions();
      expect(askedQuestions.length).toBeGreaterThan(0);
      expect(askedQuestions[askedQuestions.length - 1]).toBe('Duration of headache?');
    });

    it('should send correct request payload to API', async () => {
      const promise = service.getFirstQuestion();

      const req = httpMock.expectOne(apiUrl);
      const body = req.request.body;

      expect(body.Symptom).toBe('Headache');
      expect(Array.isArray(body.Answers)).toBe(true);
      expect(Array.isArray(body.SkippedQuestions)).toBe(true);

      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);

      await promise;
    });

    it('should stop loading after receiving question', async () => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe((state) => loadingStates.push(state));

      const promise = service.getFirstQuestion();
      const req = httpMock.expectOne(apiUrl);

      expect(loadingStates[loadingStates.length - 1]).toBe(true);

      req.flush({
        type: 'question',
        question: 'Q?',
        options: [],
      } as QuestionResponse);

      await promise;

      setTimeout(() => {
        expect(loadingStates[loadingStates.length - 1]).toBe(false);
      }, 0);
    });

    it('should handle error when fetching first question', async () => {
      const promise = service.getFirstQuestion();

      const req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Network error'), { status: 500 });

      const result = await promise;
      expect(result.action).toBe('error');
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================================================
  // TEST SUITE 3: Answer Submission & Question Flow
  // ============================================================================
  describe('3. SUBMIT ANSWER FLOW', () => {
    beforeEach(() => {
      service.startConversation('Fever');
    });

    it('should record answer in conversation service', async () => {
      // Get first question
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Do you have fever?',
        options: ['Yes', 'No'],
      } as QuestionResponse);
      await promise;

      // Submit answer
      promise = service.submitAnswer('Yes');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'For how long?',
        options: [],
      } as QuestionResponse);
      await promise;

      const answers = conversationService.getAnswers();
      expect(answers.length).toBeGreaterThan(0);
      expect(answers[answers.length - 1].Answer).toBe('Yes');
    });

    it('should increment question count on answer submission', async () => {
      const initialCount = stateService.getState().totalQuestionsAsked;

      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('Answer1');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);
      await promise;

      const newCount = stateService.getState().totalQuestionsAsked;
      expect(newCount).toBe(initialCount + 1);
    });

    it('should fetch next question after answer submission', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('Yes');
      req = httpMock.expectOne(apiUrl);
      const nextQuestion = 'Next Question?';
      req.flush({
        type: 'question',
        question: nextQuestion,
        options: [],
      } as QuestionResponse);

      const result = await promise;
      expect(result.action).toBe('show-question');
      expect(result.data?.question).toBe(nextQuestion);
    });

    it('should handle error during answer submission', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('Yes');
      req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Connection lost'), { status: 0 });

      const result = await promise;
      expect(result.action).toBe('error');
      expect(result.error).toBeTruthy();
    });

    it('should send answer in request payload', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Do you have symptoms?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('Yes, severe');
      req = httpMock.expectOne(apiUrl);

      const payload = req.request.body;
      expect(payload.Answers.length).toBeGreaterThan(0);
      expect(payload.Answers[payload.Answers.length - 1].Answer).toBe('Yes, severe');

      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);

      await promise;
    });
  });

  // ============================================================================
  // TEST SUITE 4: 5-Question Threshold & More Questions Prompt
  // ============================================================================
  describe('4. FIVE QUESTIONS THRESHOLD & MORE PROMPT', () => {
    beforeEach(() => {
      service.startConversation('Pain');
    });

    it('should trigger more-questions prompt after 5 answers', async () => {
      // Get first question
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      // Submit 5 answers
      for (let i = 1; i <= 5; i++) {
        promise = service.submitAnswer(`Answer${i}`);
        if (i < 5) {
          req = httpMock.expectOne(apiUrl);
          // Continue with more questions
          req.flush({
            type: 'question',
            question: `Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
        } else {
          // On 5th answer, should return more-prompt without fetching
          // We don't flush here because the prompt is generated client-side
        }

        const result = await promise;
        if (i === 5) {
          expect(result.action).toBe('show-more-prompt');
        } else {
          expect(result.action).toBe('show-question');
        }
      }
    });

    it('should not fetch more questions when prompt is shown', async () => {
      // Setup: get to 5 questions
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      for (let i = 1; i <= 5; i++) {
        promise = service.submitAnswer(`A${i}`);
        if (i < 5) {
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'question',
            question: `Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
        }

        await promise;
      }

      // Verify state changed
      expect(stateService.getState().phase).toBe('more-questions-prompt');
    });

    it('should change phase to more-questions-prompt', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      for (let i = 1; i <= 5; i++) {
        promise = service.submitAnswer(`A${i}`);
        if (i < 5) {
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'question',
            question: `Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
        }

        await promise;
      }

      const state = stateService.getState();
      expect(state.phase).toBe('more-questions-prompt');
    });
  });

  // ============================================================================
  // TEST SUITE 5: Skip Question Flow
  // ============================================================================
  describe('5. SKIP QUESTION FLOW', () => {
    beforeEach(() => {
      service.startConversation('Dizziness');
    });

    it('should record skipped question', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      const skippedQ = 'Do you have allergies?';
      req.flush({
        type: 'question',
        question: skippedQ,
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.skipQuestion();
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Next question?',
        options: [],
      } as QuestionResponse);
      await promise;

      const skipped = conversationService.getSkippedQuestions();
      expect(skipped.length).toBeGreaterThan(0);
      expect(skipped[skipped.length - 1]).toBe(skippedQ);
    });

    it('should increment interaction count for skipped question', async () => {
      const initialInteractions = conversationService.getTotalInteractions();

      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.skipQuestion();
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);
      await promise;

      const finalInteractions = conversationService.getTotalInteractions();
      expect(finalInteractions).toBe(initialInteractions + 1);
    });

    it('should fetch next question after skip', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Skip this?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.skipQuestion();
      req = httpMock.expectOne(apiUrl);
      const nextQ = 'Next question after skip?';
      req.flush({
        type: 'question',
        question: nextQ,
        options: [],
      } as QuestionResponse);

      const result = await promise;
      expect(result.action).toBe('show-question');
      expect(result.data?.question).toBe(nextQ);
    });

    it('should trigger more-prompt after 5 skips', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      // Skip 5 times
      for (let i = 1; i <= 5; i++) {
        promise = service.skipQuestion();
        if (i < 5) {
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'question',
            question: `Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
        }

        const result = await promise;
        if (i === 5) {
          expect(result.action).toBe('show-more-prompt');
        }
      }
    });

    it('should handle error when skipping question', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.skipQuestion();
      req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Server error'), { status: 500 });

      const result = await promise;
      expect(result.action).toBe('error');
      expect(result.error).toBeTruthy();
    });
  });

  // ============================================================================
  // TEST SUITE 6: More Questions Prompt Response
  // ============================================================================
  describe('6. MORE QUESTIONS PROMPT RESPONSE', () => {
    beforeEach(() => {
      service.startConversation('Nausea');
    });

    it('should handle NO response - request summary', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      // Skip to more-prompt
      for (let i = 1; i <= 5; i++) {
        promise = service.submitAnswer(`A${i}`);
        if (i < 5) {
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'question',
            question: `Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
        }
        await promise;
      }

      // Respond NO
      promise = service.respondToMoreQuestionsPrompt(false);
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'summary',
        Answers: [{ Question: 'Q1', Answer: 'A1' }],
      } as SummaryResponse);

      const result = await promise;
      expect(result.action).toBe('show-summary');
      expect(stateService.getState().phase).toBe('complete');
    });

    it('should handle YES response - show count prompt', async () => {
      // Get to more-prompt state
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      for (let i = 1; i <= 5; i++) {
        promise = service.submitAnswer(`A${i}`);
        if (i < 5) {
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'question',
            question: `Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
        }
        await promise;
      }

      // Respond YES
      const result = await service.respondToMoreQuestionsPrompt(true);
      expect(result.action).toBe('show-count-prompt');
      expect(stateService.getState().phase).toBe('more-questions-count');
    });

    it('should change phase to complete when NO', async () => {
      let promise = service.respondToMoreQuestionsPrompt(false);
      const req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'summary',
        Answers: [],
      } as SummaryResponse);
      await promise;

      expect(stateService.getState().phase).toBe('complete');
    });

    it('should change phase to count-prompt when YES', async () => {
      const result = await service.respondToMoreQuestionsPrompt(true);
      expect(stateService.getState().phase).toBe('more-questions-count');
    });
  });

  // ============================================================================
  // TEST SUITE 7: Count Prompt & Additional Questions
  // ============================================================================
  describe('7. COUNT PROMPT & ADDITIONAL QUESTIONS', () => {
    beforeEach(() => {
      service.startConversation('Rash');
      // Simulate being at count-prompt state
      stateService.askForMoreQuestions();
      stateService.askForQuestionCount();
    });

    it('should reject invalid counts (0)', async () => {
      const result = await service.respondToCountPrompt(0);
      expect(result.action).toBe('error');
      expect(result.error).toContain('1 and 10');
    });

    it('should reject invalid counts (11)', async () => {
      const result = await service.respondToCountPrompt(11);
      expect(result.action).toBe('error');
      expect(result.error).toContain('1 and 10');
    });

    it('should reject invalid counts (negative)', async () => {
      const result = await service.respondToCountPrompt(-5);
      expect(result.action).toBe('error');
      expect(result.error).toContain('1 and 10');
    });

    it('should accept valid count 1', async () => {
      const promise = service.respondToCountPrompt(1);
      const req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      const result = await promise;

      expect(result.action).toBe('show-question');
    });

    it('should accept valid count 5', async () => {
      const promise = service.respondToCountPrompt(5);
      const req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      const result = await promise;

      expect(result.action).toBe('show-question');
    });

    it('should accept valid count 10', async () => {
      const promise = service.respondToCountPrompt(10);
      const req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      const result = await promise;

      expect(result.action).toBe('show-question');
    });

    it('should set phase to asking-additional', async () => {
      stateService.requestMoreQuestions(3);
      expect(stateService.getState().phase).toBe('asking-additional');
    });

    it('should set remaining questions count', () => {
      const success = stateService.requestMoreQuestions(7);
      expect(success).toBe(true);
      const state = stateService.getState();
      expect(state.remainingAdditionalQuestions).toBe(7);
    });

    it('should fetch questions for additional phase', async () => {
      const promise = service.respondToCountPrompt(3);
      const req = httpMock.expectOne(apiUrl);

      const payload = req.request.body;
      expect(payload.requestedAdditionalQuestions).toBe(3);

      req.flush({
        type: 'question',
        question: 'Additional Q1?',
        options: [],
      } as QuestionResponse);

      const result = await promise;
      expect(result.action).toBe('show-question');
    });
  });

  // ============================================================================
  // TEST SUITE 8: Duplicate Question Detection
  // ============================================================================
  describe('8. DUPLICATE QUESTION PREVENTION', () => {
    beforeEach(() => {
      service.startConversation('Test');
    });

    it('should skip duplicate question and fetch another', async () => {
      const duplicateQ = 'Do you have fever?';

      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: duplicateQ,
        options: [],
      } as QuestionResponse);
      await promise;

      // Submit answer
      promise = service.submitAnswer('Yes');
      req = httpMock.expectOne(apiUrl);

      // Backend returns same question again (duplicate)
      req.flush({
        type: 'question',
        question: duplicateQ,
        options: [],
      } as QuestionResponse);

      // Should automatically fetch next question
      await nextTick();
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Different question?',
        options: [],
      } as QuestionResponse);

      const result = await promise;
      expect(result.action).toBe('show-question');
      expect(result.data?.question).not.toBe(duplicateQ);
    });

    it('should prevent infinite loops on repeated duplicates', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Duplicate Q?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('Yes');
      req = httpMock.expectOne(apiUrl);

      // Return duplicate 4 times (depth limit is 3)
      for (let i = 0; i < 3; i++) {
        req.flush({
          type: 'question',
          question: 'Duplicate Q?',
          options: [],
        } as QuestionResponse);
        await nextTick();
        req = httpMock.expectOne(apiUrl);
      }

      // 4th attempt should fail
      req.flush({
        type: 'question',
        question: 'Duplicate Q?',
        options: [],
      } as QuestionResponse);

      const result = await promise;
      expect(result.action).toBe('error');
      expect(result.error).toContain('Unable to fetch');
    });

    it('should record duplicate in skipped questions', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('Answer');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?', // Duplicate
        options: [],
      } as QuestionResponse);
      await nextTick();
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);
      await promise;

      const skipped = conversationService.getSkippedQuestions();
      expect(skipped.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // TEST SUITE 9: Summary Request
  // ============================================================================
  describe('9. SUMMARY REQUEST FLOW', () => {
    beforeEach(() => {
      service.startConversation('Symptoms');
    });

    it('should request summary with all answers', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      // Get to more-prompt
      for (let i = 1; i <= 5; i++) {
        promise = service.submitAnswer(`A${i}`);
        if (i < 5) {
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'question',
            question: `Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
        }
        await promise;
      }

      // Request summary
      promise = service.respondToMoreQuestionsPrompt(false);
      req = httpMock.expectOne(apiUrl);

      const payload = req.request.body;
      expect(payload.summaryOnly).toBe(true);
      expect(payload.Answers.length).toBeGreaterThan(0);

      req.flush({
        type: 'summary',
        Answers: payload.Answers,
      } as SummaryResponse);

      const result = await promise;
      expect(result.action).toBe('show-summary');
    });

    it('should handle missing summary type and provide fallback', async () => {
      let promise = service.respondToMoreQuestionsPrompt(false);
      let req = httpMock.expectOne(apiUrl);

      // Simulate backend returning empty response
      req.flush({} as any);

      const result = await promise;
      expect(result.action).toBe('show-summary');
      expect(result.data?.Answers).toBeDefined();
    });

    it('should handle summary request error', async () => {
      let promise = service.respondToMoreQuestionsPrompt(false);
      let req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Server error'), { status: 500 });

      const result = await promise;
      expect(result.action).toBe('error');
      expect(result.error).toBeTruthy();
    });

    it('should stop loading after summary request', async () => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe((state) => loadingStates.push(state));

      let promise = service.respondToMoreQuestionsPrompt(false);
      let req = httpMock.expectOne(apiUrl);

      expect(loadingStates[loadingStates.length - 1]).toBe(true);

      req.flush({
        type: 'summary',
        Answers: [],
      } as SummaryResponse);

      await promise;

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(loadingStates[loadingStates.length - 1]).toBe(false);
          resolve();
        }, 0);
      });
    });
  });

  // ============================================================================
  // TEST SUITE 10: Error Handling
  // ============================================================================
  describe('10. ERROR HANDLING', () => {
    beforeEach(() => {
      service.startConversation('Error Test');
    });

    it('should handle HTTP 500 error', async () => {
      const promise = service.getFirstQuestion();
      const req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Server error'), { status: 500 });

      const result = await promise;
      expect(result.action).toBe('error');
      expect(result.error).toContain('Http failure response');
    });

    it('should handle network timeout (status 0)', async () => {
      const promise = service.getFirstQuestion();
      const req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Timeout'), { status: 0 });

      const result = await promise;
      expect(result.action).toBe('error');
    });

    it('should handle 404 not found', async () => {
      const promise = service.getFirstQuestion();
      const req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Not found'), { status: 404 });

      const result = await promise;
      expect(result.action).toBe('error');
    });

    it('should handle 403 forbidden', async () => {
      const promise = service.getFirstQuestion();
      const req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Forbidden'), { status: 403 });

      const result = await promise;
      expect(result.action).toBe('error');
    });

    it('should handle null response', async () => {
      const promise = service.getFirstQuestion();
      const req = httpMock.expectOne(apiUrl);
      req.flush(null);

      const result = await promise;
      expect(result.action).toBe('error');
    });

    it('should handle unknown response type', async () => {
      const promise = service.getFirstQuestion();
      const req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'unknown',
      } as any);

      const result = await promise;
      expect(result.action).toBe('error');
    });

    it('should emit loading false on error', async () => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe((state) => loadingStates.push(state));

      const promise = service.getFirstQuestion();
      const req = httpMock.expectOne(apiUrl);
      req.error(new ErrorEvent('Error'), { status: 500 });

      await promise;

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(loadingStates[loadingStates.length - 1]).toBe(false);
          resolve();
        }, 0);
      });
    });
  });

  // ============================================================================
  // TEST SUITE 11: Data Consistency & State Management
  // ============================================================================
  describe('11. DATA CONSISTENCY & STATE MANAGEMENT', () => {
    it('should maintain consistent state through entire conversation', async () => {
      service.startConversation('Consistency Test');

      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      // Submit answers
      promise = service.submitAnswer('A1');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('A2');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q3?',
        options: [],
      } as QuestionResponse);
      await promise;

      // Verify consistency
      const answers = conversationService.getAnswers();
      const state = stateService.getState();

      expect(answers.length).toBe(2);
      expect(state.initialSymptom).toBe('Consistency Test');
      expect(state.phase).toBe('asking-questions');
      expect(conversationService.getTotalInteractions()).toBe(2);
    });

    it('should preserve answers after reset', async () => {
      service.startConversation('Preserve Test');

      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('Answer1');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);
      await promise;

      const answersBeforeReset = conversationService.getAnswers().length;

      service.reset();

      const answersAfterReset = conversationService.getAnswers().length;
      expect(answersAfterReset).toBe(0);
      expect(answersBeforeReset).toBeGreaterThan(0);
    });

    it('should sync answers between conversation and request payload', async () => {
      service.startConversation('Sync Test');

      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('Test Answer');
      req = httpMock.expectOne(apiUrl);

      const payload = req.request.body;
      const serviceAnswers = conversationService.getAnswers();

      expect(payload.Answers.length).toBe(serviceAnswers.length);
      expect(payload.Answers[payload.Answers.length - 1].Answer).toBe('Test Answer');

      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);

      await promise;
    });
  });

  // ============================================================================
  // TEST SUITE 12: Getter Methods
  // ============================================================================
  describe('12. GETTER METHODS', () => {
    beforeEach(() => {
      service.startConversation('Getter Test');
    });

    it('getAnswers should return array of answers', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('A1');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);
      await promise;

      const answers = service.getAnswers();
      expect(Array.isArray(answers)).toBe(true);
      expect(answers.length).toBeGreaterThan(0);
    });

    it('getSkippedQuestions should return array of skipped questions', async () => {
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.skipQuestion();
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);
      await promise;

      const skipped = service.getSkippedQuestions();
      expect(Array.isArray(skipped)).toBe(true);
    });

    it('should return empty arrays initially', () => {
      const answers = service.getAnswers();
      const skipped = service.getSkippedQuestions();

      expect(Array.isArray(answers)).toBe(true);
      expect(Array.isArray(skipped)).toBe(true);
    });
  });

  // ============================================================================
  // TEST SUITE 13: Reset Functionality
  // ============================================================================
  describe('13. RESET FUNCTIONALITY', () => {
    it('should reset all data', async () => {
      service.startConversation('Reset Test');

      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('A1');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);
      await promise;

      service.reset();

      expect(service.getAnswers().length).toBe(0);
      expect(service.getSkippedQuestions().length).toBe(0);
      expect(stateService.getState().initialSymptom).toBe('');
      expect(stateService.getState().phase).toBe('initial');
    });

    it('should stop loading on reset', async () => {
      const loadingStates: boolean[] = [];

      service.loading$.subscribe((state) => loadingStates.push(state));

      service.startConversation('Test');
      service.reset();

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(loadingStates[loadingStates.length - 1]).toBe(false);
          resolve();
        }, 0);
      });
    });

    it('should allow new conversation after reset', async () => {
      service.startConversation('First');

      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      service.reset();

      // Start new conversation
      service.startConversation('Second');
      const state = stateService.getState();

      expect(state.initialSymptom).toBe('Second');
      expect(state.phase).toBe('asking-questions');
    });
  });

  // ============================================================================
  // TEST SUITE 14: Complete End-to-End Scenarios
  // ============================================================================
  describe('14. COMPLETE END-TO-END SCENARIOS', () => {
    it('should handle full conversation flow with 5 answers and NO additional', async () => {
      service.startConversation('Full Flow Test');

      // Get first question
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      // Submit 5 answers
      for (let i = 1; i <= 5; i++) {
        promise = service.submitAnswer(`Answer${i}`);
        if (i < 5) {
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'question',
            question: `Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
        }

        const result = await promise;
        if (i === 5) {
          expect(result.action).toBe('show-more-prompt');
        }
      }

      // Say NO to more
      promise = service.respondToMoreQuestionsPrompt(false);
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'summary',
        Answers: conversationService.getAnswers(),
      } as SummaryResponse);

      const result = await promise;
      expect(result.action).toBe('show-summary');
      expect(stateService.getState().phase).toBe('complete');
    });

    it('should handle full conversation flow with additional questions', async () => {
      service.startConversation('Additional Flow');

      // Get first question
      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      // Submit 5 answers
      for (let i = 1; i <= 5; i++) {
        promise = service.submitAnswer(`A${i}`);
        if (i < 5) {
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'question',
            question: `Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
        }

        await promise;
      }

      // Say YES to more
      let result = await service.respondToMoreQuestionsPrompt(true);
      expect(result.action).toBe('show-count-prompt');

      // Request 3 more questions
      promise = service.respondToCountPrompt(3);
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Additional Q1?',
        options: [],
      } as QuestionResponse);

      result = await promise;
      expect(result.action).toBe('show-question');
      expect(stateService.getState().phase).toBe('asking-additional');

      // Answer additional questions
      for (let i = 1; i <= 3; i++) {
        promise = service.submitAnswer(`Additional A${i}`);
        if (i < 3) {
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'question',
            question: `Additional Q${i + 1}?`,
            options: [],
          } as QuestionResponse);
          await promise;
        } else {
          await nextTick();
          req = httpMock.expectOne(apiUrl);
          req.flush({
            type: 'summary',
            Answers: conversationService.getAnswers(),
          } as SummaryResponse);

          const summaryResult = await promise;
          expect(summaryResult.action).toBe('show-summary');
        }
      }

      expect(stateService.getState().phase).toBe('complete');
    });

    it('should handle mixed answers and skips', async () => {
      service.startConversation('Mixed Flow');

      let promise = service.getFirstQuestion();
      let req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q1?',
        options: [],
      } as QuestionResponse);
      await promise;

      // Mix of answers and skips
      promise = service.submitAnswer('A1');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q2?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.skipQuestion();
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q3?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('A3');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q4?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.submitAnswer('A4');
      req = httpMock.expectOne(apiUrl);
      req.flush({
        type: 'question',
        question: 'Q5?',
        options: [],
      } as QuestionResponse);
      await promise;

      promise = service.skipQuestion();

      const result = await promise;
      expect(result.action).toBe('show-more-prompt');

      const answers = conversationService.getAnswers();
      const skipped = conversationService.getSkippedQuestions();

      expect(answers.length).toBe(3); // A1, A3, A4
      expect(skipped.length).toBeGreaterThan(0); // Skipped questions
      expect(conversationService.getTotalInteractions()).toBe(5); // 3 answers + 2 skips
    });
  });
});