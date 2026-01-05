using System;
using System.Collections.Generic;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Master table for symptoms (SYN templates)
    /// </summary>
    public class Symptom : BaseEntity
    {
        /// <summary>
        /// Original ID from source table
        /// </summary>
        public int SourceId { get; set; }

        /// <summary>
        /// Shortcut code (e.g., "SYNAcute abdomen", "SYNBA")
        /// </summary>
        public string Shortcut { get; set; } = string.Empty;

        /// <summary>
        /// Symptom name extracted from shortcut
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Chief complaints for this symptom template
        /// </summary>
        public virtual ICollection<SymptomChiefComplaint> SymptomChiefComplaints { get; set; } = new List<SymptomChiefComplaint>();

        /// <summary>
        /// Examinations for this symptom template
        /// </summary>
        public virtual ICollection<SymptomExamination> SymptomExaminations { get; set; } = new List<SymptomExamination>();

        /// <summary>
        /// Advices for this symptom template
        /// </summary>
        public virtual ICollection<SymptomAdvice> SymptomAdvices { get; set; } = new List<SymptomAdvice>();

        /// <summary>
        /// Drugs associated with this symptom template
        /// </summary>
        public virtual ICollection<SymptomDrug> SymptomDrugs { get; set; } = new List<SymptomDrug>();

        /// <summary>
        /// Investigations for this symptom template
        /// </summary>
        public virtual ICollection<SymptomInvestigation> SymptomInvestigations { get; set; } = new List<SymptomInvestigation>();

        /// <summary>
        /// Follow-up instructions
        /// </summary>
        public string? FollowUp { get; set; }
    }
}
