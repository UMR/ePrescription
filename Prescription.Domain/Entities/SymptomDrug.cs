using System;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Junction table linking Symptom to Drug with dosage instructions
    /// </summary>
    public class SymptomDrug : BaseEntity
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
        /// Foreign key to Drug
        /// </summary>
        public Guid DrugId { get; set; }

        /// <summary>
        /// Navigation property to Drug
        /// </summary>
        public virtual Drug Drug { get; set; } = null!;

        /// <summary>
        /// Order/sequence in the prescription
        /// </summary>
        public int SortOrder { get; set; }

        /// <summary>
        /// Dosage instructions in Bengali
        /// </summary>
        public string? DosageInstructions { get; set; }

        /// <summary>
        /// Dosage instructions in English
        /// </summary>
        public string? DosageInstructionsEnglish { get; set; }
    }
}
