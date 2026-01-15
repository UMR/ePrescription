import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SymptomSessionState {
  symptoms: string;
  initialSymptom: string;
  conversationAnswers: Array<{ question: string; answer: string }>;
  conversationSummary: string;
  age: number | null;
  gender: string;
  height: number | null;
  weight: number | null;
  temperature: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  currentStep: number;
  result: any;
  expandedConditions: Set<number>;
  themeMode: 'dark' | 'light';
}

@Injectable({
  providedIn: 'root',
})
export class SymptomSessionStateService {
  private stateSubject = new BehaviorSubject<SymptomSessionState | null>(null);
  public state$ = this.stateSubject.asObservable();

  saveState(state: SymptomSessionState): void {
    this.stateSubject.next(state);
  }

  getState(): SymptomSessionState | null {
    return this.stateSubject.value;
  }

  clearState(): void {
    this.stateSubject.next(null);
  }
}
