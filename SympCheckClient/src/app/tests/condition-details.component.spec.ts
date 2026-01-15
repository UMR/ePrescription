import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ConditionDetailsComponent } from '../pages/condition-details/condition-details.component';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ConditionService } from '../services/condition.service';
import { ThemeService } from '../services/theme.service';
import { NgZone, ChangeDetectorRef } from '@angular/core';

describe('ConditionDetailsComponent', () => {
  let component: ConditionDetailsComponent;
  let fixture: ComponentFixture<ConditionDetailsComponent>;
  let activatedRoute: any;
  let router: any;
  let conditionService: any;
  let themeService: any;

  const mockParams$ = new Subject<any>();
  const mockThemeMode$ = new Subject<string>();

  beforeEach(async () => {
    activatedRoute = {
      params: mockParams$.asObservable(),
      snapshot: { params: { id: 'common-cold' } }
    };

    router = {
      getCurrentNavigation: vi.fn().mockReturnValue({
        extras: { state: { conditionName: 'Common Cold' } }
      }),
      navigate: vi.fn()
    };

    conditionService = {
      getConditionDetails: vi.fn()
    };

    themeService = {
      mode$: mockThemeMode$.asObservable(),
      toggle: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ConditionDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: Router, useValue: router },
        { provide: ConditionService, useValue: conditionService },
        { provide: ThemeService, useValue: themeService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConditionDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should get conditionName from navigation state on init', () => {
    expect(component.conditionName).toBe('Common Cold');
  });

  it('should load condition details when id route param is present', () => {
    const mockDetails = { id: 'cond-1', name: 'Common Cold', description: 'Test' };
    conditionService.getConditionDetails.mockReturnValue(of(mockDetails));
    
    mockParams$.next({ id: 'common-cold' });
    
    expect(conditionService.getConditionDetails).toHaveBeenCalledWith('common-cold');
    expect(component.condition).toEqual(mockDetails);
    expect(component.loading).toBe(false);
  });

  it('should handle error when loading fails', () => {
    conditionService.getConditionDetails.mockReturnValue(throwError(() => new Error('API Error')));
    
    mockParams$.next({ id: 'error-slug' });
    
    expect(component.error).toBe(true);
    expect(component.errorMessage).toContain('Failed to load');
    expect(component.loading).toBe(false);
  });

  it('should handle missing condition identifier', () => {
    mockParams$.next({});
    
    expect(component.error).toBe(true);
    expect(component.errorMessage).toBe('No condition identifier provided');
    expect(component.loading).toBe(false);
  });

  it('should update themeMode when theme service emits', () => {
    mockThemeMode$.next('dark');
    expect(component.themeMode).toBe('dark');
  });

  it('should call goBack when goBack is called', () => {
    const backSpy = vi.spyOn(window.history, 'back');
    component.goBack();
    expect(backSpy).toHaveBeenCalled();
  });

  it('should retry loading details', () => {
    conditionService.getConditionDetails.mockReturnValue(of({}));
    component.retry();
    expect(conditionService.getConditionDetails).toHaveBeenCalledWith('common-cold');
  });

  it('should toggle theme using theme service', () => {
    component.toggleTheme();
    expect(themeService.toggle).toHaveBeenCalled();
  });
});
