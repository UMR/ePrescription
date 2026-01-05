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
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(
            IPrescriptionTemplateService templateService,
            ILogger<ReportsController> logger)
        {
            _templateService = templateService;
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
                allReports = [.. allReports
                    .Where(r =>
                        r.Abbreviation.Contains(term, StringComparison.CurrentCultureIgnoreCase) ||
                        r.FullName.Contains(term, StringComparison.CurrentCultureIgnoreCase))];
            }

            return Ok(allReports);
        }
    }
}
