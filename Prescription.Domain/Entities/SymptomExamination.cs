using System;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Junction table linking Symptom to Examination
    /// </summary>
    public class SymptomExamination : BaseEntity
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
        /// Foreign key to Examination
        /// </summary>
        public Guid ExaminationId { get; set; }

        /// <summary>
        /// Navigation property to Examination
        /// </summary>
        public virtual Examination Examination { get; set; } = null!;

        /// <summary>
        /// Order/sequence
        /// </summary>
        public int SortOrder { get; set; }
    }
}
