namespace SympAPI.Models
{

    public class SymptomRequest
    {
        public string? Symptom { get; set; }
        public int? Age { get; set; }
        public string? Gender { get; set; }
        public double? Temperature { get; set; }
        public string? BloodPressure { get; set; }
        public int? HeartRate { get; set; }
        public List<FollowUpAnswer>? Answers { get; set; }
        public List<string>? SkippedQuestions { get; set; }

        public bool summaryOnly { get; set; } = false;     // When true, return summary instead of question
        public int? requestedAdditionalQuestions { get; set; } //
    }

    public class FollowUpAnswer
    {
        public string Question { get; set; }
        public string Answer { get; set; }
    }

    public class DiagnosisRequest
    {
        public string? Symptom { get; set; }
        public List<FollowUpAnswer> Answers { get; set; } = new List<FollowUpAnswer>();

        public int Age { get; set; }
        public string Gender { get; set; }

        public double? Temperature { get; set; }
        public string? BloodPressure { get; set; }
        public int? HeartRate { get; set; }
    }

    public class SummaryDto
    {
        public string Symptom { get; set; }
        public List<FollowUpAnswer> Answers { get; set; }
        public string SummaryText { get; set; }
    }

    public class DiagnosisResponse
    {
        public string Label { get; set; }
        public double Score { get; set; }
        public string Icd { get; set; }
        public string Details { get; set; }
        public string Physician { get; set; }
        public string Reasoning { get; set; }
        public bool IsEmergency { get; set; }
    }

    public class ConditionDetailResponse
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public List<string> Specialties { get; set; }
        public string Description { get; set; }
        public List<string> CommonCauses { get; set; }
        public List<string> RedFlags { get; set; }
        public List<string> Investigations { get; set; }
        public string Disclaimer { get; set; }
    }



}
