import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PrescriptionService } from '../services/prescription.service';
import { TemplateService } from '../services/template.service';
import { PrescriptionForm } from '../models/prescription.model';
import {
  AutocompleteItem, DiseaseDto, SymptomDto,
  CreateSymptomRequest, CreateDiseaseRequest, DrugDosageInput,
  CreateChiefComplaintRequest, UpdateChiefComplaintRequest,
  CreateExaminationRequest, UpdateExaminationRequest,
  CreateAdviceRequest, UpdateAdviceRequest
} from '../models/template.model';
import { PdfExportComponent } from '../pdf-export/pdf-export.component';
import {
  DoctorInfo,
  PatientInfo,
  PrescriptionContent,
  PrescriptionMedication,
  PrescriptionPdfData,
  DEFAULT_DOCTOR_INFO
} from '../models/pdf-template.model';

interface TemplateItem {
  id: string;
  text: string;
  originalText: string;
  source: 'template' | 'ai' | 'manual';
  isModified: boolean;
  isSaving: boolean;
}

function createTemplateItem(id: string, text: string, source: 'template' | 'ai' | 'manual'): TemplateItem {
  return {
    id,
    text,
    originalText: text,
    source,
    isModified: false,
    isSaving: false
  };
}

interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  source: 'template' | 'ai' | 'manual';
  diseaseId?: string;
}

@Component({
  selector: 'app-e-prescription',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PdfExportComponent],
  templateUrl: './e-prescription.component.html',
  styleUrl: './e-prescription.component.css'
})
export class EPrescriptionComponent implements OnInit, OnDestroy {

  prescriptionForm!: FormGroup;
  private destroy$ = new Subject<void>();
  currentDate = new Date();
  patientIdNo = 'R251100002';
  patientDOB = '';
  patientAddress = '';
  patientPhone = '';
  referredBy = 'Self';
  patientSons = 0;
  patientDaughters = 0;
  maritalStatus = '';
  occupation = '';
  specialAlert = '';
  personalInfo = '';
  patientSearchTerm = '';
  patientSearchType: 'id' | 'name' | 'phone' = 'name';
  isSearchingPatient = false;
  visitNo = 1;
  totalVisits = 1;
  visitType = 'New';
  paymentAmount = '500.00';
  physicalFindingsText = '';
  additionalInfo = '';
  drugHistory = '';
  testFilter = 'To be done ...';
  selectedSketch = '';
  @ViewChild('sketchCanvas') sketchCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sketchFileInput') sketchFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('sketchBaseImage') sketchBaseImage!: ElementRef<HTMLImageElement>;
  sketchImageUrl: string | null = null;
  sketchDataUrl: string | null = null;
  sketchZoom = 1;
  sketchTool: 'pen' | 'eraser' | 'circle' | 'arrow' | 'text' = 'pen';
  sketchColor = '#030202ff';
  sketchLineWidth = 1;
  isDrawing = false;
  showSketchModal = false;
  private sketchCtx: CanvasRenderingContext2D | null = null;
  private lastX = 0;
  private lastY = 0;
  private sketchHistory: ImageData[] = [];
  liverDisease = false;
  renalDisease = false;
  showTreatmentPhase2 = false;
  medicationItemsPhase2: MedicationItem[] = [];
  furtherAdvice = '';
  notes = '';
  diagnosisSameAsLast = false;
  followUpType = 'after';
  followUpAfter = '';
  chiefComplaintItems: TemplateItem[] = [];
  examinationItems: TemplateItem[] = [];
  adviceItems: TemplateItem[] = [];
  investigationItems: TemplateItem[] = [];
  medicationItems: MedicationItem[] = [];
  chiefComplaintSuggestions: AutocompleteItem[] = [];
  examinationSuggestions: AutocompleteItem[] = [];
  adviceSuggestions: AutocompleteItem[] = [];
  drugSuggestions: AutocompleteItem[] = [];
  investigationSuggestions: AutocompleteItem[] = [];
  diseaseSuggestions: AutocompleteItem[] = [];
  chiefComplaintSearch = '';
  examinationSearch = '';
  adviceSearch = '';
  investigationSearch = '';
  diseaseSearch = '';
  activeDropdown: string | null = null;
  activeMedicationIndex: number = -1;
  selectedDiseases: DiseaseDto[] = [];
  symptomTemplateSearch = '';
  symptomTemplateSuggestions: AutocompleteItem[] = [];
  selectedSymptomTemplate: SymptomDto | null = null;
  isLoadingSymptomTemplate = false;
  hasAiData = false;
  aiDataAccepted = false;
  icdCodes = '';
  isPhysicalFindingsExpanded = false;
  isAdviceExpanded = false;
  private isInternalUpdate = false;

  showNotificationFlag = false;
  notificationMessage = '';
  notificationType: 'success' | 'error' | 'info' = 'info';
  showConfirmDialog = false;
  confirmDialogMessage = '';
  confirmDialogAction: 'clear' | 'save' = 'clear';
  isLoadingTemplate = false;

  showSaveTemplateModal = false;
  saveTemplateType: 'symptom' | 'disease' = 'symptom';
  saveTemplateScope: 'section' | 'global' = 'global';
  templateName = '';
  templateShortcut = '';
  templateSectionToSave = '';
  showImportTemplateModal = false;
  importTemplateSearch = '';
  filteredTemplates: any[] = [];

  showPdfPreview = false;
  pdfData?: PrescriptionPdfData;

  doctorName = 'Dr. John Doe';
  doctorSpecialization = 'General Physician';
  doctorLicense = 'MD-12345';

  constructor(
    private fb: FormBuilder,
    private prescriptionService: PrescriptionService,
    private templateService: TemplateService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit() {
    this.prescriptionService.prescription$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data && Object.keys(data).length > 0 && !this.isInternalUpdate && !this.hasAiData) {
          this.loadAiData(data);
        }
        this.isInternalUpdate = false;
      });
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }

  private onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.autocomplete-container') && !target.closest('.dropdown-menu')) {
      this.activeDropdown = null;
      this.activeMedicationIndex = -1;
    }
  }

  private initializeForm() {
    this.prescriptionForm = this.fb.group({
      patientName: ['', Validators.required],
      patientAge: ['', [Validators.required, Validators.min(0), Validators.max(150)]],
      patientGender: ['', Validators.required],
      weight: [''],
      height: [''],
      pulse: [''],
      bloodPressure: [''],
      temperature: [''],
      diagnosis: [''],
      treatmentPlan: [''],
      followUpDate: [''],
      medicalHistory: [''],
      referralComments: ['']
    });
  }

  // ============== AI Data Loading ==============

  private loadAiData(data: Partial<PrescriptionForm>) {
    this.hasAiData = true;
    this.aiDataAccepted = false;
    this.prescriptionForm.patchValue({
      patientName: data.patientName || '',
      patientAge: data.patientAge || '',
      patientGender: data.patientGender || '',
      weight: data.weight || '',
      height: data.height || '',
      pulse: data.pulse || '',
      bloodPressure: data.bloodPressure || '',
      temperature: data.temperature || '',
      diagnosis: data.diagnosis || '',
      treatmentPlan: data.treatmentPlan || '',
      followUpDate: data.followUpDate || '',
      medicalHistory: data.medicalHistory || '',
      referralComments: data.referralComments || ''
    });
    if (data.chiefComplaint) {
      const complaints = this.splitText(data.chiefComplaint);
      this.chiefComplaintItems = complaints.map((text, i) =>
        createTemplateItem(`ai-cc-${i}-${Date.now()}`, text, 'ai')
      );
    }
    if (data.physicalExamination) {
      const exams = this.splitText(data.physicalExamination);
      this.examinationItems = exams.map((text, i) =>
        createTemplateItem(`ai-exam-${i}-${Date.now()}`, text, 'ai')
      );
    }
    if (data.advice) {
      const advices = this.splitText(data.advice);
      this.adviceItems = advices.map((text, i) =>
        createTemplateItem(`ai-advice-${i}-${Date.now()}`, text, 'ai')
      );
    }
    if (data.tests) {
      const tests = data.tests.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
      this.investigationItems = tests.map((text: string, i: number) =>
        createTemplateItem(`ai-test-${i}-${Date.now()}`, text, 'ai')
      );
    }
    if (data.icdCodes) {
      this.icdCodes = data.icdCodes;
    }
    if (data.medications && data.medications.length > 0) {
      this.medicationItems = data.medications.map((med, i) => ({
        id: `ai-med-${i}-${Date.now()}`,
        name: med.name || '',
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        instructions: med.instructions || '',
        source: 'ai' as const
      }));
    }
    if (this.medicationItems.length === 0) {
      this.addEmptyMedication();
    }

    this.showNotification('AI data loaded - Review and modify as needed', 'info');
  }

  private splitText(text: string): string[] {
    return text.split(/[;\n]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  // ============== AI Actions ==========================

  acceptAllAiData() {
    this.aiDataAccepted = true;
    this.showNotification('All AI suggestions accepted', 'success');
  }

  rejectAllAiData() {
    this.hasAiData = false;
    this.aiDataAccepted = false;
    this.icdCodes = '';
    this.prescriptionForm.reset();
    this.chiefComplaintItems = [];
    this.examinationItems = [];
    this.adviceItems = [];
    this.investigationItems = [];
    this.medicationItems = [];
    this.addEmptyMedication();
    this.prescriptionService.clearPrescription();
    this.showNotification('All AI suggestions rejected', 'info');
  }

  hasAiItems(): boolean {
    return this.chiefComplaintItems.some(i => i.source === 'ai') ||
      this.examinationItems.some(i => i.source === 'ai') ||
      this.adviceItems.some(i => i.source === 'ai') ||
      this.medicationItems.some(i => i.source === 'ai');
  }

  // ============== Disease Template Section ==============

  onDiseaseSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.diseaseSearch = term;
    if (term.length >= 1) {
      this.activeDropdown = 'disease';
      this.templateService.searchDiseasesAutocomplete(term)
        .pipe(takeUntil(this.destroy$))
        .subscribe(results => {
          this.diseaseSuggestions = results;
        });
    } else {
      this.diseaseSuggestions = [];
      this.activeDropdown = null;
    }
  }

  selectDiseaseTemplate(item: AutocompleteItem) {
    this.isLoadingTemplate = true;
    this.templateService.getDiseaseById(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (disease) => {
          this.applyDiseaseTemplate(disease);
          this.isLoadingTemplate = false;
          this.diseaseSearch = ''; // Clear search so user can add more diseases
          this.diseaseSuggestions = [];
          this.activeDropdown = null;
          this.showNotification(`Disease template "${disease.name}" applied`, 'success');
        },
        error: () => {
          this.isLoadingTemplate = false;
          this.showNotification('Failed to load disease template', 'error');
        }
      });
  }

  private applyDiseaseTemplate(disease: DiseaseDto) {
    // Check if disease already added
    const alreadyExists = this.selectedDiseases.find(d => d.id === disease.id);
    if (alreadyExists) {
      this.showNotification(`Disease "${disease.name}" already added`, 'info');
      return;
    }

    // Add disease to list
    this.selectedDiseases.push(disease);

    // Update diagnosis - combine all disease names
    const diagnoses = this.selectedDiseases.map(d => d.name).join(', ');
    this.prescriptionForm.patchValue({ diagnosis: diagnoses });

    // Apply medications from disease
    if (disease.drugs && disease.drugs.length > 0) {
      // Remove empty medication rows first
      this.medicationItems = this.medicationItems.filter(m => m.name.trim() !== '');

      disease.drugs.forEach(drug => {
        const exists = this.medicationItems.find(m =>
          m.name.toLowerCase() === drug.name.toLowerCase()
        );
        if (!exists) {
          this.medicationItems.push({
            id: `template-med-${disease.id}-${drug.id || Date.now()}-${Math.random()}`,
            name: drug.name,
            dosage: drug.strength || '',
            frequency: drug.dosageInstructionsEnglish || drug.dosageInstructions || '',
            duration: '',
            instructions: '',
            source: 'template',
            diseaseId: disease.id // Track which disease added this medication
          });
        }
      });

      // Ensure at least one row for adding more
      if (this.medicationItems.length === 0) {
        this.addEmptyMedication();
      }
    }
  }

  clearDiseaseTemplate() {
    this.selectedDiseases = [];
    this.diseaseSearch = '';
    this.prescriptionForm.patchValue({ diagnosis: '' });
    // Remove all template medications
    this.medicationItems = this.medicationItems.filter(m => m.source !== 'template');
    if (this.medicationItems.length === 0) {
      this.addEmptyMedication();
    }
  }

  removeDisease(diseaseId: string) {
    // Find the disease to remove
    const diseaseIndex = this.selectedDiseases.findIndex(d => d.id === diseaseId);
    if (diseaseIndex === -1) return;

    const disease = this.selectedDiseases[diseaseIndex];

    // Remove disease from list
    this.selectedDiseases.splice(diseaseIndex, 1);

    // Update diagnosis text
    const diagnoses = this.selectedDiseases.map(d => d.name).join(', ');
    this.prescriptionForm.patchValue({ diagnosis: diagnoses || '' });

    // Remove medications that were added from this disease
    this.medicationItems = this.medicationItems.filter(m => {
      // Keep if not template or if from different disease
      if (m.source !== 'template') return true;
      // Check if medication belongs to removed disease
      return m.diseaseId !== diseaseId;
    });

    if (this.medicationItems.length === 0) {
      this.addEmptyMedication();
    }

    this.showNotification(`Disease "${disease.name}" and its medications removed`, 'info');
  }

  // ============== Symptom Template (Import Template) ==============

  onSymptomTemplateSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.symptomTemplateSearch = term;
    if (term.length >= 1) {
      this.activeDropdown = 'symptomTemplate';
      this.templateService.searchSymptomsAutocomplete(term)
        .pipe(takeUntil(this.destroy$))
        .subscribe(results => {
          this.symptomTemplateSuggestions = results;
        });
    } else {
      this.symptomTemplateSuggestions = [];
      this.activeDropdown = null;
    }
  }

  selectSymptomTemplate(item: AutocompleteItem) {
    this.isLoadingSymptomTemplate = true;
    this.templateService.getSymptomById(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (symptom) => {
          this.applySymptomTemplate(symptom);
          this.isLoadingSymptomTemplate = false;
          this.symptomTemplateSearch = '';
          this.symptomTemplateSuggestions = [];
          this.activeDropdown = null;
          this.showNotification(`Template "${symptom.name}" applied - all sections populated`, 'success');
        },
        error: () => {
          this.isLoadingSymptomTemplate = false;
          this.showNotification('Failed to load symptom template', 'error');
        }
      });
  }

  private applySymptomTemplate(symptom: SymptomDto) {
    this.selectedSymptomTemplate = symptom;

    // Apply Chief Complaints
    if (symptom.chiefComplaints && symptom.chiefComplaints.length > 0) {
      symptom.chiefComplaints.forEach(cc => {
        const exists = this.chiefComplaintItems.find(c => c.text.toLowerCase() === cc.description.toLowerCase());
        if (!exists) {
          this.chiefComplaintItems.push(createTemplateItem(cc.id || `template-cc-${Date.now()}`, cc.description, 'template'));
        }
      });
    }

    // Apply Examinations
    if (symptom.examinations && symptom.examinations.length > 0) {
      symptom.examinations.forEach(exam => {
        const exists = this.examinationItems.find(e => e.text.toLowerCase() === exam.description.toLowerCase());
        if (!exists) {
          this.examinationItems.push(createTemplateItem(exam.id || `template-exam-${Date.now()}`, exam.description, 'template'));
        }
      });
    }

    // Apply Advice
    if (symptom.advices && symptom.advices.length > 0) {
      symptom.advices.forEach(adv => {
        const exists = this.adviceItems.find(a => a.text.toLowerCase() === adv.description.toLowerCase());
        if (!exists) {
          this.adviceItems.push(createTemplateItem(adv.id || `template-advice-${Date.now()}`, adv.description, 'template'));
        }
      });
    }

    // Apply Investigations
    if (symptom.investigations && symptom.investigations.length > 0) {
      symptom.investigations.forEach(inv => {
        const displayText = inv.fullName || inv.abbreviation || '';
        const exists = this.investigationItems.find(i => i.text.toLowerCase() === displayText.toLowerCase());
        if (!exists && displayText) {
          this.investigationItems.push(createTemplateItem(inv.id || `template-inv-${Date.now()}`, displayText, 'template'));
        }
      });
    }

    // Apply Medications
    if (symptom.drugs && symptom.drugs.length > 0) {
      // Remove empty medication rows first
      this.medicationItems = this.medicationItems.filter(m => m.name.trim() !== '');

      symptom.drugs.forEach(drug => {
        const exists = this.medicationItems.find(m => m.name.toLowerCase() === drug.name.toLowerCase());
        if (!exists) {
          this.medicationItems.push({
            id: `template-med-symptom-${drug.id || Date.now()}-${Math.random()}`,
            name: drug.name,
            dosage: drug.strength || '',
            frequency: drug.dosageInstructionsEnglish || drug.dosageInstructions || '',
            duration: '',
            instructions: '',
            source: 'template'
          });
        }
      });

      // Ensure at least one row for adding more
      if (this.medicationItems.length === 0) {
        this.addEmptyMedication();
      }
    }

    // Apply Follow-up
    if (symptom.followUp) {
      this.prescriptionForm.patchValue({ treatmentPlan: symptom.followUp });
    }
  }

  clearSymptomTemplate() {
    if (!this.selectedSymptomTemplate) return;

    // Clear all template items
    this.chiefComplaintItems = this.chiefComplaintItems.filter(c => c.source !== 'template');
    this.examinationItems = this.examinationItems.filter(e => e.source !== 'template');
    this.adviceItems = this.adviceItems.filter(a => a.source !== 'template');
    this.investigationItems = this.investigationItems.filter(i => i.source !== 'template');
    this.medicationItems = this.medicationItems.filter(m => m.source !== 'template');

    if (this.medicationItems.length === 0) {
      this.addEmptyMedication();
    }

    this.prescriptionForm.patchValue({ treatmentPlan: '' });

    this.selectedSymptomTemplate = null;
    this.symptomTemplateSearch = '';
    this.showNotification('Template cleared', 'info');
  }

  // ============== Chief Complaints ==============

  onChiefComplaintSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.chiefComplaintSearch = term;
    if (term.length >= 1) {
      this.activeDropdown = 'chiefComplaint';
      this.templateService.searchChiefComplaintsAutocomplete(term)
        .pipe(takeUntil(this.destroy$))
        .subscribe(results => {
          this.chiefComplaintSuggestions = results;
        });
    } else {
      this.chiefComplaintSuggestions = [];
    }
  }

  selectChiefComplaint(item: AutocompleteItem) {
    const exists = this.chiefComplaintItems.find(c => c.text.toLowerCase() === item.name.toLowerCase());
    if (!exists) {
      this.chiefComplaintItems.push(createTemplateItem(item.id, item.name, 'template'));
    }
    this.chiefComplaintSearch = '';
    this.chiefComplaintSuggestions = [];
    this.activeDropdown = null;
  }

  addChiefComplaintManual() {
    const text = this.chiefComplaintSearch.trim();
    if (text) {
      this.chiefComplaintItems.push(createTemplateItem(`manual-cc-${Date.now()}`, text, 'manual'));
      this.chiefComplaintSearch = '';
      this.activeDropdown = null;
    }
  }

  removeChiefComplaint(index: number) {
    this.chiefComplaintItems.splice(index, 1);
  }

  updateChiefComplaint(index: number, newText: string) {
    if (newText.trim()) {
      const item = this.chiefComplaintItems[index];
      item.text = newText.trim();
      item.isModified = item.text !== item.originalText;
    }
  }

  saveIndividualChiefComplaint(index: number) {
    const item = this.chiefComplaintItems[index];
    if (!item.text.trim()) return;

    item.isSaving = true;

    if (item.source === 'template' && !item.id.startsWith('manual-') && !item.id.startsWith('ai-')) {
      // Update existing item in DB
      this.templateService.updateChiefComplaint(item.id, { description: item.text })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            item.originalText = item.text;
            item.isModified = false;
            item.isSaving = false;
            this.showNotification('Chief complaint updated in database', 'success');
          },
          error: () => {
            item.isSaving = false;
            this.showNotification('Failed to update chief complaint', 'error');
          }
        });
    } else {
      // Create new item in DB
      this.templateService.createChiefComplaint({ description: item.text })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            item.id = result.id;
            item.originalText = item.text;
            item.source = 'template';
            item.isModified = false;
            item.isSaving = false;
            this.showNotification('Chief complaint saved to database', 'success');
          },
          error: () => {
            item.isSaving = false;
            this.showNotification('Failed to save chief complaint', 'error');
          }
        });
    }
  }

  // ============== Physical Examination ==============

  onExaminationSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.examinationSearch = term;
    if (term.length >= 1) {
      this.activeDropdown = 'examination';
      this.templateService.searchExaminationsAutocomplete(term)
        .pipe(takeUntil(this.destroy$))
        .subscribe(results => {
          this.examinationSuggestions = results;
        });
    } else {
      this.examinationSuggestions = [];
    }
  }

  selectExamination(item: AutocompleteItem) {
    const exists = this.examinationItems.find(e => e.text.toLowerCase() === item.name.toLowerCase());
    if (!exists) {
      this.examinationItems.push(createTemplateItem(item.id, item.name, 'template'));
    }
    this.examinationSearch = '';
    this.examinationSuggestions = [];
    this.activeDropdown = null;
  }

  addExaminationManual() {
    const text = this.examinationSearch.trim();
    if (text) {
      this.examinationItems.push(createTemplateItem(`manual-exam-${Date.now()}`, text, 'manual'));
      this.examinationSearch = '';
      this.activeDropdown = null;
    }
  }

  removeExamination(index: number) {
    this.examinationItems.splice(index, 1);
  }

  updateExamination(index: number, newText: string) {
    if (newText.trim()) {
      const item = this.examinationItems[index];
      item.text = newText.trim();
      item.isModified = item.text !== item.originalText;
    }
  }

  saveIndividualExamination(index: number) {
    const item = this.examinationItems[index];
    if (!item.text.trim()) return;

    item.isSaving = true;

    if (item.source === 'template' && !item.id.startsWith('manual-') && !item.id.startsWith('ai-')) {
      // Update existing item in DB
      this.templateService.updateExamination(item.id, { description: item.text })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            item.originalText = item.text;
            item.isModified = false;
            item.isSaving = false;
            this.showNotification('Examination updated in database', 'success');
          },
          error: () => {
            item.isSaving = false;
            this.showNotification('Failed to update examination', 'error');
          }
        });
    } else {
      // Create new item in DB
      this.templateService.createExamination({ description: item.text })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            item.id = result.id;
            item.originalText = item.text;
            item.source = 'template';
            item.isModified = false;
            item.isSaving = false;
            this.showNotification('Examination saved to database', 'success');
          },
          error: () => {
            item.isSaving = false;
            this.showNotification('Failed to save examination', 'error');
          }
        });
    }
  }

  // ============== Advice ==============

  onAdviceSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.adviceSearch = term;
    if (term.length >= 1) {
      this.activeDropdown = 'advice';
      this.templateService.searchAdvicesAutocomplete(term)
        .pipe(takeUntil(this.destroy$))
        .subscribe(results => {
          this.adviceSuggestions = results;
        });
    } else {
      this.adviceSuggestions = [];
    }
  }

  selectAdvice(item: AutocompleteItem) {
    const exists = this.adviceItems.find(a => a.text.toLowerCase() === item.name.toLowerCase());
    if (!exists) {
      this.adviceItems.push(createTemplateItem(item.id, item.name, 'template'));
    }
    this.adviceSearch = '';
    this.adviceSuggestions = [];
    this.activeDropdown = null;
  }

  addAdviceManual() {
    const text = this.adviceSearch.trim();
    if (text) {
      this.adviceItems.push(createTemplateItem(`manual-advice-${Date.now()}`, text, 'manual'));
      this.adviceSearch = '';
      this.activeDropdown = null;
    }
  }

  removeAdvice(index: number) {
    this.adviceItems.splice(index, 1);
  }

  updateAdvice(index: number, newText: string) {
    if (newText.trim()) {
      const item = this.adviceItems[index];
      item.text = newText.trim();
      item.isModified = item.text !== item.originalText;
    }
  }

  saveIndividualAdvice(index: number) {
    const item = this.adviceItems[index];
    if (!item.text.trim()) return;

    item.isSaving = true;

    if (item.source === 'template' && !item.id.startsWith('manual-') && !item.id.startsWith('ai-')) {
      // Update existing item in DB
      this.templateService.updateAdvice(item.id, { description: item.text })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            item.originalText = item.text;
            item.isModified = false;
            item.isSaving = false;
            this.showNotification('Advice updated in database', 'success');
          },
          error: () => {
            item.isSaving = false;
            this.showNotification('Failed to update advice', 'error');
          }
        });
    } else {
      // Create new item in DB
      this.templateService.createAdvice({ description: item.text })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            item.id = result.id;
            item.originalText = item.text;
            item.source = 'template';
            item.isModified = false;
            item.isSaving = false;
            this.showNotification('Advice saved to database', 'success');
          },
          error: () => {
            item.isSaving = false;
            this.showNotification('Failed to save advice', 'error');
          }
        });
    }
  }

  // ============== Investigations ==============

  onInvestigationSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.investigationSearch = term;
    if (term.length >= 1) {
      this.activeDropdown = 'investigation';
      this.templateService.searchReportsAutocomplete(term)
        .pipe(takeUntil(this.destroy$))
        .subscribe(results => {
          this.investigationSuggestions = results;
        });
    } else {
      this.investigationSuggestions = [];
    }
  }

  selectInvestigation(item: AutocompleteItem) {
    const exists = this.investigationItems.find(i => i.id === item.id);
    if (!exists) {
      this.investigationItems.push(createTemplateItem(item.id, item.displayText, 'template'));
    }
    this.investigationSearch = '';
    this.investigationSuggestions = [];
    this.activeDropdown = null;
  }

  addInvestigationManual() {
    const text = this.investigationSearch.trim();
    if (text) {
      this.investigationItems.push(createTemplateItem(`manual-inv-${Date.now()}`, text, 'manual'));
      this.investigationSearch = '';
      this.activeDropdown = null;
    }
  }

  removeInvestigation(index: number) {
    this.investigationItems.splice(index, 1);
  }

  updateInvestigation(index: number, newText: string) {
    if (newText.trim()) {
      const item = this.investigationItems[index];
      item.text = newText.trim();
      item.isModified = item.text !== item.originalText;
    }
  }

  saveIndividualInvestigation(index: number) {
    const item = this.investigationItems[index];
    if (!item.text.trim()) return;

    item.isSaving = true;

    if (item.source === 'template' && !item.id.startsWith('manual-') && !item.id.startsWith('ai-')) {
      // Update existing item in DB
      this.templateService.updateReport(item.id, { fullName: item.text, abbreviation: item.text.substring(0, 10) })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            item.originalText = item.text;
            item.isModified = false;
            item.isSaving = false;
            this.showNotification('Investigation updated in database', 'success');
          },
          error: () => {
            item.isSaving = false;
            this.showNotification('Failed to update investigation', 'error');
          }
        });
    } else {
      // Create new investigation - need OID, using timestamp as placeholder
      this.templateService.createReport({
        oid: Date.now(),
        abbreviation: item.text.substring(0, 10),
        fullName: item.text
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            item.id = result.id;
            item.originalText = item.text;
            item.source = 'template';
            item.isModified = false;
            item.isSaving = false;
            this.showNotification('Investigation saved to database', 'success');
          },
          error: () => {
            item.isSaving = false;
            this.showNotification('Failed to save investigation', 'error');
          }
        });
    }
  }

  // ============== Medications ==============

  onDrugSearch(index: number, event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.medicationItems[index].name = term;
    if (term.length >= 1) {
      this.activeDropdown = 'drug';
      this.activeMedicationIndex = index;
      this.templateService.searchDrugsAutocomplete(term)
        .pipe(takeUntil(this.destroy$))
        .subscribe(results => {
          this.drugSuggestions = results;
        });
    } else {
      this.drugSuggestions = [];
      this.activeMedicationIndex = -1;
    }
  }

  selectDrug(index: number, item: AutocompleteItem) {
    const drug = item.data;
    this.medicationItems[index] = {
      ...this.medicationItems[index],
      name: drug.name,
      dosage: drug.strength || '',
      source: 'template'
    };
    this.drugSuggestions = [];
    this.activeDropdown = null;
    this.activeMedicationIndex = -1;
  }

  addEmptyMedication() {
    this.medicationItems.push({
      id: `med-${Date.now()}`,
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      source: 'manual'
    });
  }

  removeMedication(index: number) {
    if (this.medicationItems.length > 1) {
      this.medicationItems.splice(index, 1);
    }
  }

  selectedMedicationIndex = -1;
  selectedMedicationIndices: number[] = [];
  medicationHistory: MedicationItem[][] = [];
  showEnglishDosage = false;

  pauseMedication() {
    if (this.selectedMedicationIndex >= 0) {
      const med = this.medicationItems[this.selectedMedicationIndex];
      med.instructions = med.instructions ? med.instructions + ' [অফ থাকবে]' : '[অফ থাকবে]';
      this.showNotification(`${med.name || 'Medication'} paused`, 'info');
    } else {
      this.showNotification('Select a medication to pause', 'info');
    }
  }

  clearAllMedications() {
    if (this.medicationItems.length > 0) {
      this.saveMedicationHistory();
      this.medicationItems = [];
      this.addEmptyMedication();
      this.selectedMedicationIndices = [];
      this.selectedMedicationIndex = -1;
      this.showNotification('All medications cleared', 'info');
    }
  }

  copyMedications() {
    const medicationsText = this.medicationItems
      .filter(m => m.name.trim())
      .map((m, i) => `${i + 1}. ${m.name} ${m.dosage} - ${m.frequency} ${m.duration}`)
      .join('\n');

    if (medicationsText) {
      navigator.clipboard.writeText(medicationsText).then(() => {
        this.showNotification('Medications copied to clipboard', 'success');
      }).catch(() => {
        this.showNotification('Failed to copy medications', 'error');
      });
    } else {
      this.showNotification('No medications to copy', 'info');
    }
  }


  undoMedicationChange() {
    if (this.medicationHistory.length > 0) {
      this.medicationItems = this.medicationHistory.pop()!;
      this.showNotification('Undo successful', 'info');
    } else {
      this.showNotification('Nothing to undo', 'info');
    }
  }


  private saveMedicationHistory() {
    this.medicationHistory.push([...this.medicationItems.map(m => ({ ...m }))]);
    if (this.medicationHistory.length > 10) {
      this.medicationHistory.shift();
    }
  }

  selectMedication(index: number) {
    this.selectedMedicationIndex = index;
  }

  updateMedicationField(index: number, field: keyof MedicationItem, value: string) {
    if (this.medicationItems[index]) {
      (this.medicationItems[index] as any)[field] = value;
    }
  }

  // ============== Import Template ==============

  openImportTemplateModal() {
    this.showImportTemplateModal = true;
    this.importTemplateSearch = '';
    this.loadAvailableTemplates();
  }

  closeImportTemplateModal() {
    this.showImportTemplateModal = false;
    this.importTemplateSearch = '';
  }

  loadAvailableTemplates(searchTerm: string = '') {
    this.filteredTemplates = [];

    this.templateService.searchSymptoms(searchTerm, 1, 50).subscribe({
      next: (result) => {
        const symptomTemplates = result.items.map(s => ({
          ...s,
          templateType: 'symptom'
        }));
        this.filteredTemplates = [...this.filteredTemplates, ...symptomTemplates];
      },
      error: (err: any) => console.error('Error loading symptom templates:', err)
    });

    this.templateService.searchDiseases(searchTerm, 1, 50).subscribe({
      next: (result) => {
        const diseaseTemplates = result.items.map(d => ({
          ...d,
          templateType: 'disease'
        }));
        this.filteredTemplates = [...this.filteredTemplates, ...diseaseTemplates];
      },
      error: (err: any) => console.error('Error loading disease templates:', err)
    });
  }

  filterTemplates() {
    this.loadAvailableTemplates(this.importTemplateSearch);
  }

  applyTemplate(template: any) {
    if (template.templateType === 'symptom') {
      this.templateService.getSymptomById(template.id).subscribe({
        next: (fullTemplate) => {
          this.applySymptomTemplate(fullTemplate);
          this.closeImportTemplateModal();
          this.showNotification(`Template "${template.name}" applied successfully`, 'success');
        },
        error: (err: any) => {
          console.error('Error loading template:', err);
          this.showNotification('Error loading template', 'error');
        }
      });
    } else if (template.templateType === 'disease') {
      this.templateService.getDiseaseById(template.id).subscribe({
        next: (fullTemplate) => {
          this.applyDiseaseTemplate(fullTemplate);
          this.closeImportTemplateModal();
          this.showNotification(`Template "${template.name}" applied successfully`, 'success');
        },
        error: (err: any) => {
          console.error('Error loading template:', err);
          this.showNotification('Error loading template', 'error');
        }
      });
    }
  }

  // ============== Save as Template ==============

  openSaveTemplateModal(scope: 'section' | 'global', section?: string) {
    this.saveTemplateScope = scope;
    this.templateSectionToSave = section || '';
    this.saveTemplateType = 'symptom';
    this.templateName = '';
    this.templateShortcut = '';
    this.showSaveTemplateModal = true;
  }

  closeSaveTemplateModal() {
    this.showSaveTemplateModal = false;
    this.templateName = '';
    this.templateShortcut = '';
  }

  saveAsTemplate() {
    if (!this.templateName.trim() || !this.templateShortcut.trim()) {
      this.showNotification('Please enter template name and shortcut', 'error');
      return;
    }

    if (this.saveTemplateType === 'symptom') {
      this.saveAsSymptomTemplate();
    } else {
      this.saveAsDiseaseTemplate();
    }
  }

  private saveAsSymptomTemplate() {
    const drugs = this.medicationItems
      .filter(m => m.name.trim() !== '')
      .map((m, index) => ({
        name: m.name,
        strength: m.dosage,
        dosageInstructions: m.frequency,
        dosageInstructionsEnglish: m.frequency,
        sortOrder: index + 1
      }));

    const request: CreateSymptomRequest = {
      name: this.templateName,
      shortcut: this.templateShortcut,
      followUp: this.prescriptionForm.get('treatmentPlan')?.value || '',
      chiefComplaints: this.chiefComplaintItems.map(c => c.text),
      examinations: this.examinationItems.map(e => e.text),
      advices: this.adviceItems.map(a => a.text),
      drugs: drugs,
      investigationOIDs: [] // Reports need OID numbers, we'll leave empty for now
    };

    this.templateService.createSymptom(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showNotification(`Symptom template "${this.templateName}" saved successfully`, 'success');
          this.closeSaveTemplateModal();
        },
        error: (err) => {
          console.error('Failed to save template:', err);
          this.showNotification('Failed to save template', 'error');
        }
      });
  }

  private saveAsDiseaseTemplate() {
    // Build drugs array with proper format
    const drugs = this.medicationItems
      .filter(m => m.name.trim() !== '')
      .map((m, index) => ({
        drugId: m.source === 'template' && !m.id.startsWith('template-med-') ? m.id : undefined,
        name: m.name,
        strength: m.dosage,
        dosageInstructions: m.frequency,
        dosageInstructionsEnglish: m.frequency,
        sortOrder: index + 1
      }));

    const request: CreateDiseaseRequest = {
      name: this.templateName,
      shortcut: this.templateShortcut,
      drugs: drugs
    };

    this.templateService.createDisease(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showNotification(`Disease template "${this.templateName}" saved successfully`, 'success');
          this.closeSaveTemplateModal();
        },
        error: (err) => {
          console.error('Failed to save template:', err);
          this.showNotification('Failed to save template', 'error');
        }
      });
  }

  // ============== Form Actions ==============

  backToClinicalBot() {
    this.router.navigate(['/clinical-bot']);
  }

  printPrescription() {
    // Open PDF preview for printing
    this.openPdfPreview();
    setTimeout(() => {
      window.print();
    }, 500);
  }

  exportAsPDF() {
    // Open PDF preview modal
    this.openPdfPreview();
  }

  openPdfPreview() {
    this.pdfData = this.buildPdfData();
    this.showPdfPreview = true;
  }

  closePdfPreview() {
    this.showPdfPreview = false;
  }

  private buildPdfData(): PrescriptionPdfData {
    const formData = this.prescriptionForm.value;

    // Build patient info
    const patient: PatientInfo = {
      name: formData.patientName || 'Unknown Patient',
      age: formData.patientAge || 0,
      gender: formData.patientGender || 'Unknown',
      weight: formData.weight,
      date: new Date(),
      visitNo: 1
    };

    // Build medications
    const medications: PrescriptionMedication[] = this.medicationItems
      .filter(m => m.name.trim())
      .map((med, index) => ({
        serialNo: index + 1,
        name: med.name,
        form: this.extractMedForm(med.name),
        strength: med.dosage,
        dosage: med.frequency || '1+0+1',
        duration: med.duration || '',
        instructions: med.instructions
      }));

    // Build content
    const content: PrescriptionContent = {
      chiefComplaints: this.chiefComplaintItems.map(c => c.text),
      diagnosis: formData.diagnosis ? [formData.diagnosis] : this.selectedDiseases.map(d => d.name),
      medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(/[;\n]/).filter((s: string) => s.trim()) : [],
      physicalExamination: this.examinationItems.map(e => e.text),
      investigations: this.investigationItems.map(i => i.text),
      medications: medications,
      advice: this.adviceItems.map(a => a.text),
      followUp: formData.followUpDate,
      referralComments: formData.referralComments
    };

    return {
      doctor: DEFAULT_DOCTOR_INFO,
      patient: patient,
      vitals: {
        weight: formData.weight,
        height: formData.height,
        pulse: formData.pulse,
        bloodPressure: formData.bloodPressure,
        temperature: formData.temperature
      },
      content: content,
      serialNo: '8880',
      printedAt: new Date()
    };
  }

  private extractMedForm(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith('tab') || lowerName.includes('tab.')) return 'Tab';
    if (lowerName.startsWith('cap') || lowerName.includes('cap.')) return 'Cap';
    if (lowerName.startsWith('syp') || lowerName.includes('syp.') || lowerName.includes('syrup')) return 'Syp';
    if (lowerName.startsWith('inj') || lowerName.includes('inj.')) return 'Inj';
    if (lowerName.includes('cream')) return 'Cream';
    if (lowerName.includes('oint')) return 'Oint';
    if (lowerName.includes('drop')) return 'Drop';
    if (lowerName.includes('susp')) return 'Susp';
    return 'Tab';
  }

  private preparePrescriptionDataForPdf() {
    const formData = this.prescriptionForm.value;
    const prescriptionData = {
      ...formData,
      chiefComplaint: this.chiefComplaintItems.map(c => c.text).join('; '),
      physicalExamination: this.examinationItems.map(e => e.text).join('; '),
      advice: this.adviceItems.map(a => a.text).join('; '),
      investigations: this.investigationItems.map(i => i.text),
      medications: this.medicationItems.filter(m => m.name.trim()).map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions
      }))
    };


    this.isInternalUpdate = true;
    this.prescriptionService.updatePrescription(prescriptionData);
  }

  clearForm() {
    this.confirmDialogMessage = 'Are you sure you want to clear all prescription data?';
    this.confirmDialogAction = 'clear';
    this.showConfirmDialog = true;
  }

  confirmAction() {
    if (this.confirmDialogAction === 'clear') {
      this.doClearForm();
    }
    this.showConfirmDialog = false;
  }

  cancelConfirmDialog() {
    this.showConfirmDialog = false;
  }

  private doClearForm() {
    this.prescriptionService.clearPrescription();
    this.prescriptionForm.reset();
    this.chiefComplaintItems = [];
    this.examinationItems = [];
    this.adviceItems = [];
    this.investigationItems = [];
    this.medicationItems = [];
    this.addEmptyMedication();
    this.selectedDiseases = [];
    this.diseaseSearch = '';
    this.hasAiData = false;
    this.aiDataAccepted = false;
    this.showNotification('Form cleared', 'info');
  }

  showReferredDoctor() {
    this.showNotification('No doctor in the system to refer', 'info');
  }

  // ============== Helpers ==============

  private showNotification(message: string, type: 'success' | 'error' | 'info') {
    this.notificationMessage = message;
    this.notificationType = type;
    this.showNotificationFlag = true;
    setTimeout(() => {
      this.showNotificationFlag = false;
    }, 3000);
  }

  getItemSourceClass(source: string): string {
    switch (source) {
      case 'ai': return 'item-ai';
      case 'template': return 'item-template';
      default: return 'item-manual';
    }
  }

  getSourceLabel(source: string): string {
    switch (source) {
      case 'ai': return 'AI';
      case 'template': return 'DB';
      default: return 'NEW';
    }
  }

  // Check if item is from database (can be updated)
  isFromDatabase(item: TemplateItem): boolean {
    return item.source === 'template' && !item.id.startsWith('manual-') && !item.id.startsWith('ai-');
  }

  // Check if item needs to be saved (new or modified)
  needsSave(item: TemplateItem): boolean {
    // New items (manual or AI) always need save
    if (item.source !== 'template' || item.id.startsWith('manual-') || item.id.startsWith('ai-')) {
      return true;
    }
    // Template items need save only if modified
    return item.isModified;
  }

  // Get save button label
  getSaveButtonLabel(item: TemplateItem): string {
    if (this.isFromDatabase(item)) {
      return item.isModified ? 'Update' : 'Saved';
    }
    return 'Save';
  }

  trackByItemId(index: number, item: TemplateItem): string {
    return item.id;
  }

  trackByMedId(index: number, item: MedicationItem): string {
    return item.id;
  }

  // ============== Patient Search Methods ==============

  searchPatientById() {
    if (!this.patientIdNo.trim()) {
      this.showNotification('Please enter a patient ID', 'info');
      return;
    }
    this.isSearchingPatient = true;
    // Simulate patient search - replace with actual service call
    setTimeout(() => {
      this.isSearchingPatient = false;
      this.showNotification(`Searching for patient ID: ${this.patientIdNo}`, 'info');
      // In real implementation, call patient service and populate form
    }, 500);
  }

  searchPatient() {
    if (!this.patientSearchTerm.trim()) {
      this.showNotification('Please enter a search term', 'info');
      return;
    }
    this.isSearchingPatient = true;
    // Simulate patient search - replace with actual service call
    setTimeout(() => {
      this.isSearchingPatient = false;
      this.showNotification(`Searching for patient by ${this.patientSearchType}: ${this.patientSearchTerm}`, 'info');
      // In real implementation, call patient service and show results
    }, 500);
  }

  editPersonalInfo() {
    this.showNotification('Personal info editor opened', 'info');
    // In real implementation, open a modal or navigate to edit personal info
  }

  // ============== Visit Navigation Methods ==============

  previousVisit() {
    if (this.visitNo > 1) {
      this.visitNo--;
      this.loadVisitData(this.visitNo);
      this.showNotification(`Loaded visit ${this.visitNo}`, 'info');
    }
  }

  nextVisit() {
    if (this.visitNo < this.totalVisits) {
      this.visitNo++;
      this.loadVisitData(this.visitNo);
      this.showNotification(`Loaded visit ${this.visitNo}`, 'info');
    }
  }

  lastVisit() {
    if (this.visitNo !== this.totalVisits) {
      this.visitNo = this.totalVisits;
      this.loadVisitData(this.visitNo);
      this.showNotification(`Loaded last visit (${this.visitNo})`, 'info');
    }
  }

  newVisit() {
    this.totalVisits++;
    this.visitNo = this.totalVisits;
    this.visitType = 'New';
    this.doClearForm();
    this.showNotification(`New visit ${this.visitNo} created`, 'success');
  }

  noOperation() {
    // No operation - just show a notification
    this.showNotification('No operation mode active', 'info');
  }

  onVisitTypeChange(type: string) {
    if (type === 'Follow-up' && this.visitNo === 1 && this.totalVisits === 1) {
      // If changing to follow-up on first visit, prompt
      this.showNotification('Follow-up visit selected', 'info');
    }
  }

  private loadVisitData(visitNumber: number) {
    this.currentDate = new Date();
  }

  // ============== Action Button Methods ==============

  emailPrescription() {
    if (!this.prescriptionForm.get('patientName')?.value) {
      this.showNotification('Please enter patient name first', 'error');
      return;
    }
    this.preparePrescriptionDataForPdf();
    this.showNotification('Email dialog opened - enter recipient email', 'info');
  }

  openSettings() {
    this.showNotification('Settings dialog opened', 'info');
  }

  // ============== NEW UI Methods (EasyPrescription style) ==============

  calculateAge(): string {
    if (!this.patientDOB) {
      const age = this.prescriptionForm.get('patientAge')?.value;
      return age ? `${age}y 0m 0d` : '0y 0m 0d';
    }
    const dob = new Date(this.patientDOB);
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      days += 30;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years}y ${months}m ${days}d`;
  }

  getMedicationDose(med: MedicationItem): string {
    const parts = [];
    if (med.frequency) parts.push(med.frequency);
    if (med.duration) parts.push(`- ${med.duration}`);
    if (med.instructions) parts.push(med.instructions);
    return parts.join(' ') || '';
  }

  updateMedicationDose(index: number, value: string) {
    if (this.medicationItems[index]) {
      this.medicationItems[index].frequency = value;
      this.medicationItems[index].duration = '';
      this.medicationItems[index].instructions = '';
    }
  }

  savePrescription() {
    if (!this.prescriptionForm.get('patientName')?.value) {
      this.showNotification('Please enter patient name', 'error');
      return;
    }
    this.preparePrescriptionDataForPdf();
    this.showNotification('Patient not onborad to system, Work in progress!', 'info');
  }

  showMedia() {
    this.showNotification('Media viewer opened', 'info');
  }

  getPhysicalFindingsText(): string {
    return this.examinationItems.map(e => e.text).join('\n');
  }

  // ============== Sketch/Drawing Methods ==============

  addSketchImage() {
    this.sketchFileInput?.nativeElement?.click();
  }

  onSketchImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.sketchImageUrl = e.target?.result as string;
        this.sketchZoom = 1;
        // Initialize canvas after image loads
        setTimeout(() => this.initSketchCanvas(), 100);
      };
      reader.readAsDataURL(file);
    }
  }

  onSketchTemplateChange() {
    if (!this.selectedSketch || this.selectedSketch === '') {
      return;
    }

    if (this.selectedSketch === 'custom') {
      this.addSketchImage();
      return;
    }
    const templateUrls: { [key: string]: string } = {
      'body-front': 'assets/sketches/body-front.png',
      'body-back': 'assets/sketches/body-back.png',
      'head': 'assets/sketches/head.png',
      'hand': 'assets/sketches/hand.png',
      'foot': 'assets/sketches/foot.png',
      'teeth': 'assets/sketches/teeth.png',
      'eye': 'assets/sketches/eye.png'
    };

    const url = templateUrls[this.selectedSketch];
    if (url) {
      this.sketchImageUrl = url;
      this.sketchZoom = 1;
      setTimeout(() => this.initSketchCanvas(), 100);
      this.showNotification(`Loaded ${this.selectedSketch} template`, 'info');
    }
  }

  private initSketchCanvas() {
    if (this.sketchCanvasRef?.nativeElement) {
      const canvas = this.sketchCanvasRef.nativeElement;
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth || 300;
        canvas.height = container.clientHeight || 200;
      }
      this.sketchCtx = canvas.getContext('2d');
      if (this.sketchCtx) {
        this.sketchCtx.lineCap = 'round';
        this.sketchCtx.lineJoin = 'round';
      }
    }
  }

  setSketchTool(tool: 'pen' | 'eraser' | 'circle' | 'arrow' | 'text') {
    this.sketchTool = tool;
  }

  startDrawing(event: MouseEvent) {
    if (!this.sketchCtx) return;

    this.isDrawing = true;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.lastX = (event.clientX - rect.left) / this.sketchZoom;
    this.lastY = (event.clientY - rect.top) / this.sketchZoom;

    // Save state for undo
    this.saveSketchState();
  }

  draw(event: MouseEvent) {
    if (!this.isDrawing || !this.sketchCtx) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.sketchZoom;
    const y = (event.clientY - rect.top) / this.sketchZoom;

    this.sketchCtx.beginPath();

    if (this.sketchTool === 'eraser') {
      this.sketchCtx.globalCompositeOperation = 'destination-out';
      this.sketchCtx.lineWidth = this.sketchLineWidth * 3;
    } else {
      this.sketchCtx.globalCompositeOperation = 'source-over';
      this.sketchCtx.strokeStyle = this.sketchColor;
      this.sketchCtx.lineWidth = this.sketchLineWidth;
    }

    if (this.sketchTool === 'pen' || this.sketchTool === 'eraser') {
      this.sketchCtx.moveTo(this.lastX, this.lastY);
      this.sketchCtx.lineTo(x, y);
      this.sketchCtx.stroke();
    } else if (this.sketchTool === 'circle') {
      // Draw circle from start point
      const radius = Math.sqrt(Math.pow(x - this.lastX, 2) + Math.pow(y - this.lastY, 2));
      this.sketchCtx.arc(this.lastX, this.lastY, radius, 0, 2 * Math.PI);
      this.sketchCtx.stroke();
    } else if (this.sketchTool === 'arrow') {
      // Draw arrow line
      this.sketchCtx.moveTo(this.lastX, this.lastY);
      this.sketchCtx.lineTo(x, y);
      this.sketchCtx.stroke();
      // Draw arrow head
      const angle = Math.atan2(y - this.lastY, x - this.lastX);
      const headLen = 10;
      this.sketchCtx.moveTo(x, y);
      this.sketchCtx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6));
      this.sketchCtx.moveTo(x, y);
      this.sketchCtx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6));
      this.sketchCtx.stroke();
    }

    if (this.sketchTool === 'pen' || this.sketchTool === 'eraser') {
      this.lastX = x;
      this.lastY = y;
    }
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  private saveSketchState() {
    if (this.sketchCtx && this.sketchCanvasRef?.nativeElement) {
      const canvas = this.sketchCanvasRef.nativeElement;
      const imageData = this.sketchCtx.getImageData(0, 0, canvas.width, canvas.height);
      this.sketchHistory.push(imageData);
      // Keep only last 20 states
      if (this.sketchHistory.length > 20) {
        this.sketchHistory.shift();
      }
    }
  }

  zoomInSketch() {
    if (this.sketchZoom < 3) {
      this.sketchZoom += 0.25;
    }
  }

  zoomOutSketch() {
    if (this.sketchZoom > 0.5) {
      this.sketchZoom -= 0.25;
    }
  }

  clearSketch() {
    if (this.sketchCtx && this.sketchCanvasRef?.nativeElement) {
      const canvas = this.sketchCanvasRef.nativeElement;
      this.sketchCtx.clearRect(0, 0, canvas.width, canvas.height);
      this.sketchHistory = [];
      this.showNotification('Sketch cleared', 'info');
    }
  }

  resetSketch() {
    this.sketchImageUrl = null;
    this.sketchZoom = 1;
    this.selectedSketch = '';
    this.sketchHistory = [];
    this.showNotification('Sketch reset', 'info');
  }

  cropSketch() {
    // In a full implementation, this would allow selecting an area to crop
    this.showNotification('Crop mode - select area to crop', 'info');
  }

  undoSketch() {
    if (this.sketchHistory.length > 0 && this.sketchCtx) {
      const previousState = this.sketchHistory.pop();
      if (previousState) {
        this.sketchCtx.putImageData(previousState, 0, 0);
      }
    }
  }

  // ============== Treatment Disease Warning Methods ==============

  onLiverDiseaseChange() {
    if (this.liverDisease) {
      this.showNotification('⚠️ Liver disease noted - some medications may need dose adjustment', 'info');
      this.checkMedicationContraindications('liver');
    }
  }

  onRenalDiseaseChange() {
    if (this.renalDisease) {
      this.showNotification('⚠️ Renal disease noted - some medications may need dose adjustment', 'info');
      this.checkMedicationContraindications('renal');
    }
  }

  private checkMedicationContraindications(diseaseType: 'liver' | 'renal') {
    // In a full implementation, this would check medications against contraindications
    const contraindicated = this.medicationItems.filter(med => {
      // Example check - in real app, check against a drug database
      const name = med.name.toLowerCase();
      if (diseaseType === 'liver') {
        return name.includes('paracetamol') || name.includes('acetaminophen');
      } else {
        return name.includes('nsaid') || name.includes('ibuprofen');
      }
    });

    if (contraindicated.length > 0) {
      const names = contraindicated.map(m => m.name).join(', ');
      this.showNotification(`⚠️ Warning: ${names} may require adjustment for ${diseaseType} disease`, 'error');
    }
  }

  openLargerTreatmentView() {

  }

  // ============== Panel Expand/Collapse Methods ==============

  togglePhysicalFindingsExpand() {
    this.isPhysicalFindingsExpanded = !this.isPhysicalFindingsExpanded;
  }

  toggleAdviceExpand() {
    this.isAdviceExpanded = !this.isAdviceExpanded;
  }

  // ============== Sketch Modal Methods ==============

  openSketchModal() {
    this.showSketchModal = true;
    // Initialize canvas after modal opens
    setTimeout(() => this.initSketchCanvas(), 100);
  }

  closeSketchModal() {
    this.showSketchModal = false;
  }

  saveSketchToForm() {
    if (this.sketchCanvasRef?.nativeElement && this.sketchImageUrl) {
      // Combine the base image and canvas drawing
      const canvas = this.sketchCanvasRef.nativeElement;
      const tempCanvas = document.createElement('canvas');
      const img = this.sketchBaseImage?.nativeElement;

      if (img) {
        tempCanvas.width = img.naturalWidth || canvas.width;
        tempCanvas.height = img.naturalHeight || canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          // Draw the base image
          tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
          // Draw the canvas overlay
          tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
          // Get combined data URL
          this.sketchDataUrl = tempCanvas.toDataURL('image/png');
        }
      } else {
        this.sketchDataUrl = canvas.toDataURL('image/png');
      }

      this.showNotification('Sketch saved to prescription', 'success');
    }
    this.closeSketchModal();
  }

  onSketchImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    if (this.sketchCanvasRef?.nativeElement) {
      const canvas = this.sketchCanvasRef.nativeElement;
      canvas.width = img.naturalWidth || img.width || 500;
      canvas.height = img.naturalHeight || img.height || 400;
      this.sketchCtx = canvas.getContext('2d');
      if (this.sketchCtx) {
        this.sketchCtx.lineCap = 'round';
        this.sketchCtx.lineJoin = 'round';
      }
    }
  }

  // ============== Medication Selection Methods ==============

  selectMedicationRow(index: number, event: Event) {
    // Single click selects row
    this.selectedMedicationIndex = index;

    // Ctrl+click for multi-select
    if ((event as MouseEvent).ctrlKey) {
      this.toggleMedicationSelection(index, event);
    } else {
      // Single select - clear others
      this.selectedMedicationIndices = [index];
    }
  }

  toggleMedicationSelection(index: number, event: Event) {
    event.stopPropagation();
    const idx = this.selectedMedicationIndices.indexOf(index);
    if (idx > -1) {
      this.selectedMedicationIndices.splice(idx, 1);
    } else {
      this.selectedMedicationIndices.push(index);
    }
    // Also update single selection to last toggled
    if (this.selectedMedicationIndices.length > 0) {
      this.selectedMedicationIndex = this.selectedMedicationIndices[this.selectedMedicationIndices.length - 1];
    } else {
      this.selectedMedicationIndex = -1;
    }
  }

  onDrugInputFocus(index: number) {
    this.selectedMedicationIndex = index;
    this.activeMedicationIndex = index;
  }

  // Override existing methods to use multi-select
  removeSelectedMedication() {
    if (this.selectedMedicationIndices.length > 0) {
      this.saveMedicationHistory();
      // Remove in reverse order to maintain correct indices
      const indicesToRemove = [...this.selectedMedicationIndices].sort((a, b) => b - a);
      indicesToRemove.forEach(idx => {
        if (this.medicationItems.length > 1) {
          this.medicationItems.splice(idx, 1);
        }
      });
      this.selectedMedicationIndices = [];
      this.selectedMedicationIndex = -1;
      this.showNotification('Selected medications removed', 'info');
    } else if (this.selectedMedicationIndex >= 0 && this.medicationItems.length > 1) {
      this.saveMedicationHistory();
      this.medicationItems.splice(this.selectedMedicationIndex, 1);
      this.selectedMedicationIndex = -1;
      this.showNotification('Medication removed', 'info');
    } else {
      this.showNotification('Select a medication to remove', 'info');
    }
  }

  toggleSelectAllMedications() {
    if (this.selectedMedicationIndices.length === this.medicationItems.length) {
      this.selectedMedicationIndices = [];
      this.selectedMedicationIndex = -1;
      this.showNotification('All medications deselected', 'info');
    } else {
      this.selectedMedicationIndices = this.medicationItems.map((_, i) => i);
      this.selectedMedicationIndex = this.medicationItems.length - 1;
      this.showNotification('All medications selected', 'info');
    }
  }
}
