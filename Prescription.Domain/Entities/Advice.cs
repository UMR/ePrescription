using System;
using System.Collections.Generic;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Master table for advice/instructions
    /// </summary>
    public class Advice : BaseEntity
    {
        /// <summary>
        /// Advice text
        /// </summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Symptom templates using this advice
        /// </summary>
        public virtual ICollection<SymptomAdvice> SymptomAdvices { get; set; } = new List<SymptomAdvice>();
    }
}
