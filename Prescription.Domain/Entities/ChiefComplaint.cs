using System;
using System.Collections.Generic;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Master table for chief complaints
    /// </summary>
    public class ChiefComplaint : BaseEntity
    {
        /// <summary>
        /// Chief complaint text
        /// </summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Symptom templates using this chief complaint
        /// </summary>
        public virtual ICollection<SymptomChiefComplaint> SymptomChiefComplaints { get; set; } = new List<SymptomChiefComplaint>();
    }
}
