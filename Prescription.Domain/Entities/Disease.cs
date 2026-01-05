using System;
using System.Collections.Generic;
using Prescription.Domain.Entities.Base;

namespace Prescription.Domain.Entities
{
    /// <summary>
    /// Master table for diseases (DIS templates)
    /// </summary>
    public class Disease : BaseEntity
    {
        /// <summary>
        /// Original ID from source table
        /// </summary>
        public int SourceId { get; set; }

        /// <summary>
        /// Shortcut code (e.g., "DISAcne", "DISBA")
        /// </summary>
        public string Shortcut { get; set; } = string.Empty;

        /// <summary>
        /// Disease name extracted from shortcut (e.g., "Acne", "BA")
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Drugs associated with this disease template
        /// </summary>
        public virtual ICollection<DiseaseDrug> DiseaseDrugs { get; set; } = new List<DiseaseDrug>();
    }
}
