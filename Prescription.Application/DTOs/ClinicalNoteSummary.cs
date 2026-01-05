namespace Prescription.Application.DTOs
{
    public class ClinicalNoteSummary
    {
        public string DetectedLanguage { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public int PatientAge { get; set; }
        public string PatientGender { get; set; } = string.Empty;
        public string ChiefComplaint { get; set; } = string.Empty;
        public string MedicalHistory { get; set; } = string.Empty;
        public string PhysicalExamination { get; set; } = string.Empty;
        public string Diagnosis { get; set; } = string.Empty;
        public string TreatmentPlan { get; set; } = string.Empty;
        public List<MedicationInfo> Medications { get; set; } = new();
        public string Advice { get; set; } = string.Empty;
        public string Tests { get; set; } = string.Empty;
        public string FollowUpDate { get; set; } = string.Empty;
        public string Weight { get; set; } = string.Empty;
        public string Height { get; set; } = string.Empty;
        public string Pulse { get; set; } = string.Empty;
        public string BloodPressure { get; set; } = string.Empty;
        public string Temperature { get; set; } = string.Empty;
        public string ReferralComments { get; set; } = string.Empty;
        public string IcdCodes { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class MedicationInfo
    {
        public string Name { get; set; } = string.Empty;
        public string Dosage { get; set; } = string.Empty;
        public string Frequency { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
        public string Instructions { get; set; } = string.Empty;
    }
}
