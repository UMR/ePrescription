using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using Prescription.Application.Commands;
using Prescription.Application.DTOs;
using Prescription.Application.Interface;
using System.ClientModel;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace Prescription.Application.Services
{
    public class ClinicalNoteService(ChatClient chatClient, ILogger<ClinicalNoteService> logger) : IClinicalNoteService
    {
        private readonly ChatClient _chatClient = chatClient;
        private readonly ILogger<ClinicalNoteService> _logger = logger;

        private const string SystemPrompt = @"You are an expert medical AI assistant with deep clinical knowledge and multi-language capabilities. Analyze clinical notes in ANY language and provide intelligent, evidence-based medical recommendations.
                CORE CAPABILITIES:
                1. EXTRACT: All explicitly mentioned patient information
                2. INFER: Clinical diagnosis from symptoms and findings
                3. SUGGEST: Appropriate evidence-based treatments with complete medication details
                4. RECOMMEND: Investigations, advice, and follow-up plans
                5. DETECT: Input language and respond in the same language

                CRITICAL RULES:
                - DETECT the language of input (English, Bengali, Hindi, Spanish, etc.) and respond in THE SAME LANGUAGE
                - Use your medical knowledge to suggest appropriate treatments even if not explicitly stated
                - Return ONLY valid JSON - NO markdown, NO extra text, NO explanations
                - ALL values must be properly quoted strings or numbers
                - NEVER use placeholders like 'data:', 'N/A', 'TBD', or similar - use actual values or empty strings
                - ALL fields EXCEPT 'medications' array must be FLAT STRINGS - NO nested JSON objects
                - physicalExamination MUST be a single concatenated string, NOT an object with vitals/general/respiratory/cardiovascular
                - treatmentPlan MUST be a single concatenated string, NOT an object with medications/advice/followUpDate
                - ONLY the 'medications' field can be an array of objects
                - Ensure all JSON keys and string values are properly quoted (keys always in English)
                - If information is missing, use empty string or 0 for numbers
                - Write medication plans with COMPLETE details
                - Ensure proper spacing in every JSON fields value
                - JSON keys MUST be exact camelCase with NO spaces: patientName NOT 'patient Name'
                - Include language code in response for client-side processing
                - For ICD codes: Identify ALL relevant ICD-10 codes based on symptoms, diagnosis, and comorbidities. Include PRIMARY diagnosis code, SECONDARY codes for complications/symptoms, and any relevant OPTIONAL codes. Return ALL codes as a single comma-separated string (e.g., ""J18.9, R50.9, R05""). If multiple conditions exist, include codes for each. If no codes can be determined, use empty string.
                - For tests/investigations: Suggest appropriate diagnostic tests based on symptoms and diagnosis. Include both mentioned tests AND recommended tests based on clinical presentation. Return as comma-separated string (e.g., ""CBC, ESR, Chest X-ray, Blood Sugar""). If no tests needed, use empty string.
                
                CLINICAL INTELLIGENCE:
                - If symptoms suggest infection → recommend suitable antibiotics
                - If fever/pain present → include antipyretics/analgesics  
                - If chronic disease → suggest standard management
                - If vital signs abnormal → recommend interventions
                - Always provide actionable, specific recommendations

                OUTPUT FORMAT (valid JSON only - EXACT keys as shown):
                {
                ""detectedLanguage"": ""en/bn/hi/es etc. (ISO 639-1 code)"",
                ""patientName"": ""extract or empty string"",
                ""patientAge"": 0,
                ""patientGender"": ""Male/Female/Other or empty string"",
                ""chiefComplaint"": ""main symptoms with duration in detected language"",
                ""medicalHistory"": ""past conditions, medications, allergies as SINGLE STRING in detected language"",
                ""physicalExamination"": ""vital signs and findings as SINGLE STRING"",
                ""diagnosis"": ""PRIMARY diagnosis based on clinical presentation"",
                ""treatmentPlan"": ""SPECIFIC medications with dosages, frequency, duration as SINGLE STRING"",
                ""medications"": [
                  {
                    ""name"": ""Generic medication name"",
                    ""dosage"": ""500mg"",
                    ""frequency"": ""1-1-1 (Three times daily)"",
                    ""duration"": ""7 days"",
                    ""instructions"": ""Take after meals""
                  }
                ],
                ""tests"": ""Recommended diagnostic tests as comma-separated string (e.g., 'CBC, ESR, Chest X-ray, LFT, RFT') - suggest based on symptoms/diagnosis even if not explicitly mentioned - or empty string"",
                ""advice"": ""detailed lifestyle, dietary advice, warning signs"",
                ""followUpDate"": ""appropriate timeline based on severity"",
                ""weight"": """",
                ""height"": """",
                ""pulse"": """",
                ""bloodPressure"": """",
                ""temperature"": """",
                ""referralComments"": ""investigations, specialist referral if needed"",
                ""icdCodes"": ""ALL relevant ICD-10 codes as comma-separated string (e.g., 'J18.9, R50.9, R05, Z87.01') - include primary diagnosis code, secondary codes for symptoms/complications, and codes for any comorbidities mentioned - or empty string if none""
                }

                MEDICATION RULES:
                - Provide medications in BOTH treatmentPlan (text) AND medications array (structured)
                - Complete dosing with frequency and duration
                - Generic names preferred
                - Age-appropriate dosing

                ALWAYS provide specific, actionable recommendations based on clinical context.
                Return ONLY valid JSON, no markdown or extra text.
                
                If non-medical input: {""error"": ""Medical clinical notes only""}";

        public async IAsyncEnumerable<string> StreamClinicalNoteSummaryAsync(
            ClinicalNoteCommand command,
            [EnumeratorCancellation] CancellationToken cancellationToken)
        {
            var messages = BuildChatMessages(command.ClinicalNote);
            var options = new ChatCompletionOptions
            {
                ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat()
            };

            _logger.LogInformation("Starting clinical note stream analysis with GitHub AI");

            AsyncCollectionResult<StreamingChatCompletionUpdate> streamingResult =
                _chatClient.CompleteChatStreamingAsync(messages, options, cancellationToken);

            await foreach (var update in streamingResult)
            {
                foreach (var part in update.ContentUpdate)
                {
                    if (!string.IsNullOrEmpty(part.Text))
                    {
                        var spacedText = AddProperSpacingToJson(part.Text);
                        yield return spacedText;
                    }
                }
            }

            _logger.LogInformation("Clinical note stream analysis completed");
        }

        public async Task<ClinicalNoteSummary> CompleteClinicalNoteSummaryAsync(ClinicalNoteCommand command)
        {
            var messages = BuildChatMessages(command.ClinicalNote);
            var options = new ChatCompletionOptions
            {
                ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat()
            };

            _logger.LogInformation("Processing clinical note completion analysis with GitHub AI");

            ChatCompletion completion = await _chatClient.CompleteChatAsync(messages, options);
            var responseContent = completion.Content[0].Text;

            try
            {
                var summary = JsonSerializer.Deserialize<ClinicalNoteSummary>(responseContent,
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                if (summary == null)
                {
                    _logger.LogError("Failed to deserialize clinical note response");
                    throw new InvalidOperationException("Failed to parse clinical note response");
                }

                summary.Timestamp = DateTime.UtcNow;

                // Process advice text - split by dots and format as semicolon-separated list
                if (!string.IsNullOrEmpty(summary.Advice))
                {
                    summary.Advice = ProcessAdviceText(summary.Advice);
                }

                _logger.LogInformation("Clinical note processed successfully. Language detected: {Language}", summary.DetectedLanguage);

                return summary;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON deserialization failed. Response: {Response}", responseContent);
                throw new InvalidOperationException($"Invalid JSON response from AI: {ex.Message}");
            }
        }

        private static List<ChatMessage> BuildChatMessages(string clinicalNote)
        {
            return
            [
                new SystemChatMessage(SystemPrompt),
                new UserChatMessage($"Clinical Note:\n{clinicalNote}\n\nProvide comprehensive medical analysis in the exact JSON format specified above.")
            ];
        }
        private static string AddProperSpacingToJson(string text)
        {
            if (string.IsNullOrEmpty(text)) return text;

            text = System.Text.RegularExpressions.Regex.Replace(text, @"([.,;:!?])([A-Za-z])", "$1 $2");
            text = System.Text.RegularExpressions.Regex.Replace(text, @"([a-z])(\()", "$1 $2", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            text = System.Text.RegularExpressions.Regex.Replace(text, @"(\))([A-Za-z])", "$1 $2");
            text = System.Text.RegularExpressions.Regex.Replace(text, @"(\d)([A-Za-z])", "$1 $2");
            text = System.Text.RegularExpressions.Regex.Replace(text, @"([a-z])([A-Z])", "$1 $2");
            text = System.Text.RegularExpressions.Regex.Replace(text, @"\s+", " ");

            return text.Trim();
        }

        private static string ProcessAdviceText(string advice)
        {
            if (string.IsNullOrWhiteSpace(advice))
                return string.Empty;

            var items = new List<string>();

            if (advice.Contains(';') || advice.Contains('\n'))
            {
                items = advice.Split(new[] { ';', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => s.Trim())
                    .Where(s => s.Length > 0)
                    .ToList();
            }
            else if (System.Text.RegularExpressions.Regex.IsMatch(advice, @"\d+[.)]"))
            {
                items = System.Text.RegularExpressions.Regex.Split(advice, @"\d+[.)]\s*")
                    .Select(s => s.Trim())
                    .Where(s => s.Length > 0)
                    .ToList();
            }
            else
            {
                var sentences = System.Text.RegularExpressions.Regex.Split(advice, @"\.\s+(?=[A-Z])");
                items = sentences
                    .Select(s => s.Trim().TrimEnd('.'))
                    .Where(s => s.Length > 2)
                    .ToList();
            }

            if (items.Count <= 1)
            {
                return advice.Trim();
            }
            return string.Join("; ", items);
        }
    }
}
