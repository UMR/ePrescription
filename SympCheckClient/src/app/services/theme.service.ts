import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme-preference';
  private readonly modeSubject: BehaviorSubject<ThemeMode>;
  public readonly mode$;

  constructor() {
    // Load saved theme or default to 'dark'
    const savedTheme = this.loadTheme();
    this.modeSubject = new BehaviorSubject<ThemeMode>(savedTheme);
    this.mode$ = this.modeSubject.asObservable();
    this.applyMode(savedTheme);
  }

  private loadTheme(): ThemeMode {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    }
    return 'dark'; // Default to dark mode
  }

  private saveTheme(mode: ThemeMode): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, mode);
    }
  }

  get currentMode(): ThemeMode {
    return this.modeSubject.value;
  }

  setMode(mode: ThemeMode): void {
    if (mode === this.modeSubject.value) {
      this.applyMode(mode);
      return;
    }
    this.modeSubject.next(mode);
    this.saveTheme(mode);
    this.applyMode(mode);
  }

  toggle(): void {
    const next: ThemeMode = this.modeSubject.value === 'dark' ? 'light' : 'dark';
    this.setMode(next);
  }

  private applyMode(mode: ThemeMode): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', mode);
    }
  }
}
