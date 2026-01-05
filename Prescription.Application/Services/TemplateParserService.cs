using System.Text.RegularExpressions;
using Prescription.Application.DTOs;
using Prescription.Application.Interface;

namespace Prescription.Application.Services
{
    /// <summary>
    /// Service for parsing template data from the raw CSV/database format
    /// </summary>
    public class TemplateParserService : ITemplateParserService
    {
        // Medication separators: ## for Disease templates, && for Symptom templates
        private const string DIS_MEDICATION_SEPARATOR = "##";
        private const string SYN_MEDICATION_SEPARATOR = "&&";

        private const string BENGALI_INSTRUCTION_MARKER = "@";
        private const string ENGLISH_INSTRUCTION_MARKER = "%";

        private const string SYN_SECTION_SEPARATOR = "#";

        public ParsedTemplateData ParseTemplate(RawTemplateRecord record)
        {
            var (type, shortcut, name) = ParseTemplateIdentifier(record.Disease);

            var result = new ParsedTemplateData
            {
                SourceId = record.Id,
                Type = type,
                Shortcut = shortcut,
                Name = name
            };

            switch (type)
            {
                case "DIS":
                    ParseDiseaseTemplate(record.Treatment, result);
                    break;
                case "SYN":
                    ParseSymptomTemplate(record.Treatment, result);
                    break;
                case "INV":
                    ParseInvestigationTemplate(record.Treatment, result);
                    break;
            }

            return result;
        }

        public (string Type, string Shortcut, string Name) ParseTemplateIdentifier(string diseaseColumn)
        {
            if (string.IsNullOrWhiteSpace(diseaseColumn))
                return ("UNKNOWN", "", "");

            string type;
            string shortcut;
            string name;

            if (diseaseColumn.StartsWith("DIS", StringComparison.OrdinalIgnoreCase))
            {
                type = "DIS";
                shortcut = diseaseColumn;
                name = diseaseColumn.Substring(3).Trim();
            }
            else if (diseaseColumn.StartsWith("SYN", StringComparison.OrdinalIgnoreCase))
            {
                type = "SYN";
                shortcut = diseaseColumn;
                name = diseaseColumn.Substring(3).Trim();
            }
            else if (diseaseColumn.StartsWith("INV", StringComparison.OrdinalIgnoreCase) ||
                     diseaseColumn.StartsWith("Inv", StringComparison.Ordinal))
            {
                type = "INV";
                shortcut = diseaseColumn;
                name = diseaseColumn.Substring(3).Trim();
            }
            else
            {
                type = "UNKNOWN";
                shortcut = diseaseColumn;
                name = diseaseColumn;
            }

            return (type, shortcut, name);
        }

        private void ParseDiseaseTemplate(string treatment, ParsedTemplateData result)
        {
            if (string.IsNullOrWhiteSpace(treatment))
                return;

            result.Medications = ParseMedications(treatment, false);
        }

        private void ParseSymptomTemplate(string treatment, ParsedTemplateData result)
        {
            if (string.IsNullOrWhiteSpace(treatment))
                return;

            // SYN format: ChiefComplaint#Examination#Advice#Medications#Investigations##FollowUp
            // Sections are separated by single #, medications within section by &&

            var mainParts = treatment.Split(new[] { SYN_SECTION_SEPARATOR }, StringSplitOptions.None);

            if (mainParts.Length >= 1)
            {
                var complaints = CleanText(mainParts[0]);
                if (!string.IsNullOrEmpty(complaints))
                {
                    result.ChiefComplaints = complaints
                        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(c => c.Trim())
                        .Where(c => !string.IsNullOrEmpty(c))
                        .ToList();

                    if (result.ChiefComplaints.Count == 0 && !string.IsNullOrEmpty(complaints))
                    {
                        result.ChiefComplaints.Add(complaints);
                    }
                }
            }

            if (mainParts.Length >= 2)
            {
                var examinations = CleanText(mainParts[1]);
                if (!string.IsNullOrEmpty(examinations))
                {
                    result.Examinations = [.. examinations
                        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(e => e.Trim())
                        .Where(e => !string.IsNullOrEmpty(e))];

                    if (result.Examinations.Count == 0 && !string.IsNullOrEmpty(examinations))
                    {
                        result.Examinations.Add(examinations);
                    }
                }
            }

            if (mainParts.Length >= 3)
            {
                var advices = CleanText(mainParts[2]);
                if (!string.IsNullOrEmpty(advices))
                {
                    result.Advices = advices
                        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(a => a.Trim())
                        .Where(a => !string.IsNullOrEmpty(a))
                        .ToList();

                    if (result.Advices.Count == 0 && !string.IsNullOrEmpty(advices))
                    {
                        result.Advices.Add(advices);
                    }
                }
            }

            if (mainParts.Length >= 4)
            {
                // Medications section - may contain && separators
                var medicationsSection = mainParts[3];
                result.Medications = ParseMedications(medicationsSection, true);
            }

            if (mainParts.Length >= 5)
            {
                // Last part contains investigations (3-digit IDs) and possibly follow-up
                var lastPart = string.Join("#", mainParts.Skip(4));

                // Check for follow-up marker (##)
                var followUpIndex = lastPart.IndexOf(DIS_MEDICATION_SEPARATOR);
                string investigationsPart;

                if (followUpIndex >= 0)
                {
                    investigationsPart = lastPart.Substring(0, followUpIndex);
                    result.FollowUp = CleanText(lastPart.Substring(followUpIndex + 2));
                }
                else
                {
                    investigationsPart = lastPart;
                }

                result.InvestigationOIDs = ParseInvestigationIds(investigationsPart);
            }
        }

        private void ParseInvestigationTemplate(string treatment, ParsedTemplateData result)
        {
            if (string.IsNullOrWhiteSpace(treatment))
                return;

            // INV templates contain only investigation IDs
            result.InvestigationOIDs = ParseInvestigationIds(treatment);
        }

        public List<ParsedMedication> ParseMedications(string treatmentText, bool isSymptomTemplate)
        {
            var medications = new List<ParsedMedication>();

            if (string.IsNullOrWhiteSpace(treatmentText))
                return medications;

            string separator = isSymptomTemplate ? SYN_MEDICATION_SEPARATOR : DIS_MEDICATION_SEPARATOR;
            var items = treatmentText.Split(new[] { separator }, StringSplitOptions.RemoveEmptyEntries);

            int order = 1;
            foreach (var item in items)
            {
                var medication = ParseSingleMedication(item.Trim(), order);
                if (medication != null)
                {
                    medications.Add(medication);
                    order++;
                }
            }

            return medications;
        }

        private ParsedMedication? ParseSingleMedication(string medicationText, int order)
        {
            if (string.IsNullOrWhiteSpace(medicationText))
                return null;

            var medication = new ParsedMedication
            {
                Order = order,
                RawText = medicationText
            };

            // Check for instruction marker (& or #) followed by @ or %
            string nameAndStrength;
            string? instructionBn = null;
            string? instructionEn = null;

            // Try to find instruction separator: &@ or &% or #@ or #%
            var instructionMatch = Regex.Match(medicationText, @"[&#]([@%])(.*)$", RegexOptions.Singleline);

            if (instructionMatch.Success)
            {
                nameAndStrength = medicationText.Substring(0, instructionMatch.Index).Trim();
                var langMarker = instructionMatch.Groups[1].Value;
                var instruction = CleanText(instructionMatch.Groups[2].Value);

                if (langMarker == "%")
                    instructionEn = instruction;
                else
                    instructionBn = instruction;
            }
            else
            {
                nameAndStrength = medicationText.Trim();
            }

            medication.FullName = CleanText(nameAndStrength) ?? string.Empty;
            medication.DosageInstruction = instructionBn;
            medication.DosageInstructionEnglish = instructionEn;

            // Parse medication type, brand name, and strength
            ParseMedicationDetails(nameAndStrength, medication);

            return medication;
        }

        private void ParseMedicationDetails(string nameAndStrength, ParsedMedication medication)
        {
            // Common medication types/forms
            var medicationForms = new[]
            {
                "Tab.", "Cap.", "Syrup", "Susp.", "Inj.", "Inhaler", "Cream", "Ointment",
                "Drop", "Solution", "Spray", "Gel", "Powder", "Sachet", "Strip", "Suppository",
                "Lotion", "Oral paste"
            };

            string remaining = nameAndStrength;

            // Extract medication form
            foreach (var form in medicationForms)
            {
                if (remaining.StartsWith(form, StringComparison.OrdinalIgnoreCase))
                {
                    medication.Form = form.TrimEnd('.');
                    remaining = remaining.Substring(form.Length).Trim();
                    break;
                }
            }

            // Try to extract strength (pattern like "20 mg", "500 mg/10 ml", etc.)
            var strengthMatch = Regex.Match(remaining, @",?\s*([\d\.]+\s*(?:mg|g|ml|mcg|iu|%|u/L|mmol/L)[^,]*?)$", RegexOptions.IgnoreCase);
            if (strengthMatch.Success)
            {
                medication.Strength = strengthMatch.Groups[1].Value.Trim();
                remaining = remaining.Substring(0, strengthMatch.Index).Trim().TrimEnd(',');
            }

            // The remaining is the brand name
            medication.BrandName = CleanText(remaining);
        }

        public List<int> ParseInvestigationIds(string investigationString)
        {
            var ids = new List<int>();

            if (string.IsNullOrWhiteSpace(investigationString))
                return ids;

            // Clean the string - remove any non-digit characters except the digits themselves
            var cleanString = Regex.Replace(investigationString, @"[^\d]", "");

            // Investigation IDs are 3-digit numbers concatenated together
            for (int i = 0; i + 3 <= cleanString.Length; i += 3)
            {
                var idStr = cleanString.Substring(i, 3);
                if (int.TryParse(idStr, out int id) && id > 0)
                {
                    ids.Add(id);
                }
            }

            return ids;
        }

        private string? CleanText(string? text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Remove extra whitespace and trim
            var cleaned = Regex.Replace(text.Trim(), @"\s+", " ");
            return string.IsNullOrWhiteSpace(cleaned) ? null : cleaned;
        }
    }
}
