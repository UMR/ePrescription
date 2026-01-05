import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { EPrescriptionComponent } from "./e-prescription/e-prescription.component";
import { ClinicalBotComponent } from "./clinical-bot/clinical-bot.component";


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, EPrescriptionComponent, ClinicalBotComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Prescription.Client';
  currentView: 'prescription' | 'template' | 'ocr' = 'prescription';
}
