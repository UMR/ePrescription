namespace Telemedicine.Application.Options
{
    public class AgoraOptions
    {
        public string AppId { get; set; } = string.Empty;
        public string AppCertificate { get; set; } = string.Empty;
        public int TokenLifetimeSeconds { get; set; } = 3600;
    }
}
