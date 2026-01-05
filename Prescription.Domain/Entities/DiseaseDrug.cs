using System;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Junction table linking Disease to Drug with dosage instructions
    /// </summary>
    public class DiseaseDrug : BaseEntity
    {
        /// <summary>
        /// Foreign key to Disease
        /// </summary>
        public Guid DiseaseId { get; set; }

        /// <summary>
        /// Navigation property to Disease
        /// </summary>
        public virtual Disease Disease { get; set; } = null!;

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
