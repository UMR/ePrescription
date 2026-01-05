namespace Prescription.Domain.Services
{
    public class MedicalContextValidator : IMedicalContextValidator
    {
        private static readonly string[] MedicalKeywords =
        [
            // English medical terms
            "patient", "symptom", "diagnosis", "treatment", "medication", "prescription",
            "medical", "clinical", "exam", "examination", "history", "complaint", "pain",
            "fever", "blood", "pressure", "heart", "lung", "condition", "disease",
            "doctor", "hospital", "vital", "signs", "test", "lab", "result",
            "allergies", "surgery", "procedure", "chronic", "acute", "assessment",
            "therapy", "dose", "drug", "infection", "injury", "disorder", "syndrome",
            "mg", "ml", "dose", "tablet", "capsule", "injection", "BP", "HR", "temp",
            
            // Bengali medical terms (বাংলা)
            "রোগী", "লক্ষণ", "নির্ণয়", "চিকিৎসা", "ওষুধ", "প্রেসক্রিপশন ",
            "জ্বর", "ব্যথা", "রক্তচাপ", "হৃদয়", "ফুসফুস", "রোগ", "ডাক্তার",
            "হাসপাতাল", "পরীক্ষা", "এলার্জি", "সংক্রমণ", "আঘাত", "অভিযোগ",
            "কাশি", "শ্বাসকষ্ট", "মাথাব্যথা", "পেটব্যথা", "ডায়াবেটিস", "উচ্চ রক্তচাপ",
            
            // Hindi medical terms (हिंदी)
            "रोगी", "लक्षण", "निदान", "उपचार", "दवा", "प्रिस्क्रिप्शन",
            "बुखार", "दर्द", "रक्तचाप", "दिल", "फेफड़े", "बीमारी", "डॉक्टर",
            "अस्पताल", "परीक्षण", "एलर्जी", "संक्रमण", "चोट", "शिकायत",
            "खांसी", "सांस", "सिरदर्द", "पेटदर्द", "मधुमेह", "उच्च रक्तचाप",
            
            // Common symptoms in multiple languages
            "cough", "headache", "vomiting", "diarrhea", "weakness", "nausea",
            "breathing", "swelling", "rash", "fatigue", "dizziness", "chest",
            "abdomen", "throat", "ear", "eye", "skin", "joint", "muscle",
            
            // Medical abbreviations (universal)
            "BP", "HR", "RR", "SpO2", "Temp", "BMI", "ECG", "CBC", "USG"
        ];

        private const int MinimumKeywordMatches = 1;

        public bool IsValidMedicalContext(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return false;

            var lowerText = text.ToLower();
            var matchCount = MedicalKeywords.Count(keyword =>
            {
                if (keyword.Any(c => c > 127))
                    return text.Contains(keyword);
                return lowerText.Contains(keyword.ToLower());
            });

            return matchCount >= MinimumKeywordMatches;
        }
    }
}
