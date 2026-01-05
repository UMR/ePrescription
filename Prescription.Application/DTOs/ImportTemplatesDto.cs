namespace Prescription.Application.DTOs
{
    /// <summary>
    /// Request for importing templates from the source table
    /// </summary>
    public class ImportTemplatesRequest
    {
        /// <summary>
        /// Whether to clear existing data before import
        /// </summary>
        public bool ClearExisting { get; set; } = false;
    }

    /// <summary>
    /// Result of template import operation
    /// </summary>
    public class ImportTemplatesResult
    {
        public bool Success { get; set; }
        public int ReportsImported { get; set; }
        public int DiseasesImported { get; set; }
        public int SymptomsImported { get; set; }
        public int DrugsImported { get; set; }
        public int ChiefComplaintsImported { get; set; }
        public int ExaminationsImported { get; set; }
        public int AdvicesImported { get; set; }
        public int DiseaseDrugLinksCreated { get; set; }
        public int SymptomDrugLinksCreated { get; set; }
        public int SymptomChiefComplaintLinksCreated { get; set; }
        public int SymptomExaminationLinksCreated { get; set; }
        public int SymptomAdviceLinksCreated { get; set; }
        public int SymptomInvestigationLinksCreated { get; set; }
        public int InvestigationOIDsNotFound { get; set; }
        public List<string> Errors { get; set; } = new();
        public TimeSpan Duration { get; set; }
    }

    /// <summary>
    /// Raw template record from Chacha_Prescription_Template_Master
    /// </summary>
    public class RawTemplateRecord
    {
        public int Id { get; set; }
        public string Disease { get; set; } = string.Empty;
        public string Treatment { get; set; } = string.Empty;
    }

    /// <summary>
    /// Parsed template data ready for entity creation
    /// </summary>
    public class ParsedTemplateData
    {
        public int SourceId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Shortcut { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        // For SYN templates
        public List<string> ChiefComplaints { get; set; } = new();
        public List<string> Examinations { get; set; } = new();
        public List<string> Advices { get; set; } = new();
        public string? FollowUp { get; set; }

        // Common
        public List<ParsedMedication> Medications { get; set; } = new();
        public List<int> InvestigationOIDs { get; set; } = new();
    }

    /// <summary>
    /// Parsed medication data
    /// </summary>
    public class ParsedMedication
    {
        public int Order { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Form { get; set; }
        public string? BrandName { get; set; }
        public string? Strength { get; set; }
        public string? DosageInstruction { get; set; }
        public string? DosageInstructionEnglish { get; set; }
        public string RawText { get; set; } = string.Empty;
    }
}
