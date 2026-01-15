import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ConditionService, ConditionDetailResponse } from '../../services/condition.service';
import { ThemeService, ThemeMode } from '../../services/theme.service';

@Component({
  selector: 'app-condition-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './condition-details.component.html',
  styleUrls: ['./condition-details.component.css'],
})
export class ConditionDetailsComponent implements OnInit, OnDestroy {
  condition: ConditionDetailResponse | null = null;
  conditionName: string = '';
  loading = true;
  error = false;
  errorMessage = '';
  themeMode: ThemeMode = 'light';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private conditionService: ConditionService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.mode$.pipe(takeUntil(this.destroy$)).subscribe((mode) => {
      this.themeMode = mode;
      this.cdr.markForCheck();
    });
  
    // Get condition name from navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.conditionName = navigation.extras.state['conditionName'] || '';
    }

    // Get ICD code from query params instead of route param
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const label = params['label'];
      if (label) {
        this.loadConditionDetails(label);
      } else {
        this.error = true;
        this.errorMessage = 'No condition label provided';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConditionDetails(label: string): void {
    this.loading = true;
    this.error = false;
    console.log('Starting load, loading =', this.loading);

    this.conditionService
      .getConditionDetails(label)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.ngZone.run(() => {
            console.log('Finalize - setting loading to false');
            this.loading = false;
            this.cdr.detectChanges();
            console.log('After finalize, loading =', this.loading);
          });
        })
      )
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            console.log('Condition data received:', data);
            this.condition = data;
            this.cdr.detectChanges();
            console.log('After setting condition, loading =', this.loading);
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Error loading condition details:', err);
            this.error = true;
            this.errorMessage = 'Failed to load condition details. Please try again.';
            this.cdr.detectChanges();
          });
        },
      });
  }

  retry(): void {
    const label = this.route.snapshot.queryParams['label'];
    if (label) {
      this.loadConditionDetails(label);
    }
  }

  goBack(): void {
    // Use browser history to go back and maintain state
    window.history.back();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
