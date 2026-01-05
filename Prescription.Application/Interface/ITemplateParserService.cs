using Prescription.Application.DTOs;

namespace Prescription.Application.Interface
{
    /// <summary>
    /// Service for parsing template data from the raw format
    /// </summary>
    public interface ITemplateParserService
    {
        /// <summary>
        /// Parse a raw template record into structured data
        /// </summary>
        ParsedTemplateData ParseTemplate(RawTemplateRecord record);

        /// <summary>
        /// Parse medication string (##separated items with #@ or #% for instructions)
        /// </summary>
        List<ParsedMedication> ParseMedications(string treatmentText, bool isSymptomTemplate);

        /// <summary>
        /// Parse investigation IDs from string (3-digit IDs concatenated)
        /// </summary>
        List<int> ParseInvestigationIds(string investigationString);

        /// <summary>
        /// Determine template type from disease column prefix
        /// </summary>
        (string Type, string Shortcut, string Name) ParseTemplateIdentifier(string diseaseColumn);
    }
}
