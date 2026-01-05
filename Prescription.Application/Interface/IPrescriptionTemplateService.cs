using Prescription.Application.DTOs;

namespace Prescription.Application.Interface
{
    /// <summary>
    /// Service interface for managing prescription templates with normalized structure
    /// </summary>
    public interface IPrescriptionTemplateService
    {
        #region Import Operations

        /// <summary>
        /// Import templates from source table (Chacha_Prescription_Template_Master)
        /// and reports from Report table, then split into normalized tables
        /// </summary>
        Task<ImportTemplatesResult> ImportFromSourceTableAsync(ImportTemplatesRequest request, CancellationToken cancellationToken = default);

        #endregion

        #region Disease CRUD

        /// <summary>
        /// Search diseases by shortcut or name
        /// </summary>
        Task<PagedResult<DiseaseListDto>> SearchDiseasesAsync(SearchRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get disease by ID with full details including drugs
        /// </summary>
        Task<DiseaseDto?> GetDiseaseByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get disease by shortcut name
        /// </summary>
        Task<DiseaseDto?> GetDiseaseByShortcutAsync(string shortcut, CancellationToken cancellationToken = default);

        /// <summary>
        /// Create a new disease template
        /// </summary>
        Task<DiseaseDto> CreateDiseaseAsync(CreateDiseaseRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update a disease template
        /// </summary>
        Task<DiseaseDto?> UpdateDiseaseAsync(Guid id, UpdateDiseaseRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete a disease template (soft delete)
        /// </summary>
        Task<bool> DeleteDiseaseAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion

        #region Symptom CRUD

        /// <summary>
        /// Search symptoms by shortcut or name
        /// </summary>
        Task<PagedResult<SymptomListDto>> SearchSymptomsAsync(SearchRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get symptom by ID with full details
        /// </summary>
        Task<SymptomDto?> GetSymptomByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get symptom by shortcut name
        /// </summary>
        Task<SymptomDto?> GetSymptomByShortcutAsync(string shortcut, CancellationToken cancellationToken = default);

        /// <summary>
        /// Create a new symptom template
        /// </summary>
        Task<SymptomDto> CreateSymptomAsync(CreateSymptomRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update a symptom template
        /// </summary>
        Task<SymptomDto?> UpdateSymptomAsync(Guid id, UpdateSymptomRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete a symptom template (soft delete)
        /// </summary>
        Task<bool> DeleteSymptomAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion

        #region Drug Section Search & CRUD

        /// <summary>
        /// Search drugs by name or brand
        /// </summary>
        Task<PagedResult<DrugListDto>> SearchDrugsAsync(SearchRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get drug by ID
        /// </summary>
        Task<DrugDto?> GetDrugByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Create a new drug
        /// </summary>
        Task<DrugDto> CreateDrugAsync(CreateDrugRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update a drug
        /// </summary>
        Task<DrugDto?> UpdateDrugAsync(Guid id, UpdateDrugRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete a drug (soft delete)
        /// </summary>
        Task<bool> DeleteDrugAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion

        #region Chief Complaint Section Search & CRUD

        /// <summary>
        /// Search chief complaints by description
        /// </summary>
        Task<PagedResult<ChiefComplaintListDto>> SearchChiefComplaintsAsync(SearchRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get chief complaint by ID
        /// </summary>
        Task<ChiefComplaintDto?> GetChiefComplaintByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Create a new chief complaint
        /// </summary>
        Task<ChiefComplaintDto> CreateChiefComplaintAsync(CreateChiefComplaintRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update a chief complaint
        /// </summary>
        Task<ChiefComplaintDto?> UpdateChiefComplaintAsync(Guid id, UpdateChiefComplaintRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete a chief complaint (soft delete)
        /// </summary>
        Task<bool> DeleteChiefComplaintAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion

        #region Examination Section Search & CRUD

        /// <summary>
        /// Search examinations by description
        /// </summary>
        Task<PagedResult<ExaminationListDto>> SearchExaminationsAsync(SearchRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get examination by ID
        /// </summary>
        Task<ExaminationDto?> GetExaminationByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Create a new examination
        /// </summary>
        Task<ExaminationDto> CreateExaminationAsync(CreateExaminationRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update an examination
        /// </summary>
        Task<ExaminationDto?> UpdateExaminationAsync(Guid id, UpdateExaminationRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete an examination (soft delete)
        /// </summary>
        Task<bool> DeleteExaminationAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion

        #region Advice Section Search & CRUD

        /// <summary>
        /// Search advices by description
        /// </summary>
        Task<PagedResult<AdviceListDto>> SearchAdvicesAsync(SearchRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get advice by ID
        /// </summary>
        Task<AdviceDto?> GetAdviceByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Create a new advice
        /// </summary>
        Task<AdviceDto> CreateAdviceAsync(CreateAdviceRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update an advice
        /// </summary>
        Task<AdviceDto?> UpdateAdviceAsync(Guid id, UpdateAdviceRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete an advice (soft delete)
        /// </summary>
        Task<bool> DeleteAdviceAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion

        #region Report/Investigation Section Search & CRUD

        /// <summary>
        /// Search reports/investigations
        /// </summary>
        Task<PagedResult<ReportListDto>> SearchReportsAsync(SearchRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get all reports
        /// </summary>
        Task<List<ReportDto>> GetAllReportsAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Get report by OID
        /// </summary>
        Task<ReportDto?> GetReportByOIDAsync(int oid, CancellationToken cancellationToken = default);

        /// <summary>
        /// Get report by ID
        /// </summary>
        Task<ReportDto?> GetReportByIdAsync(Guid id, CancellationToken cancellationToken = default);

        /// <summary>
        /// Create a new report
        /// </summary>
        Task<ReportDto> CreateReportAsync(CreateReportRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Update a report
        /// </summary>
        Task<ReportDto?> UpdateReportAsync(Guid id, UpdateReportRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Delete a report (soft delete)
        /// </summary>
        Task<bool> DeleteReportAsync(Guid id, CancellationToken cancellationToken = default);

        #endregion
    }
}
