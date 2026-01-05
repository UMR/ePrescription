import { Injectable } from '@angular/core';

export interface MedicationInfo {
    name: string;
    commonDosages: string[];
    commonFrequencies: string[];
    commonDurations: string[];
    defaultInstructions: string;
    category: string;
}

@Injectable({
    providedIn: 'root'
})
export class MedicationKnowledgeService {

    private medicationDatabase: Map<string, MedicationInfo> = new Map([
        // Antibiotics
        ['amoxicillin', {
            name: 'Amoxicillin',
            commonDosages: ['250mg', '500mg', '875mg'],
            commonFrequencies: ['1-1-1 (Three times daily)', '1-0-1 (Twice daily)'],
            commonDurations: ['7 days', '10 days', '14 days'],
            defaultInstructions: 'Take after meals',
            category: 'Antibiotic'
        }],
        ['azithromycin', {
            name: 'Azithromycin',
            commonDosages: ['250mg', '500mg'],
            commonFrequencies: ['1-0-0 (Once daily)'],
            commonDurations: ['3 days', '5 days'],
            defaultInstructions: 'Take before or after meals',
            category: 'Antibiotic'
        }],
        ['ciprofloxacin', {
            name: 'Ciprofloxacin',
            commonDosages: ['250mg', '500mg', '750mg'],
            commonFrequencies: ['1-0-1 (Twice daily)'],
            commonDurations: ['7 days', '10 days', '14 days'],
            defaultInstructions: 'Take with plenty of water',
            category: 'Antibiotic'
        }],
        ['cefixime', {
            name: 'Cefixime',
            commonDosages: ['200mg', '400mg'],
            commonFrequencies: ['1-0-1 (Twice daily)', '1-0-0 (Once daily)'],
            commonDurations: ['5 days', '7 days', '10 days'],
            defaultInstructions: 'Take after meals',
            category: 'Antibiotic'
        }],

        // Pain & Fever
        ['paracetamol', {
            name: 'Paracetamol',
            commonDosages: ['500mg', '650mg', '1000mg'],
            commonFrequencies: ['1-1-1 (Three times daily)', '1-0-1 (Twice daily)', 'SOS (As needed)'],
            commonDurations: ['3 days', '5 days', '7 days'],
            defaultInstructions: 'Take after meals, max 4g/day',
            category: 'Analgesic/Antipyretic'
        }],
        ['ibuprofen', {
            name: 'Ibuprofen',
            commonDosages: ['200mg', '400mg', '600mg'],
            commonFrequencies: ['1-1-1 (Three times daily)', '1-0-1 (Twice daily)', 'SOS'],
            commonDurations: ['3 days', '5 days', '7 days'],
            defaultInstructions: 'Take after meals',
            category: 'NSAID'
        }],

        // Antacids & GI
        ['omeprazole', {
            name: 'Omeprazole',
            commonDosages: ['20mg', '40mg'],
            commonFrequencies: ['1-0-0 (Once daily)', '1-0-1 (Twice daily)'],
            commonDurations: ['14 days', '30 days', '60 days'],
            defaultInstructions: 'Take before breakfast',
            category: 'PPI'
        }],
        ['pantoprazole', {
            name: 'Pantoprazole',
            commonDosages: ['20mg', '40mg'],
            commonFrequencies: ['1-0-0 (Once daily)', '1-0-1 (Twice daily)'],
            commonDurations: ['14 days', '30 days', '60 days'],
            defaultInstructions: 'Take before breakfast',
            category: 'PPI'
        }],
        ['ranitidine', {
            name: 'Ranitidine',
            commonDosages: ['150mg', '300mg'],
            commonFrequencies: ['1-0-1 (Twice daily)', '0-0-1 (Once at night)'],
            commonDurations: ['14 days', '30 days'],
            defaultInstructions: 'Take after meals',
            category: 'H2 Blocker'
        }],

        // Antihistamines
        ['cetirizine', {
            name: 'Cetirizine',
            commonDosages: ['5mg', '10mg'],
            commonFrequencies: ['0-0-1 (Once at night)', '1-0-0 (Once daily)'],
            commonDurations: ['5 days', '7 days', '14 days'],
            defaultInstructions: 'May cause drowsiness',
            category: 'Antihistamine'
        }],
        ['loratadine', {
            name: 'Loratadine',
            commonDosages: ['10mg'],
            commonFrequencies: ['1-0-0 (Once daily)'],
            commonDurations: ['5 days', '7 days', '14 days'],
            defaultInstructions: 'Non-drowsy formulation',
            category: 'Antihistamine'
        }],

        // Antidiabetic
        ['metformin', {
            name: 'Metformin',
            commonDosages: ['500mg', '850mg', '1000mg'],
            commonFrequencies: ['1-0-1 (Twice daily)', '1-1-1 (Three times daily)'],
            commonDurations: ['30 days', '60 days', '90 days'],
            defaultInstructions: 'Take with or after meals',
            category: 'Antidiabetic'
        }],

        // Antihypertensive
        ['amlodipine', {
            name: 'Amlodipine',
            commonDosages: ['2.5mg', '5mg', '10mg'],
            commonFrequencies: ['1-0-0 (Once daily)'],
            commonDurations: ['30 days', '60 days', '90 days'],
            defaultInstructions: 'Take at same time daily',
            category: 'Antihypertensive'
        }],
        ['enalapril', {
            name: 'Enalapril',
            commonDosages: ['2.5mg', '5mg', '10mg', '20mg'],
            commonFrequencies: ['1-0-0 (Once daily)', '1-0-1 (Twice daily)'],
            commonDurations: ['30 days', '60 days', '90 days'],
            defaultInstructions: 'Take with or without food',
            category: 'ACE Inhibitor'
        }],

        // Vitamins & Supplements
        ['vitamin d', {
            name: 'Vitamin D',
            commonDosages: ['1000 IU', '2000 IU', '60000 IU'],
            commonFrequencies: ['1-0-0 (Once daily)', 'Once weekly (60000 IU)'],
            commonDurations: ['30 days', '60 days', '90 days'],
            defaultInstructions: 'Take with meals for better absorption',
            category: 'Vitamin'
        }],
        ['calcium', {
            name: 'Calcium',
            commonDosages: ['500mg', '600mg', '1000mg'],
            commonFrequencies: ['0-0-1 (Once at night)', '1-0-1 (Twice daily)'],
            commonDurations: ['30 days', '60 days', '90 days'],
            defaultInstructions: 'Take at night for better absorption',
            category: 'Supplement'
        }],

        // Cough & Cold
        ['dextromethorphan', {
            name: 'Dextromethorphan',
            commonDosages: ['10mg', '15mg', '30mg'],
            commonFrequencies: ['1-1-1 (Three times daily)', 'SOS'],
            commonDurations: ['3 days', '5 days', '7 days'],
            defaultInstructions: 'Take after meals',
            category: 'Cough Suppressant'
        }],
        ['montelukast', {
            name: 'Montelukast',
            commonDosages: ['4mg', '5mg', '10mg'],
            commonFrequencies: ['0-0-1 (Once at night)'],
            commonDurations: ['14 days', '30 days', '60 days'],
            defaultInstructions: 'Take at bedtime',
            category: 'Leukotriene Inhibitor'
        }]
    ]);

    constructor() { }

    getMedicationInfo(medicineName: string): MedicationInfo | null {
        if (!medicineName) return null;

        const searchTerm = medicineName.toLowerCase().trim();
        if (this.medicationDatabase.has(searchTerm)) {
            return this.medicationDatabase.get(searchTerm)!;
        }
        for (const [key, value] of this.medicationDatabase.entries()) {
            if (key.includes(searchTerm) || searchTerm.includes(key)) {
                return value;
            }
        }

        return null;
    }

    getAllMedicationNames(): string[] {
        return Array.from(this.medicationDatabase.values()).map(med => med.name);
    }

    getMedicationsByCategory(category: string): MedicationInfo[] {
        return Array.from(this.medicationDatabase.values())
            .filter(med => med.category.toLowerCase() === category.toLowerCase());
    }
    getAllCategories(): string[] {
        const categories = new Set<string>();
        this.medicationDatabase.forEach(med => categories.add(med.category));
        return Array.from(categories);
    }

    searchMedications(query: string): MedicationInfo[] {
        if (!query) return [];

        const searchTerm = query.toLowerCase().trim();
        return Array.from(this.medicationDatabase.values())
            .filter(med => med.name.toLowerCase().includes(searchTerm));
    }
}
