import { TestBed } from '@angular/core/testing';
import { ConversationStateService } from '../services/conversation-state.service';
import { INITIAL_CONVERSATION_STATE, QUESTION_LIMITS, ConversationState } from '../models/conversation.models';

describe('ConversationStateService', () => {
  let service: ConversationStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConversationStateService],
    });
    service = TestBed.inject(ConversationStateService);
  });

  it('starts a conversation by priming state with the symptom', () => {
    service.startConversation('Severe headache');
    const state = service.getState();

    expect(state.initialSymptom).toBe('Severe headache');
    expect(state.phase).toBe('asking-questions');
  });

  it('increments total questions and signals when initial limit is reached', () => {
    service.startConversation('Cough');

    for (let i = 0; i < QUESTION_LIMITS.INITIAL_LIMIT - 1; i++) {
      expect(service.incrementQuestionCount()).toBeFalsy();
    }

    const reachedLimit = service.incrementQuestionCount();
    expect(reachedLimit).toBeTruthy();
    expect(service.getState().totalQuestionsAsked).toBe(QUESTION_LIMITS.INITIAL_LIMIT);
  });

  it('decrements remaining additional questions while in asking-additional phase', () => {
    const customState: ConversationState = {
      phase: 'asking-additional',
      totalQuestionsAsked: QUESTION_LIMITS.INITIAL_LIMIT,
      remainingAdditionalQuestions: 2,
      additionalQuestionsRequested: 2,
      conversationComplete: false,
      initialSymptom: 'Fatigue',
    };

    service.setState(customState);
    service.incrementQuestionCount();

    expect(service.getState().remainingAdditionalQuestions).toBe(1);
  });

  it('transitions through the more-questions flow correctly', () => {
    service.startConversation('Fever');
    service.askForMoreQuestions();
    expect(service.getState().phase).toBe('more-questions-prompt');

    service.askForQuestionCount();
    expect(service.getState().phase).toBe('more-questions-count');
  });

  it('rejects invalid additional question counts', () => {
    service.startConversation('Chest pain');
    service.askForQuestionCount();

    const accepted = service.requestMoreQuestions(0);
    expect(accepted).toBeFalsy();
    expect(service.getState().phase).toBe('more-questions-count');
  });

  it('accepts the maximum allowable additional questions and enters additional phase', () => {
    service.startConversation('Headache');
    service.askForQuestionCount();

    const accepted = service.requestMoreQuestions(10);
    expect(accepted).toBeTruthy();

    const state = service.getState();
    const expectedMax = QUESTION_LIMITS.SESSION_CAP - QUESTION_LIMITS.INITIAL_LIMIT;
    expect(state.phase).toBe('asking-additional');
    expect(state.additionalQuestionsRequested).toBe(expectedMax);
    expect(state.remainingAdditionalQuestions).toBe(expectedMax);
  });

  it('marks conversation as complete and resets to initial state when requested', () => {
    service.startConversation('Dizziness');
    service.completeConversation();
    expect(service.getState().conversationComplete).toBeTruthy();
    expect(service.getState().phase).toBe('complete');

    service.reset();
    expect(service.getState()).toEqual(INITIAL_CONVERSATION_STATE);
  });
});
