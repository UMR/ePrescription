using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using Prescription.Application.DTOs;
using Prescription.Application.Interface;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Prescription.Application.Services
{
    /// <summary>
    /// Service for text summarization using AI
    /// </summary>
    public class SummaryService : ISummaryService
    {
        private readonly ChatClient _chatClient;
        private readonly ILogger<SummaryService> _logger;

        private const string MeetingNotesSystemPrompt = @"You are an expert meeting notes summarizer that can work with both Bangla and English text. 
                                                        Your task is to analyze meeting notes and extract structured information.

                                                        RULES:
                                                        - Detect the language of the input (Bangla/English)
                                                        - Create a comprehensive but concise summary
                                                        - Extract key points, action items, decisions, and attendees
                                                        - Preserve the original language in the summary
                                                        - If mixed languages, use the dominant language for the summary
                                                        - Return ONLY valid JSON - NO markdown, NO extra text

                                                        OUTPUT FORMAT (valid JSON only):
                                                        {
                                                            ""summary"": ""Main summary of the meeting in 2-3 paragraphs"",
                                                            ""detectedLanguage"": ""bn/en"",
                                                            ""keyPoints"": [""key point 1"", ""key point 2""],
                                                            ""actionItems"": [
                                                                {
                                                                    ""description"": ""action description"",
                                                                    ""assignedTo"": ""person name or null"",
                                                                    ""dueDate"": ""date or null"",
                                                                    ""priority"": ""high/medium/low or null""
                                                                }
                                                            ],
                                                            ""decisions"": [""decision 1"", ""decision 2""],
                                                            ""attendees"": [""attendee 1"", ""attendee 2""]
                                                        }

                                                        IMPORTANT: 
                                                        - If information is not available, use empty arrays or null values
                                                        - Keep the summary concise but informative
                                                        - Maintain professional tone
                                                        - Return ONLY the JSON, no explanations";

        private const string QuickSummaryPrompt = @"You are a text summarizer. Create a concise summary of the provided text.
                                                   Maintain the original language. Keep it professional and informative.
                                                   Focus on the most important information and key points.";

        public SummaryService(ChatClient chatClient, ILogger<SummaryService> logger)
        {
            _chatClient = chatClient;
            _logger = logger;
        }

        public async Task<MeetingNotesResponse> SummarizeMeetingNotesAsync(MeetingNotesRequest request, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Processing meeting notes summarization");

            try
            {
                var prompt = BuildMeetingNotesPrompt(request);
                
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage(MeetingNotesSystemPrompt),
                    new UserChatMessage(prompt)
                };

                var options = new ChatCompletionOptions
                {
                    ResponseFormat = ChatResponseFormat.CreateJsonObjectFormat(),
                    MaxOutputTokenCount = 2000,
                };

                var response = await _chatClient.CompleteChatAsync(messages, options, cancellationToken);
                var responseText = response.Value.Content[0].Text;

                _logger.LogInformation("AI response received, parsing JSON");

                var summaryResponse = JsonSerializer.Deserialize<MeetingNotesJsonResponse>(responseText, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (summaryResponse == null)
                {
                    throw new InvalidOperationException("Failed to parse summary response");
                }

                var result = MapToMeetingNotesResponse(summaryResponse, request);

                _logger.LogInformation("Meeting notes summarization completed successfully");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing meeting notes summarization");
                
                // Return a fallback response in case of error
                return new MeetingNotesResponse
                {
                    Summary = "Unable to generate summary due to processing error.",
                    DetectedLanguage = DetectLanguage(request.MeetingNotes),
                    OriginalWordCount = CountWords(request.MeetingNotes),
                    SummaryWordCount = 0
                };
            }
        }

        public async Task<string> SummarizeTextAsync(string text, int maxWords = 150, CancellationToken cancellationToken = default)
        {
            try
            {
                var prompt = $"Summarize the following text in approximately {maxWords} words:\n\n{text}";
                
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage(QuickSummaryPrompt),
                    new UserChatMessage(prompt)
                };

                var response = await _chatClient.CompleteChatAsync(messages, cancellationToken: cancellationToken);
                return response.Value.Content[0].Text;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating quick summary");
                return "Unable to generate summary.";
            }
        }

        private static string BuildMeetingNotesPrompt(MeetingNotesRequest request)
        {
            var prompt = "Please analyze and summarize the following meeting notes:\n\n";
            
            prompt += $"\nMeeting Notes:\n{request.MeetingNotes}";
            
            if (!string.IsNullOrWhiteSpace(request.Language))
            {
                prompt += $"\n\nNote: The notes are in {request.Language}";
            }
            
            if (!string.IsNullOrWhiteSpace(request.SummaryLength))
            {
                prompt += $"\nRequested summary length: {request.SummaryLength}";
            }

            return prompt;
        }

        private static MeetingNotesResponse MapToMeetingNotesResponse(MeetingNotesJsonResponse jsonResponse, MeetingNotesRequest request)
        {
            return new MeetingNotesResponse
            {
                Summary = jsonResponse.Summary ?? "No summary available",
                DetectedLanguage = jsonResponse.DetectedLanguage ?? DetectLanguage(request.MeetingNotes),
                KeyPoints = jsonResponse.KeyPoints ?? new List<string>(),
                ActionItems = jsonResponse.ActionItems?.Select(ai => new ActionItem
                {
                    Description = ai.Description ?? "",
                    AssignedTo = ai.AssignedTo,
                    DueDate = ai.DueDate,
                    Priority = ai.Priority
                }).ToList() ?? new List<ActionItem>(),
                Decisions = jsonResponse.Decisions ?? new List<string>(),
                Attendees = jsonResponse.Attendees ?? new List<string>(),
                OriginalWordCount = CountWords(request.MeetingNotes),
                SummaryWordCount = CountWords(jsonResponse.Summary ?? "")
            };
        }

        private static string DetectLanguage(string text)
        {
            // Simple language detection - check for Bangla characters
            var banglaPattern = @"[\u0980-\u09FF]";
            return Regex.IsMatch(text, banglaPattern) ? "bn" : "en";
        }

        private static int CountWords(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return 0;

            return text.Split(new char[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries).Length;
        }

        // Internal classes for JSON deserialization
        private class MeetingNotesJsonResponse
        {
            public string? Summary { get; set; }
            public string? DetectedLanguage { get; set; }
            public List<string>? KeyPoints { get; set; }
            public List<ActionItemJson>? ActionItems { get; set; }
            public List<string>? Decisions { get; set; }
            public List<string>? Attendees { get; set; }
        }

        private class ActionItemJson
        {
            public string? Description { get; set; }
            public string? AssignedTo { get; set; }
            public string? DueDate { get; set; }
            public string? Priority { get; set; }
        }
    }
}