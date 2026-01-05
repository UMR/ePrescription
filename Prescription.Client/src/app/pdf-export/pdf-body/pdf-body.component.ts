import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { PatientInfo, VitalsInfo, PrescriptionContent } from '../../models/pdf-template.model';

@Component({
    selector: 'app-pdf-body',
    standalone: true,
    imports: [CommonModule, DatePipe],
    template: `
    <div class="pdf-body">
      <!-- Patient Info Row -->
      <div class="patient-row">
        <div class="patient-info">
          <div class="patient-name">
            <span class="label">Name:</span>
            <span class="value">{{ patient.name }}, {{ patient.age }} {{ patient.ageUnit || 'years' }}, {{ patient.gender }}</span>
            @if (patient.weight) {
              <span class="weight">, {{ patient.weight }} kg</span>
            }
          </div>
          @if (patient.address) {
            <div class="patient-address">
              <span class="label">Address:</span>
              <span class="value">{{ patient.address }}</span>
            </div>
          }
        </div>
        <div class="visit-info">
          <div class="date-info">
            <span class="label">Date</span>
            <span class="value">{{ patient.date | date:'dd/MM/yyyy' }}</span>
          </div>
          @if (patient.patientId) {
            <div class="patient-id">
              <span class="label">Patient ID:</span>
              <span class="value">{{ patient.patientId }}</span>
            </div>
          }
          @if (patient.visitNo) {
            <div class="visit-no">
              <span class="label">Visit No :</span>
              <span class="value">{{ patient.visitNo }}</span>
            </div>
          }
        </div>
      </div>
    
      <!-- Main Content Area -->
      <div class="content-area">
        <!-- Left Column - Clinical Info -->
        <div class="left-column">
          <!-- Chief Complaints -->
          @if (content.chiefComplaints.length > 0) {
            <div class="section">
              <h3 class="section-title">C/C:</h3>
              <div class="section-content">
                @for (cc of content.chiefComplaints; track cc) {
                  <p class="item">{{ cc }}</p>
                }
              </div>
            </div>
          }
    
          <!-- Diagnosis -->
          @if (content.diagnosis.length > 0) {
            <div class="section">
              <h3 class="section-title">Dx:</h3>
              <div class="section-content">
                @for (dx of content.diagnosis; track dx) {
                  <p class="item">{{ dx }}</p>
                }
              </div>
            </div>
          }
    
          <!-- Medical History -->
          @if (content.medicalHistory && content.medicalHistory.length > 0) {
            <div class="section">
              <h3 class="section-title">D/H:</h3>
              <div class="section-content">
                @for (hist of content.medicalHistory; track hist) {
                  <p class="item">{{ hist }}</p>
                }
              </div>
            </div>
          }
    
          <!-- Investigations -->
          @if (content.investigations.length > 0) {
            <div class="section">
              <h3 class="section-title underline">Investigations:</h3>
              <div class="section-content">
                @for (inv of content.investigations; track inv) {
                  <p class="item">{{ inv }}</p>
                }
              </div>
            </div>
          }
    
          <!-- Advice -->
          @if (content.advice.length > 0) {
            <div class="section advice-section">
              <h3 class="section-title underline">উপদেশঃ</h3>
              <div class="section-content">
                @for (adv of content.advice; track adv) {
                  <p class="item">{{ adv }}</p>
                }
              </div>
            </div>
          }
        </div>
    
        <!-- Right Column - Rx (Medications) -->
        <div class="right-column">
          <div class="rx-header">
            <span class="rx-symbol">℞</span>
          </div>
    
          <div class="medications-list">
            @for (med of content.medications; track med.serialNo; let i = $index) {
              <div class="medication-item">
                <div class="med-line-1">
                  <span class="med-number">{{ i + 1 }}.</span>
                  @if (med.form) {
                    <span class="med-form">{{ med.form }}.</span>
                  }
                  <span class="med-name">{{ med.name }}</span>
                  @if (med.strength) {
                    <span class="med-strength">({{ med.strength }})</span>
                  }
                </div>
                <div class="med-line-2">
                  <span class="med-dosage">{{ med.dosage }}</span>
                  @if (med.timing) {
                    <span class="med-timing">{{ med.timing }}</span>
                  }
                  <span class="med-duration">---------- {{ med.duration }}</span>
                </div>
                @if (med.instructions) {
                  <div class="med-instructions">
                    {{ med.instructions }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
    `,
    styles: [`
    .pdf-body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Patient Row */
    .patient-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 16px;
    }

    .patient-info {
      flex: 1;
    }

    .patient-name {
      font-size: 12px;
      margin-bottom: 4px;
    }

    .patient-name .label {
      font-weight: 600;
      color: #64748b;
    }

    .patient-name .value {
      font-weight: 600;
      color: #1e293b;
    }

    .patient-name .weight {
      color: #475569;
    }

    .patient-address {
      font-size: 11px;
      color: #64748b;
    }

    .patient-address .label {
      font-weight: 500;
    }

    .visit-info {
      text-align: right;
    }

    .date-info,
    .patient-id,
    .visit-no {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .date-info .label,
    .patient-id .label,
    .visit-no .label {
      color: #64748b;
    }

    .date-info .value,
    .patient-id .value,
    .visit-no .value {
      font-weight: 600;
      color: #1e293b;
      margin-left: 8px;
    }

    /* Content Area */
    .content-area {
      display: flex;
      gap: 20px;
      flex: 1;
    }

    /* Left Column */
    .left-column {
      width: 35%;
      border-right: 1px solid #e2e8f0;
      padding-right: 16px;
    }

    .section {
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 6px 0;
    }

    .section-title.underline {
      text-decoration: underline;
    }

    .section-content {
      padding-left: 0;
    }

    .section-content .item {
      font-size: 11px;
      color: #475569;
      margin: 0 0 4px 0;
      line-height: 1.5;
    }

    .advice-section {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px dashed #e2e8f0;
    }

    /* Right Column */
    .right-column {
      flex: 1;
      padding-left: 16px;
    }

    .rx-header {
      margin-bottom: 16px;
    }

    .rx-symbol {
      font-size: 28px;
      font-weight: 400;
      color: #1e293b;
      font-family: serif;
    }

    /* Medications */
    .medications-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .medication-item {
      padding-bottom: 8px;
    }

    .med-line-1 {
      font-size: 12px;
      margin-bottom: 4px;
    }

    .med-number {
      font-weight: 600;
      color: #1e293b;
      margin-right: 4px;
    }

    .med-form {
      font-weight: 500;
      color: #475569;
    }

    .med-name {
      font-weight: 600;
      color: #1e293b;
    }

    .med-strength {
      color: #64748b;
      font-size: 11px;
      margin-left: 4px;
    }

    .med-line-2 {
      font-size: 11px;
      color: #475569;
      padding-left: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .med-dosage {
      font-weight: 500;
      color: #1e293b;
      letter-spacing: 1px;
    }

    .med-timing {
      font-size: 10px;
      color: #64748b;
    }

    .med-duration {
      color: #64748b;
    }

    .med-instructions {
      font-size: 10px;
      color: #64748b;
      font-style: italic;
      padding-left: 16px;
      margin-top: 2px;
    }

    @media print {
      .content-area {
        min-height: 60vh;
      }
    }
  `]
})
export class PdfBodyComponent {
    @Input() patient!: PatientInfo;
    @Input() vitals?: VitalsInfo;
    @Input() content!: PrescriptionContent;
}
