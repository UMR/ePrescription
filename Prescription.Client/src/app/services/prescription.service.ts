import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { PrescriptionForm, Medication } from '../models/prescription.model';
import { environment } from '../../environments/environment';

interface ClinicalNoteResponse {
    detectedLanguage: string;
    patientName: string;
    patientAge: number;
    patientGender: string;
    chiefComplaint: string;
    medicalHistory: string;
    physicalExamination: string;
    diagnosis: string;
    treatmentPlan: string;
    medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions: string;
    }>;
    tests: string;
    advice: string;
    followUpDate: string;
    weight: string;
    height: string;
    pulse: string;
    bloodPressure: string;
    temperature: string;
    referralComments: string;
    icdCodes: string;
}

@Injectable({
    providedIn: 'root'
})
export class PrescriptionService {
    private prescriptionData = new BehaviorSubject<Partial<PrescriptionForm>>({});
    public prescription$ = this.prescriptionData.asObservable();

    private apiUrl = environment.apiUrl || 'https://localhost:7085/api';

    constructor(private http: HttpClient) { }

    updatePrescription(data: Partial<PrescriptionForm>) {
        const currentData = this.prescriptionData.value;
        this.prescriptionData.next({ ...currentData, ...data });
    }

    getPrescription(): Partial<PrescriptionForm> {
        return this.prescriptionData.value;
    }

    clearPrescription() {
        this.prescriptionData.next({});
    }

    generateClinicalNote(chatRequest: string): Observable<ClinicalNoteResponse> {
        return this.http.post<ClinicalNoteResponse>(`${this.apiUrl}/Chat/complete`, {
            prompt: chatRequest
        });
    }

    extractMedications(treatmentPlan: string): Medication[] {
        if (!treatmentPlan) return [];

        const medications: Medication[] = [];
        const lines = treatmentPlan.split('\n').filter(line => line.trim());

        for (const line of lines) {
            let cleanLine = line.replace(/^\d+\.\s*/, '').trim();
            const pattern1 = /^([\w-]+(?:\s+[\w-]+)*?)\s+(\d+(?:\.\d+)?)\s*(mg|ml|g|mcg|IU|units?)\s+(?:(PO|IV|IM|SC|SL|PR|topical|inhalation)\s+)?(?:(once|twice|thrice|\d+\s*times?)\s+)?(daily|per\s+day|every\s+\d+\s+hours?|as\s+needed|prn)(?:\s+for\s+(\d+\s*(?:days?|weeks?|months?)))?/i;

            const match1 = cleanLine.match(pattern1);
            if (match1) {
                medications.push({
                    name: match1[1].trim(),
                    dosage: `${match1[2]} ${match1[3]}`,
                    frequency: `${match1[5] || ''} ${match1[6] || 'daily'}`.trim(),
                    duration: match1[7] || '7 days',
                    instructions: match1[4] ? `Route: ${match1[4]}` : 'Take as directed'
                });
                continue;
            }
            const pattern2 = /^([\w-]+(?:\s+[\w-]+)*?)\s+(\d+(?:\.\d+)?)\s*(mg|ml|g|mcg|IU|units?)\s+(.*)/i;
            const match2 = cleanLine.match(pattern2);
            if (match2) {
                medications.push({
                    name: match2[1].trim(),
                    dosage: `${match2[2]} ${match2[3]}`,
                    frequency: match2[4].trim() || 'As directed',
                    duration: '7 days',
                    instructions: 'Take as directed'
                });
            }
        }

        return medications;
    }
}
