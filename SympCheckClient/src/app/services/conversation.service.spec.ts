import { TestBed } from '@angular/core/testing';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConversationService],
    });
    service = TestBed.inject(ConversationService);
  });

  it('records asked questions only once', () => {
    service.recordAskedQuestion('Q1');
    service.recordAskedQuestion('Q1');
    service.recordAskedQuestion('Q2');

    expect(service.getAskedQuestions()).toEqual(['Q1', 'Q2']);
  });

  it('tracks skipped questions and asked status', () => {
    service.recordAskedQuestion('Q1');
    service.recordSkippedQuestion('Q2');

    expect(service.hasBeenAsked('Q1')).toBeTruthy();
    expect(service.hasBeenAsked('Q2')).toBeTruthy();
    expect(service.hasBeenAsked('Q3')).toBeFalsy();
  });

  it('records answers and formats them for downstream services', () => {
    service.recordAnswer('How long?', 'Two days');

    const answers = service.getAnswers();
    expect(answers).toEqual([
      {
        Question: 'How long?',
        Answer: 'Two days',
      },
    ]);

    const formatted = service.getFormattedAnswers();
    expect(formatted).toEqual([
      {
        question: 'How long?',
        answer: 'Two days',
      },
    ]);
  });

  it('returns defensive copies so callers cannot mutate internal state', () => {
    service.recordAskedQuestion('Q1');
    service.recordAnswer('Severity?', 'Severe');

    const asked = service.getAskedQuestions();
    asked.push('Injected');

    const answers = service.getAnswers();
    answers[0].Answer = 'Modified';

    expect(service.getAskedQuestions()).toEqual(['Q1']);
    expect(service.getAnswers()).toEqual([
      {
        Question: 'Severity?',
        Answer: 'Severe',
      },
    ]);
  });

  it('resets internal collections', () => {
    service.recordAskedQuestion('Q1');
    service.recordAnswer('Temp?', '101F');

    service.reset();

    expect(service.getAskedQuestions()).toEqual([]);
    expect(service.getAnswers()).toEqual([]);
    expect(service.getSkippedQuestions()).toEqual([]);
  });
});
