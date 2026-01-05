using System;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Junction table linking Symptom to ChiefComplaint
    /// </summary>
    public class SymptomChiefComplaint : BaseEntity
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
        /// Foreign key to ChiefComplaint
        /// </summary>
        public Guid ChiefComplaintId { get; set; }

        /// <summary>
        /// Navigation property to ChiefComplaint
        /// </summary>
        public virtual ChiefComplaint ChiefComplaint { get; set; } = null!;

        /// <summary>
        /// Order/sequence
        /// </summary>
        public int SortOrder { get; set; }
    }
}
