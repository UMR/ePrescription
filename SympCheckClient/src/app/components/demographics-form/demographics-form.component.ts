import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface Demographics {
  age: number | null;
  gender: string;
  height: number | null;
  weight: number | null;
  temperature: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
}

@Component({
  selector: 'app-demographics-form',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './demographics-form.component.html',
  styleUrl: './demographics-form.component.css',
})
export class DemographicsFormComponent implements OnInit {
  @Output() demographicsUpdated = new EventEmitter<Demographics>();
  @Output() submit = new EventEmitter<Demographics>();

  demographics: Demographics = {
    age: 44,
    gender: 'male',
    height: 170,
    weight: 65,
    temperature: 99,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    heartRate: 70,
  };

  currentStep: number = 1;
  totalSteps: number = 2;

  constructor() {}

  ngOnInit(): void {}

  nextStep(): void {
    if (this.currentStep === 1) {
      if (
        !this.demographics.age ||
        !this.demographics.gender ||
        !this.demographics.height ||
        !this.demographics.weight
      ) {
        alert('Please fill in all basic information (Age, Gender, Height, Weight).');
        return;
      }
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onDemographicsChange(): void {
    this.demographicsUpdated.emit(this.demographics);
  }

  onSubmit(): void {
    // Validate vitals
    if (
      !this.demographics.temperature ||
      !this.demographics.bloodPressureSystolic ||
      !this.demographics.bloodPressureDiastolic ||
      !this.demographics.heartRate
    ) {
      alert('Please fill in all vital information.');
      return;
    }
    this.submit.emit(this.demographics);
  }

  populateRandom(): void {
    // Only populate vitals (Step 2)
    this.demographics = {
      ...this.demographics, // Keep existing basic info
      temperature: Math.round((Math.random() * 3 + 99) * 10) / 10,
      bloodPressureSystolic: Math.floor(Math.random() * 41) + 100,
      bloodPressureDiastolic: Math.floor(Math.random() * 31) + 60,
      heartRate: Math.floor(Math.random() * 41) + 60,
    };
    this.onDemographicsChange();
  }

  reset(): void {
    // Reset to defaults or clear? 
    // Going with defaults as per original implementation, but maybe less "pre-filled" logic if requested.
    // User didn't explicitly ask to remove defaults, just structural change.
    // However, for "Populate Random" to be useful, it implies fields might start empty or user wants to change them.
    // I will keep the original reset logic for safety but ensure it resets everything.
    this.demographics = {
      age: 44,
      gender: 'male',
      height: 170,
      weight: 65,
      temperature: 99,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 70,
    };
    this.currentStep = 1;
    this.onDemographicsChange();
  }
}
