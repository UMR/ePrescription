import { Component, signal, computed, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ClinicalChatService, MeetingNotesRequest, MeetingNotesResponse } from '../services/clinical-chat.service';
import { PrescriptionService } from '../services/prescription.service';
import { SpeechRecorderComponent } from '../speech-recorder/speech-recorder.component';
import { SpeechRecordingState, SpeechError, RealtimeTextData, SegmentCompleteData } from '../models/speech-to-text.model';
import { MeetingSummaryPopupComponent } from './meeting-summary-popup/meeting-summary-popup.component';

@Component({
  selector: 'app-clinical-bot',
  standalone: true,
  imports: [FormsModule, SpeechRecorderComponent, MeetingSummaryPopupComponent],
  templateUrl: './clinical-bot.component.html',
  styleUrl: './clinical-bot.component.css'
})
export class ClinicalBotComponent implements OnDestroy {
  private clinicalChatService = inject(ClinicalChatService);
  private prescriptionService = inject(PrescriptionService);
  router = inject(Router);

  // Core state signals
  clinicalNote = signal<string>('');
  aiResponse = signal<string>('');
  isStreaming = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  errorMessage = signal<string>('');
  isRecording = signal<boolean>(false);

  // Meeting summary popup signals
  isSummaryPopupOpen = signal<boolean>(false);
  meetingSummaryResponse = signal<MeetingNotesResponse | null>(null);
  meetingSummaryError = signal<string | null>(null);

  // Speech tracking signals
  // baseText: The text content before any pending speech (includes user edits + finalized speech)
  private baseText = signal<string>('');
  pendingText = signal<string>('');

  // Computed signals
  canSubmit = computed(() =>
    this.clinicalNote().trim().length > 0 &&
    !this.isStreaming() &&
    !this.isProcessing()
  );

  hasResponse = computed(() => this.aiResponse().length > 0);
  hasError = computed(() => this.errorMessage().length > 0);

  private destroy$ = new Subject<void>();

  sampleNote = `Patient: John Doe, 45-year-old male
Chief Complaint: Persistent cough and fever for 5 days

History of Present Illness:
The patient presents with a productive cough with yellowish sputum for the past 5 days. Associated symptoms include fever (up to 101°F), chills, and mild shortness of breath. No chest pain. The patient has tried over-the-counter medications without significant relief.

Past Medical History:
- Hypertension (controlled with medication)
- Type 2 Diabetes Mellitus
- No known drug allergies

Physical Examination:
- Vitals: BP 138/86, HR 92, RR 20, Temp 100.8°F, SpO2 94% on room air
- General: Alert and oriented, mild respiratory distress
- Respiratory: Bilateral crackles in lower lung fields, no wheezing
- Cardiovascular: Regular rate and rhythm, no murmurs

Assessment:
Community-acquired pneumonia

Plan:
1. Start Amoxicillin-Clavulanate 875mg twice daily for 7 days
2. Azithromycin 500mg daily for 5 days
3. Acetaminophen 650mg every 6 hours as needed for fever
4. Increase fluid intake
5. Rest and avoid strenuous activities
6. Follow-up in 3-5 days or sooner if symptoms worsen
7. Chest X-ray if no improvement in 48 hours`;

  sampleNoteBengali = `রোগীর নাম: জন ডো, 45 বছর বয়সী পুরুষ
প্রধান অভিযোগ: 5 দিন ধরে ক্রমাগত কাশি এবং জ্বর

বর্তমান অসুস্থতার ইতিহাস:
রোগী গত 5 দিন ধরে হলুদাভ কফ সহ কাশি নিয়ে এসেছেন। সহযোগী লক্ষণগুলির মধ্যে রয়েছে জ্বর (101°F পর্যন্ত), ঠান্ডা লাগা এবং হালকা শ্বাসকষ্ট। বুকে ব্যথা নেই।

অতীত চিকিৎসা ইতিহাস:
- উচ্চ রক্তচাপ (ওষুধ দ্বারা নিয়ন্ত্রিত)
- টাইপ 2 ডায়াবেটিস মেলিটাস
- কোন ওষুধ এলার্জি নেই

শারীরিক পরীক্ষা:
- ভাইটালস: BP 138/86, HR 92, RR 20, Temp 100.8°F, SpO2 94%
- সাধারণ: সতর্ক এবং সচেতন, হালকা শ্বাসকষ্ট
- শ্বাসযন্ত্র: নিচের ফুসফুসের ক্ষেত্রে দ্বিপাক্ষিক ক্র্যাকলস

মূল্যায়ন:
কমিউনিটি-অর্জিত নিউমোনিয়া`;

  sampleNoteHindi = `रोगी का नाम: जॉन डो, 45 वर्षीय पुरुष
मुख्य शिकायत: 5 दिनों से लगातार खांसी और बुखार

वर्तमान बीमारी का इतिहास:
रोगी पिछले 5 दिनों से पीले रंग के बलगम के साथ खांसी की समस्या से परेशान है। संबंधित लक्षणों में बुखार (101°F तक), ठंड लगना और हल्की सांस की तकलीफ शामिल है। सीने में दर्द नहीं है।

पिछला चिकित्सा इतिहास:
- उच्च रक्तचाप (दवा से नियंत्रित)
- टाइप 2 मधुमेह मेलिटस
- कोई ज्ञात दवा एलर्जी नहीं

शारीरिक परीक्षण:
- वाइटल्स: BP 138/86, HR 92, RR 20, Temp 100.8°F, SpO2 94%
- सामान्य: सतर्क और उन्मुख, हल्की सांस की तकलीफ
- श्वसन: निचले फेफड़े के क्षेत्रों में द्विपक्षीय क्रैकल्स

मूल्यांकन:
समुदाय-अधिग्रहीत निमोनिया`;

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSampleNote() {
    this.clinicalNote.set(this.sampleNote);
  }

  loadBengaliSample() {
    this.clinicalNote.set(this.sampleNoteBengali);
  }

  loadHindiSample() {
    this.clinicalNote.set(this.sampleNoteHindi);
  }

  streamSummary() {
    if (!this.clinicalNote().trim()) {
      this.errorMessage.set('Please enter a clinical note');
      return;
    }

    this.isStreaming.set(true);
    this.aiResponse.set('');
    this.errorMessage.set('');

    console.log('Starting stream analysis...');

    this.clinicalChatService.streamClinicalNoteSummary(this.clinicalNote())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chunk) => {
          console.log('Received chunk:', chunk);
          this.aiResponse.update(current => current + chunk);
        },
        error: (error) => {
          this.isStreaming.set(false);
          console.error('Streaming error:', error);
          this.errorMessage.set(error.message || 'Failed to process clinical note. Please ensure the API is running at http://localhost:5086');
        },
        complete: () => {
          console.log('Stream completed. Response:', this.aiResponse());
          this.isStreaming.set(false);
          if (this.aiResponse().trim()) {
            this.sendToPrescription();
          } else {
            this.errorMessage.set('No response received from AI. Please try again.');
          }
        }
      });
  }

  getCompleteSummary() {
    if (!this.clinicalNote().trim()) {
      this.errorMessage.set('Please enter a clinical note');
      return;
    }

    this.isProcessing.set(true);
    this.aiResponse.set('');
    this.errorMessage.set('');

    console.log('Getting complete summary with language detection...');

    this.prescriptionService.generateClinicalNote(this.clinicalNote())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Received complete response with language:', response);
          console.log('Medications from AI:', response.medications);
          console.log('Number of medications:', response.medications?.length || 0);
          this.isProcessing.set(false);

          // Direct mapping from structured response
          const prescriptionData = {
            patientName: response.patientName || '',
            patientAge: response.patientAge || 0,
            patientGender: response.patientGender || '',
            chiefComplaint: response.chiefComplaint || '',
            medicalHistory: response.medicalHistory || '',
            physicalExamination: response.physicalExamination || '',
            diagnosis: response.diagnosis || '',
            treatmentPlan: response.treatmentPlan || '',
            medications: response.medications || [],
            tests: response.tests || '',
            advice: response.advice || '',
            followUpDate: response.followUpDate || '',
            weight: response.weight || '',
            height: response.height || '',
            pulse: response.pulse || '',
            bloodPressure: response.bloodPressure || '',
            temperature: response.temperature || '',
            referralComments: response.referralComments || '',
            icdCodes: response.icdCodes || ''
          };

          console.log('Sending to prescription service:', prescriptionData);
          console.log('Medications being sent:', prescriptionData.medications);

          this.prescriptionService.updatePrescription(prescriptionData);

          console.log(`Data processed in ${response.detectedLanguage} and sent to prescription service`);

          // Navigate to prescription
          this.router.navigate(['/prescription']);
        },
        error: (error) => {
          this.isProcessing.set(false);
          console.error('Complete summary error:', error);
          const errorMsg = error.error?.error || error.message || 'Failed to process clinical note';
          this.errorMessage.set(errorMsg + '. Please ensure the API is running at http://localhost:5086');
        }
      });
  }

  private sendToPrescription() {
    const response = this.aiResponse();
    if (!response) return;
    const parsedSummary = this.clinicalChatService.parseClinicalNoteSummary(response);

    if (parsedSummary) {
      console.log('Parsed summary:', parsedSummary);
      console.log('Medications from parsed summary:', parsedSummary.medications);
      console.log('Number of medications:', parsedSummary.medications?.length || 0);
      let medications = parsedSummary.medications || [];

      if (medications.length === 0 && parsedSummary.treatmentPlan) {
        console.log('No medications in array, extracting from treatment plan...');
        medications = this.prescriptionService.extractMedications(parsedSummary.treatmentPlan);
        console.log('Extracted medications:', medications);
      }
      this.prescriptionService.updatePrescription({
        patientName: parsedSummary.patientName || '',
        patientAge: parsedSummary.patientAge || 0,
        patientGender: parsedSummary.patientGender || '',
        chiefComplaint: parsedSummary.chiefComplaint || '',
        medicalHistory: parsedSummary.medicalHistory || '',
        physicalExamination: parsedSummary.physicalExamination || '',
        diagnosis: parsedSummary.diagnosis || '',
        treatmentPlan: parsedSummary.treatmentPlan || '',
        medications: medications,
        tests: parsedSummary.tests || '',
        advice: parsedSummary.advice || '',
        followUpDate: parsedSummary.followUpDate || '',
        weight: parsedSummary.weight || '',
        height: parsedSummary.height || '',
        pulse: parsedSummary.pulse || '',
        bloodPressure: parsedSummary.bloodPressure || '',
        temperature: parsedSummary.temperature || '',
        referralComments: parsedSummary.referralComments || '',
        icdCodes: parsedSummary.icdCodes || ''
      });
    } else {
      console.error('Failed to parse AI response');
      this.errorMessage.set('Failed to parse AI response. Please check the format. See console for details.');
    }
  }

  // ============== Speech-to-Text Methods ==============

  /**
   * Handle final transcribed text from speech recorder (when recording stops)
   */
  onSpeechTranscription(_text: string): void {
    console.log('Final transcription received:', _text);
    // Clear the pending text indicator
    this.pendingText.set('');
    // Sync baseText with current clinicalNote (preserving any user edits)
    this.baseText.set(this.clinicalNote());
  }

  /**
   * Handle real-time text streaming (for direct textarea updates)
   */
  onRealtimeText(data: RealtimeTextData): void {
    console.log('Realtime text data received:', data);
    if (!data.text) return;

    if (data.isFinal) {
      // Finalized text - append to base text permanently
      const currentBase = this.baseText();
      let separator = '';
      if (currentBase && !currentBase.endsWith(' ') && !currentBase.endsWith('\n')) {
        separator = ' ';
      }
      const newBaseText = currentBase + separator + data.text;
      this.baseText.set(newBaseText);
      this.pendingText.set('');

      // Update the clinical note with the new base text
      this.clinicalNote.set(newBaseText);
    } else {
      // Pending text - show as temporary (will be replaced by final)
      this.pendingText.set(data.text);

      // Show base text + pending in the textarea
      const currentBase = this.baseText();
      const separator = currentBase && !currentBase.endsWith(' ') && !currentBase.endsWith('\n') ? ' ' : '';
      this.clinicalNote.set(currentBase + separator + data.text);
    }
  }

  /**
   * Handle segment complete (speaker pause detected)
   */
  onSegmentComplete(_data: SegmentCompleteData): void {
    // A segment is complete - add a line break for conversation separation
    const currentBase = this.baseText();
    if (currentBase && !currentBase.endsWith('\n')) {
      const newBaseText = currentBase + '\n';
      this.baseText.set(newBaseText);
      this.clinicalNote.set(newBaseText);
    }
  }

  generateMeetingSummary() {
    if (!this.clinicalNote().trim()) {
      this.errorMessage.set('Please enter a clinical note first');
      return;
    }

    this.meetingSummaryResponse.set(null);
    this.meetingSummaryError.set(null);
    this.isSummaryPopupOpen.set(true);

    const request: MeetingNotesRequest = {
      meetingNotes: this.clinicalNote(),
      language: 'en',
      summaryLength: 'medium',
      meetingTitle: 'Clinical Consultation',
      meetingDate: new Date().toISOString()
    };

    this.clinicalChatService.summarizeMeetingNotes(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: MeetingNotesResponse) => {
          console.log('Meeting summary received:', response);
          this.meetingSummaryResponse.set(response);
        },
        error: (error) => {
          console.error('Error generating meeting summary:', error);
          this.meetingSummaryError.set('An error occurred');
        }
      });
  }

  closeSummaryPopup() {
    this.isSummaryPopupOpen.set(false);
    this.meetingSummaryResponse.set(null);
    this.meetingSummaryError.set(null);
  }

  /**
   * Handle recording state changes
   */
  onRecordingStateChange(state: SpeechRecordingState): void {
    const wasRecording = this.isRecording();
    this.isRecording.set(state === 'recording');

    // When starting to record, sync baseText with current clinicalNote (preserves user edits)
    if (state === 'recording' && !wasRecording) {
      this.baseText.set(this.clinicalNote());
      this.pendingText.set('');
    }

    // When stopping/idle, sync baseText with clinicalNote and clear pending
    if (state === 'idle' || state === 'error') {
      this.baseText.set(this.clinicalNote());
      this.pendingText.set('');
    }

    // When paused, also sync to preserve any edits made during pause
    if (state === 'paused') {
      this.baseText.set(this.clinicalNote());
      this.pendingText.set('');
    }
  }

  /**
   * Handle user input in textarea - sync baseText when user edits during recording
   */
  onTextareaInput(value: string): void {
    this.clinicalNote.set(value);

    // If recording is active (or paused), sync baseText to allow user edits
    // We need to extract the base part (without pending text)
    if (this.isRecording() && this.pendingText()) {
      // User is editing while there's pending text
      // The pending text will be at the end, so we update baseText to exclude it
      const pending = this.pendingText();
      if (value.endsWith(pending)) {
        // User didn't modify the pending part, update base
        const baseLength = value.length - pending.length;
        const separator = value.charAt(baseLength - 1) === ' ' ? 1 : 0;
        this.baseText.set(value.substring(0, baseLength - separator).trimEnd());
      } else {
        // User modified the text including pending area - treat all as base
        this.baseText.set(value);
        this.pendingText.set('');
      }
    } else {
      // Not recording or no pending text - just sync
      this.baseText.set(value);
    }
  }

  /**
   * Handle speech recognition errors
   */
  onSpeechError(error: SpeechError): void {
    this.errorMessage.set(error.message);
    this.pendingText.set('');
    this.baseText.set(this.clinicalNote());
  }

  /**
   * Clear note and reset all state
   */
  clearNote() {
    this.clinicalNote.set('');
    this.aiResponse.set('');
    this.errorMessage.set('');
    this.baseText.set('');
    this.pendingText.set('');
  }
}
