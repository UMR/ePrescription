using Prescription.Application.DTOs;

namespace Prescription.Application.Interface
{
    public interface IOcrService
    {
        Task<OcrResult> ProcessImageAsync(byte[] imageData, string fileName, CancellationToken cancellationToken = default);
        Task<OcrResult> ProcessImageFromBase64Async(string base64Image, string fileName, CancellationToken cancellationToken = default);
        Task<OcrQuestionResponse> AnswerQuestionAsync(OcrQuestionRequest request, CancellationToken cancellationToken = default);
        Task<string> GenerateSummaryAsync(string extractedText, CancellationToken cancellationToken = default);
    }
}
