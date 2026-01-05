import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'templates',
        loadComponent: () => import('./eprescription-template/eprescription-template.component').then(m => m.EprescriptionTemplateComponent)
    },
    {
        path: 'clinical-bot',
        loadComponent: () => import('./clinical-bot/clinical-bot.component').then(m => m.ClinicalBotComponent)
    },
    {
        path: 'e-prescription',
        loadComponent: () => import('./e-prescription/e-prescription.component').then(m => m.EPrescriptionComponent)
    },
    {
        path: 'pdf-preview',
        loadComponent: () => import('./pdf-export/pdf-preview.component').then(m => m.PdfPreviewComponent)
    },
    {
        path: 'ocr',
        loadComponent: () => import('./ocr-bot/ocr-bot.component').then(m => m.OcrBotComponent)
    }
];
