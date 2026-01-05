namespace Prescription.Application.DTOs
{
    public class OcrResult
    {
        public string ExtractedText { get; set; } = string.Empty;
        public List<TextRegion> TextRegions { get; set; } = new();
        public OcrDocumentSections Sections { get; set; } = new();
        public string Summary { get; set; } = string.Empty;
        public string DetectedLanguage { get; set; } = "en";
        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
        public double Confidence { get; set; }
        public ImageDimensions ImageDimensions { get; set; } = new();
    }

    public class TextRegion
    {
        public string Text { get; set; } = string.Empty;
        public BoundingBox BoundingBox { get; set; } = new();
        public double Confidence { get; set; }
        public string Category { get; set; } = string.Empty; // patient_info, medication, diagnosis, etc.
    }

    public class BoundingBox
    {
        public int X { get; set; }
        public int Y { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
        public List<Point> Polygon { get; set; } = new();
    }

    public class Point
    {
        public int X { get; set; }
        public int Y { get; set; }
    }

    public class ImageDimensions
    {
        public int Width { get; set; }
        public int Height { get; set; }
    }

    public class OcrDocumentSections
    {
        public string PatientInformation { get; set; } = string.Empty;
        public string DoctorInformation { get; set; } = string.Empty;
        public string Diagnosis { get; set; } = string.Empty;
        public List<ExtractedMedication> Medications { get; set; } = new();
        public string LabResults { get; set; } = string.Empty;
        public string VitalSigns { get; set; } = string.Empty;
        public string ClinicalNotes { get; set; } = string.Empty;
        public string Instructions { get; set; } = string.Empty;
        public string FollowUp { get; set; } = string.Empty;
        public string OtherInformation { get; set; } = string.Empty;
    }

    public class ExtractedMedication
    {
        public string Name { get; set; } = string.Empty;
        public string Dosage { get; set; } = string.Empty;
        public string Frequency { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
        public string Instructions { get; set; } = string.Empty;
    }

    public class OcrQuestionRequest
    {
        public string Question { get; set; } = string.Empty;
        public string DocumentContext { get; set; } = string.Empty;
        public string ExtractedText { get; set; } = string.Empty;
    }

    public class OcrQuestionResponse
    {
        public string Answer { get; set; } = string.Empty;
        public string Confidence { get; set; } = string.Empty;
        public List<string> RelevantSections { get; set; } = new();
    }

    public class OcrUploadRequest
    {
        public string Base64Image { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
    }
}
