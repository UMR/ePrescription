using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using Prescription.Application.DTOs;
using Prescription.Application.Interface;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Prescription.Application.Services
{
    public class OcrService : IOcrService
    {
        private readonly ChatClient _chatClient;
        private readonly ILogger<OcrService> _logger;

        private const string OcrSystemPrompt = @"You are an expert medical document OCR and analysis assistant. 
                                Your task is to extract text from medical documents (prescriptions, lab reports, medical records) and organize the information into structured sections.

                                CRITICAL RULES:
                                - Extract ALL visible text from the document image
                                - Identify and categorize text into appropriate medical sections
                                - Return ONLY valid JSON - NO markdown, NO extra text
                                - Detect bounding boxes for text regions (approximate coordinates as percentages 0-100)
                                - Categorize each text region: patient_info, doctor_info, medication, diagnosis, lab_result, vital_signs, clinical_notes, instructions, follow_up, other
                                - For medications, extract name, dosage, frequency, duration, and instructions separately
                                - Detect the language of the document

                                OUTPUT FORMAT (valid JSON only):
                                {
                                    ""extractedText"": ""complete raw text extracted from document"",
                                    ""detectedLanguage"": ""en/bn/hi etc."",
                                    ""confidence"": 0.95,
                                    ""textRegions"": [
                                        {
                                            ""text"": ""extracted text segment"",
                                            ""boundingBox"": {
                                                ""x"": 10,
                                                ""y"": 5,
                                                ""width"": 30,
                                                ""height"": 8,
                                                ""polygon"": [{""x"": 10, ""y"": 5}, {""x"": 40, ""y"": 5}, {""x"": 40, ""y"": 13}, {""x"": 10, ""y"": 13}]
                                            },
                                            ""confidence"": 0.98,
                                            ""category"": ""patient_info""
                                        }
                                    ],
                                    ""sections"": {
                                        ""patientInformation"": ""Name, Age, Gender, ID, Contact details"",
                                        ""doctorInformation"": ""Doctor name, specialization, license, clinic/hospital"",
                                        ""diagnosis"": ""diagnosed conditions"",
                                        ""medications"": [
                                            {
                                                ""name"": ""medication name"",
                                                ""dosage"": ""500mg"",
                                                ""frequency"": ""twice daily"",
                                                ""duration"": ""7 days"",
                                                ""instructions"": ""after meals""
                                            }
                                        ],
                                        ""labResults"": ""any lab test results"",
                                        ""vitalSigns"": ""BP, pulse, temperature, weight, height"",
                                        ""clinicalNotes"": ""clinical observations"",
                                        ""instructions"": ""patient instructions and advice"",
                                        ""followUp"": ""follow-up date and instructions"",
                                        ""otherInformation"": ""any other relevant information""
                                    }
                                }

                                IMPORTANT: Provide approximate bounding box coordinates as percentages (0-100) of image dimensions.
                                Return ONLY the JSON, no explanations.";

        private const string SummaryPrompt = @"You are a medical document summarizer. 
                                            Given the extracted text from a medical document, provide a concise, professional summary.

                                            The summary should include:
                                            1. Document type (prescription, lab report, medical record, etc.)
                                            2. Key patient information (if available)
                                            3. Main diagnosis or reason for visit
                                            4. Key medications or treatments prescribed
                                            5. Important findings or results
                                            6. Follow-up recommendations

                                            Keep the summary concise but comprehensive. Use medical terminology appropriately.
                                            Write in the same language as the input text.";

        private const string QAPrompt = @"You are a medical document Q&A assistant.
                                        Given the extracted text from a medical document, answer questions about its content.

                                        RULES:
                                        - Answer based ONLY on the information in the document
                                        - If the information is not in the document, say so
                                        - Be precise and accurate
                                        - Use medical terminology when appropriate
                                        - If uncertain, indicate your confidence level
                                        - Provide relevant sections from the document that support your answer

                                        Respond in JSON format:
                                        {
                                            ""answer"": ""your answer here"",
                                            ""confidence"": ""high/medium/low"",
                                            ""relevantSections"": [""section1"", ""section2""]
                                        }";

        public OcrService(ChatClient chatClient, ILogger<OcrService> logger)
        {
            _chatClient = chatClient;
            _logger = logger;
        }

        public async Task<OcrResult> ProcessImageAsync(byte[] imageData, string fileName, CancellationToken cancellationToken = default)
        {
            var base64Image = Convert.ToBase64String(imageData);
            return await ProcessImageFromBase64Async(base64Image, fileName, cancellationToken);
        }

        public async Task<OcrResult> ProcessImageFromBase64Async(string base64Image, string fileName, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Processing OCR for file: {FileName}", fileName);

            try
            {
                // Determine content type from filename or default to jpeg
                var contentType = GetContentType(fileName);

                // Convert base64 to BinaryData to avoid URI length limits
                var imageBytes = Convert.FromBase64String(base64Image);
                var binaryData = BinaryData.FromBytes(imageBytes);

                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage(OcrSystemPrompt),
                    new UserChatMessage(
                        ChatMessageContentPart.CreateTextPart("Extract all text from this medical document image and organize it into structured sections. Provide bounding boxes for each text region."),
                        ChatMessageContentPart.CreateImagePart(binaryData, contentType)
                    )
                };

                var options = new ChatCompletionOptions
                {
                    ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat(),
                    MaxOutputTokenCount = 4000,
                };

                var response = await _chatClient.CompleteChatAsync(messages, options, cancellationToken);
                var responseText = response.Value.Content[0].Text;

                _logger.LogInformation("OCR Response received, parsing JSON");

                var ocrResponse = JsonSerializer.Deserialize<OcrJsonResponse>(responseText, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (ocrResponse == null)
                {
                    throw new InvalidOperationException("Failed to parse OCR response");
                }

                var result = MapToOcrResult(ocrResponse);

                // Generate summary
                if (!string.IsNullOrEmpty(result.ExtractedText))
                {
                    result.Summary = await GenerateSummaryAsync(result.ExtractedText, cancellationToken);
                }

                _logger.LogInformation("OCR processing completed successfully");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing OCR for file: {FileName}", fileName);
                throw;
            }
        }

        public async Task<string> GenerateSummaryAsync(string extractedText, CancellationToken cancellationToken = default)
        {
            try
            {
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage(SummaryPrompt),
                    new UserChatMessage($"Please summarize this medical document:\n\n{extractedText}")
                };

                var response = await _chatClient.CompleteChatAsync(messages, cancellationToken: cancellationToken);
                return response.Value.Content[0].Text;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating summary");
                return "Unable to generate summary.";
            }
        }

        public async Task<OcrQuestionResponse> AnswerQuestionAsync(OcrQuestionRequest request, CancellationToken cancellationToken = default)
        {
            try
            {
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage(QAPrompt),
                    new UserChatMessage($"Document content:\n{request.ExtractedText}\n\nQuestion: {request.Question}")
                };

                var options = new ChatCompletionOptions
                {
                    ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat()
                };

                var response = await _chatClient.CompleteChatAsync(messages, options, cancellationToken);
                var responseText = response.Value.Content[0].Text;

                var qaResponse = JsonSerializer.Deserialize<OcrQuestionResponse>(responseText, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return qaResponse ?? new OcrQuestionResponse { Answer = "Unable to process your question." };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error answering question");
                return new OcrQuestionResponse { Answer = $"Error: {ex.Message}" };
            }
        }

        private static string GetContentType(string fileName)
        {
            var extension = Path.GetExtension(fileName)?.ToLowerInvariant();
            return extension switch
            {
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".gif" => "image/gif",
                ".webp" => "image/webp",
                ".bmp" => "image/bmp",
                _ => "image/jpeg"
            };
        }

        /// <summary>
        /// Converts a JsonElement to a string, handling both string values and objects/arrays
        /// </summary>
        private static string JsonElementToString(JsonElement? element)
        {
            if (element == null || !element.HasValue)
                return string.Empty;

            var el = element.Value;
            return el.ValueKind switch
            {
                JsonValueKind.String => el.GetString() ?? string.Empty,
                JsonValueKind.Null => string.Empty,
                JsonValueKind.Undefined => string.Empty,
                // For objects or arrays, serialize them back to JSON string for display
                _ => el.GetRawText()
            };
        }

        private static OcrResult MapToOcrResult(OcrJsonResponse response)
        {
            var result = new OcrResult
            {
                ExtractedText = response.ExtractedText ?? string.Empty,
                DetectedLanguage = response.DetectedLanguage ?? "en",
                Confidence = response.Confidence,
                ProcessedAt = DateTime.UtcNow
            };

            // Map text regions
            if (response.TextRegions != null)
            {
                result.TextRegions = response.TextRegions.Select(r => new TextRegion
                {
                    Text = r.Text ?? string.Empty,
                    Confidence = r.Confidence,
                    Category = r.Category ?? "other",
                    BoundingBox = new BoundingBox
                    {
                        X = r.BoundingBox?.X ?? 0,
                        Y = r.BoundingBox?.Y ?? 0,
                        Width = r.BoundingBox?.Width ?? 0,
                        Height = r.BoundingBox?.Height ?? 0,
                        Polygon = r.BoundingBox?.Polygon?.Select(p => new Point { X = p.X, Y = p.Y }).ToList() ?? new List<Point>()
                    }
                }).ToList();
            }

            // Map sections
            if (response.Sections != null)
            {
                result.Sections = new OcrDocumentSections
                {
                    PatientInformation = JsonElementToString(response.Sections.PatientInformation),
                    DoctorInformation = JsonElementToString(response.Sections.DoctorInformation),
                    Diagnosis = JsonElementToString(response.Sections.Diagnosis),
                    LabResults = JsonElementToString(response.Sections.LabResults),
                    VitalSigns = JsonElementToString(response.Sections.VitalSigns),
                    ClinicalNotes = JsonElementToString(response.Sections.ClinicalNotes),
                    Instructions = JsonElementToString(response.Sections.Instructions),
                    FollowUp = JsonElementToString(response.Sections.FollowUp),
                    OtherInformation = JsonElementToString(response.Sections.OtherInformation),
                    Medications = response.Sections.Medications?.Select(m => new ExtractedMedication
                    {
                        Name = m.Name ?? string.Empty,
                        Dosage = m.Dosage ?? string.Empty,
                        Frequency = m.Frequency ?? string.Empty,
                        Duration = m.Duration ?? string.Empty,
                        Instructions = m.Instructions ?? string.Empty
                    }).ToList() ?? new List<ExtractedMedication>()
                };
            }

            return result;
        }

        // Internal classes for JSON deserialization
        private class OcrJsonResponse
        {
            public string? ExtractedText { get; set; }
            public string? DetectedLanguage { get; set; }
            public double Confidence { get; set; }
            public List<TextRegionJson>? TextRegions { get; set; }
            public SectionsJson? Sections { get; set; }
        }

        private class TextRegionJson
        {
            public string? Text { get; set; }
            public BoundingBoxJson? BoundingBox { get; set; }
            public double Confidence { get; set; }
            public string? Category { get; set; }
        }

        private class BoundingBoxJson
        {
            public int X { get; set; }
            public int Y { get; set; }
            public int Width { get; set; }
            public int Height { get; set; }
            public List<PointJson>? Polygon { get; set; }
        }

        private class PointJson
        {
            public int X { get; set; }
            public int Y { get; set; }
        }

        private class SectionsJson
        {
            public JsonElement? PatientInformation { get; set; }
            public JsonElement? DoctorInformation { get; set; }
            public JsonElement? Diagnosis { get; set; }
            public List<MedicationJson>? Medications { get; set; }
            public JsonElement? LabResults { get; set; }
            public JsonElement? VitalSigns { get; set; }
            public JsonElement? ClinicalNotes { get; set; }
            public JsonElement? Instructions { get; set; }
            public JsonElement? FollowUp { get; set; }
            public JsonElement? OtherInformation { get; set; }
        }

        private class MedicationJson
        {
            public string? Name { get; set; }
            public string? Dosage { get; set; }
            public string? Frequency { get; set; }
            public string? Duration { get; set; }
            public string? Instructions { get; set; }
        }
    }
}
