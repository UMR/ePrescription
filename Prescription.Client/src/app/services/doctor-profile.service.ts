import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DoctorInfo, DEFAULT_DOCTOR_INFO } from '../models/pdf-template.model';

@Injectable({
    providedIn: 'root'
})
export class DoctorProfileService {
    private doctorProfile = new BehaviorSubject<DoctorInfo>(DEFAULT_DOCTOR_INFO);
    public doctorProfile$ = this.doctorProfile.asObservable();

    constructor() {
        // Load saved profile from localStorage if available
        this.loadSavedProfile();
    }

    private loadSavedProfile(): void {
        const saved = localStorage.getItem('doctorProfile');
        if (saved) {
            try {
                const profile = JSON.parse(saved);
                this.doctorProfile.next(profile);
            } catch (e) {
                console.error('Failed to load saved doctor profile:', e);
            }
        }
    }

    getDoctorProfile(): DoctorInfo {
        return this.doctorProfile.value;
    }

    updateDoctorProfile(profile: Partial<DoctorInfo>): void {
        const currentProfile = this.doctorProfile.value;
        const updatedProfile = { ...currentProfile, ...profile };
        this.doctorProfile.next(updatedProfile);
        this.saveProfile(updatedProfile);
    }

    setDoctorProfile(profile: DoctorInfo): void {
        this.doctorProfile.next(profile);
        this.saveProfile(profile);
    }

    private saveProfile(profile: DoctorInfo): void {
        try {
            localStorage.setItem('doctorProfile', JSON.stringify(profile));
        } catch (e) {
            console.error('Failed to save doctor profile:', e);
        }
    }

    resetToDefault(): void {
        this.doctorProfile.next(DEFAULT_DOCTOR_INFO);
        localStorage.removeItem('doctorProfile');
    }
}
