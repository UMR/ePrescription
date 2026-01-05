export interface PrescriptionForm {
    patientName: string;
    patientAge: number;
    patientGender: string;
    chiefComplaint: string;
    medicalHistory: string;
    physicalExamination: string;
    diagnosis: string;
    treatmentPlan: string;
    medications: Medication[];
    tests?: string;
    advice?: string;
    followUpDate?: string;
    weight?: string;
    height?: string;
    pulse?: string;
    bloodPressure?: string;
    temperature?: string;
    referralComments?: string;
    icdCodes?: string;
}

export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
}

export interface ClinicalNoteSummary {
    patientName: string;
    patientAge: number;
    patientGender: string;
    chiefComplaint: string;
    medicalHistory: string;
    physicalExamination: string;
    diagnosis: string;
    treatmentPlan: string;
    medications?: Medication[];
    tests?: string;
    advice?: string;
    followUpDate?: string;
    weight?: string;
    height?: string;
    pulse?: string;
    bloodPressure?: string;
    temperature?: string;
    referralComments?: string;
    icdCodes?: string;
}

