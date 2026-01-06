import { Context } from '@soniox/speech-to-text-web';

export const SONIOX_MEDICAL_CONTEXT: Context = {
  general: [
    { key: 'domain', value: 'Healthcare' },
    { key: 'interaction', value: 'Doctor-Patient-Caregiver Consultation' },
    { key: 'setting', value: 'Clinical' },
    {
      key: 'participants',
      value: 'healthcare_professional, patient, caregiver',
    },
    { key: 'purpose', value: 'clinical_assessment_diagnosis_and_treatment' },
    { key: 'output_usage', value: 'clinical_documentation' },
  ],
  text: `This is a real-time clinical consultation between a licensed healthcare professional
and a patient. The conversation may include patient complaints, medical history,
symptom descriptions, physical examination findings, diagnoses, medications,
dosages, laboratory results, imaging studies, treatment plans, and follow-up
instructions. Medical terminology, abbreviations, anatomical terms, and
pharmaceutical names may be used. Transcription accuracy and clinical context
preservation are required.`,
  terms: [
    "hypertension",
    "diabetes mellitus",
    "blood pressure",
    "heart rate",
    "respiratory rate",
    "oxygen saturation",
    "chest pain",
    "shortness of breath",
    "headache",
    "fever",
    "metformin",
    "amlodipine",
    "atorvastatin",
    "insulin",
    "ECG",
    "CBC",
    "HbA1c",
    "MRI",
    "CT scan"
  ],
  translation_terms: [
    { source: 'patient', target: 'রোগী' },
    { source: 'doctor', target: 'ডাক্তার' }
  ],
};


export const SONIOX_AI_MODEL = 'stt-rt-v3-preview';
