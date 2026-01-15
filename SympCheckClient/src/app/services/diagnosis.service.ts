import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { DiagnosisRequest, DiagnosisCondition } from '../models/api.models';

/**
 * Handles final diagnosis analysis
 */
@Injectable({
  providedIn: 'root',
})
export class DiagnosisService {
  private analyzeUrl = environment.apiBaseUrl + environment.apiEndpoints.analysis;
  private threshold = environment.diagnosisThreshold;

  constructor(private http: HttpClient) {}

  /**
   * Submit diagnosis request with symptom, conversation summary, and vitals
   */
  async analyzeSymptomsAndConversation(request: DiagnosisRequest): Promise<DiagnosisCondition[]> {
    try {
      
      const backendRequest = {
        Symptom: request.Symptom,
        Answers: request.Answers,
        Age: request.Age,
        Gender: request.Gender,
        Temperature: request.Temperature,
        BloodPressure: request.BloodPressure,
        HeartRate: request.HeartRate,
      };

      const response = await this.http
        .post<any>(this.analyzeUrl, backendRequest)
        .toPromise();

      if (!response) {
        throw new Error('No response from server');
      }

      // Normalize to array of conditions
      let conditions: DiagnosisCondition[] = [];
      if (Array.isArray(response)) {
        conditions = response;
      } else if (response.conditions && Array.isArray(response.conditions)) {
        conditions = response.conditions;
      }

      // Filter by configured threshold
      return conditions
        .filter((c) => c.score >= this.threshold)
        .sort((a, b) => b.score - a.score);
    } catch (err) {
      this.logDiagnosisError(err);
      throw err;
    }
  }

  private logDiagnosisError(err: unknown): void {
    if (!environment.enableVerboseLogging) {
      return;
    }
    console.error('[DiagnosisService] Analysis error:', err);
  }
}
