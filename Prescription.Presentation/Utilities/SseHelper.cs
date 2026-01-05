namespace Prescription.Presentation.Utilities
{
    public static class SseHelper
    {
        public static void ConfigureSseResponse(HttpResponse response)
        {
            response.ContentType = "text/event-stream";
            response.Headers.Append("Cache-Control", "no-cache");
            response.Headers.Append("Connection", "keep-alive");
            response.Headers.Append("X-Accel-Buffering", "no");
        }

        public static async Task WriteDataAsync(
            HttpResponse response,
            string data,
            CancellationToken cancellationToken)
        {
            var sseData = $"data: {data}\n\n";
            await response.WriteAsync(sseData, cancellationToken);
            await response.Body.FlushAsync(cancellationToken);
        }

        public static async Task WriteCompletionAsync(
            HttpResponse response,
            CancellationToken cancellationToken)
        {
            await response.WriteAsync("data: [DONE]\n\n", cancellationToken);
            await response.Body.FlushAsync(cancellationToken);
        }

        public static async Task WriteErrorAsync(
            HttpResponse response,
            string errorMessage,
            CancellationToken cancellationToken)
        {
            var errorData = $"data: {{\"error\": \"{errorMessage}\"}}\n\n";
            await response.WriteAsync(errorData, cancellationToken);
            await response.Body.FlushAsync(cancellationToken);
        }
    }
}
