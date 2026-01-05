import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

import { PdfHeaderComponent } from './pdf-header/pdf-header.component';
import { PdfFooterComponent } from './pdf-footer/pdf-footer.component';
import { PdfBodyComponent } from './pdf-body/pdf-body.component';
import { DoctorProfileService } from '../services/doctor-profile.service';
import {
    DoctorInfo,
    PatientInfo,
    VitalsInfo,
    PrescriptionContent,
    PrescriptionPdfData,
    DEFAULT_DOCTOR_INFO
} from '../models/pdf-template.model';

// Declare html2canvas and jspdf for dynamic import
declare var html2canvas: any;
declare var jspdf: any;

@Component({
    selector: 'app-pdf-export',
    standalone: true,
    imports: [PdfHeaderComponent, PdfFooterComponent, PdfBodyComponent],
    template: `
    <div class="pdf-container" [class.print-mode]="isPrintMode">
      <!-- Print/Export Controls (hidden in print) -->
      @if (showControls) {
        <div class="pdf-controls">
          <button class="btn btn-primary" (click)="downloadPdf()" [disabled]="isGenerating">
            <i class="fa-solid" [class.fa-download]="!isGenerating" [class.fa-spinner]="isGenerating" [class.fa-spin]="isGenerating"></i>
            {{ isGenerating ? 'Generating...' : 'Download PDF' }}
          </button>
          <button class="btn btn-outline" (click)="printPdf()" [disabled]="isGenerating">
            <i class="fa-solid" [class.fa-print]="!isGenerating" [class.fa-spinner]="isGenerating" [class.fa-spin]="isGenerating"></i>
            {{ isGenerating ? 'Generating...' : 'Print' }}
          </button>
          <button class="btn btn-ghost" (click)="closePdfView()">
            <i class="fa-solid fa-times"></i> Close
          </button>
        </div>
      }
    
      <!-- PDF Page -->
      <div class="pdf-page" id="pdf-content">
        <!-- Header -->
        <app-pdf-header [doctor]="doctorInfo"></app-pdf-header>
    
        <!-- Body -->
        <app-pdf-body
          [patient]="patientInfo"
          [vitals]="vitalsInfo"
          [content]="prescriptionContent">
        </app-pdf-body>
    
        <!-- Footer -->
        <app-pdf-footer
          [doctor]="doctorInfo"
          [serialNo]="serialNo">
        </app-pdf-footer>
      </div>
    </div>
    `,
    styles: [`
    .pdf-container {
      background: #f1f5f9;
      min-height: 100vh;
      padding: 20px;
    }

    .pdf-container.print-mode {
      background: white;
      padding: 0;
    }

    .pdf-controls {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
      padding: 12px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 13px;
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

    .btn-outline {
      background: white;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }

    .btn-outline:hover {
      background: #f8fafc;
    }

    .btn-ghost {
      background: transparent;
      color: #64748b;
    }

    .btn-ghost:hover {
      background: #f1f5f9;
      color: #1e293b;
    }

    /* PDF Page */
    .pdf-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm 20mm;
      background: white;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      position: relative;
    }

    @media print {
      .pdf-controls {
        display: none !important;
      }

      .pdf-container {
        background: white !important;
        padding: 0 !important;
        min-height: auto !important;
      }

      .pdf-page {
        width: 100% !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 10mm 15mm !important;
        box-shadow: none !important;
        page-break-after: always;
      }

      @page {
        size: A4;
        margin: 0;
      }
    }

    /* Critical: Ensure only this content prints */
    :host {
      display: block;
    }

    @media screen and (max-width: 900px) {
      .pdf-page {
        width: 100%;
        min-height: auto;
        padding: 16px;
      }
    }
  `]
})
export class PdfExportComponent implements OnInit {
    @Input() pdfData?: PrescriptionPdfData;
    @Input() showControls = true;
    @Input() isPrintMode = false;
    @Output() closePreview = new EventEmitter<void>();

    doctorInfo: DoctorInfo = DEFAULT_DOCTOR_INFO;
    patientInfo!: PatientInfo;
    vitalsInfo?: VitalsInfo;
    prescriptionContent!: PrescriptionContent;
    serialNo?: string;
    isGenerating = false;

    // CDN URLs for libraries
    private html2canvasCDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    private jspdfCDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

    constructor(private doctorProfileService: DoctorProfileService) { }

    ngOnInit() {
        // Get doctor info from service
        this.doctorInfo = this.doctorProfileService.getDoctorProfile();

        if (this.pdfData) {
            // Use doctor from pdfData if provided, otherwise use from service
            if (this.pdfData.doctor) {
                this.doctorInfo = this.pdfData.doctor;
            }
            this.patientInfo = this.pdfData.patient;
            this.vitalsInfo = this.pdfData.vitals;
            this.prescriptionContent = this.pdfData.content;
            this.serialNo = this.pdfData.serialNo;
        } else {
            // Initialize with empty data for preview
            this.initializeEmptyData();
        }
    }

    private initializeEmptyData() {
        this.patientInfo = {
            name: 'Patient Name',
            age: 0,
            gender: 'Male',
            date: new Date()
        };

        this.prescriptionContent = {
            chiefComplaints: [],
            diagnosis: [],
            investigations: [],
            medications: [],
            advice: []
        };
    }

    // Load external script dynamically
    private loadScript(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`script[src="${url}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${url}`));
            document.head.appendChild(script);
        });
    }

    // Load both libraries
    private async loadLibraries(): Promise<void> {
        await this.loadScript(this.html2canvasCDN);
        await this.loadScript(this.jspdfCDN);
    }

    async downloadPdf() {
        const pdfContent = document.getElementById('pdf-content');
        if (!pdfContent) return;

        this.isGenerating = true;

        try {
            // Load libraries dynamically
            await this.loadLibraries();

            // Get html2canvas from window
            const html2canvas = (window as any).html2canvas;
            const { jsPDF } = (window as any).jspdf;

            if (!html2canvas || !jsPDF) {
                throw new Error('Libraries not loaded');
            }

            // Capture the PDF content as canvas
            const canvas = await html2canvas(pdfContent, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: pdfContent.scrollWidth,
                windowHeight: pdfContent.scrollHeight
            });

            // A4 dimensions in mm
            const a4Width = 210;
            const a4Height = 297;

            // Create PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Calculate dimensions to fit A4
            const imgWidth = a4Width;
            const imgHeight = (canvas.height * a4Width) / canvas.width;

            // Add image to PDF
            const imgData = canvas.toDataURL('image/png', 1.0);

            // If content is taller than A4, we might need multiple pages
            if (imgHeight <= a4Height) {
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            } else {
                // For longer prescriptions, fit to page
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            }

            // Generate filename
            const patientName = this.patientInfo?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Prescription';
            const date = new Date().toISOString().split('T')[0];
            const filename = `${patientName}_${date}.pdf`;

            // Download the PDF
            pdf.save(filename);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try using Print option instead.');
        } finally {
            this.isGenerating = false;
        }
    }

    async printPdf() {
        const pdfContent = document.getElementById('pdf-content');
        if (!pdfContent) return;

        this.isGenerating = true;

        try {
            // Load libraries dynamically
            await this.loadLibraries();

            const html2canvas = (window as any).html2canvas;
            const { jsPDF } = (window as any).jspdf;

            if (!html2canvas || !jsPDF) {
                throw new Error('Libraries not loaded');
            }

            // Capture the PDF content as canvas
            const canvas = await html2canvas(pdfContent, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: pdfContent.scrollWidth,
                windowHeight: pdfContent.scrollHeight
            });

            // A4 dimensions in mm
            const a4Width = 210;

            // Create PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Calculate dimensions to fit A4
            const imgWidth = a4Width;
            const imgHeight = (canvas.height * a4Width) / canvas.width;

            // Add image to PDF
            const imgData = canvas.toDataURL('image/png', 1.0);
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            // Open PDF in new tab for printing
            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const printWindow = window.open(pdfUrl, '_blank');

            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                };
            }

        } catch (error) {
            console.error('Error generating PDF for print:', error);
            alert('Failed to generate PDF for printing.');
        } finally {
            this.isGenerating = false;
        }
    }

    closePdfView() {
        this.closePreview.emit();
    }
}
