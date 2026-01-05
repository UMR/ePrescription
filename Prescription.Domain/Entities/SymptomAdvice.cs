using System;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Junction table linking Symptom to Advice
    /// </summary>
    public class SymptomAdvice : BaseEntity
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
        /// Foreign key to Advice
        /// </summary>
        public Guid AdviceId { get; set; }

        /// <summary>
        /// Navigation property to Advice
        /// </summary>
        public virtual Advice Advice { get; set; } = null!;

        /// <summary>
        /// Order/sequence
        /// </summary>
        public int SortOrder { get; set; }
    }
}
