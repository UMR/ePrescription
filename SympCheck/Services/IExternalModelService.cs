using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SympAPI.Models;

namespace SympAPI.Services
{
    public interface IExternalModelService
    {
        Task<InteractiveResponse?> GetInteractiveResponseAsync(SymptomRequest request, CancellationToken cancellationToken = default);
        Task<List<DiagnosisResponse>> DiagnoseSymptomsAsync(DiagnosisRequest request, CancellationToken cancellationToken = default);
        Task<ConditionDetailResponse?> GetConditionDetailsAsync(string id, CancellationToken cancellationToken = default);
    }
}
