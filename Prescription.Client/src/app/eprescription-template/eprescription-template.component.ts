import { Component, OnInit, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { TemplateService } from '../services/template.service';
import {
  PagedResult, DiseaseDto, DiseaseListDto, SymptomDto, SymptomListDto,
  DrugListDto, ChiefComplaintListDto, ExaminationListDto, AdviceListDto,
  ReportListDto, ReportDto, DrugDosageInput, CreateDiseaseRequest,
  CreateSymptomRequest, CreateDrugRequest, CreateChiefComplaintRequest,
  CreateExaminationRequest, CreateAdviceRequest, CreateReportRequest,
  AutocompleteItem
} from '../models/template.model';

type ActiveTab = 'diseases' | 'symptoms' | 'drugs' | 'chief-complaints' | 'examinations' | 'advices' | 'reports';
type AutocompleteType = 'drug' | 'chief-complaint' | 'examination' | 'advice' | 'report';

interface TabConfig {
  id: ActiveTab;
  label: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-eprescription-template',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './eprescription-template.component.html',
  styleUrl: './eprescription-template.component.css'
})
export class EprescriptionTemplateComponent implements OnInit, OnDestroy {
  activeTab: ActiveTab = 'diseases';
  tabs: TabConfig[] = [
    { id: 'diseases', label: 'Disease Templates', icon: 'fa-disease', color: '#e74c3c' },
    { id: 'symptoms', label: 'Symptom Templates', icon: 'fa-stethoscope', color: '#9b59b6' },
    { id: 'drugs', label: 'Medications', icon: 'fa-pills', color: '#3498db' },
    { id: 'chief-complaints', label: 'Chief Complaints', icon: 'fa-clipboard-list', color: '#2ecc71' },
    { id: 'examinations', label: 'Examinations', icon: 'fa-microscope', color: '#f39c12' },
    { id: 'advices', label: 'Advices', icon: 'fa-lightbulb', color: '#1abc9c' },
    { id: 'reports', label: 'Investigations', icon: 'fa-flask', color: '#e67e22' }
  ];

  searchTerm = '';
  searchSubject = new Subject<string>();
  searchSubscription?: Subscription;
  autocompleteResults: AutocompleteItem[] = [];
  showAutocomplete = false;
  isSearching = false;
  currentPage = 1;
  pageSize = 15;
  isLoading = false;
  isSaving = false;
  diseases: PagedResult<DiseaseListDto> = this.emptyPagedResult();
  symptoms: PagedResult<SymptomListDto> = this.emptyPagedResult();
  drugs: PagedResult<DrugListDto> = this.emptyPagedResult();
  chiefComplaints: PagedResult<ChiefComplaintListDto> = this.emptyPagedResult();
  examinations: PagedResult<ExaminationListDto> = this.emptyPagedResult();
  advices: PagedResult<AdviceListDto> = this.emptyPagedResult();
  reports: PagedResult<ReportListDto> = this.emptyPagedResult();
  allReports: ReportDto[] = [];

  // Preview
  selectedDisease: DiseaseDto | null = null;
  selectedSymptom: SymptomDto | null = null;

  // Modals
  showCreateModal = false;
  showPreviewModal = false;
  showDeleteConfirm = false;
  deleteItemId = '';
  deleteItemType: ActiveTab = 'diseases';

  // Form data
  newDisease: CreateDiseaseRequest = { shortcut: '', name: '', drugs: [] };
  newSymptom: CreateSymptomRequest = {
    shortcut: '', name: '', followUp: '',
    chiefComplaints: [], examinations: [], advices: [],
    drugs: [], investigationOIDs: []
  };
  newDrug: CreateDrugRequest = { name: '', form: '', brandName: '', strength: '' };
  newChiefComplaint: CreateChiefComplaintRequest = { description: '' };
  newExamination: CreateExaminationRequest = { description: '' };
  newAdvice: CreateAdviceRequest = { description: '' };
  newReport: CreateReportRequest = { oid: 0, abbreviation: '', fullName: '', defaultValue: '', normalRange: '', cost: 0 };

  // Template builder inputs with autocomplete
  drugSearchTerm = '';
  drugAutocomplete: AutocompleteItem[] = [];
  showDrugAutocomplete = false;
  selectedDrugForTemplate: DrugListDto | null = null;
  tempDosageInstructions = '';
  tempDosageInstructionsEnglish = '';

  ccSearchTerm = '';
  ccAutocomplete: AutocompleteItem[] = [];
  showCCAutocomplete = false;

  examSearchTerm = '';
  examAutocomplete: AutocompleteItem[] = [];
  showExamAutocomplete = false;

  adviceSearchTerm = '';
  adviceAutocomplete: AutocompleteItem[] = [];
  showAdviceAutocomplete = false;

  reportSearchTerm = '';
  reportAutocomplete: AutocompleteItem[] = [];
  showReportAutocomplete = false;

  // Edit mode
  isEditMode = false;
  editItemId = '';

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  showToast = false;

  // Autocomplete subjects for debouncing
  private drugSearchSubject = new Subject<string>();
  private ccSearchSubject = new Subject<string>();
  private examSearchSubject = new Subject<string>();
  private adviceSearchSubject = new Subject<string>();
  private reportSearchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(private templateService: TemplateService) { }

  ngOnInit(): void {
    this.setupAutocomplete();
    this.loadData();
    this.loadAllReports();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.searchSubscription?.unsubscribe();
  }

  private setupAutocomplete(): void {
    // Main search autocomplete
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      if (term.length >= 1) {
        this.isSearching = true;
        this.performAutocompleteSearch(term);
      } else {
        this.autocompleteResults = [];
        this.showAutocomplete = false;
      }
    });

    // Drug autocomplete for template builder
    this.subscriptions.push(
      this.drugSearchSubject.pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(term => this.templateService.searchDrugsAutocomplete(term))
      ).subscribe(results => {
        this.drugAutocomplete = results;
        this.showDrugAutocomplete = results.length > 0;
      })
    );

    // Chief Complaint autocomplete
    this.subscriptions.push(
      this.ccSearchSubject.pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(term => this.templateService.searchChiefComplaintsAutocomplete(term))
      ).subscribe(results => {
        this.ccAutocomplete = results;
        this.showCCAutocomplete = results.length > 0;
      })
    );

    // Examination autocomplete
    this.subscriptions.push(
      this.examSearchSubject.pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(term => this.templateService.searchExaminationsAutocomplete(term))
      ).subscribe(results => {
        this.examAutocomplete = results;
        this.showExamAutocomplete = results.length > 0;
      })
    );

    // Advice autocomplete
    this.subscriptions.push(
      this.adviceSearchSubject.pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(term => this.templateService.searchAdvicesAutocomplete(term))
      ).subscribe(results => {
        this.adviceAutocomplete = results;
        this.showAdviceAutocomplete = results.length > 0;
      })
    );

    // Report autocomplete
    this.subscriptions.push(
      this.reportSearchSubject.pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(term => this.templateService.searchReportsAutocomplete(term))
      ).subscribe(results => {
        this.reportAutocomplete = results;
        this.showReportAutocomplete = results.length > 0;
      })
    );
  }

  private performAutocompleteSearch(term: string): void {
    let searchObservable;
    switch (this.activeTab) {
      case 'diseases':
        searchObservable = this.templateService.searchDiseasesAutocomplete(term);
        break;
      case 'symptoms':
        searchObservable = this.templateService.searchSymptomsAutocomplete(term);
        break;
      case 'drugs':
        searchObservable = this.templateService.searchDrugsAutocomplete(term);
        break;
      case 'chief-complaints':
        searchObservable = this.templateService.searchChiefComplaintsAutocomplete(term);
        break;
      case 'examinations':
        searchObservable = this.templateService.searchExaminationsAutocomplete(term);
        break;
      case 'advices':
        searchObservable = this.templateService.searchAdvicesAutocomplete(term);
        break;
      case 'reports':
        searchObservable = this.templateService.searchReportsAutocomplete(term);
        break;
      default:
        return;
    }

    searchObservable.subscribe(results => {
      this.autocompleteResults = results;
      this.showAutocomplete = results.length > 0;
      this.isSearching = false;
    });
  }

  onSearchInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchSubject.next(term);
  }

  selectAutocompleteItem(item: AutocompleteItem): void {
    this.searchTerm = item.name;
    this.showAutocomplete = false;
    this.currentPage = 1;
    this.loadData();
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showAutocomplete = false;
    }, 200);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.autocompleteResults = [];
    this.showAutocomplete = false;
    this.currentPage = 1;
    this.loadData();
  }

  // Template builder autocomplete handlers
  onDrugSearch(term: string): void {
    this.drugSearchTerm = term;
    this.drugSearchSubject.next(term);
  }

  selectDrug(item: AutocompleteItem): void {
    this.selectedDrugForTemplate = item.data;
    this.drugSearchTerm = item.displayText;
    this.showDrugAutocomplete = false;
  }

  addDrugToTemplate(): void {
    if (this.selectedDrugForTemplate) {
      const drug: DrugDosageInput = {
        drugId: this.selectedDrugForTemplate.id,
        name: this.selectedDrugForTemplate.name,
        form: this.selectedDrugForTemplate.form,
        strength: this.selectedDrugForTemplate.strength,
        dosageInstructions: this.tempDosageInstructions,
        dosageInstructionsEnglish: this.tempDosageInstructionsEnglish,
        sortOrder: (this.activeTab === 'diseases' ? this.newDisease.drugs.length : this.newSymptom.drugs.length) + 1
      };

      if (this.activeTab === 'diseases') {
        this.newDisease.drugs.push(drug);
      } else {
        this.newSymptom.drugs.push(drug);
      }

      // Reset
      this.selectedDrugForTemplate = null;
      this.drugSearchTerm = '';
      this.tempDosageInstructions = '';
      this.tempDosageInstructionsEnglish = '';
    } else if (this.drugSearchTerm.trim()) {
      // Create new drug entry by name
      const drug: DrugDosageInput = {
        name: this.drugSearchTerm.trim(),
        dosageInstructions: this.tempDosageInstructions,
        dosageInstructionsEnglish: this.tempDosageInstructionsEnglish,
        sortOrder: (this.activeTab === 'diseases' ? this.newDisease.drugs.length : this.newSymptom.drugs.length) + 1
      };

      if (this.activeTab === 'diseases') {
        this.newDisease.drugs.push(drug);
      } else {
        this.newSymptom.drugs.push(drug);
      }

      this.drugSearchTerm = '';
      this.tempDosageInstructions = '';
      this.tempDosageInstructionsEnglish = '';
    }
  }

  removeDrugFromTemplate(index: number): void {
    if (this.activeTab === 'diseases') {
      this.newDisease.drugs.splice(index, 1);
    } else {
      this.newSymptom.drugs.splice(index, 1);
    }
  }

  onCCSearch(term: string): void {
    this.ccSearchTerm = term;
    this.ccSearchSubject.next(term);
  }

  selectCC(item: AutocompleteItem): void {
    if (!this.newSymptom.chiefComplaints.includes(item.name)) {
      this.newSymptom.chiefComplaints.push(item.name);
    }
    this.ccSearchTerm = '';
    this.showCCAutocomplete = false;
  }

  addCCManually(): void {
    if (this.ccSearchTerm.trim() && !this.newSymptom.chiefComplaints.includes(this.ccSearchTerm.trim())) {
      this.newSymptom.chiefComplaints.push(this.ccSearchTerm.trim());
      this.ccSearchTerm = '';
    }
  }

  removeCC(index: number): void {
    this.newSymptom.chiefComplaints.splice(index, 1);
  }

  onExamSearch(term: string): void {
    this.examSearchTerm = term;
    this.examSearchSubject.next(term);
  }

  selectExam(item: AutocompleteItem): void {
    if (!this.newSymptom.examinations.includes(item.name)) {
      this.newSymptom.examinations.push(item.name);
    }
    this.examSearchTerm = '';
    this.showExamAutocomplete = false;
  }

  addExamManually(): void {
    if (this.examSearchTerm.trim() && !this.newSymptom.examinations.includes(this.examSearchTerm.trim())) {
      this.newSymptom.examinations.push(this.examSearchTerm.trim());
      this.examSearchTerm = '';
    }
  }

  removeExam(index: number): void {
    this.newSymptom.examinations.splice(index, 1);
  }

  onAdviceSearch(term: string): void {
    this.adviceSearchTerm = term;
    this.adviceSearchSubject.next(term);
  }

  selectAdvice(item: AutocompleteItem): void {
    if (!this.newSymptom.advices.includes(item.name)) {
      this.newSymptom.advices.push(item.name);
    }
    this.adviceSearchTerm = '';
    this.showAdviceAutocomplete = false;
  }

  addAdviceManually(): void {
    if (this.adviceSearchTerm.trim() && !this.newSymptom.advices.includes(this.adviceSearchTerm.trim())) {
      this.newSymptom.advices.push(this.adviceSearchTerm.trim());
      this.adviceSearchTerm = '';
    }
  }

  removeAdvice(index: number): void {
    this.newSymptom.advices.splice(index, 1);
  }

  onReportSearch(term: string): void {
    this.reportSearchTerm = term;
    this.reportSearchSubject.next(term);
  }

  selectReport(item: AutocompleteItem): void {
    const report = item.data as ReportListDto;
    if (!this.newSymptom.investigationOIDs.includes(report.oid)) {
      this.newSymptom.investigationOIDs.push(report.oid);
    }
    this.reportSearchTerm = '';
    this.showReportAutocomplete = false;
  }

  removeInvestigation(index: number): void {
    this.newSymptom.investigationOIDs.splice(index, 1);
  }

  getReportNameByOID(oid: number): string {
    const report = this.allReports.find(r => r.oid === oid);
    return report ? `${report.abbreviation} - ${report.fullName}` : `OID: ${oid}`;
  }

  // Tab & Navigation
  setActiveTab(tabId: ActiveTab): void {
    this.activeTab = tabId;
    this.searchTerm = '';
    this.autocompleteResults = [];
    this.showAutocomplete = false;
    this.currentPage = 1;
    this.loadData();
  }

  getTabColor(tabId: string): string {
    return this.tabs.find(t => t.id === tabId)?.color || '#3498db';
  }

  // Data Loading
  loadData(): void {
    this.isLoading = true;
    switch (this.activeTab) {
      case 'diseases': this.loadDiseases(); break;
      case 'symptoms': this.loadSymptoms(); break;
      case 'drugs': this.loadDrugs(); break;
      case 'chief-complaints': this.loadChiefComplaints(); break;
      case 'examinations': this.loadExaminations(); break;
      case 'advices': this.loadAdvices(); break;
      case 'reports': this.loadReports(); break;
    }
  }

  loadDiseases(): void {
    this.templateService.searchDiseases(this.searchTerm, this.currentPage, this.pageSize).subscribe({
      next: (result) => { this.diseases = result; this.isLoading = false; },
      error: () => { this.notify('Failed to load diseases', 'error'); this.isLoading = false; }
    });
  }

  loadSymptoms(): void {
    this.templateService.searchSymptoms(this.searchTerm, this.currentPage, this.pageSize).subscribe({
      next: (result) => { this.symptoms = result; this.isLoading = false; },
      error: () => { this.notify('Failed to load symptoms', 'error'); this.isLoading = false; }
    });
  }

  loadDrugs(): void {
    this.templateService.searchDrugs(this.searchTerm, this.currentPage, this.pageSize).subscribe({
      next: (result) => { this.drugs = result; this.isLoading = false; },
      error: () => { this.notify('Failed to load drugs', 'error'); this.isLoading = false; }
    });
  }

  loadChiefComplaints(): void {
    this.templateService.searchChiefComplaints(this.searchTerm, this.currentPage, this.pageSize).subscribe({
      next: (result) => { this.chiefComplaints = result; this.isLoading = false; },
      error: () => { this.notify('Failed to load chief complaints', 'error'); this.isLoading = false; }
    });
  }

  loadExaminations(): void {
    this.templateService.searchExaminations(this.searchTerm, this.currentPage, this.pageSize).subscribe({
      next: (result) => { this.examinations = result; this.isLoading = false; },
      error: () => { this.notify('Failed to load examinations', 'error'); this.isLoading = false; }
    });
  }

  loadAdvices(): void {
    this.templateService.searchAdvices(this.searchTerm, this.currentPage, this.pageSize).subscribe({
      next: (result) => { this.advices = result; this.isLoading = false; },
      error: () => { this.notify('Failed to load advices', 'error'); this.isLoading = false; }
    });
  }

  loadReports(): void {
    this.templateService.searchReports(this.searchTerm, this.currentPage, this.pageSize).subscribe({
      next: (result) => { this.reports = result; this.isLoading = false; },
      error: () => { this.notify('Failed to load reports', 'error'); this.isLoading = false; }
    });
  }

  loadAllReports(): void {
    this.templateService.getAllReports().subscribe({
      next: (reports) => this.allReports = reports,
      error: () => console.error('Failed to load all reports')
    });
  }

  // Pagination
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadData();
  }

  getCurrentPagedResult(): PagedResult<any> {
    switch (this.activeTab) {
      case 'diseases': return this.diseases;
      case 'symptoms': return this.symptoms;
      case 'drugs': return this.drugs;
      case 'chief-complaints': return this.chiefComplaints;
      case 'examinations': return this.examinations;
      case 'advices': return this.advices;
      case 'reports': return this.reports;
      default: return this.emptyPagedResult();
    }
  }

  getPageNumbers(): number[] {
    const result = this.getCurrentPagedResult();
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(result.totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Preview
  previewDisease(id: string): void {
    this.isLoading = true;
    this.templateService.getDiseaseById(id).subscribe({
      next: (disease) => {
        this.selectedDisease = disease;
        this.selectedSymptom = null;
        this.showPreviewModal = true;
        this.isLoading = false;
      },
      error: () => { this.notify('Failed to load disease', 'error'); this.isLoading = false; }
    });
  }

  previewSymptom(id: string): void {
    this.isLoading = true;
    this.templateService.getSymptomById(id).subscribe({
      next: (symptom) => {
        this.selectedSymptom = symptom;
        this.selectedDisease = null;
        this.showPreviewModal = true;
        this.isLoading = false;
      },
      error: () => { this.notify('Failed to load symptom', 'error'); this.isLoading = false; }
    });
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.selectedDisease = null;
    this.selectedSymptom = null;
  }

  // Create/Edit Modal
  openCreateModal(): void {
    this.isEditMode = false;
    this.editItemId = '';
    this.resetForms();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetForms();
  }

  resetForms(): void {
    this.newDisease = { shortcut: '', name: '', drugs: [] };
    this.newSymptom = {
      shortcut: '', name: '', followUp: '',
      chiefComplaints: [], examinations: [], advices: [],
      drugs: [], investigationOIDs: []
    };
    this.newDrug = { name: '', form: '', brandName: '', strength: '' };
    this.newChiefComplaint = { description: '' };
    this.newExamination = { description: '' };
    this.newAdvice = { description: '' };
    this.newReport = { oid: 0, abbreviation: '', fullName: '', defaultValue: '', normalRange: '', cost: 0 };

    this.drugSearchTerm = '';
    this.ccSearchTerm = '';
    this.examSearchTerm = '';
    this.adviceSearchTerm = '';
    this.reportSearchTerm = '';
    this.selectedDrugForTemplate = null;
    this.tempDosageInstructions = '';
    this.tempDosageInstructionsEnglish = '';
  }

  // Save
  saveTemplate(): void {
    this.isSaving = true;
    switch (this.activeTab) {
      case 'diseases': this.saveDisease(); break;
      case 'symptoms': this.saveSymptom(); break;
      case 'drugs': this.saveDrug(); break;
      case 'chief-complaints': this.saveChiefComplaint(); break;
      case 'examinations': this.saveExamination(); break;
      case 'advices': this.saveAdvice(); break;
      case 'reports': this.saveReport(); break;
    }
  }

  saveDisease(): void {
    const obs = this.isEditMode
      ? this.templateService.updateDisease(this.editItemId, this.newDisease)
      : this.templateService.createDisease(this.newDisease);

    obs.subscribe({
      next: () => {
        this.notify(`Disease ${this.isEditMode ? 'updated' : 'created'} successfully`, 'success');
        this.closeCreateModal();
        this.loadDiseases();
        this.isSaving = false;
      },
      error: () => { this.notify('Failed to save disease', 'error'); this.isSaving = false; }
    });
  }

  saveSymptom(): void {
    const obs = this.isEditMode
      ? this.templateService.updateSymptom(this.editItemId, this.newSymptom)
      : this.templateService.createSymptom(this.newSymptom);

    obs.subscribe({
      next: () => {
        this.notify(`Symptom ${this.isEditMode ? 'updated' : 'created'} successfully`, 'success');
        this.closeCreateModal();
        this.loadSymptoms();
        this.isSaving = false;
      },
      error: () => { this.notify('Failed to save symptom', 'error'); this.isSaving = false; }
    });
  }

  saveDrug(): void {
    this.templateService.createDrug(this.newDrug).subscribe({
      next: () => {
        this.notify('Drug created successfully', 'success');
        this.closeCreateModal();
        this.loadDrugs();
        this.isSaving = false;
      },
      error: () => { this.notify('Failed to create drug', 'error'); this.isSaving = false; }
    });
  }

  saveChiefComplaint(): void {
    this.templateService.createChiefComplaint(this.newChiefComplaint).subscribe({
      next: () => {
        this.notify('Chief complaint created successfully', 'success');
        this.closeCreateModal();
        this.loadChiefComplaints();
        this.isSaving = false;
      },
      error: () => { this.notify('Failed to create chief complaint', 'error'); this.isSaving = false; }
    });
  }

  saveExamination(): void {
    this.templateService.createExamination(this.newExamination).subscribe({
      next: () => {
        this.notify('Examination created successfully', 'success');
        this.closeCreateModal();
        this.loadExaminations();
        this.isSaving = false;
      },
      error: () => { this.notify('Failed to create examination', 'error'); this.isSaving = false; }
    });
  }

  saveAdvice(): void {
    this.templateService.createAdvice(this.newAdvice).subscribe({
      next: () => {
        this.notify('Advice created successfully', 'success');
        this.closeCreateModal();
        this.loadAdvices();
        this.isSaving = false;
      },
      error: () => { this.notify('Failed to create advice', 'error'); this.isSaving = false; }
    });
  }

  saveReport(): void {
    this.templateService.createReport(this.newReport).subscribe({
      next: () => {
        this.notify('Investigation created successfully', 'success');
        this.closeCreateModal();
        this.loadReports();
        this.loadAllReports();
        this.isSaving = false;
      },
      error: () => { this.notify('Failed to create investigation', 'error'); this.isSaving = false; }
    });
  }

  // Edit
  editDisease(id: string): void {
    this.templateService.getDiseaseById(id).subscribe({
      next: (disease) => {
        this.isEditMode = true;
        this.editItemId = id;
        this.newDisease = {
          shortcut: disease.shortcut,
          name: disease.name,
          drugs: disease.drugs.map(d => ({
            drugId: d.id,
            name: d.name,
            form: d.form,
            brandName: d.brandName,
            strength: d.strength,
            dosageInstructions: d.dosageInstructions,
            dosageInstructionsEnglish: d.dosageInstructionsEnglish,
            sortOrder: d.sortOrder
          }))
        };
        this.showCreateModal = true;
      },
      error: () => this.notify('Failed to load disease', 'error')
    });
  }

  editSymptom(id: string): void {
    this.templateService.getSymptomById(id).subscribe({
      next: (symptom) => {
        this.isEditMode = true;
        this.editItemId = id;
        this.newSymptom = {
          shortcut: symptom.shortcut,
          name: symptom.name,
          followUp: symptom.followUp || '',
          chiefComplaints: symptom.chiefComplaints.map(c => c.description),
          examinations: symptom.examinations.map(e => e.description),
          advices: symptom.advices.map(a => a.description),
          drugs: symptom.drugs.map(d => ({
            drugId: d.id,
            name: d.name,
            form: d.form,
            brandName: d.brandName,
            strength: d.strength,
            dosageInstructions: d.dosageInstructions,
            dosageInstructionsEnglish: d.dosageInstructionsEnglish,
            sortOrder: d.sortOrder
          })),
          investigationOIDs: symptom.investigations.map(i => i.oid)
        };
        this.showCreateModal = true;
      },
      error: () => this.notify('Failed to load symptom', 'error')
    });
  }

  // Delete
  confirmDelete(id: string, type: ActiveTab): void {
    this.deleteItemId = id;
    this.deleteItemType = type;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteItemId = '';
  }

  executeDelete(): void {
    const deleteMap: Record<ActiveTab, () => void> = {
      'diseases': () => this.templateService.deleteDisease(this.deleteItemId).subscribe({
        next: () => { this.notify('Deleted successfully', 'success'); this.loadDiseases(); },
        error: () => this.notify('Delete failed', 'error')
      }),
      'symptoms': () => this.templateService.deleteSymptom(this.deleteItemId).subscribe({
        next: () => { this.notify('Deleted successfully', 'success'); this.loadSymptoms(); },
        error: () => this.notify('Delete failed', 'error')
      }),
      'drugs': () => this.templateService.deleteDrug(this.deleteItemId).subscribe({
        next: () => { this.notify('Deleted successfully', 'success'); this.loadDrugs(); },
        error: () => this.notify('Delete failed', 'error')
      }),
      'chief-complaints': () => this.templateService.deleteChiefComplaint(this.deleteItemId).subscribe({
        next: () => { this.notify('Deleted successfully', 'success'); this.loadChiefComplaints(); },
        error: () => this.notify('Delete failed', 'error')
      }),
      'examinations': () => this.templateService.deleteExamination(this.deleteItemId).subscribe({
        next: () => { this.notify('Deleted successfully', 'success'); this.loadExaminations(); },
        error: () => this.notify('Delete failed', 'error')
      }),
      'advices': () => this.templateService.deleteAdvice(this.deleteItemId).subscribe({
        next: () => { this.notify('Deleted successfully', 'success'); this.loadAdvices(); },
        error: () => this.notify('Delete failed', 'error')
      }),
      'reports': () => this.templateService.deleteReport(this.deleteItemId).subscribe({
        next: () => { this.notify('Deleted successfully', 'success'); this.loadReports(); this.loadAllReports(); },
        error: () => this.notify('Delete failed', 'error')
      })
    };

    deleteMap[this.deleteItemType]();
    this.cancelDelete();
  }

  // Helpers
  private emptyPagedResult(): PagedResult<any> {
    return { items: [], totalCount: 0, page: 1, pageSize: this.pageSize, totalPages: 0 };
  }

  notify(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 3000);
  }

  getCreateFormTitle(): string {
    const prefix = this.isEditMode ? 'Edit' : 'New';
    const titles: Record<ActiveTab, string> = {
      'diseases': `${prefix} Disease Template`,
      'symptoms': `${prefix} Symptom Template`,
      'drugs': `${prefix} Medication`,
      'chief-complaints': `${prefix} Chief Complaint`,
      'examinations': `${prefix} Examination`,
      'advices': `${prefix} Advice`,
      'reports': `${prefix} Investigation`
    };
    return titles[this.activeTab];
  }

  hideAutocomplete(field: AutocompleteType): void {
    setTimeout(() => {
      switch (field) {
        case 'drug': this.showDrugAutocomplete = false; break;
        case 'chief-complaint': this.showCCAutocomplete = false; break;
        case 'examination': this.showExamAutocomplete = false; break;
        case 'advice': this.showAdviceAutocomplete = false; break;
        case 'report': this.showReportAutocomplete = false; break;
      }
    }, 200);
  }
}
