namespace Prescription.Application.DTOs
{
    public class MeetingNotesResponse
    {
        public string Summary { get; set; } = string.Empty;
        public string DetectedLanguage { get; set; } = string.Empty;
        public List<string> KeyPoints { get; set; } = new();
        public List<ActionItem> ActionItems { get; set; } = new();
        public List<string> Decisions { get; set; } = new();
        public List<string> Attendees { get; set; } = new();
        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
        public int OriginalWordCount { get; set; }
        public int SummaryWordCount { get; set; }
    }

    public class ActionItem
    {
        public string Description { get; set; } = string.Empty;
        public string? AssignedTo { get; set; }
        public string? DueDate { get; set; }
        public string? Priority { get; set; }
    }
}