import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ClinicalNoteSummary } from '../models/prescription.model';

@Injectable({
    providedIn: 'root'
})
export class ClinicalChatService {
    private apiUrl = `${environment.apiUrl}/Chat`;

    constructor(private http: HttpClient) { }
    streamClinicalNoteSummary(clinicalNote: string): Observable<string> {
        return new Observable(observer => {
            let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
            let aborted = false;
            fetch(`${this.apiUrl}/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({ prompt: clinicalNote })
            }).then(response => {
                console.log('Stream response status:', response.status);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                }

                if (!response.body) {
                    throw new Error('Response body is null');
                }

                reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                const readStream = (): void => {
                    if (aborted || !reader) {
                        return;
                    }

                    reader.read().then(({ done, value }) => {
                        if (done) {
                            observer.complete();
                            return;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;

                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        lines.forEach(line => {
                            line = line.trim();

                            if (line.startsWith('data: ')) {
                                const data = line.substring(6).trim();

                                if (data === '[DONE]') {
                                    observer.complete();
                                    return;
                                }

                                if (data) {
                                    try {
                                        const parsed = JSON.parse(data);
                                        if (parsed.error) {
                                            observer.error(new Error(parsed.error));
                                            return;
                                        }
                                    } catch {
                                        observer.next(data);
                                    }
                                }
                            } else if (line && !line.startsWith(':')) {
                                observer.next(line);
                            }
                        });

                        readStream();
                    }).catch(err => {
                        if (!aborted) {
                            console.error('Stream read error:', err);
                            observer.error(err);
                        }
                    });
                };

                readStream();
            }).catch(err => {
                if (!aborted) {
                    console.error('Fetch error:', err);
                    observer.error(err);
                }
            });

            return () => {
                aborted = true;
                if (reader) {
                    reader.cancel().catch(err => console.error('Reader cancel error:', err));
                }
            };
        });
    }
    parseClinicalNoteSummary(jsonResponse: string): ClinicalNoteSummary | null {
        try {
            if (!jsonResponse || jsonResponse.trim().length === 0) {
                throw new Error('Empty response from AI');
            }

            let jsonText = jsonResponse.trim();
            jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            if (jsonText.includes('\\"')) {
                try {
                    jsonText = JSON.parse(jsonText);
                } catch {
                    jsonText = jsonText.replace(/\\"/g, '"');
                }
            }
            jsonText = jsonText
                .replace(/\\r/g, '')
                .replace(/\\n/g, ' ')
                .replace(/\r/g, '')
                .replace(/\n/g, ' ');
            const jsonStart = jsonText.indexOf('{');
            const jsonEnd = jsonText.lastIndexOf('}');

            if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
                throw new Error('No valid JSON object found in response');
            }

            jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
            jsonText = jsonText
                .replace(/data:\s*/gi, '')
                .replace(/data:/gi, '')
                .replace(/\\"/g, '"')
                .replace(/"{\s*/g, '"{')
                .replace(/\s*}"/g, '}"')
                .replace(/\\n/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/,(\s*[}\]])/g, '$1')
                .replace(/:\s*,/g, ':"",')
                .replace(/:\s*}/g, ':""}')
                .trim();

            const parsed = JSON.parse(jsonText);
            if (parsed.error) {
                throw new Error(parsed.error);
            }

            const findValue = (obj: any, ...keys: string[]): any => {
                for (const key of keys) {
                    if (obj[key] !== undefined) return obj[key];
                }
                const objKeys = Object.keys(obj);
                for (const key of keys) {
                    const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
                    const found = objKeys.find(k =>
                        k.toLowerCase().replace(/\s+/g, '') === normalizedKey
                    );
                    if (found && obj[found] !== undefined) return obj[found];
                }
                return '';
            };
            const addProperSpacing = (text: string): string => {
                if (!text) return text;

                return text
                    .replace(/([.,;:!?])([A-Za-z])/g, '$1 $2')
                    .replace(/([a-z])(\()/gi, '$1 $2')
                    .replace(/(\))([A-Za-z])/g, '$1 $2')
                    .replace(/(\d)([A-Za-z])/g, '$1 $2')
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .replace(/\s+/g, ' ')
                    .trim();
            };
            let patientName = findValue(parsed, 'patientName', 'patient Name', 'patient_name', 'PatientName');
            let patientAge = findValue(parsed, 'patientAge', 'patient Age', 'patient_age', 'PatientAge');
            let patientGender = findValue(parsed, 'patientGender', 'patient Gender', 'patient_gender', 'PatientGender');
            if (parsed.patient && typeof parsed.patient === 'object') {
                patientName = patientName || parsed.patient.name || '';
                patientAge = patientAge || parsed.patient.age || 0;
                patientGender = patientGender || parsed.patient.gender || '';
            }
            let bloodPressureVal = '';
            let temperatureVal = '';
            let pulseVal = '';
            let respiratoryRateVal = '';

            if (parsed.vital_signs && typeof parsed.vital_signs === 'object') {
                const vs = parsed.vital_signs;
                bloodPressureVal = vs.bloodPressure || vs.blood_pressure || vs.BP || '';
                temperatureVal = vs.Temperature || vs.temperature || vs.Temp || '';
                pulseVal = vs.heartRate || vs.heart_rate || vs.HR || vs.pulse || '';
                respiratoryRateVal = vs.respiratoryRate || vs.respiratory_rate || vs.RR || '';
            }

            let chiefComplaintText = findValue(parsed, 'chiefComplaint', 'chief Complaint', 'chief_complaint', 'ChiefComplaint');

            if (!chiefComplaintText && parsed.symptoms) {
                if (Array.isArray(parsed.symptoms)) {
                    chiefComplaintText = parsed.symptoms.join(', ');
                } else if (typeof parsed.symptoms === 'string') {
                    chiefComplaintText = parsed.symptoms;
                }
            }
            let diagnosisText = findValue(parsed, 'diagnosis', 'Diagnosis');

            if (!diagnosisText && parsed.impressions) {
                if (Array.isArray(parsed.impressions)) {
                    diagnosisText = parsed.impressions.join('. ');
                } else if (typeof parsed.impressions === 'string') {
                    diagnosisText = parsed.impressions;
                }
            }
            let physicalExamText = '';
            const physicalExam = findValue(parsed, 'physicalExamination', 'physical Examination', 'physical_examination', 'PhysicalExamination');

            if (typeof physicalExam === 'object' && physicalExam !== null) {
                const parts: string[] = [];
                if (physicalExam.vitals) {
                    const vitals = physicalExam.vitals;
                    const vitalsParts: string[] = [];
                    if (vitals.BP) vitalsParts.push(`BP: ${vitals.BP}`);
                    if (vitals.HR) vitalsParts.push(`HR: ${vitals.HR}`);
                    if (vitals.RR) vitalsParts.push(`RR: ${vitals.RR}`);
                    if (vitals.Temp) vitalsParts.push(`Temp: ${vitals.Temp}`);
                    if (vitalsParts.length > 0) {
                        parts.push(`Vitals: ${vitalsParts.join(', ')}`);
                    }
                }
                if (physicalExam.general) parts.push(`General: ${physicalExam.general}`);
                if (physicalExam.respiratory) parts.push(`Respiratory: ${physicalExam.respiratory}`);
                if (physicalExam.cardiovascular) parts.push(`Cardiovascular: ${physicalExam.cardiovascular}`);

                physicalExamText = parts.join('. ');
            } else if (typeof physicalExam === 'string') {
                physicalExamText = physicalExam;
            }
            if (!physicalExamText && parsed.vital_signs) {
                const vitalsParts: string[] = [];
                if (temperatureVal) vitalsParts.push(`Temp: ${temperatureVal}`);
                if (bloodPressureVal) vitalsParts.push(`BP: ${bloodPressureVal}`);
                if (pulseVal) vitalsParts.push(`HR: ${pulseVal}`);
                if (respiratoryRateVal) vitalsParts.push(`RR: ${respiratoryRateVal}`);

                if (vitalsParts.length > 0) {
                    physicalExamText = `Vital Signs: ${vitalsParts.join(', ')}`;
                }
            }
            let treatmentPlanText = '';
            let adviceText = '';
            let followUpText = '';
            let referralText = '';
            const treatmentPlan = findValue(parsed, 'treatmentPlan', 'treatment Plan', 'treatment_plan', 'TreatmentPlan');

            if (Array.isArray(treatmentPlan)) {
                const medications: string[] = [];
                const advices: string[] = [];

                treatmentPlan.forEach((item: any) => {
                    if (item.medication) {
                        let medText = item.medication;
                        if (item.dosage) medText += ` ${item.dosage}`;
                        if (item.route) medText += ` ${item.route}`;
                        if (item.frequency) medText += ` ${item.frequency}`;
                        if (item.duration) medText += ` for ${item.duration}`;
                        medications.push(medText);
                    } else if (item.advice) {
                        advices.push(item.advice);
                    } else if (item['follow Up Date']) {
                        followUpText = item['follow Up Date'];
                    } else if (item['referral Comments']) {
                        referralText = item['referral Comments'];
                    }
                });

                if (medications.length > 0) {
                    treatmentPlanText = medications.map((m, i) => `${i + 1}. ${m}`).join('\n');
                }
                if (advices.length > 0) {
                    adviceText = advices.map((a, i) => `${i + 1}. ${a}`).join('\n');
                }
            } else if (typeof treatmentPlan === 'string') {
                treatmentPlanText = treatmentPlan;
            }
            if (!treatmentPlanText && parsed.plan && typeof parsed.plan === 'object') {
                const planParts: string[] = [];

                if (parsed.plan.treatmentInitiated && Array.isArray(parsed.plan.treatmentInitiated)) {
                    planParts.push('Treatment: ' + parsed.plan.treatmentInitiated.join(', '));
                }

                if (parsed.plan.diagnosticTestsOrdered && Array.isArray(parsed.plan.diagnosticTestsOrdered)) {
                    if (!referralText) {
                        referralText = 'Diagnostic Tests Ordered: ' + parsed.plan.diagnosticTestsOrdered.join(', ');
                    }
                }

                if (planParts.length > 0) {
                    treatmentPlanText = planParts.join('. ');
                }
            }
            let medicationsArray = parsed.medications || parsed.Medications || [];

            if (medicationsArray.length === 0 && parsed.plan?.treatmentInitiated && Array.isArray(parsed.plan.treatmentInitiated)) {
                medicationsArray = parsed.plan.treatmentInitiated.map((treatment: string) => {
                    const parts = treatment.split(' for ');
                    const namePart = parts[0] || treatment;
                    const indication = parts[1] || '';

                    return {
                        name: namePart,
                        dosage: '',
                        frequency: '',
                        duration: '',
                        instructions: indication
                    };
                });
            }

            if (!bloodPressureVal) {
                const vitals = physicalExam?.vitals || {};
                bloodPressureVal = vitals.BP || findValue(parsed, 'bloodPressure', 'blood Pressure', 'blood_pressure', 'BloodPressure') || '';
            }
            if (!temperatureVal) {
                const vitals = physicalExam?.vitals || {};
                temperatureVal = vitals.Temp || findValue(parsed, 'temperature', 'Temperature') || '';
            }
            if (!pulseVal) {
                const vitals = physicalExam?.vitals || {};
                pulseVal = vitals.HR || findValue(parsed, 'pulse', 'Pulse', 'HR') || '';
            }

            if (!adviceText) {
                adviceText = addProperSpacing(findValue(parsed, 'advice', 'Advice'));
            }

            if (!followUpText) {
                followUpText = addProperSpacing(findValue(parsed, 'followUpDate', 'follow Up Date', 'followup Date', 'follow_up_date', 'FollowUpDate'));
            }
            if (!referralText) {
                referralText = addProperSpacing(findValue(parsed, 'referralComments', 'referral Comments', 'referral_comments', 'ReferralComments'));
            }

            const result = {
                patientName: addProperSpacing(patientName),
                patientAge: parseInt(patientAge) || 0,
                patientGender: addProperSpacing(patientGender),
                chiefComplaint: addProperSpacing(chiefComplaintText),
                medicalHistory: addProperSpacing(findValue(parsed, 'medicalHistory', 'medical History', 'medical_history', 'MedicalHistory')),
                physicalExamination: addProperSpacing(physicalExamText),
                diagnosis: addProperSpacing(diagnosisText),
                treatmentPlan: addProperSpacing(treatmentPlanText),
                medications: medicationsArray,
                advice: adviceText,
                followUpDate: followUpText,
                weight: addProperSpacing(findValue(parsed, 'weight', 'Weight')),
                height: addProperSpacing(findValue(parsed, 'height', 'Height')),
                pulse: addProperSpacing(String(pulseVal)),
                bloodPressure: addProperSpacing(String(bloodPressureVal)),
                temperature: addProperSpacing(String(temperatureVal)),
                referralComments: referralText
            };

            if (!result.chiefComplaint && !result.diagnosis) {
            }

            return result;
        } catch (error) {

            if (jsonResponse?.includes('You are an expert medical AI')) {
            }

            return null;
        }
    }
}
