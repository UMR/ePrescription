import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
    PagedResult,
    DiseaseDto, DiseaseListDto, CreateDiseaseRequest, UpdateDiseaseRequest,
    SymptomDto, SymptomListDto, CreateSymptomRequest, UpdateSymptomRequest,
    DrugDto, DrugListDto, CreateDrugRequest, UpdateDrugRequest,
    ChiefComplaintDto, ChiefComplaintListDto, CreateChiefComplaintRequest, UpdateChiefComplaintRequest,
    ExaminationDto, ExaminationListDto, CreateExaminationRequest, UpdateExaminationRequest,
    AdviceDto, AdviceListDto, CreateAdviceRequest, UpdateAdviceRequest,
    ReportDto, ReportListDto, CreateReportRequest, UpdateReportRequest,
    AutocompleteItem
} from '../models/template.model';

@Injectable({
    providedIn: 'root'
})
export class TemplateService {
    private apiUrl = `${environment.apiUrl}/Templates`;

    constructor(private http: HttpClient) { }

    // ============== Autocomplete Search (for real-time suggestions) ==============

    searchDrugsAutocomplete(term: string): Observable<AutocompleteItem[]> {
        if (!term || term.length < 1) return of([]);
        return this.http.get<PagedResult<DrugListDto>>(`${this.apiUrl}/drugs`, {
            params: new HttpParams().set('searchTerm', term).set('pageSize', '10')
        }).pipe(
            switchMap(result => of(result.items.map(d => ({
                id: d.id,
                name: d.name,
                displayText: `${d.name}${d.form ? ' (' + d.form + ')' : ''}${d.strength ? ' ' + d.strength : ''}`,
                subText: d.brandName || undefined,
                data: d
            })))),
            catchError(() => of([]))
        );
    }

    searchChiefComplaintsAutocomplete(term: string): Observable<AutocompleteItem[]> {
        if (!term || term.length < 1) return of([]);
        return this.http.get<PagedResult<ChiefComplaintListDto>>(`${this.apiUrl}/chief-complaints`, {
            params: new HttpParams().set('searchTerm', term).set('pageSize', '10')
        }).pipe(
            switchMap(result => of(result.items.map(c => ({
                id: c.id,
                name: c.description,
                displayText: c.description,
                data: c
            })))),
            catchError(() => of([]))
        );
    }

    searchExaminationsAutocomplete(term: string): Observable<AutocompleteItem[]> {
        if (!term || term.length < 1) return of([]);
        return this.http.get<PagedResult<ExaminationListDto>>(`${this.apiUrl}/examinations`, {
            params: new HttpParams().set('searchTerm', term).set('pageSize', '10')
        }).pipe(
            switchMap(result => of(result.items.map(e => ({
                id: e.id,
                name: e.description,
                displayText: e.description,
                data: e
            })))),
            catchError(() => of([]))
        );
    }

    searchAdvicesAutocomplete(term: string): Observable<AutocompleteItem[]> {
        if (!term || term.length < 1) return of([]);
        return this.http.get<PagedResult<AdviceListDto>>(`${this.apiUrl}/advices`, {
            params: new HttpParams().set('searchTerm', term).set('pageSize', '10')
        }).pipe(
            switchMap(result => of(result.items.map(a => ({
                id: a.id,
                name: a.description,
                displayText: a.description,
                data: a
            })))),
            catchError(() => of([]))
        );
    }

    searchReportsAutocomplete(term: string): Observable<AutocompleteItem[]> {
        if (!term || term.length < 1) return of([]);
        return this.http.get<PagedResult<ReportListDto>>(`${this.apiUrl}/reports`, {
            params: new HttpParams().set('searchTerm', term).set('pageSize', '10')
        }).pipe(
            switchMap(result => of(result.items.map(r => ({
                id: r.id,
                name: r.fullName,
                displayText: `${r.abbreviation} - ${r.fullName}`,
                subText: r.cost ? `৳${r.cost}` : undefined,
                data: r
            })))),
            catchError(() => of([]))
        );
    }

    searchDiseasesAutocomplete(term: string): Observable<AutocompleteItem[]> {
        if (!term || term.length < 1) return of([]);
        return this.http.get<PagedResult<DiseaseListDto>>(`${this.apiUrl}/disease`, {
            params: new HttpParams().set('searchTerm', term).set('pageSize', '10')
        }).pipe(
            switchMap(result => of(result.items.map(d => ({
                id: d.id,
                name: d.name,
                displayText: `${d.shortcut} - ${d.name}`,
                subText: `${d.drugCount} drugs`,
                data: d
            })))),
            catchError(() => of([]))
        );
    }

    searchSymptomsAutocomplete(term: string): Observable<AutocompleteItem[]> {
        if (!term || term.length < 1) return of([]);
        return this.http.get<PagedResult<SymptomListDto>>(`${this.apiUrl}/symptom`, {
            params: new HttpParams().set('searchTerm', term).set('pageSize', '10')
        }).pipe(
            switchMap(result => of(result.items.map(s => ({
                id: s.id,
                name: s.name,
                displayText: `${s.shortcut} - ${s.name}`,
                subText: `${s.drugCount} drugs, ${s.chiefComplaintCount} CC`,
                data: s
            })))),
            catchError(() => of([]))
        );
    }

    // ============== Disease Operations ==============

    searchDiseases(searchTerm?: string, page: number = 1, pageSize: number = 20): Observable<PagedResult<DiseaseListDto>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());
        if (searchTerm) params = params.set('searchTerm', searchTerm);
        return this.http.get<PagedResult<DiseaseListDto>>(`${this.apiUrl}/disease`, { params });
    }

    getDiseaseById(id: string): Observable<DiseaseDto> {
        return this.http.get<DiseaseDto>(`${this.apiUrl}/disease/${id}`);
    }

    getDiseaseByShortcut(shortcut: string): Observable<DiseaseDto> {
        return this.http.get<DiseaseDto>(`${this.apiUrl}/disease/shortcut/${shortcut}`);
    }

    createDisease(request: CreateDiseaseRequest): Observable<DiseaseDto> {
        return this.http.post<DiseaseDto>(`${this.apiUrl}/disease`, request);
    }

    updateDisease(id: string, request: UpdateDiseaseRequest): Observable<DiseaseDto> {
        return this.http.put<DiseaseDto>(`${this.apiUrl}/disease/${id}`, request);
    }

    deleteDisease(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/disease/${id}`);
    }

    // ============== Symptom Operations ==============

    searchSymptoms(searchTerm?: string, page: number = 1, pageSize: number = 20): Observable<PagedResult<SymptomListDto>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());
        if (searchTerm) params = params.set('searchTerm', searchTerm);
        return this.http.get<PagedResult<SymptomListDto>>(`${this.apiUrl}/symptom`, { params });
    }

    getSymptomById(id: string): Observable<SymptomDto> {
        return this.http.get<SymptomDto>(`${this.apiUrl}/symptom/${id}`);
    }

    getSymptomByShortcut(shortcut: string): Observable<SymptomDto> {
        return this.http.get<SymptomDto>(`${this.apiUrl}/symptom/shortcut/${shortcut}`);
    }

    createSymptom(request: CreateSymptomRequest): Observable<SymptomDto> {
        return this.http.post<SymptomDto>(`${this.apiUrl}/symptom`, request);
    }

    updateSymptom(id: string, request: UpdateSymptomRequest): Observable<SymptomDto> {
        return this.http.put<SymptomDto>(`${this.apiUrl}/symptom/${id}`, request);
    }

    deleteSymptom(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/symptom/${id}`);
    }

    // ============== Drug Operations ==============

    searchDrugs(searchTerm?: string, page: number = 1, pageSize: number = 20): Observable<PagedResult<DrugListDto>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());
        if (searchTerm) params = params.set('searchTerm', searchTerm);
        return this.http.get<PagedResult<DrugListDto>>(`${this.apiUrl}/drugs`, { params });
    }

    getDrugById(id: string): Observable<DrugDto> {
        return this.http.get<DrugDto>(`${this.apiUrl}/drugs/${id}`);
    }

    createDrug(request: CreateDrugRequest): Observable<DrugDto> {
        return this.http.post<DrugDto>(`${this.apiUrl}/drugs`, request);
    }

    updateDrug(id: string, request: UpdateDrugRequest): Observable<DrugDto> {
        return this.http.put<DrugDto>(`${this.apiUrl}/drugs/${id}`, request);
    }

    deleteDrug(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/drugs/${id}`);
    }

    // ============== Chief Complaint Operations ==============

    searchChiefComplaints(searchTerm?: string, page: number = 1, pageSize: number = 20): Observable<PagedResult<ChiefComplaintListDto>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());
        if (searchTerm) params = params.set('searchTerm', searchTerm);
        return this.http.get<PagedResult<ChiefComplaintListDto>>(`${this.apiUrl}/chief-complaints`, { params });
    }

    getChiefComplaintById(id: string): Observable<ChiefComplaintDto> {
        return this.http.get<ChiefComplaintDto>(`${this.apiUrl}/chief-complaints/${id}`);
    }

    createChiefComplaint(request: CreateChiefComplaintRequest): Observable<ChiefComplaintDto> {
        return this.http.post<ChiefComplaintDto>(`${this.apiUrl}/chief-complaints`, request);
    }

    updateChiefComplaint(id: string, request: UpdateChiefComplaintRequest): Observable<ChiefComplaintDto> {
        return this.http.put<ChiefComplaintDto>(`${this.apiUrl}/chief-complaints/${id}`, request);
    }

    deleteChiefComplaint(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/chief-complaints/${id}`);
    }

    // ============== Examination Operations ==============

    searchExaminations(searchTerm?: string, page: number = 1, pageSize: number = 20): Observable<PagedResult<ExaminationListDto>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());
        if (searchTerm) params = params.set('searchTerm', searchTerm);
        return this.http.get<PagedResult<ExaminationListDto>>(`${this.apiUrl}/examinations`, { params });
    }

    getExaminationById(id: string): Observable<ExaminationDto> {
        return this.http.get<ExaminationDto>(`${this.apiUrl}/examinations/${id}`);
    }

    createExamination(request: CreateExaminationRequest): Observable<ExaminationDto> {
        return this.http.post<ExaminationDto>(`${this.apiUrl}/examinations`, request);
    }

    updateExamination(id: string, request: UpdateExaminationRequest): Observable<ExaminationDto> {
        return this.http.put<ExaminationDto>(`${this.apiUrl}/examinations/${id}`, request);
    }

    deleteExamination(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/examinations/${id}`);
    }

    // ============== Advice Operations ==============

    searchAdvices(searchTerm?: string, page: number = 1, pageSize: number = 20): Observable<PagedResult<AdviceListDto>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());
        if (searchTerm) params = params.set('searchTerm', searchTerm);
        return this.http.get<PagedResult<AdviceListDto>>(`${this.apiUrl}/advices`, { params });
    }

    getAdviceById(id: string): Observable<AdviceDto> {
        return this.http.get<AdviceDto>(`${this.apiUrl}/advices/${id}`);
    }

    createAdvice(request: CreateAdviceRequest): Observable<AdviceDto> {
        return this.http.post<AdviceDto>(`${this.apiUrl}/advices`, request);
    }

    updateAdvice(id: string, request: UpdateAdviceRequest): Observable<AdviceDto> {
        return this.http.put<AdviceDto>(`${this.apiUrl}/advices/${id}`, request);
    }

    deleteAdvice(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/advices/${id}`);
    }

    // ============== Report/Investigation Operations ==============

    searchReports(searchTerm?: string, page: number = 1, pageSize: number = 20): Observable<PagedResult<ReportListDto>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', pageSize.toString());
        if (searchTerm) params = params.set('searchTerm', searchTerm);
        return this.http.get<PagedResult<ReportListDto>>(`${this.apiUrl}/reports`, { params });
    }

    getAllReports(): Observable<ReportDto[]> {
        return this.http.get<ReportDto[]>(`${this.apiUrl}/reports/all`);
    }

    getReportById(id: string): Observable<ReportDto> {
        return this.http.get<ReportDto>(`${this.apiUrl}/reports/${id}`);
    }

    getReportByOID(oid: number): Observable<ReportDto> {
        return this.http.get<ReportDto>(`${this.apiUrl}/reports/oid/${oid}`);
    }

    createReport(request: CreateReportRequest): Observable<ReportDto> {
        return this.http.post<ReportDto>(`${this.apiUrl}/reports`, request);
    }

    updateReport(id: string, request: UpdateReportRequest): Observable<ReportDto> {
        return this.http.put<ReportDto>(`${this.apiUrl}/reports/${id}`, request);
    }

    deleteReport(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/reports/${id}`);
    }
}
