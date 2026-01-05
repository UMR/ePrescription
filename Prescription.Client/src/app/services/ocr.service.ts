import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Point {
    x: number;
    y: number;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    polygon: Point[];
}

export interface TextRegion {
    text: string;
    boundingBox: BoundingBox;
    confidence: number;
    category: string;
}

export interface ExtractedMedication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
}

// Parsed patient information
export interface ParsedPatientInfo {
    name?: string;
    age?: string;
    gender?: string;
    id?: string;
    contactDetails?: string;
}

// Parsed doctor information
export interface ParsedDoctorInfo {
    name?: string;
    specialization?: string;
    license?: string;
    clinicHospital?: string;
}

// Parsed lab result
export interface ParsedLabResult {
    testName: string;
    result: string;
    referenceValue: string;
    status?: 'normal' | 'high' | 'low';
}

export interface OcrDocumentSections {
    patientInformation: string;
    doctorInformation: string;
    diagnosis: string;
    medications: ExtractedMedication[];
    labResults: string;
    vitalSigns: string;
    clinicalNotes: string;
    instructions: string;
    followUp: string;
    otherInformation: string;
}

// Parsed sections for UI display
export interface ParsedSections {
    patientInfo?: ParsedPatientInfo;
    doctorInfo?: ParsedDoctorInfo;
    labResults?: ParsedLabResult[];
    rawSections: OcrDocumentSections;
}

export interface ImageDimensions {
    width: number;
    height: number;
}

export interface OcrResult {
    extractedText: string;
    detectedLanguage: string;
    confidence: number;
    textRegions: TextRegion[];
    sections: OcrDocumentSections;
    parsedSections?: ParsedSections;
    summary: string;
    imageDimensions: ImageDimensions;
    processedAt: Date;
}

export interface OcrQuestionRequest {
    extractedText: string;
    question: string;
    sections?: OcrDocumentSections;
}

export interface OcrQuestionResponse {
    answer: string;
    confidence: string;
    relevantSections: string[];
}

export interface OcrUploadRequest {
    base64Image: string;
    fileName: string;
}

@Injectable({
    providedIn: 'root'
})
export class OcrService {
    private apiUrl = environment.apiUrl || 'http://localhost:5032/api';

    constructor(private http: HttpClient) { }

    /**
     * Process an image file for OCR extraction
     */
    processImage(file: File): Observable<OcrResult> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<OcrResult>(`${this.apiUrl}/ocr/process`, formData).pipe(
            map(result => this.parseOcrResult(result))
        );
    }

    /**
     * Process a base64 encoded image for OCR extraction
     */
    processBase64Image(base64Image: string, fileName: string): Observable<OcrResult> {
        const request: OcrUploadRequest = { base64Image, fileName };
        return this.http.post<OcrResult>(`${this.apiUrl}/ocr/process-base64`, request).pipe(
            map(result => this.parseOcrResult(result))
        );
    }

    /**
     * Parse OCR result and extract structured data from JSON strings
     */
    private parseOcrResult(result: OcrResult): OcrResult {
        const parsedSections: ParsedSections = {
            rawSections: result.sections
        };

        // Parse patient information
        if (result.sections?.patientInformation) {
            parsedSections.patientInfo = this.tryParseJson<ParsedPatientInfo>(result.sections.patientInformation);
        }

        // Parse doctor information
        if (result.sections?.doctorInformation) {
            parsedSections.doctorInfo = this.tryParseJson<ParsedDoctorInfo>(result.sections.doctorInformation);
        }

        // Parse lab results
        if (result.sections?.labResults) {
            const labData = this.tryParseJson<ParsedLabResult[]>(result.sections.labResults);
            if (Array.isArray(labData)) {
                parsedSections.labResults = labData;
            }
        }

        result.parsedSections = parsedSections;
        return result;
    }

    /**
     * Safely parse JSON string
     */
    private tryParseJson<T>(jsonString: string): T | undefined {
        if (!jsonString || jsonString.trim() === '' || jsonString === '{}') {
            return undefined;
        }
        try {
            return JSON.parse(jsonString) as T;
        } catch {
            return undefined;
        }
    }

    /**
     * Ask a question about the extracted document content
     */
    askQuestion(extractedText: string, question: string, sections?: OcrDocumentSections): Observable<OcrQuestionResponse> {
        const request: OcrQuestionRequest = { extractedText, question, sections };
        return this.http.post<OcrQuestionResponse>(`${this.apiUrl}/ocr/question`, request);
    }

    /**
     * Generate a summary of the extracted document
     */
    generateSummary(extractedText: string): Observable<{ summary: string }> {
        return this.http.post<{ summary: string }>(`${this.apiUrl}/ocr/summary`, { extractedText });
    }

    /**
     * Convert a File to base64 string
     */
    fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Get category display name
     */
    getCategoryDisplayName(category: string): string {
        const categoryNames: Record<string, string> = {
            'patient_info': 'Patient Information',
            'doctor_info': 'Doctor Information',
            'medication': 'Medication',
            'diagnosis': 'Diagnosis',
            'lab_result': 'Lab Result',
            'vital_signs': 'Vital Signs',
            'clinical_notes': 'Clinical Notes',
            'instructions': 'Instructions',
            'follow_up': 'Follow-up',
            'other': 'Other'
        };
        return categoryNames[category] || category;
    }

    /**
     * Get category color for visualization
     */
    getCategoryColor(category: string): string {
        const categoryColors: Record<string, string> = {
            'patient_info': '#4CAF50',
            'doctor_info': '#2196F3',
            'medication': '#FF9800',
            'diagnosis': '#F44336',
            'lab_result': '#9C27B0',
            'vital_signs': '#00BCD4',
            'clinical_notes': '#795548',
            'instructions': '#607D8B',
            'follow_up': '#E91E63',
            'other': '#9E9E9E'
        };
        return categoryColors[category] || '#9E9E9E';
    }
}
