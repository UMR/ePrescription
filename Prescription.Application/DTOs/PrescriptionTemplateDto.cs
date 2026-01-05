namespace Prescription.Application.DTOs
{
    #region Disease DTOs

    /// <summary>
    /// DTO for disease template response
    /// </summary>
    public class DiseaseDto
    {
        public Guid Id { get; set; }
        public int SourceId { get; set; }
        public string Shortcut { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<DrugWithDosageDto> Drugs { get; set; } = new();
    }

    /// <summary>
    /// Request to create a new disease template
    /// </summary>
    public class CreateDiseaseRequest
    {
        public string Shortcut { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<DrugDosageInput> Drugs { get; set; } = new();
    }

    /// <summary>
    /// Request to update a disease template
    /// </summary>
    public class UpdateDiseaseRequest
    {
        public string? Shortcut { get; set; }
        public string? Name { get; set; }
        public List<DrugDosageInput>? Drugs { get; set; }
    }

    /// <summary>
    /// DTO for disease listing
    /// </summary>
    public class DiseaseListDto
    {
        public Guid Id { get; set; }
        public int SourceId { get; set; }
        public string Shortcut { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int DrugCount { get; set; }
    }

    #endregion

    #region Symptom DTOs

    /// <summary>
    /// DTO for symptom template response
    /// </summary>
    public class SymptomDto
    {
        public Guid Id { get; set; }
        public int SourceId { get; set; }
        public string Shortcut { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? FollowUp { get; set; }
        public List<ChiefComplaintDto> ChiefComplaints { get; set; } = new();
        public List<ExaminationDto> Examinations { get; set; } = new();
        public List<AdviceDto> Advices { get; set; } = new();
        public List<DrugWithDosageDto> Drugs { get; set; } = new();
        public List<ReportDto> Investigations { get; set; } = new();
    }

    /// <summary>
    /// Request to create a new symptom template
    /// </summary>
    public class CreateSymptomRequest
    {
        public string Shortcut { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? FollowUp { get; set; }
        public List<string> ChiefComplaints { get; set; } = new();
        public List<string> Examinations { get; set; } = new();
        public List<string> Advices { get; set; } = new();
        public List<DrugDosageInput> Drugs { get; set; } = new();
        public List<int> InvestigationOIDs { get; set; } = new();
    }

    /// <summary>
    /// Request to update a symptom template
    /// </summary>
    public class UpdateSymptomRequest
    {
        public string? Shortcut { get; set; }
        public string? Name { get; set; }
        public string? FollowUp { get; set; }
        public List<string>? ChiefComplaints { get; set; }
        public List<string>? Examinations { get; set; }
        public List<string>? Advices { get; set; }
        public List<DrugDosageInput>? Drugs { get; set; }
        public List<int>? InvestigationOIDs { get; set; }
    }

    /// <summary>
    /// DTO for symptom listing
    /// </summary>
    public class SymptomListDto
    {
        public Guid Id { get; set; }
        public int SourceId { get; set; }
        public string Shortcut { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int ChiefComplaintCount { get; set; }
        public int ExaminationCount { get; set; }
        public int AdviceCount { get; set; }
        public int DrugCount { get; set; }
        public int InvestigationCount { get; set; }
    }

    #endregion

    #region Drug DTOs

    /// <summary>
    /// DTO for drug/medication details
    /// </summary>
    public class DrugDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Form { get; set; }
        public string? BrandName { get; set; }
        public string? Strength { get; set; }
    }

    /// <summary>
    /// Drug listing DTO
    /// </summary>
    public class DrugListDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Form { get; set; }
        public string? BrandName { get; set; }
        public string? Strength { get; set; }
        public int DiseaseCount { get; set; }
        public int SymptomCount { get; set; }
    }

    /// <summary>
    /// DTO for drug with dosage instructions (used in template context)
    /// </summary>
    public class DrugWithDosageDto
    {
        public Guid Id { get; set; }
        public int SortOrder { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Form { get; set; }
        public string? BrandName { get; set; }
        public string? Strength { get; set; }
        public string? DosageInstructions { get; set; }
        public string? DosageInstructionsEnglish { get; set; }
    }

    /// <summary>
    /// Input for drug with dosage in template creation
    /// </summary>
    public class DrugDosageInput
    {
        public Guid? DrugId { get; set; }
        public string? Name { get; set; }
        public string? Form { get; set; }
        public string? BrandName { get; set; }
        public string? Strength { get; set; }
        public string? DosageInstructions { get; set; }
        public string? DosageInstructionsEnglish { get; set; }
        public int SortOrder { get; set; }
    }

    /// <summary>
    /// Request to create a new drug
    /// </summary>
    public class CreateDrugRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Form { get; set; }
        public string? BrandName { get; set; }
        public string? Strength { get; set; }
    }

    /// <summary>
    /// Request to update a drug
    /// </summary>
    public class UpdateDrugRequest
    {
        public string? Name { get; set; }
        public string? Form { get; set; }
        public string? BrandName { get; set; }
        public string? Strength { get; set; }
    }

    #endregion

    #region ChiefComplaint/Examination/Advice DTOs

    /// <summary>
    /// DTO for chief complaint
    /// </summary>
    public class ChiefComplaintDto
    {
        public Guid Id { get; set; }
        public int SortOrder { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Chief complaint listing DTO
    /// </summary>
    public class ChiefComplaintListDto
    {
        public Guid Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public int SymptomCount { get; set; }
    }

    /// <summary>
    /// Request to create a chief complaint
    /// </summary>
    public class CreateChiefComplaintRequest
    {
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request to update a chief complaint
    /// </summary>
    public class UpdateChiefComplaintRequest
    {
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO for examination finding
    /// </summary>
    public class ExaminationDto
    {
        public Guid Id { get; set; }
        public int SortOrder { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Examination listing DTO
    /// </summary>
    public class ExaminationListDto
    {
        public Guid Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public int SymptomCount { get; set; }
    }

    /// <summary>
    /// Request to create an examination
    /// </summary>
    public class CreateExaminationRequest
    {
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request to update an examination
    /// </summary>
    public class UpdateExaminationRequest
    {
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO for advice/instruction
    /// </summary>
    public class AdviceDto
    {
        public Guid Id { get; set; }
        public int SortOrder { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Advice listing DTO
    /// </summary>
    public class AdviceListDto
    {
        public Guid Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public int SymptomCount { get; set; }
    }

    /// <summary>
    /// Request to create an advice
    /// </summary>
    public class CreateAdviceRequest
    {
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request to update an advice
    /// </summary>
    public class UpdateAdviceRequest
    {
        public string Description { get; set; } = string.Empty;
    }

    #endregion

    #region Report DTOs

    /// <summary>
    /// DTO for report/investigation details
    /// </summary>
    public class ReportDto
    {
        public Guid Id { get; set; }
        public int OID { get; set; }
        public string Abbreviation { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? DefaultValue { get; set; }
        public string? NormalRange { get; set; }
        public decimal? Cost { get; set; }
        public int SortOrder { get; set; }
    }

    /// <summary>
    /// Report listing DTO
    /// </summary>
    public class ReportListDto
    {
        public Guid Id { get; set; }
        public int OID { get; set; }
        public string Abbreviation { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public decimal? Cost { get; set; }
        public int SymptomCount { get; set; }
    }

    /// <summary>
    /// Request to create a report/investigation
    /// </summary>
    public class CreateReportRequest
    {
        public int OID { get; set; }
        public string Abbreviation { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? DefaultValue { get; set; }
        public string? NormalRange { get; set; }
        public decimal? Cost { get; set; }
    }

    /// <summary>
    /// Request to update a report/investigation
    /// </summary>
    public class UpdateReportRequest
    {
        public string? Abbreviation { get; set; }
        public string? FullName { get; set; }
        public string? DefaultValue { get; set; }
        public string? NormalRange { get; set; }
        public decimal? Cost { get; set; }
    }

    #endregion

    #region Search/Pagination DTOs

    /// <summary>
    /// Generic search request
    /// </summary>
    public class SearchRequest
    {
        public string? SearchTerm { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>
    /// Template search request with type filter
    /// </summary>
    public class TemplateSearchRequest
    {
        public string? SearchTerm { get; set; }
        public string? Type { get; set; } // DIS, SYN
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    /// <summary>
    /// Paginated response
    /// </summary>
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    }

    #endregion

}
