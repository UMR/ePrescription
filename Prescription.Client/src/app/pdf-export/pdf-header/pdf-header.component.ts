import { Component, Input } from '@angular/core';

import { DoctorInfo } from '../../models/pdf-template.model';

@Component({
    selector: 'app-pdf-header',
    standalone: true,
    imports: [],
    template: `
    <div class="pdf-header">
      <div class="header-content">
        <!-- Left Side - English -->
        <div class="header-left">
          <h1 class="doctor-name">{{ doctor.name }}</h1>
          <div class="degrees">
            @for (degree of doctor.degrees; track degree) {
              <span class="degree">{{ degree }}</span>
            }
          </div>
          <p class="specialization">{{ doctor.specialization }}</p>
          @if (doctor.chamber.name) {
            <p class="institution">{{ doctor.chamber.name }}</p>
          }
          @if (doctor.mobile) {
            <p class="mobile">Cell: {{ doctor.mobile }}</p>
          }
        </div>
    
        <!-- Right Side - Bengali -->
        <div class="header-right">
          @if (doctor.degreesBn && doctor.degreesBn.length > 0) {
            <div class="degrees-bn">
              @for (degree of doctor.degreesBn; track degree) {
                <span class="degree">{{ degree }}</span>
              }
            </div>
          }
          @if (doctor.specializationBn) {
            <p class="specialization-bn">{{ doctor.specializationBn }}</p>
          }
          @if (doctor.mobile) {
            <p class="mobile-bn">মোবাইল: {{ doctor.mobile }}</p>
          }
        </div>
      </div>
    
      <div class="header-divider"></div>
    </div>
    `,
    styles: [`
    .pdf-header {
      padding: 0 0 12px 0;
      border-bottom: 2px solid #1e293b;
      margin-bottom: 16px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }

    .header-left {
      flex: 1;
    }

    .header-right {
      flex: 1;
      text-align: right;
    }

    .doctor-name {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 6px 0;
    }

    .degrees {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }

    .degree {
      font-size: 11px;
      color: #475569;
    }

    .degree:not(:last-child)::after {
      content: ',';
    }

    .degrees-bn {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 6px;
    }

    .degrees-bn .degree {
      font-size: 10px;
      color: #475569;
    }

    .degrees-bn .degree::after {
      content: none;
    }

    .specialization,
    .specialization-bn {
      font-size: 10px;
      color: #64748b;
      margin: 0 0 4px 0;
      line-height: 1.4;
    }

    .institution {
      font-size: 10px;
      color: #64748b;
      margin: 0 0 4px 0;
    }

    .mobile,
    .mobile-bn {
      font-size: 11px;
      color: #1e293b;
      font-weight: 600;
      margin: 0;
    }

    .header-divider {
      height: 2px;
      background: linear-gradient(90deg, #2563eb 0%, #10b981 100%);
      margin-top: 12px;
    }
  `]
})
export class PdfHeaderComponent {
    @Input() doctor!: DoctorInfo;
}
