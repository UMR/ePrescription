import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DiagnosisCondition } from '../models/api.models';
import { environment } from '../../environments/environment';

/**
 * Service to cache complete diagnosis state when navigating to condition details
 * and restore it when navigating back
 */
export interface CachedDiagnosisState {
  initialSymptom: string;
  conversationSummary: string;
  diagnosisResults: DiagnosisCondition[];
  demographics: any;
}

@Injectable({
  providedIn: 'root',
})
export class DiagnosisCacheService {
  private cacheSubject = new BehaviorSubject<CachedDiagnosisState | null>(null);
  public cache$ = this.cacheSubject.asObservable();

  constructor() {}

  private logCacheError(message: string, err: unknown): void {
    if (!environment.enableVerboseLogging) {
      return;
    }
    console.error(`[DiagnosisCache] ${message}`, err);
  }

  /**
   * Store complete diagnosis state before navigating to condition details
   */
  setDiagnosisState(state: CachedDiagnosisState): void {
    this.cacheSubject.next(state);
    // Also store in sessionStorage as backup
    sessionStorage.setItem('diagnosis_state', JSON.stringify(state));
  }

  /**
   * Get cached diagnosis state
   */
  getCachedState(): CachedDiagnosisState | null {
    return this.cacheSubject.value;
  }

  /**
   * Check if diagnosis state is cached
   */
  hasCachedState(): boolean {
    return this.cacheSubject.value !== null;
  }

  /**
   * Restore from sessionStorage if available
   */
  restoreFromStorage(): CachedDiagnosisState | null {
    const cached = sessionStorage.getItem('diagnosis_state');
    if (cached) {
      try {
        const state = JSON.parse(cached) as CachedDiagnosisState;
        this.cacheSubject.next(state);
        return state;
      } catch (e) {
        this.logCacheError('Failed to restore diagnosis state from storage', e);
      }
    }
    return null;
  }

  /**
   * Clear cached state
   */
  clearCache(): void {
    this.cacheSubject.next(null);
    sessionStorage.removeItem('diagnosis_state');
  }
}
