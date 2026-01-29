using Microsoft.AspNetCore.Mvc;
using Prescription.Application.DTOs;
using Prescription.Application.Interface;

namespace Prescription.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IPrescriptionTemplateService _templateService;
        private readonly ISummaryService _summaryService;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(
            IPrescriptionTemplateService templateService,
            ISummaryService summaryService,
            ILogger<ReportsController> logger)
        {
            _templateService = templateService;
            _summaryService = summaryService;
            _logger = logger;
        }

        /// <summary>
        /// Get all reports/investigations
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<List<ReportDto>>> GetAllReports(CancellationToken cancellationToken)
        {
            var reports = await _templateService.GetAllReportsAsync(cancellationToken);
            return Ok(reports);
        }

        /// <summary>
        /// Get report by OID (original ID from source data)
        /// </summary>
        [HttpGet("{oid:int}")]
        public async Task<ActionResult<ReportDto>> GetReportByOID(int oid, CancellationToken cancellationToken)
        {
            var report = await _templateService.GetReportByOIDAsync(oid, cancellationToken);

            if (report == null)
                return NotFound($"Report with OID {oid} not found");

            return Ok(report);
        }

        /// <summary>
        /// Search reports by abbreviation or full name
        /// </summary>
        [HttpGet("search")]
        public async Task<ActionResult<List<ReportDto>>> SearchReports(
            [FromQuery] string? searchTerm,
            CancellationToken cancellationToken)
        {
            var allReports = await _templateService.GetAllReportsAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.ToLower();
                allReports = allReports
                    .Where(r =>
                        r.Abbreviation.Contains(term, StringComparison.CurrentCultureIgnoreCase) ||
                        r.FullName.Contains(term, StringComparison.CurrentCultureIgnoreCase))
                    .ToList();
            }

            return Ok(allReports);
        }

        [HttpPost("summarize-meeting")]
        public async Task<ActionResult<MeetingNotesResponse>> SummarizeMeetingNotes([FromBody] MeetingNotesRequest request,  CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.MeetingNotes))
            {
                return BadRequest(new { error = "Meeting notes are required" });
            }

            try
            {
                _logger.LogInformation("Processing meeting notes summarization request");
                
                var result = await _summaryService.SummarizeMeetingNotesAsync(request, cancellationToken);
                
                _logger.LogInformation("Meeting notes summarization completed successfully");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing meeting notes summarization");
                return StatusCode(500, new { error = "An error occurred while processing the meeting notes" });
            }
        }

        [HttpPost("summarize-text")]
        public async Task<ActionResult<object>> SummarizeText([FromBody] TextSummaryRequest request,CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
            {
                return BadRequest(new { error = "Text is required" });
            }

            try
            {
                _logger.LogInformation("Processing text summarization request");
                
                var maxWords = request.MaxWords ?? 150;
                var summary = await _summaryService.SummarizeTextAsync(request.Text, maxWords, cancellationToken);
                
                var result = new
                {
                    Summary = summary,
                    OriginalLength = request.Text.Length,
                    SummaryLength = summary.Length,
                    ProcessedAt = DateTime.UtcNow
                };

                _logger.LogInformation("Text summarization completed successfully");
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing text summarization");
                return StatusCode(500, new { error = "An error occurred while processing the text" });
            }
        }
    }
    public class TextSummaryRequest
    {
       
        public string Text { get; set; } = string.Empty;
        public int? MaxWords { get; set; }
    }
}
