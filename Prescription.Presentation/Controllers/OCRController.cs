using Microsoft.AspNetCore.Mvc;
using Prescription.Application.DTOs;
using Prescription.Application.Interface;

namespace Prescription.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OCRController : ControllerBase
    {
        private readonly IOcrService _ocrService;
        private readonly ILogger<OCRController> _logger;

        public OCRController(IOcrService ocrService, ILogger<OCRController> logger)
        {
            _ocrService = ocrService;
            _logger = logger;
        }

        /// <summary>
        /// Process an uploaded image for OCR extraction
        /// </summary>
        [HttpPost("process")]
        public async Task<ActionResult<OcrResult>> ProcessImage(IFormFile file, CancellationToken cancellationToken)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "No file uploaded" });
            }

            // Validate file type
            var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp" };
            if (!allowedTypes.Contains(file.ContentType.ToLower()))
            {
                return BadRequest(new { error = "Invalid file type. Supported types: JPEG, PNG, GIF, WebP, BMP" });
            }

            // Limit file size (10MB)
            if (file.Length > 10 * 1024 * 1024)
            {
                return BadRequest(new { error = "File size exceeds 10MB limit" });
            }

            try
            {
                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream, cancellationToken);
                var imageData = memoryStream.ToArray();

                var result = await _ocrService.ProcessImageAsync(imageData, file.FileName, cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing OCR request");
                return StatusCode(500, new { error = "Failed to process image", details = ex.Message });
            }
        }

        /// <summary>
        /// Process a base64 encoded image for OCR extraction
        /// </summary>
        [HttpPost("process-base64")]
        public async Task<ActionResult<OcrResult>> ProcessBase64Image([FromBody] OcrUploadRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(request.Base64Image))
            {
                return BadRequest(new { error = "No image data provided" });
            }

            try
            {
                // Remove data URL prefix if present
                var base64Data = request.Base64Image;
                if (base64Data.Contains(","))
                {
                    base64Data = base64Data.Split(',')[1];
                }

                var result = await _ocrService.ProcessImageFromBase64Async(base64Data, request.FileName ?? "image.jpg", cancellationToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing base64 OCR request");
                return StatusCode(500, new { error = "Failed to process image", details = ex.Message });
            }
        }

        /// <summary>
        /// Ask a question about the extracted document content
        /// </summary>
        [HttpPost("question")]
        public async Task<ActionResult<OcrQuestionResponse>> AskQuestion([FromBody] OcrQuestionRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(request.ExtractedText))
            {
                return BadRequest(new { error = "No document content provided" });
            }

            if (string.IsNullOrEmpty(request.Question))
            {
                return BadRequest(new { error = "No question provided" });
            }

            try
            {
                var response = await _ocrService.AnswerQuestionAsync(request, cancellationToken);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error answering question");
                return StatusCode(500, new { error = "Failed to process question", details = ex.Message });
            }
        }

        /// <summary>
        /// Generate a summary of the extracted document
        /// </summary>
        [HttpPost("summary")]
        public async Task<ActionResult<object>> GenerateSummary([FromBody] SummaryRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrEmpty(request.ExtractedText))
            {
                return BadRequest(new { error = "No document content provided" });
            }

            try
            {
                var summary = await _ocrService.GenerateSummaryAsync(request.ExtractedText, cancellationToken);
                return Ok(new { summary });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating summary");
                return StatusCode(500, new { error = "Failed to generate summary", details = ex.Message });
            }
        }
    }

    public class SummaryRequest
    {
        public string ExtractedText { get; set; } = string.Empty;
    }
}