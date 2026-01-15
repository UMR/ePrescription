import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DiagnosisCondition } from '../../models/api.models';

@Component({
  selector: 'app-diagnosis-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diagnosis-results.component.html',
  styleUrl: './diagnosis-results.component.css',
})
export class DiagnosisResultsComponent {
  @Input() conditions: DiagnosisCondition[] = [];

  expandedConditions = new Set<number>();

  constructor(private router: Router) {}

  toggleCondition(index: number): void {
    if (this.expandedConditions.has(index)) {
      this.expandedConditions.delete(index);
    } else {
      this.expandedConditions.add(index);
    }
  }

  isExpanded(index: number): boolean {
    return this.expandedConditions.has(index);
  }

  viewDetails(label: string): void {
    // Find condition to pass name along with navigation
    const condition = this.conditions.find(c => c.label === label);
    if (!condition) return;
    
    // Create URL-friendly slug from condition name
    const nameSlug = condition.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Navigate to condition details page using condition name in URL
    this.router.navigate(['/conditions', nameSlug], {
      state: { conditionName: condition.label, icdCode: condition.icd }
    });
  }
}
