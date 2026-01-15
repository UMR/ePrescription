import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DiagnosisService } from '../services/diagnosis.service';
import { DiagnosisRequest, DiagnosisCondition } from '../models/api.models';
import { environment } from '../../environments/environment';

describe('DiagnosisService', () => {
  let service: DiagnosisService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiBaseUrl + environment.apiEndpoints.analysis;

  const baseRequest: DiagnosisRequest = {
    Symptom: 'Headache',
    Answers: [{ Question: 'Duration?', Answer: '3 days' }],
    Age: 35,
    Gender: 'female',
    Temperature: 99,
    BloodPressure: '120/80',
    HeartRate: 72,
    Summary: 'Summary text',
  };

  const sampleCondition = (overrides: Partial<DiagnosisCondition>): DiagnosisCondition => ({
    label: 'Condition',
    score: 0.5,
    icd: 'R51',
    details: 'Details',
    physician: 'General',
    reasoning: 'Reason',
    isEmergency: false,
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DiagnosisService],
    });

    service = TestBed.inject(DiagnosisService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts diagnosis request and filters by threshold', async () => {
    const promise = service.analyzeSymptomsAndConversation(baseRequest);

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      Symptom: 'Headache',
      Answers: baseRequest.Answers,
      Age: 35,
      Gender: 'female',
      Temperature: 99,
      BloodPressure: '120/80',
      HeartRate: 72,
    });

    req.flush({
      conditions: [
        sampleCondition({ label: 'Migraine', score: 0.8 }),
        sampleCondition({ label: 'Mild Tension', score: 0.1 }),
      ],
    });

    const result = await promise;
    expect(result).toEqual([sampleCondition({ label: 'Migraine', score: 0.8 })]);
  });

  it('accepts array response payloads', async () => {
    const promise = service.analyzeSymptomsAndConversation(baseRequest);

    const req = httpMock.expectOne(apiUrl);
    req.flush([
      sampleCondition({ label: 'Sinusitis', score: 0.4 }),
      sampleCondition({ label: 'Tension', score: 0.3 }),
      sampleCondition({ label: 'Minor', score: 0.2 }),
    ]);

    const result = await promise;
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.label)).toEqual(['Sinusitis', 'Tension']);
  });

  it('throws when backend returns no response body', async () => {
    const promise = service.analyzeSymptomsAndConversation(baseRequest);

    const req = httpMock.expectOne(apiUrl);
    req.flush(null);

    await expect(promise).rejects.toThrow('No response from server');
  });

  it('propagates http errors', async () => {
    const promise = service.analyzeSymptomsAndConversation(baseRequest);

    const req = httpMock.expectOne(apiUrl);
    req.flush('Server error', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toBeTruthy();
  });
});
