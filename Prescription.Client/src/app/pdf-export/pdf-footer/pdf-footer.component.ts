import { Component, Input } from '@angular/core';

import { DoctorInfo } from '../../models/pdf-template.model';

@Component({
    selector: 'app-pdf-footer',
    standalone: true,
    imports: [],
    template: `
    <div class="pdf-footer">
      <div class="footer-divider"></div>
    
      <div class="footer-content">
        <!-- Left - Chamber Info -->
        <div class="footer-left">
          <h4 class="chamber-name">{{ doctor.chamber.name }}</h4>
          @if (doctor.chamber.nameBn) {
            <p class="chamber-name-bn">{{ doctor.chamber.nameBn }}</p>
          }
          <p class="chamber-address">{{ doctor.chamber.address }}</p>
          @if (doctor.chamber.addressBn) {
            <p class="chamber-address-bn">{{ doctor.chamber.addressBn }}</p>
          }
        </div>
    
        <!-- Center - Certifications -->
        <div class="footer-center">
          @if (doctor.chamber.certifications) {
            <div class="certifications">
              @for (cert of doctor.chamber.certifications; track cert) {
                <div class="certification-badge">
                  <span class="cert-icon">✓</span>
                  <span class="cert-text">{{ cert }}</span>
                </div>
              }
            </div>
          }
        </div>
    
        <!-- Right - Timing & Serial -->
        <div class="footer-right">
          @if (serialNo) {
            <div class="serial-info">
              <span class="label">সিরিয়ালের জন্যঃ</span>
              <span class="value">+{{ serialNo }}</span>
            </div>
          }
          <p class="next-visit-note">পরবর্তী সাক্ষাতের সময় ব্যবস্থাপত্র সংগে আনবেন</p>
    
          @if (doctor.chamber.timings) {
            <div class="timing-info">
              <span class="label">সাক্ষাতের সময়:</span>
              @if (doctor.chamber.timingsBn) {
                <span class="value">{{ doctor.chamber.timingsBn }}</span>
              }
              <span class="value-en">{{ doctor.chamber.timings }}</span>
            </div>
          }
        </div>
      </div>
    
      <!-- Signature Area -->
      <div class="signature-area">
        <div class="signature-line"></div>
        <p class="signature-label">স্বাক্ষর</p>
      </div>
    </div>
    `,
    styles: [`
    .pdf-footer {
      margin-top: auto;
      padding-top: 16px;
    }

    .footer-divider {
      height: 1px;
      background: #e2e8f0;
      margin-bottom: 12px;
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      font-size: 10px;
    }

    .footer-left {
      flex: 1;
    }

    .footer-center {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
    }

    .footer-right {
      flex: 1;
      text-align: right;
    }

    .chamber-name {
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 2px 0;
    }

    .chamber-name-bn {
      font-size: 10px;
      color: #475569;
      margin: 0 0 4px 0;
    }

    .chamber-address,
    .chamber-address-bn {
      font-size: 9px;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    .certifications {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .certification-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 4px;
    }

    .cert-icon {
      color: #10b981;
      font-size: 10px;
    }

    .cert-text {
      font-size: 9px;
      font-weight: 600;
      color: #166534;
    }

    .serial-info {
      margin-bottom: 4px;
    }

    .serial-info .label {
      font-size: 10px;
      color: #64748b;
    }

    .serial-info .value {
      font-size: 12px;
      font-weight: 700;
      color: #dc2626;
      margin-left: 4px;
    }

    .next-visit-note {
      font-size: 9px;
      color: #64748b;
      margin: 4px 0;
      font-style: italic;
    }

    .timing-info {
      margin-top: 4px;
    }

    .timing-info .label {
      font-size: 10px;
      font-weight: 600;
      color: #1e293b;
      display: block;
    }

    .timing-info .value,
    .timing-info .value-en {
      font-size: 9px;
      color: #475569;
      display: block;
    }

    .signature-area {
      position: absolute;
      bottom: 60px;
      right: 40px;
      text-align: center;
    }

    .signature-line {
      width: 150px;
      height: 1px;
      background: #1e293b;
      margin-bottom: 4px;
    }

    .signature-label {
      font-size: 10px;
      color: #64748b;
      margin: 0;
    }

    @media print {
      .pdf-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        padding: 12px 20px;
      }
    }
  `]
})
export class PdfFooterComponent {
    @Input() doctor!: DoctorInfo;
    @Input() serialNo?: string;
}
