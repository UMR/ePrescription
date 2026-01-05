using System;
using System.Collections.Generic;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Master table for examination findings
    /// </summary>
    public class Examination : BaseEntity
    {
        /// <summary>
        /// Examination finding text
        /// </summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Symptom templates using this examination
        /// </summary>
        public virtual ICollection<SymptomExamination> SymptomExaminations { get; set; } = new List<SymptomExamination>();
    }
}
