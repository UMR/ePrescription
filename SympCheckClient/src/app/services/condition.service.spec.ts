import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ConditionService, ConditionDetailResponse } from './condition.service';
import { environment } from '../../environments/environment';

describe('ConditionService', () => {
  let service: ConditionService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiBaseUrl + environment.apiEndpoints.conditions;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ConditionService],
    });

    service = TestBed.inject(ConditionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests condition details using formatted slug', () => {
    const response: ConditionDetailResponse = {
      id: 'cond-1',
      name: 'Heart Attack Warning',
      specialties: ['Cardiology'],
      description: 'Sample description',
      commonCauses: ['Cause A'],
      redFlags: ['Flag'],
      investigations: ['ECG'],
      disclaimer: 'Consult a doctor',
    };

    service.getConditionDetails('heart-attack-warning').subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne(`${apiUrl}/Heart%20Attack%20Warning`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });

  it('encodes special characters before requesting details', () => {
    const response: ConditionDetailResponse = {
      id: 'rare',
      name: 'Rare Condition+Test',
      specialties: [],
      description: 'Details',
      commonCauses: [],
      redFlags: [],
      investigations: [],
      disclaimer: 'Info',
      source: 'Unit Test',
    };

    service.getConditionDetails('rare-condition+test').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/Rare%20Condition%2Btest`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });
});
