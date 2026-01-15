import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Component imports
import { InteractiveConversationComponent } from '../../components/interactive-conversation/interactive-conversation.component';
import { DemographicsFormComponent, Demographics } from '../../components/demographics-form/demographics-form.component';
import { DiagnosisResultsComponent } from '../../components/diagnosis-results/diagnosis-results.component';

// Services
import { InteractiveFlowService } from '../../services/interactive-flow.service';
import { ConversationStateService } from '../../services/conversation-state.service';
import { DiagnosisService } from '../../services/diagnosis.service';
import { SymptomSessionStateService } from '../../services/symptom-session-state.service';
import { DiagnosisCacheService, CachedDiagnosisState } from '../../services/diagnosis-cache.service';

// Models
import { DiagnosisCondition, DiagnosisRequest } from '../../models/api.models';

@Component({
  selector: 'app-symptom-form',
  standalone: true,
  imports: [
    CommonModule,
    InteractiveConversationComponent,
    DemographicsFormComponent,
    DiagnosisResultsComponent
  ],
  templateUrl: './symptom-form.component.html',
  styleUrl: './symptom-form.component.css',
})
export class SymptomFormComponent implements OnInit, OnDestroy {

  @ViewChild('conversationComponent') conversationComponent: InteractiveConversationComponent | undefined;

  // Step management
  currentStep: number = 1; // 1: Interactive, 2: Demographics, 3: Results
  private destroy$ = new Subject<void>();
  private isRestoredFromCache = false; // Flag to skip conversation completion when restored
  private hasStateSubscription = false;

  // Interactive conversation state
  initialSymptom: string = '';
  conversationSummary: string = '';
  liveConversationHistory: Array<{ question: string; answer: string }> = [];
  isHistoryExpanded: boolean = false;
  isSymptomExpanded: boolean = false;
  isDemographicsExpanded: boolean = false;

  // Demographics state
  demographics: Demographics | null = null;

  // Results state
  diagnosisResults: DiagnosisCondition[] = [];
  isAnalyzing: boolean = false;
  analysisError: string | null = null;

  // Symptom auto-suggestion
  availableSymptoms: string[] = [];

  constructor(
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private interactiveFlow: InteractiveFlowService,
    private conversationState: ConversationStateService,
    private diagnosisService: DiagnosisService,
    private stateService: SymptomSessionStateService,
    private diagnosisCache: DiagnosisCacheService
  ) { }

  private logConversationEvent(message: string): void {
    if (!environment.enableVerboseLogging) {
      return;
    }
    console.info(`[SymptomForm] ${message}`);
  }


  private updateLiveHistory(): void {
    const answers = this.interactiveFlow.getAnswers().map((a) => ({
      question: a.Question,
      answer: a.Answer,
    }));
    const skipped = this.interactiveFlow.getSkippedQuestions().map((q) => ({
      question: q,
      answer: '(Skipped)',
    }));
    const initialEntry = this.initialSymptom
      ? [{ question: 'Initial Symptom', answer: this.initialSymptom }]
      : [];

    this.liveConversationHistory = [...initialEntry, ...answers, ...skipped];
  }

  ngOnInit(): void {
    // Load available symptoms for autocomplete
    this.loadAvailableSymptoms();

    // Try to restore complete diagnosis state from cache (returning from condition details)
    const cachedState = this.diagnosisCache.restoreFromStorage();
    if (cachedState) {
      this.initialSymptom = cachedState.initialSymptom;
      this.conversationSummary = cachedState.conversationSummary;
      this.diagnosisResults = cachedState.diagnosisResults;
      this.demographics = cachedState.demographics;
      this.currentStep = 3;
      this.isRestoredFromCache = true; // Skip conversation completion logic

      // Rebuild liveConversationHistory from conversationSummary
      this.rebuildConversationHistory();
      this.logConversationEvent('Restored cached diagnosis state');
      this.cdr.detectChanges();
    }

    this.subscribeToConversationStateUpdates();
  }

  private subscribeToConversationStateUpdates(): void {
    if (this.hasStateSubscription) {
      return;
    }
    this.hasStateSubscription = true;
    // Subscribe to conversation state to detect completion
    this.conversationState.state$.pipe(takeUntil(this.destroy$)).subscribe((state) => {
      if (this.isRestoredFromCache) {
        return;
      }

      // Detect reset: if phase is initial and no symptom, clear local state
      if (state.phase === 'initial' && !state.initialSymptom) {
        this.initialSymptom = '';
        this.liveConversationHistory = [];
        this.cdr.detectChanges();
        return;
      }

      // Capture initial symptom when conversation starts
      if (state.initialSymptom && !this.initialSymptom) {
        this.initialSymptom = state.initialSymptom;
      }

      // Live history: reflect current recorded answers for the sidebar
      this.updateLiveHistory();
      this.cdr.detectChanges();

      // Detect completion
      if (state.phase === 'complete') {
        this.logConversationEvent('Conversation complete, moving to demographics');
        this.onConversationComplete();
      }
    });
  }

  /**
   * Called when interactive conversation completes
   */
  onConversationComplete(): void {
    if (this.isRestoredFromCache) {
      return;
    }

    // Capture conversation summary
    const answers = this.interactiveFlow.getAnswers();

    this.conversationSummary = answers
      .map((a, i) => `Q${i + 1}: ${a.Question}\nA: ${a.Answer}`)
      .join('\n\n');

    // Ensure live history is populated even after completion
    this.updateLiveHistory();

    // Move to demographics step - wrap in ngZone to ensure change detection
    this.ngZone.run(() => {
      this.currentStep = 2;
      this.logConversationEvent('Conversation complete, moving to demographics');
      this.cdr.detectChanges();
    });
  }

  /**
   * Handle demographics submission
   */
  onDemographicsSubmit(demographics: Demographics): void {
    this.demographics = demographics;
    this.submitAnalysis();
  }

  /**
   * Submit final diagnosis analysis
   */
  private async submitAnalysis(): Promise<void> {
    if (!this.demographics) {
      this.analysisError = 'Demographics not provided';
      return;
    }

    this.isAnalyzing = true;
    this.analysisError = null;

    // Ensure conversation history is preserved
    if (this.liveConversationHistory.length === 0) {
      this.rebuildConversationHistory();
    }

    this.currentStep = 3; // Move to step 3 immediately to show spinner
    this.cdr.detectChanges(); // Force change detection to show spinner

    try {
      const answers = this.interactiveFlow.getAnswers();
      const request: DiagnosisRequest = {
        Symptom: this.initialSymptom,
        Answers: answers,
        Age: this.demographics.age || 0,
        Gender: this.demographics.gender || 'male',
        Temperature: this.demographics.temperature || undefined,
        BloodPressure:
          this.demographics.bloodPressureSystolic && this.demographics.bloodPressureDiastolic
            ? `${this.demographics.bloodPressureSystolic}/${this.demographics.bloodPressureDiastolic}`
            : undefined,
        HeartRate: this.demographics.heartRate || undefined,
      };

      // Run diagnosis inside NgZone to ensure change detection
      this.diagnosisResults = await this.ngZone.run(async () => {
        return await this.diagnosisService.analyzeSymptomsAndConversation(request);
      });

      // Cache complete state before moving to step 3 (so it persists if user navigates to details)
      const stateToCache: CachedDiagnosisState = {
        initialSymptom: this.initialSymptom,
        conversationSummary: this.conversationSummary,
        diagnosisResults: this.diagnosisResults,
        demographics: this.demographics
      };
      this.diagnosisCache.setDiagnosisState(stateToCache);

      this.isAnalyzing = false;
      this.cdr.detectChanges();
    } catch (err) {
      this.analysisError = (err as any).message || 'Failed to analyze symptoms';
      console.error('Analysis error:', err);
      this.isAnalyzing = false;
      this.cdr.detectChanges();
    } finally {
      // Ensure isAnalyzing is false
      this.isAnalyzing = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Retry the analysis step
   */
  retryAnalysis(): void {
    this.submitAnalysis();
  }

  /**
   * Get demographics as formatted string for display
   */
  getDemographicsString(): string {
    if (!this.demographics) return '';
    const parts: string[] = [];
    if (this.demographics.age) parts.push(`Age: ${this.demographics.age}`);
    if (this.demographics.gender) parts.push(`Gender: ${this.demographics.gender}`);
    if (this.demographics.temperature) parts.push(`Temperature: ${this.demographics.temperature}°F`);
    if (this.demographics.bloodPressureSystolic && this.demographics.bloodPressureDiastolic) {
      parts.push(`BP: ${this.demographics.bloodPressureSystolic}/${this.demographics.bloodPressureDiastolic}`);
    }
    if (this.demographics.heartRate) parts.push(`Heart Rate: ${this.demographics.heartRate} bpm`);
    return parts.join('\n');
  }

  /**
   * Reset form to start over
   */
  resetForm(): void {
    this.currentStep = 1;
    this.initialSymptom = '';
    this.conversationSummary = '';
    this.demographics = null;
    this.diagnosisResults = [];
    this.analysisError = null;
    this.isAnalyzing = false;
    this.liveConversationHistory = [];
    this.isRestoredFromCache = false; // Reset flag

    // Reset all services and clear cache
    this.interactiveFlow.reset();
    // Reset interactive conversation component state
    if (this.conversationComponent) {
      this.conversationComponent.resetComponent();
    }

    this.conversationState.reset();
    this.diagnosisCache.clearCache();

    this.cdr.detectChanges();
  }

  /**
   * Rebuild conversation history from summary string
   * Used when restoring from cache
   */
  private rebuildConversationHistory(): void {
    if (!this.conversationSummary) {
      this.liveConversationHistory = [];
      return;
    }

    // Parse the conversation summary back into Q&A pairs
    // Format: "Q1: Question text\nA: Answer text\n\nQ2: ..."
    const entries: Array<{ question: string; answer: string }> = [];

    // Split by double newline to get individual Q&A blocks
    const blocks = this.conversationSummary.split('\n\n');
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 2) {
        // Extract question (remove "Q1: " prefix)
        const questionLine = lines[0];
        const question = questionLine.includes(':')
          ? questionLine.substring(questionLine.indexOf(':') + 1).trim()
          : questionLine.trim();

        // Extract answer (remove "A: " prefix)
        const answerLine = lines[1];
        const answer = answerLine.includes(':')
          ? answerLine.substring(answerLine.indexOf(':') + 1).trim()
          : answerLine.trim();
        entries.push({ question, answer });
      }
    }

    this.liveConversationHistory = entries;
  }

  /**
   * Load available symptoms for autocomplete
   */
  private loadAvailableSymptoms(): void {
    this.http.get<string[]>('assets/symptoms.json').subscribe({
      next: (data) => {
        this.availableSymptoms = data;
      },
      error: () => {
        this.availableSymptoms = [
          'Headache',
          'Fever',
          'Cough',
          'Sore throat',
          'Fatigue',
          'Nausea',
          'Chest pain',
          'Shortness of breath',
          'Dizziness',
        ];
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
