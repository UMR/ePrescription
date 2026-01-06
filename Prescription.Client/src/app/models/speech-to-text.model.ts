import {
  type ErrorStatus,
  Token,
  SpeechToTextAPIResponse,
} from '@soniox/speech-to-text-web';

export type SpeechRecordingState =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'error';

export interface SpeechToken extends Token {}

export interface SpeechTranscriptionResult extends SpeechToTextAPIResponse {}

/**
 * Configuration options for speech-to-text service
 */
export interface SpeechToTextConfig {
  apiKey: string | (() => Promise<string>);
  model?: string;
  languageHints?: string[];
  context?: string;
  enableSpeakerDiarization?: boolean;
  enableEndpointDetection?: boolean;
  enableLanguageIdentification?: boolean;
}

export type SpeechErrorStatus = ErrorStatus | 'unknown_error';

export interface SpeechError {
  status: SpeechErrorStatus;
  message: string;
}

export const MEDICAL_CONTEXT = `
Paracetamol, Amoxicillin, Azithromycin, Omeprazole, Metformin,
Amlodipine, Atorvastatin, Losartan, Ciprofloxacin, Pantoprazole,
Cetirizine, Ranitidine, Ibuprofen, Aspirin, Clopidogrel,
hypertension, diabetes mellitus, pneumonia, bronchitis, gastritis,
chief complaint, physical examination, diagnosis, treatment plan,
blood pressure, heart rate, respiratory rate, temperature, SpO2,
CBC, LFT, RFT, HbA1c, ECG, X-ray, ultrasound, CT scan, MRI,
fever, cough, headache, nausea, vomiting, diarrhea, constipation,
abdomen, chest, throat, lungs, heart, liver, kidney, skin,
milligram, twice daily, three times daily, once daily, after meals,
before meals, at bedtime, as needed, subcutaneous, intramuscular
`.trim();

/**
 * User-friendly error messages for each error status
 */
export const ERROR_MESSAGES: Record<SpeechErrorStatus, string> = {
  get_user_media_failed:
    'Microphone access denied. Please allow microphone permission in your browser settings.',
  api_key_fetch_failed:
    'Unable to connect to speech service. Please check your internet connection and try again.',
  queue_limit_exceeded: 'Too many audio chunks buffered. Please try again.',
  media_recorder_error:
    'Recording failed. Please ensure your microphone is working and try again.',
  api_error: 'Speech service error. Please try again later.',
  websocket_error: 'Connection lost. Please check your internet connection.',
  unknown_error: 'An unexpected error occurred. Please try again.',
};
