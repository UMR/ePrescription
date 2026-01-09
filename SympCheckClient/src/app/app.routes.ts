import { Routes } from '@angular/router';
import { SymptomFormComponent } from './pages/symptom-form/symptom-form.component';

export const routes: Routes = [
  {
    path: '',
    component: SymptomFormComponent,
  },
  {
    path: 'conditions/:id',
    loadComponent: () =>
      import('./pages/condition-details/condition-details.component').then(
        (m) => m.ConditionDetailsComponent
      ),
  },
];
