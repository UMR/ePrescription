using System;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Junction table linking Symptom to Investigation (Report)
    /// </summary>
    public class SymptomInvestigation : BaseEntity
    {
        /// <summary>
        /// Foreign key to Symptom
        /// </summary>
        public Guid SymptomId { get; set; }

        /// <summary>
        /// Navigation property to Symptom
        /// </summary>
        public virtual Symptom Symptom { get; set; } = null!;

        /// <summary>
        /// Foreign key to Report (Investigation)
        /// </summary>
        public Guid ReportId { get; set; }

        /// <summary>
        /// Navigation property to Report
        /// </summary>
        public virtual Report Report { get; set; } = null!;

        /// <summary>
        /// Order/sequence
        /// </summary>
        public int SortOrder { get; set; }
    }
}
