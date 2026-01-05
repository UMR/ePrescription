namespace Prescription.Application.DTOs
{
    public sealed record ChatRequest
    {
        public string Prompt { get; set; } = string.Empty;
    }
}
