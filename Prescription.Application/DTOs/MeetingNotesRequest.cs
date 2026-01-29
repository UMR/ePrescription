namespace Prescription.Application.DTOs
{
    public class MeetingNotesRequest
    {
        public string MeetingNotes { get; set; } = string.Empty;
        public string? Language { get; set; }
        public string SummaryLength { get; set; } = "medium";
        public string? MeetingTitle { get; set; }
        public DateTime? MeetingDate { get; set; }
    }
}