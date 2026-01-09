import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ThemeService, ThemeMode } from '../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnDestroy {
  themeMode: ThemeMode = 'light';

  private readonly destroy$ = new Subject<void>();

  constructor(private themeService: ThemeService, private cdr: ChangeDetectorRef) {
    this.themeService.mode$.pipe(takeUntil(this.destroy$)).subscribe((mode) => {
      this.themeMode = mode;
      this.cdr.markForCheck();
    });
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
