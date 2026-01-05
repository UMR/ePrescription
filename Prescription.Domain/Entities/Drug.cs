using System;
using System.Collections.Generic;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Master table for drugs/medications
    /// </summary>
    public class Drug : BaseEntity
    {
        /// <summary>
        /// Full drug name with strength (e.g., "Tab. Erythrox, 500 mg")
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Drug form (Tab., Cap., Syrup, Inj., Inhaler, etc.)
        /// </summary>
        public string? Form { get; set; }

        /// <summary>
        /// Brand name
        /// </summary>
        public string? BrandName { get; set; }

        /// <summary>
        /// Strength (e.g., "500 mg", "250 mcg/puff")
        /// </summary>
        public string? Strength { get; set; }

        /// <summary>
        /// Disease templates using this drug
        /// </summary>
        public virtual ICollection<DiseaseDrug> DiseaseDrugs { get; set; } = new List<DiseaseDrug>();

        /// <summary>
        /// Symptom templates using this drug
        /// </summary>
        public virtual ICollection<SymptomDrug> SymptomDrugs { get; set; } = new List<SymptomDrug>();
    }
}
