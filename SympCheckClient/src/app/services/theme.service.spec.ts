import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const storageKey = 'theme-preference';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    localStorage.removeItem(storageKey);
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to dark mode when no preference exists', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.currentMode).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('loads the saved preference during construction', () => {
    localStorage.setItem(storageKey, 'light');

    const service = TestBed.inject(ThemeService);

    expect(service.currentMode).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles between modes and persists the choice', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();
    expect(service.currentMode).toBe('light');
    expect(localStorage.getItem(storageKey)).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    service.toggle();
    expect(service.currentMode).toBe('dark');
    expect(localStorage.getItem(storageKey)).toBe('dark');
  });

  it('setMode applies the requested theme even if it matches the current value', () => {
    localStorage.setItem(storageKey, 'dark');

    const service = TestBed.inject(ThemeService);
    document.documentElement.setAttribute('data-theme', 'light');

    service.setMode('dark');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(storageKey)).toBe('dark');
  });
});
