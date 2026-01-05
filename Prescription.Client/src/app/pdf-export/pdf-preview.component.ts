import { Component, OnInit, OnDestroy } from '@angular/core';

import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PdfExportComponent } from './pdf-export.component';
import { PrescriptionService } from '../services/prescription.service';
import {
    DoctorInfo,
    PatientInfo,
    PrescriptionContent,
    PrescriptionMedication,
    PrescriptionPdfData,
    DEFAULT_DOCTOR_INFO
} from '../models/pdf-template.model';

@Component({
    selector: 'app-pdf-preview',
    standalone: true,
    imports: [PdfExportComponent],
    template: `
    <div class="pdf-preview-container">
      @if (isLoading) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Preparing prescription...</p>
        </div>
      } @else if (pdfData) {
        <app-pdf-export 
          [pdfData]="pdfData" 
          [showControls]="true">
        </app-pdf-export>
      } @else {
        <div class="empty-state">
          <i class="bi bi-file-earmark-x"></i>
          <h3>No Prescription Data</h3>
          <p>Please fill in the prescription form first.</p>
          <button class="btn btn-primary" (click)="goToPrescription()">
            Go to Prescription
          </button>
        </div>
      }
    </div>
  `,
    styles: [`
    .pdf-preview-container {
      min-height: 100vh;
      background: #f1f5f9;
    }

    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      gap: 16px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state i {
      font-size: 48px;
      color: #94a3b8;
    }

    .empty-state h3 {
      font-size: 18px;
      color: #1e293b;
      margin: 0;
    }

    .empty-state p {
      font-size: 14px;
      color: #64748b;
      margin: 0;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }
  `]
})
export class PdfPreviewComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    pdfData?: PrescriptionPdfData;
    isLoading = true;

    constructor(
        private prescriptionService: PrescriptionService,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadPrescriptionData();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private loadPrescriptionData() {
        this.prescriptionService.prescription$
            .pipe(takeUntil(this.destroy$))
            .subscribe(data => {
                if (data && Object.keys(data).length > 0) {
                    this.pdfData = this.transformToPdfData(data);
                }
                this.isLoading = false;
            });
    }

    private transformToPdfData(data: any): PrescriptionPdfData {
        // Transform patient info
        const patient: PatientInfo = {
            name: data.patientName || 'Unknown Patient',
            age: data.patientAge || 0,
            gender: data.patientGender || 'Unknown',
            weight: data.weight,
            date: new Date(),
            patientId: data.patientId,
            visitNo: data.visitNo || 1
        };

        // Transform medications
        const medications: PrescriptionMedication[] = (data.medications || []).map((med: any, index: number) => ({
            serialNo: index + 1,
            name: med.name,
            form: this.extractMedicationForm(med.name),
            strength: med.dosage,
            dosage: med.frequency || '1+0+1',
            duration: med.duration || '',
            instructions: med.instructions
        }));

        // Transform content
        const content: PrescriptionContent = {
            chiefComplaints: this.splitToArray(data.chiefComplaint),
            diagnosis: this.splitToArray(data.diagnosis),
            medicalHistory: this.splitToArray(data.medicalHistory),
            physicalExamination: this.splitToArray(data.physicalExamination),
            investigations: [], // Will be populated from investigationItems
            medications: medications,
            advice: this.splitToArray(data.advice),
            followUp: data.followUpDate,
            referralComments: data.referralComments
        };

        return {
            doctor: DEFAULT_DOCTOR_INFO,
            patient: patient,
            vitals: {
                weight: data.weight,
                height: data.height,
                pulse: data.pulse,
                bloodPressure: data.bloodPressure,
                temperature: data.temperature
            },
            content: content,
            printedAt: new Date()
        };
    }

    private splitToArray(text?: string): string[] {
        if (!text) return [];
        return text.split(/[;\n]/).map(t => t.trim()).filter(t => t.length > 0);
    }

    private extractMedicationForm(name: string): string {
        const forms: { [key: string]: string } = {
            'tab': 'Tab',
            'cap': 'Cap',
            'syp': 'Syp',
            'inj': 'Inj',
            'cream': 'Cream',
            'oint': 'Oint',
            'drop': 'Drop',
            'susp': 'Susp'
        };

        const lowerName = name.toLowerCase();
        for (const [key, value] of Object.entries(forms)) {
            if (lowerName.startsWith(key) || lowerName.includes(key + '.') || lowerName.includes(key + ' ')) {
                return value;
            }
        }
        return 'Tab'; // Default
    }

    goToPrescription() {
        this.router.navigate(['/e-prescription']);
    }
}
