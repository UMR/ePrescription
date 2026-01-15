import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConditionDetailResponse {
  id: string;
  name: string;
  specialties: string[];
  description: string;
  commonCauses: string[];
  redFlags: string[];
  investigations: string[];
  disclaimer: string;
  // Optional additional metadata used by the UI
  prevalence?: string;
  ageGroup?: string;
  duration?: string;
  severity?: string;
  source?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConditionService {
  private apiUrl = environment.apiBaseUrl + environment.apiEndpoints.conditions;

  constructor(private http: HttpClient) {}

  getConditionDetails(id: string): Observable<ConditionDetailResponse> {
    // Convert slug back to proper format for API
    const conditionName = id
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const encodedId = encodeURIComponent(conditionName);
    return this.http.get<ConditionDetailResponse>(`${this.apiUrl}/${encodedId}`);
  }
}
