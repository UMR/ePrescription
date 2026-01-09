using System.Collections.Generic;

namespace SympAPI.Models
{
    public abstract record InteractiveResponse
    {
        public string Type { get; init; } = string.Empty;
    }

    public record QuestionResponse : InteractiveResponse
    {
        public QuestionResponse()
        {
            Type = "question";
        }

        public string Question { get; init; } = string.Empty;
        public List<string> Options { get; init; } = new();
        public bool Multiple { get; init; } = false;
    }

    public record SummaryResponse : InteractiveResponse
    {
        public SummaryResponse()
        {
            Type = "summary";
        }

        public string Symptom { get; init; } = string.Empty;
        public List<FollowUpAnswer> Answers { get; init; } = new();
        public string SummaryText { get; init; } = string.Empty;
    }

    public record ErrorResponse : InteractiveResponse
    {
        public ErrorResponse()
        {
            Type = "error";
        }
        public string ErrorCode { get; init; } = string.Empty;
        public string Message { get; init; } = string.Empty;
    }
}