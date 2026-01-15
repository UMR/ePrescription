import { TestBed } from '@angular/core/testing';
import { SymptomSessionStateService, SymptomSessionState } from '../services/symptom-session-state.service';

describe('SymptomSessionStateService', () => {
  let service: SymptomSessionStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SymptomSessionStateService],
    });
    service = TestBed.inject(SymptomSessionStateService);
  });

  const sampleState: SymptomSessionState = {
    symptoms: 'sample',
    initialSymptom: 'initial',
    conversationAnswers: [],
    conversationSummary: '',
    age: 30,
    gender: 'female',
    height: 165,
    weight: 60,
    temperature: 98,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    heartRate: 70,
    currentStep: 2,
    result: null,
    expandedConditions: new Set(),
    themeMode: 'light',
  };

  it('saves and retrieves the session state', () => {
    service.saveState(sampleState);
    expect(service.getState()).toBe(sampleState);
  });

  it('clears the stored state', () => {
    service.saveState(sampleState);
    service.clearState();
    expect(service.getState()).toBeNull();
  });
});
