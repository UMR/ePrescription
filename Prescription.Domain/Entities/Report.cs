using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Medical investigation/test report entity
    /// Maps to the Report table (Main DB - Tests.csv)
    /// </summary>
    public class Report : BaseEntity
    {
        /// <summary>
        /// Original ID from the source data (InvID in CSV)
        /// </summary>
        public int OID { get; set; }

        /// <summary>
        /// Abbreviation/short code for the report
        /// </summary>
        public string Abbreviation { get; set; } = string.Empty;

        /// <summary>
        /// Full name of the investigation/test
        /// </summary>
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// Default value/format for the report
        /// </summary>
        public string? DefaultValue { get; set; }

        /// <summary>
        /// Normal range/reference values
        /// </summary>
        public string? NormalRange { get; set; }

        /// <summary>
        /// Cost of the investigation
        /// </summary>
        public decimal? Cost { get; set; }

        // Navigation properties
        public virtual ICollection<SymptomInvestigation> SymptomInvestigations { get; set; } = new List<SymptomInvestigation>();
    }
}
