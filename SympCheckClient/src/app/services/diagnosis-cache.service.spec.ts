import { TestBed } from '@angular/core/testing';
import { DiagnosisCacheService, CachedDiagnosisState } from './diagnosis-cache.service';
import { DiagnosisCondition } from '../models/api.models';

describe('DiagnosisCacheService', () => {
  let service: DiagnosisCacheService;
  const storageKey = 'diagnosis_state';

  const sampleCondition: DiagnosisCondition = {
    label: 'Migraine',
    score: 0.92,
    icd: 'G43',
    details: 'Recurring headaches.',
    physician: 'Neurology',
    reasoning: 'Matches symptom cluster',
    isEmergency: false,
  };

  const sampleState: CachedDiagnosisState = {
    initialSymptom: 'Severe headache',
    conversationSummary: 'Summary text',
    diagnosisResults: [sampleCondition],
    demographics: {
      age: 32,
      gender: 'female',
    },
  } as CachedDiagnosisState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DiagnosisCacheService],
    });
    service = TestBed.inject(DiagnosisCacheService);
    sessionStorage.removeItem(storageKey);
  });

  it('stores state in memory and session storage', () => {
    service.setDiagnosisState(sampleState);

    expect(service.getCachedState()).toEqual(sampleState);
    expect(service.hasCachedState()).toBeTruthy();

    const stored = sessionStorage.getItem(storageKey);
    expect(stored).toContain('Severe headache');
  });

  it('restores cached state from session storage when available', () => {
    sessionStorage.setItem(storageKey, JSON.stringify(sampleState));

    const restored = service.restoreFromStorage();
    expect(restored).toEqual(sampleState);
    expect(service.getCachedState()).toEqual(sampleState);
  });

  it('gracefully handles invalid session storage payloads', () => {
    sessionStorage.setItem(storageKey, '{ invalid json');

    const restored = service.restoreFromStorage();
    expect(restored).toBeNull();
    expect(service.getCachedState()).toBeNull();
  });

  it('clears both in-memory and persisted cache entries', () => {
    service.setDiagnosisState(sampleState);
    service.clearCache();

    expect(service.getCachedState()).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });
});
