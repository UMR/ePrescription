using Prescription.Application.DTOs;

namespace Prescription.Application.Interface
{
    public interface ISummaryService
    {
        Task<MeetingNotesResponse> SummarizeMeetingNotesAsync(MeetingNotesRequest request, CancellationToken cancellationToken = default);
        Task<string> SummarizeTextAsync(string text, int maxWords = 250, CancellationToken cancellationToken = default);
    }
}