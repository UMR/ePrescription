import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ClinicalChatService } from '../services/clinical-chat.service';
import { PrescriptionService } from '../services/prescription.service';
import { SpeechRecorderComponent } from '../speech-recorder/speech-recorder.component';
import { SpeechRecordingState, SpeechError } from '../models/speech-to-text.model';

@Component({
  selector: 'app-clinical-bot',
  standalone: true,
  imports: [FormsModule, SpeechRecorderComponent],
  templateUrl: './clinical-bot.component.html',
  styleUrl: './clinical-bot.component.css'
})
export class ClinicalBotComponent implements OnInit, OnDestroy {
  clinicalNote: string = '';
  aiResponse: string = '';
  isStreaming: boolean = false;
  isProcessing: boolean = false;
  errorMessage: string = '';
  isRecording: boolean = false;

  private finalizedText = '';
  pendingText = '';

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

  constructor(
    private clinicalChatService: ClinicalChatService,
    private prescriptionService: PrescriptionService,
    public router: Router
  ) { }

  ngOnInit() {
    // Component initialization
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSampleNote() {
    this.clinicalNote = this.sampleNote;
  }

  loadBengaliSample() {
    this.clinicalNote = this.sampleNoteBengali;
  }

  loadHindiSample() {
    this.clinicalNote = this.sampleNoteHindi;
  }

  streamSummary() {
    if (!this.clinicalNote.trim()) {
      this.errorMessage = 'Please enter a clinical note';
      return;
    }

    this.isStreaming = true;
    this.aiResponse = '';
    this.errorMessage = '';

    console.log('Starting stream analysis...');

    this.clinicalChatService.streamClinicalNoteSummary(this.clinicalNote)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chunk) => {
          console.log('Received chunk:', chunk);
          this.aiResponse += chunk;
        },
        error: (error) => {
          this.isStreaming = false;
          console.error('Streaming error:', error);
          this.errorMessage = error.message || 'Failed to process clinical note. Please ensure the API is running at http://localhost:5086';
        },
        complete: () => {
          console.log('Stream completed. Response:', this.aiResponse);
          this.isStreaming = false;
          if (this.aiResponse.trim()) {
            this.sendToPrescription();
          } else {
            this.errorMessage = 'No response received from AI. Please try again.';
          }
        }
      });
  }

  getCompleteSummary() {
    if (!this.clinicalNote.trim()) {
      this.errorMessage = 'Please enter a clinical note';
      return;
    }

    this.isProcessing = true;
    this.aiResponse = '';
    this.errorMessage = '';

    console.log('Getting complete summary with language detection...');

    this.prescriptionService.generateClinicalNote(this.clinicalNote)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Received complete response with language:', response);
          console.log('Medications from AI:', response.medications);
          console.log('Number of medications:', response.medications?.length || 0);
          this.isProcessing = false;

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
          this.isProcessing = false;
          console.error('Complete summary error:', error);
          const errorMsg = error.error?.error || error.message || 'Failed to process clinical note';
          this.errorMessage = errorMsg + '. Please ensure the API is running at http://localhost:5086';
        }
      });
  }

  private sendToPrescription() {
    if (!this.aiResponse) return;
    const parsedSummary = this.clinicalChatService.parseClinicalNoteSummary(this.aiResponse);

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
      this.errorMessage = 'Failed to parse AI response. Please check the format. See console for details.';
    }
  }

  // ============== Speech-to-Text Methods ==============


  /**
   * Handle final transcribed text from speech recorder (when recording stops)
   */
  onSpeechTranscription(_text: string): void {
    console.log('Final transcription received:', _text);
    // This is called when recording stops with the complete formatted text
    // We don't need to append here since real-time streaming already did it
    // Just clear the pending text indicator
    this.pendingText = '';
  }

  /**
   * Handle real-time text streaming (for direct textarea updates)
   */
  onRealtimeText(data: { text: string; isFinal: boolean }): void {
    console.log('Realtime text data received ------------> :', data);
    if (!data.text) return;

    if (data.isFinal) {
      // Finalized text - append to clinical note permanently
      if (this.finalizedText && !this.finalizedText.endsWith(' ') && !this.finalizedText.endsWith('\n')) {
        this.finalizedText += ' ';
      }
      this.finalizedText += data.text;
      this.pendingText = '';

      // Update the clinical note with finalized text only
      this.clinicalNote = this.finalizedText;
    } else {
      // Pending text - show as temporary (will be replaced)
      this.pendingText = data.text;

      // Update clinical note to show finalized + pending
      // this.clinicalNote = this.finalizedText + (this.finalizedText ? ' ' : '') + this.pendingText;
      const separator = this.finalizedText && !this.finalizedText.endsWith(' ') && !this.finalizedText.endsWith('\n') ? ' ' : '';
      this.clinicalNote = this.finalizedText + separator + this.pendingText;
    }
  }

  /**
   * Handle segment complete (speaker pause detected)
   */
  onSegmentComplete(_text: string): void {
    // A segment is complete - could add a line break for conversation separation
    if (this.finalizedText && !this.finalizedText.endsWith('\n')) {
      this.finalizedText += '\n';
      this.clinicalNote = this.finalizedText;
    }
  }

  /**
   * Handle recording state changes
   */
  onRecordingStateChange(state: SpeechRecordingState): void {
    this.isRecording = state === 'recording';

    // Reset tracking when starting a new recording
    // if (state === 'recording' && !this.finalizedText) {
    if (state === 'recording') {
      this.finalizedText = this.clinicalNote || ''; // Preserve existing text
      this.pendingText = '';
    }

    // Clear pending when not recording
    if (state === 'idle' || state === 'error') {
      this.pendingText = '';
    }
  }

  /**
   * Handle speech recognition errors
   */
  onSpeechError(error: SpeechError): void {
    this.errorMessage = error.message;
    this.pendingText = '';
  }

  /**
   * Override clearNote to also reset speech tracking
   */
  clearNote() {
    this.clinicalNote = '';
    this.aiResponse = '';
    this.errorMessage = '';
    this.finalizedText = '';
    this.pendingText = '';
  }
}
