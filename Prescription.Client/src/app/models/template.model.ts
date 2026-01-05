// ============== Response DTOs ==============

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// Disease DTOs
export interface DiseaseDto {
    id: string;
    sourceId: number;
    shortcut: string;
    name: string;
    drugs: DrugWithDosageDto[];
}

export interface DiseaseListDto {
    id: string;
    sourceId: number;
    shortcut: string;
    name: string;
    drugCount: number;
}

// Symptom DTOs
export interface SymptomDto {
    id: string;
    sourceId: number;
    shortcut: string;
    name: string;
    followUp?: string;
    chiefComplaints: ChiefComplaintDto[];
    examinations: ExaminationDto[];
    advices: AdviceDto[];
    drugs: DrugWithDosageDto[];
    investigations: ReportDto[];
}

export interface SymptomListDto {
    id: string;
    sourceId: number;
    shortcut: string;
    name: string;
    chiefComplaintCount: number;
    examinationCount: number;
    adviceCount: number;
    drugCount: number;
    investigationCount: number;
}

// Drug DTOs
export interface DrugDto {
    id: string;
    name: string;
    form?: string;
    brandName?: string;
    strength?: string;
}

export interface DrugListDto {
    id: string;
    name: string;
    form?: string;
    brandName?: string;
    strength?: string;
    diseaseCount: number;
    symptomCount: number;
}

export interface DrugWithDosageDto {
    id: string;
    sortOrder: number;
    name: string;
    form?: string;
    brandName?: string;
    strength?: string;
    dosageInstructions?: string;
    dosageInstructionsEnglish?: string;
}

// Chief Complaint DTOs
export interface ChiefComplaintDto {
    id: string;
    sortOrder: number;
    description: string;
}

export interface ChiefComplaintListDto {
    id: string;
    description: string;
    symptomCount: number;
}

// Examination DTOs
export interface ExaminationDto {
    id: string;
    sortOrder: number;
    description: string;
}

export interface ExaminationListDto {
    id: string;
    description: string;
    symptomCount: number;
}

// Advice DTOs
export interface AdviceDto {
    id: string;
    sortOrder: number;
    description: string;
}

export interface AdviceListDto {
    id: string;
    description: string;
    symptomCount: number;
}

// Report DTOs
export interface ReportDto {
    id: string;
    oid: number;
    abbreviation: string;
    fullName: string;
    defaultValue?: string;
    normalRange?: string;
    cost?: number;
    sortOrder: number;
}

export interface ReportListDto {
    id: string;
    oid: number;
    abbreviation: string;
    fullName: string;
    cost?: number;
    symptomCount: number;
}

// ============== Request DTOs ==============

export interface CreateDiseaseRequest {
    shortcut: string;
    name: string;
    drugs: DrugDosageInput[];
}

export interface UpdateDiseaseRequest {
    shortcut?: string;
    name?: string;
    drugs?: DrugDosageInput[];
}

export interface CreateSymptomRequest {
    shortcut: string;
    name: string;
    followUp?: string;
    chiefComplaints: string[];
    examinations: string[];
    advices: string[];
    drugs: DrugDosageInput[];
    investigationOIDs: number[];
}

export interface UpdateSymptomRequest {
    shortcut?: string;
    name?: string;
    followUp?: string;
    chiefComplaints?: string[];
    examinations?: string[];
    advices?: string[];
    drugs?: DrugDosageInput[];
    investigationOIDs?: number[];
}

export interface DrugDosageInput {
    drugId?: string;
    name?: string;
    form?: string;
    brandName?: string;
    strength?: string;
    dosageInstructions?: string;
    dosageInstructionsEnglish?: string;
    sortOrder: number;
}

export interface CreateDrugRequest {
    name: string;
    form?: string;
    brandName?: string;
    strength?: string;
}

export interface UpdateDrugRequest {
    name?: string;
    form?: string;
    brandName?: string;
    strength?: string;
}

export interface CreateChiefComplaintRequest {
    description: string;
}

export interface UpdateChiefComplaintRequest {
    description: string;
}

export interface CreateExaminationRequest {
    description: string;
}

export interface UpdateExaminationRequest {
    description: string;
}

export interface CreateAdviceRequest {
    description: string;
}

export interface UpdateAdviceRequest {
    description: string;
}

export interface CreateReportRequest {
    oid: number;
    abbreviation: string;
    fullName: string;
    defaultValue?: string;
    normalRange?: string;
    cost?: number;
}

export interface UpdateReportRequest {
    abbreviation?: string;
    fullName?: string;
    defaultValue?: string;
    normalRange?: string;
    cost?: number;
}

// ============== UI Helper Types ==============

export type TemplateType = 'disease' | 'symptom';
export type SectionType = 'drugs' | 'chief-complaints' | 'examinations' | 'advices' | 'reports';

export interface TabItem {
    id: string;
    label: string;
    icon: string;
}

export interface AutocompleteItem {
    id: string;
    name: string;
    displayText: string;
    subText?: string;
    data?: any;
}
