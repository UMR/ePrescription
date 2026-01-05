using Prescription.Application.Commands;
using Prescription.Application.DTOs;

namespace Prescription.Application.Interface
{
    public interface IClinicalNoteService
    {
        IAsyncEnumerable<string> StreamClinicalNoteSummaryAsync(ClinicalNoteCommand command, CancellationToken cancellationToken);
        Task<ClinicalNoteSummary> CompleteClinicalNoteSummaryAsync(ClinicalNoteCommand command);
    }
}
