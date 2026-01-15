import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SymptomFormComponent } from '../pages/symptom-form/symptom-form.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, Subject, BehaviorSubject } from 'rxjs';
import { InteractiveFlowService } from '../services/interactive-flow.service';
import { ConversationStateService } from '../services/conversation-state.service';
import { ConversationState } from '../models/conversation.models';
import { DiagnosisService } from '../services/diagnosis.service';
import { SymptomSessionStateService } from '../services/symptom-session-state.service';
import { DiagnosisCacheService } from '../services/diagnosis-cache.service';

describe('SymptomFormComponent', () => {
  let component: SymptomFormComponent;
  let fixture: ComponentFixture<SymptomFormComponent>;
  let httpMock: HttpTestingController;
  let router: any;
  let interactiveFlow: any;
  let conversationState: any;
  let diagnosisService: any;
  let diagnosisCache: any;
  let stateService: any;
  let mockState$: Subject<ConversationState>;
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockState$ = new Subject<ConversationState>();
    router = {
      navigate: vi.fn(),
      getCurrentNavigation: vi.fn().mockReturnValue(null),
    };

    interactiveFlow = {
      getAnswers: vi.fn().mockReturnValue([]),
      getSkippedQuestions: vi.fn().mockReturnValue([]),
      reset: vi.fn(),
      loading$: new BehaviorSubject(false),
      getFirstQuestion: vi.fn().mockResolvedValue({ action: 'show-question' }),
      submitAnswer: vi.fn().mockResolvedValue({ action: 'show-question' }),
      skipQuestion: vi.fn().mockResolvedValue({ action: 'show-question' }),
    };

    conversationState = {
      state$: mockState$.asObservable(),
      reset: vi.fn(),
      getState: vi.fn().mockReturnValue({
        phase: 'initial',
        totalQuestionsAsked: 0,
        remainingAdditionalQuestions: 0,
        additionalQuestionsRequested: 0,
        conversationComplete: false,
        initialSymptom: '',
      }),
    };

    diagnosisService = {
      analyzeSymptomsAndConversation: vi.fn().mockResolvedValue([]),
    };

    diagnosisCache = {
      restoreFromStorage: vi.fn().mockReturnValue(null),
      setDiagnosisState: vi.fn(),
      clearCache: vi.fn(),
    };

    stateService = {};

    await TestBed.configureTestingModule({
      imports: [
        SymptomFormComponent, 
        HttpClientTestingModule,
      ],
      providers: [
        { provide: Router, useValue: router },
        { provide: InteractiveFlowService, useValue: interactiveFlow },
        { provide: ConversationStateService, useValue: conversationState },
        { provide: DiagnosisService, useValue: diagnosisService },
        { provide: DiagnosisCacheService, useValue: diagnosisCache },
        { provide: SymptomSessionStateService, useValue: stateService },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(SymptomFormComponent, {
      set: {
        imports: [CommonModule],
        schemas: [NO_ERRORS_SCHEMA]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(SymptomFormComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    
    // Automatically handle the initial symptom load for EVERY test
    // This makes sure component is always ready and ngOnInit has run
    fixture.detectChanges();
    const req = httpMock.expectOne('assets/symptoms.json');
    req.flush([]);
  });

  afterEach(() => {
    httpMock.verify();
    mockState$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with step 1', () => {
    expect(component.currentStep).toBe(1);
  });

  it('should load symptoms on init', () => {
    // Already handled in beforeEach, but we can verify availableSymptoms is empty here
    expect(component.availableSymptoms).toEqual([]);
  });

  it('should restore state from cache if available', () => {
    const cachedState = {
      initialSymptom: 'Headache',
      conversationSummary: 'Q1: A1',
      diagnosisResults: [],
      demographics: { age: 30, gender: 'male' },
    };
    diagnosisCache.restoreFromStorage.mockReturnValue(cachedState);
    
    // Pick up changes from cachedState
    component.ngOnInit();
    
    // Handle the second HTTP request triggered by manual ngOnInit call
    const req = httpMock.expectOne('assets/symptoms.json');
    req.flush([]);
    
    fixture.detectChanges();
    
    expect(component.currentStep).toBe(3);
    expect(component.initialSymptom).toBe('Headache');
    expect(component.demographics).toEqual(cachedState.demographics);
  });

  it('should update history when conversation state changes', () => {
    const newState: ConversationState = {
      phase: 'asking-questions',
      initialSymptom: 'Fever',
      totalQuestionsAsked: 1,
      remainingAdditionalQuestions: 0,
      additionalQuestionsRequested: 0,
      conversationComplete: false
    };

    interactiveFlow.getAnswers.mockReturnValue([{ Question: 'Q1?', Answer: 'Yes' }]);
    
    mockState$.next(newState);
    fixture.detectChanges();

    expect(component.initialSymptom).toBe('Fever');
    expect(component.liveConversationHistory).toContainEqual({ question: 'Initial Symptom', answer: 'Fever' });
    expect(component.liveConversationHistory).toContainEqual({ question: 'Q1?', answer: 'Yes' });
  });

  it('should move to step 2 when conversation is complete', () => {
    const completeState: ConversationState = {
      phase: 'complete',
      initialSymptom: 'Cough',
      totalQuestionsAsked: 5,
      remainingAdditionalQuestions: 0,
      additionalQuestionsRequested: 0,
      conversationComplete: true
    };

    interactiveFlow.getAnswers.mockReturnValue([
      { Question: 'Q1', Answer: 'A1' }
    ]);

    mockState$.next(completeState);
    fixture.detectChanges();

    expect(component.currentStep).toBe(2);
    expect(component.conversationSummary).toContain('Q1: Q1');
    expect(component.conversationSummary).toContain('A: A1');
  });

  it('should handle demographics submit and run analysis', async () => {
    const demographics = { age: 25, gender: 'female' };
    diagnosisService.analyzeSymptomsAndConversation.mockResolvedValue([{ condition: 'Test', score: 90 }]);
    
    component.initialSymptom = 'Rash';
    component.onDemographicsSubmit(demographics as any);
    
    expect(component.isAnalyzing).toBe(true);
    expect(component.currentStep).toBe(3);
    
    await nextTick(); // Wait for promise
    
    expect(component.diagnosisResults.length).toBe(1);
    expect(component.isAnalyzing).toBe(false);
    expect(diagnosisCache.setDiagnosisState).toHaveBeenCalled();
  });

  it('should handle analysis error', async () => {
    diagnosisService.analyzeSymptomsAndConversation.mockRejectedValue(new Error('API Error'));
    
    component.onDemographicsSubmit({ age: 20 } as any);
    await nextTick();
    
    expect(component.analysisError).toBe('API Error');
    expect(component.isAnalyzing).toBe(false);
  });

  it('should reset form correctly', () => {
    component.currentStep = 3;
    component.initialSymptom = 'Something';
    
    // Mock child component since we are in shallow test mode
    component.conversationComponent = {
      resetComponent: vi.fn()
    } as any;
    
    component.resetForm();
    fixture.detectChanges();
    
    expect(component.currentStep).toBe(1);
    expect(component.initialSymptom).toBe('');
    expect(interactiveFlow.reset).toHaveBeenCalled();
    expect(conversationState.reset).toHaveBeenCalled();
    expect(diagnosisCache.clearCache).toHaveBeenCalled();
  });

  it('should use fallback symptoms if HTTP load fails', () => {
    // Manually trigger load and simulate error
    (component as any).loadAvailableSymptoms();
    const req = httpMock.expectOne('assets/symptoms.json');
    req.error(new ErrorEvent('error'));
    
    expect(component.availableSymptoms).toContain('Headache');
    expect(component.availableSymptoms).toContain('Chest pain');
  });

  it('should format demographics string correctly', () => {
    component.demographics = { 
      age: 30, 
      gender: 'male', 
      temperature: 98.6 
    } as any;
    
    const str = component.getDemographicsString();
    expect(str).toContain('Age: 30');
    expect(str).toContain('Gender: male');
    expect(str).toContain('Temperature: 98.6°F');
  });

  it('should rebuild history from summary string', () => {
    component.initialSymptom = 'Fever';
    component.conversationSummary = 'Q1: How long?\nA: 2 days\n\nQ2: Any cough?\nA: No';
    
    (component as any).rebuildConversationHistory();
    
    expect(component.liveConversationHistory.length).toBe(3); // Initial + 2 blocks
    expect(component.liveConversationHistory[1]).toEqual({ question: 'How long?', answer: '2 days' });
    expect(component.liveConversationHistory[2]).toEqual({ question: 'Any cough?', answer: 'No' });
  });

  it('should handle analysis submission with missing demographics', async () => {
    component.demographics = null;
    await component['submitAnalysis']();
    expect(component.analysisError).toBe('Demographics not provided');
  });
});
