namespace Prescription.Domain.Services
{
    public interface IMedicalContextValidator
    {
        bool IsValidMedicalContext(string text);
    }
}
