// PDF Template Models

export interface DoctorInfo {
    name: string;
    nameBn?: string; // Bengali name
    degrees: string[];
    degreesBn?: string[]; // Bengali degrees
    specialization: string;
    specializationBn?: string;
    registrationNo: string;
    chamber: ChamberInfo;
    mobile: string;
    email?: string;
    logoUrl?: string;
}

export interface ChamberInfo {
    name: string;
    nameBn?: string;
    address: string;
    addressBn?: string;
    floor?: string;
    phone?: string;
    certifications?: string[];
    timings?: string;
    timingsBn?: string;
}

export interface PatientInfo {
    name: string;
    age: number;
    ageUnit?: 'years' | 'months' | 'days';
    gender: string;
    weight?: string;
    address?: string;
    patientId?: string;
    visitNo?: number;
    date: Date;
}

export interface VitalsInfo {
    weight?: string;
    height?: string;
    pulse?: string;
    bloodPressure?: string;
    temperature?: string;
    spo2?: string;
    bmi?: string;
}

export interface PrescriptionContent {
    chiefComplaints: string[];
    diagnosis: string[];
    medicalHistory?: string[];
    physicalExamination?: string[];
    investigations: string[];
    medications: PrescriptionMedication[];
    advice: string[];
    followUp?: string;
    nextVisitDate?: Date;
    referralComments?: string;
}

export interface PrescriptionMedication {
    serialNo: number;
    name: string;
    form?: string; // Tab, Cap, Syp, Inj
    strength?: string;
    dosage: string; // 1+0+1
    timing?: string; // Before/After meal
    duration: string;
    instructions?: string;
}

export interface PrescriptionPdfData {
    doctor: DoctorInfo;
    patient: PatientInfo;
    vitals?: VitalsInfo;
    content: PrescriptionContent;
    serialNo?: string;
    printedAt?: Date;
}

// Default doctor template (can be loaded from API later)
export const DEFAULT_DOCTOR_INFO: DoctorInfo = {
    name: 'Dr.',
    degrees: ['MBBS (RU)', 'BMDC A', 'MRCP (UK) (Final Part)', 'Trained in Neuromedicine (RCPE, UK)'],
    degreesBn: ['এমবিবিএস( আর ইউ), বিএমডিসি এ', 'এমআরসিপি( ইউকে) (ফাইনাল পার্ট)', 'ট্রেইন্ড ইন নিউরোমেডিসিন( রয়্যাল কলেজ অব ফিজিশিয়ানস অব এডিনবার্গ, ইউকে)'],
    specialization: 'Co-ordinator (Medical Programs), Global Professional Testing Centre & Lecturer (Biochemistry)',
    specializationBn: 'কোঅর্ডিনেটর( মেডিকেল প্রোগ্রামস), গ্লোবাল প্রফেশনাল টেস্টিং সেন্টার। প্রভাষক( বায়োকেমিস্ট্রি), ইন্টারন্যাশনাল মেডিকেল কলেজ, টঙ্গী, ঢাকা',
    registrationNo: '017',
    chamber: {
        name: 'Thyrocare Bangladesh Limited',
        nameBn: 'থাইরোকেয়ার বাংলাদেশ লিমিটেড',
        address: 'Confidence Center (Lift#12), H- 9/ Progoti Sarani/ Shahjadpur/ Gulshan/ Dhaka-1212',
        addressBn: 'কনফিডেন্স সেন্টার( লিফট#১২), হ- ৯/ প্রগতি সরনি/ শাহজাদপুর',
        certifications: ['CAP RECOGNIZED'],
        timings: 'Saturday - Wednesday (5 PM - 9 PM)',
        timingsBn: 'শনিবার - বুধবার( ৫ টা - ৯টা)'
    },
    mobile: '017'
};
