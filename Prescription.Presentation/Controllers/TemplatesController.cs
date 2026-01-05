using Microsoft.AspNetCore.Mvc;
using Prescription.Application.DTOs;
using Prescription.Application.Interface;

namespace Prescription.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TemplatesController : ControllerBase
    {
        private readonly IPrescriptionTemplateService _templateService;
        private readonly ILogger<TemplatesController> _logger;

        public TemplatesController(
            IPrescriptionTemplateService templateService,
            ILogger<TemplatesController> logger)
        {
            _templateService = templateService;
            _logger = logger;
        }

        #region Import

        /// <summary>
        /// Import templates from source table (Chacha_Prescription_Template_Master) 
        /// and split into normalized tables (diseases, symptoms, drugs, etc.)
        /// </summary>
        [HttpPost("import")]
        public async Task<ActionResult<ImportTemplatesResult>> ImportTemplates(
            [FromBody] ImportTemplatesRequest request,
            CancellationToken cancellationToken)
        {
            _logger.LogInformation("Starting template import. ClearExisting: {ClearExisting}", request.ClearExisting);

            var result = await _templateService.ImportFromSourceTableAsync(request, cancellationToken);

            if (result.Success)
            {
                _logger.LogInformation(
                    "Import completed. Reports: {Reports}, Diseases: {Diseases}, Symptoms: {Symptoms}, Drugs: {Drugs}",
                    result.ReportsImported, result.DiseasesImported, result.SymptomsImported, result.DrugsImported);
                return Ok(result);
            }

            _logger.LogWarning("Import completed with errors: {Errors}", string.Join(", ", result.Errors));
            return BadRequest(result);
        }

        #endregion

        #region Disease Endpoints

        /// <summary>
        /// Search disease templates
        /// </summary>
        [HttpGet("disease")]
        public async Task<ActionResult<PagedResult<DiseaseListDto>>> SearchDiseases(
            [FromQuery] string? searchTerm,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var request = new SearchRequest
            {
                SearchTerm = searchTerm,
                Page = page,
                PageSize = pageSize
            };

            var result = await _templateService.SearchDiseasesAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Get disease by ID with full details including drugs
        /// </summary>
        [HttpGet("disease/{id:guid}")]
        public async Task<ActionResult<DiseaseDto>> GetDiseaseById(
            Guid id,
            CancellationToken cancellationToken)
        {
            var disease = await _templateService.GetDiseaseByIdAsync(id, cancellationToken);

            if (disease == null)
                return NotFound($"Disease with ID {id} not found");

            return Ok(disease);
        }

        /// <summary>
        /// Get disease by shortcut code (e.g., "DISAcne")
        /// </summary>
        [HttpGet("disease/shortcut/{shortcut}")]
        public async Task<ActionResult<DiseaseDto>> GetDiseaseByShortcut(
            string shortcut,
            CancellationToken cancellationToken)
        {
            var disease = await _templateService.GetDiseaseByShortcutAsync(shortcut, cancellationToken);

            if (disease == null)
                return NotFound($"Disease with shortcut '{shortcut}' not found");

            return Ok(disease);
        }

        /// <summary>
        /// Create a new disease template
        /// </summary>
        [HttpPost("disease")]
        public async Task<ActionResult<DiseaseDto>> CreateDisease(
            [FromBody] CreateDiseaseRequest request,
            CancellationToken cancellationToken)
        {
            var disease = await _templateService.CreateDiseaseAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetDiseaseById), new { id = disease.Id }, disease);
        }

        /// <summary>
        /// Update a disease template
        /// </summary>
        [HttpPut("disease/{id:guid}")]
        public async Task<ActionResult<DiseaseDto>> UpdateDisease(
            Guid id,
            [FromBody] UpdateDiseaseRequest request,
            CancellationToken cancellationToken)
        {
            var disease = await _templateService.UpdateDiseaseAsync(id, request, cancellationToken);

            if (disease == null)
                return NotFound($"Disease with ID {id} not found");

            return Ok(disease);
        }

        /// <summary>
        /// Delete a disease template (soft delete)
        /// </summary>
        [HttpDelete("disease/{id:guid}")]
        public async Task<ActionResult> DeleteDisease(
            Guid id,
            CancellationToken cancellationToken)
        {
            var deleted = await _templateService.DeleteDiseaseAsync(id, cancellationToken);

            if (!deleted)
                return NotFound($"Disease with ID {id} not found");

            return NoContent();
        }

        #endregion

        #region Symptom Endpoints

        /// <summary>
        /// Search symptom templates
        /// </summary>
        [HttpGet("symptom")]
        public async Task<ActionResult<PagedResult<SymptomListDto>>> SearchSymptoms(
            [FromQuery] string? searchTerm,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var request = new SearchRequest
            {
                SearchTerm = searchTerm,
                Page = page,
                PageSize = pageSize
            };

            var result = await _templateService.SearchSymptomsAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Get symptom by ID with full details (chief complaints, examinations, advices, drugs, investigations)
        /// </summary>
        [HttpGet("symptom/{id:guid}")]
        public async Task<ActionResult<SymptomDto>> GetSymptomById(
            Guid id,
            CancellationToken cancellationToken)
        {
            var symptom = await _templateService.GetSymptomByIdAsync(id, cancellationToken);

            if (symptom == null)
                return NotFound($"Symptom with ID {id} not found");

            return Ok(symptom);
        }

        /// <summary>
        /// Get symptom by shortcut code (e.g., "SYNAcute abdomen")
        /// </summary>
        [HttpGet("symptom/shortcut/{shortcut}")]
        public async Task<ActionResult<SymptomDto>> GetSymptomByShortcut(
            string shortcut,
            CancellationToken cancellationToken)
        {
            var symptom = await _templateService.GetSymptomByShortcutAsync(shortcut, cancellationToken);

            if (symptom == null)
                return NotFound($"Symptom with shortcut '{shortcut}' not found");

            return Ok(symptom);
        }

        /// <summary>
        /// Create a new symptom template
        /// </summary>
        [HttpPost("symptom")]
        public async Task<ActionResult<SymptomDto>> CreateSymptom(
            [FromBody] CreateSymptomRequest request,
            CancellationToken cancellationToken)
        {
            var symptom = await _templateService.CreateSymptomAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetSymptomById), new { id = symptom.Id }, symptom);
        }

        /// <summary>
        /// Update a symptom template
        /// </summary>
        [HttpPut("symptom/{id:guid}")]
        public async Task<ActionResult<SymptomDto>> UpdateSymptom(
            Guid id,
            [FromBody] UpdateSymptomRequest request,
            CancellationToken cancellationToken)
        {
            var symptom = await _templateService.UpdateSymptomAsync(id, request, cancellationToken);

            if (symptom == null)
                return NotFound($"Symptom with ID {id} not found");

            return Ok(symptom);
        }

        /// <summary>
        /// Delete a symptom template (soft delete)
        /// </summary>
        [HttpDelete("symptom/{id:guid}")]
        public async Task<ActionResult> DeleteSymptom(
            Guid id,
            CancellationToken cancellationToken)
        {
            var deleted = await _templateService.DeleteSymptomAsync(id, cancellationToken);

            if (!deleted)
                return NotFound($"Symptom with ID {id} not found");

            return NoContent();
        }

        #endregion

        #region Drug Section Endpoints

        /// <summary>
        /// Search drugs by name or brand
        /// </summary>
        [HttpGet("drugs")]
        public async Task<ActionResult<PagedResult<DrugListDto>>> SearchDrugs(
            [FromQuery] string? searchTerm,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var request = new SearchRequest
            {
                SearchTerm = searchTerm,
                Page = page,
                PageSize = pageSize
            };

            var result = await _templateService.SearchDrugsAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Get drug by ID
        /// </summary>
        [HttpGet("drugs/{id:guid}")]
        public async Task<ActionResult<DrugDto>> GetDrugById(
            Guid id,
            CancellationToken cancellationToken)
        {
            var drug = await _templateService.GetDrugByIdAsync(id, cancellationToken);

            if (drug == null)
                return NotFound($"Drug with ID {id} not found");

            return Ok(drug);
        }

        /// <summary>
        /// Create a new drug
        /// </summary>
        [HttpPost("drugs")]
        public async Task<ActionResult<DrugDto>> CreateDrug(
            [FromBody] CreateDrugRequest request,
            CancellationToken cancellationToken)
        {
            var drug = await _templateService.CreateDrugAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetDrugById), new { id = drug.Id }, drug);
        }

        /// <summary>
        /// Update a drug
        /// </summary>
        [HttpPut("drugs/{id:guid}")]
        public async Task<ActionResult<DrugDto>> UpdateDrug(
            Guid id,
            [FromBody] UpdateDrugRequest request,
            CancellationToken cancellationToken)
        {
            var drug = await _templateService.UpdateDrugAsync(id, request, cancellationToken);

            if (drug == null)
                return NotFound($"Drug with ID {id} not found");

            return Ok(drug);
        }

        /// <summary>
        /// Delete a drug (soft delete)
        /// </summary>
        [HttpDelete("drugs/{id:guid}")]
        public async Task<ActionResult> DeleteDrug(
            Guid id,
            CancellationToken cancellationToken)
        {
            var deleted = await _templateService.DeleteDrugAsync(id, cancellationToken);

            if (!deleted)
                return NotFound($"Drug with ID {id} not found");

            return NoContent();
        }

        #endregion

        #region Chief Complaint Section Endpoints

        /// <summary>
        /// Search chief complaints by description
        /// </summary>
        [HttpGet("chief-complaints")]
        public async Task<ActionResult<PagedResult<ChiefComplaintListDto>>> SearchChiefComplaints(
            [FromQuery] string? searchTerm,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var request = new SearchRequest
            {
                SearchTerm = searchTerm,
                Page = page,
                PageSize = pageSize
            };

            var result = await _templateService.SearchChiefComplaintsAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Get chief complaint by ID
        /// </summary>
        [HttpGet("chief-complaints/{id:guid}")]
        public async Task<ActionResult<ChiefComplaintDto>> GetChiefComplaintById(
            Guid id,
            CancellationToken cancellationToken)
        {
            var cc = await _templateService.GetChiefComplaintByIdAsync(id, cancellationToken);

            if (cc == null)
                return NotFound($"Chief complaint with ID {id} not found");

            return Ok(cc);
        }

        /// <summary>
        /// Create a new chief complaint
        /// </summary>
        [HttpPost("chief-complaints")]
        public async Task<ActionResult<ChiefComplaintDto>> CreateChiefComplaint(
            [FromBody] CreateChiefComplaintRequest request,
            CancellationToken cancellationToken)
        {
            var cc = await _templateService.CreateChiefComplaintAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetChiefComplaintById), new { id = cc.Id }, cc);
        }

        /// <summary>
        /// Update a chief complaint
        /// </summary>
        [HttpPut("chief-complaints/{id:guid}")]
        public async Task<ActionResult<ChiefComplaintDto>> UpdateChiefComplaint(
            Guid id,
            [FromBody] UpdateChiefComplaintRequest request,
            CancellationToken cancellationToken)
        {
            var cc = await _templateService.UpdateChiefComplaintAsync(id, request, cancellationToken);

            if (cc == null)
                return NotFound($"Chief complaint with ID {id} not found");

            return Ok(cc);
        }

        /// <summary>
        /// Delete a chief complaint (soft delete)
        /// </summary>
        [HttpDelete("chief-complaints/{id:guid}")]
        public async Task<ActionResult> DeleteChiefComplaint(
            Guid id,
            CancellationToken cancellationToken)
        {
            var deleted = await _templateService.DeleteChiefComplaintAsync(id, cancellationToken);

            if (!deleted)
                return NotFound($"Chief complaint with ID {id} not found");

            return NoContent();
        }

        #endregion

        #region Examination Section Endpoints

        /// <summary>
        /// Search examinations by description
        /// </summary>
        [HttpGet("examinations")]
        public async Task<ActionResult<PagedResult<ExaminationListDto>>> SearchExaminations(
            [FromQuery] string? searchTerm,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var request = new SearchRequest
            {
                SearchTerm = searchTerm,
                Page = page,
                PageSize = pageSize
            };

            var result = await _templateService.SearchExaminationsAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Get examination by ID
        /// </summary>
        [HttpGet("examinations/{id:guid}")]
        public async Task<ActionResult<ExaminationDto>> GetExaminationById(
            Guid id,
            CancellationToken cancellationToken)
        {
            var exam = await _templateService.GetExaminationByIdAsync(id, cancellationToken);

            if (exam == null)
                return NotFound($"Examination with ID {id} not found");

            return Ok(exam);
        }

        /// <summary>
        /// Create a new examination
        /// </summary>
        [HttpPost("examinations")]
        public async Task<ActionResult<ExaminationDto>> CreateExamination(
            [FromBody] CreateExaminationRequest request,
            CancellationToken cancellationToken)
        {
            var exam = await _templateService.CreateExaminationAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetExaminationById), new { id = exam.Id }, exam);
        }

        /// <summary>
        /// Update an examination
        /// </summary>
        [HttpPut("examinations/{id:guid}")]
        public async Task<ActionResult<ExaminationDto>> UpdateExamination(
            Guid id,
            [FromBody] UpdateExaminationRequest request,
            CancellationToken cancellationToken)
        {
            var exam = await _templateService.UpdateExaminationAsync(id, request, cancellationToken);

            if (exam == null)
                return NotFound($"Examination with ID {id} not found");

            return Ok(exam);
        }

        /// <summary>
        /// Delete an examination (soft delete)
        /// </summary>
        [HttpDelete("examinations/{id:guid}")]
        public async Task<ActionResult> DeleteExamination(
            Guid id,
            CancellationToken cancellationToken)
        {
            var deleted = await _templateService.DeleteExaminationAsync(id, cancellationToken);

            if (!deleted)
                return NotFound($"Examination with ID {id} not found");

            return NoContent();
        }

        #endregion

        #region Advice Section Endpoints

        /// <summary>
        /// Search advices by description
        /// </summary>
        [HttpGet("advices")]
        public async Task<ActionResult<PagedResult<AdviceListDto>>> SearchAdvices(
            [FromQuery] string? searchTerm,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var request = new SearchRequest
            {
                SearchTerm = searchTerm,
                Page = page,
                PageSize = pageSize
            };

            var result = await _templateService.SearchAdvicesAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Get advice by ID
        /// </summary>
        [HttpGet("advices/{id:guid}")]
        public async Task<ActionResult<AdviceDto>> GetAdviceById(
            Guid id,
            CancellationToken cancellationToken)
        {
            var advice = await _templateService.GetAdviceByIdAsync(id, cancellationToken);

            if (advice == null)
                return NotFound($"Advice with ID {id} not found");

            return Ok(advice);
        }

        /// <summary>
        /// Create a new advice
        /// </summary>
        [HttpPost("advices")]
        public async Task<ActionResult<AdviceDto>> CreateAdvice(
            [FromBody] CreateAdviceRequest request,
            CancellationToken cancellationToken)
        {
            var advice = await _templateService.CreateAdviceAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetAdviceById), new { id = advice.Id }, advice);
        }

        /// <summary>
        /// Update an advice
        /// </summary>
        [HttpPut("advices/{id:guid}")]
        public async Task<ActionResult<AdviceDto>> UpdateAdvice(
            Guid id,
            [FromBody] UpdateAdviceRequest request,
            CancellationToken cancellationToken)
        {
            var advice = await _templateService.UpdateAdviceAsync(id, request, cancellationToken);

            if (advice == null)
                return NotFound($"Advice with ID {id} not found");

            return Ok(advice);
        }

        /// <summary>
        /// Delete an advice (soft delete)
        /// </summary>
        [HttpDelete("advices/{id:guid}")]
        public async Task<ActionResult> DeleteAdvice(
            Guid id,
            CancellationToken cancellationToken)
        {
            var deleted = await _templateService.DeleteAdviceAsync(id, cancellationToken);

            if (!deleted)
                return NotFound($"Advice with ID {id} not found");

            return NoContent();
        }

        #endregion

        #region Report/Investigation Section Endpoints

        /// <summary>
        /// Search reports/investigations
        /// </summary>
        [HttpGet("reports")]
        public async Task<ActionResult<PagedResult<ReportListDto>>> SearchReports(
            [FromQuery] string? searchTerm,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            var request = new SearchRequest
            {
                SearchTerm = searchTerm,
                Page = page,
                PageSize = pageSize
            };

            var result = await _templateService.SearchReportsAsync(request, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Get all reports
        /// </summary>
        [HttpGet("reports/all")]
        public async Task<ActionResult<List<ReportDto>>> GetAllReports(CancellationToken cancellationToken)
        {
            var reports = await _templateService.GetAllReportsAsync(cancellationToken);
            return Ok(reports);
        }

        /// <summary>
        /// Get report by ID
        /// </summary>
        [HttpGet("reports/{id:guid}")]
        public async Task<ActionResult<ReportDto>> GetReportById(
            Guid id,
            CancellationToken cancellationToken)
        {
            var report = await _templateService.GetReportByIdAsync(id, cancellationToken);

            if (report == null)
                return NotFound($"Report with ID {id} not found");

            return Ok(report);
        }

        /// <summary>
        /// Get report by OID
        /// </summary>
        [HttpGet("reports/oid/{oid:int}")]
        public async Task<ActionResult<ReportDto>> GetReportByOID(
            int oid,
            CancellationToken cancellationToken)
        {
            var report = await _templateService.GetReportByOIDAsync(oid, cancellationToken);

            if (report == null)
                return NotFound($"Report with OID {oid} not found");

            return Ok(report);
        }

        /// <summary>
        /// Create a new report
        /// </summary>
        [HttpPost("reports")]
        public async Task<ActionResult<ReportDto>> CreateReport(
            [FromBody] CreateReportRequest request,
            CancellationToken cancellationToken)
        {
            var report = await _templateService.CreateReportAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetReportById), new { id = report.Id }, report);
        }

        /// <summary>
        /// Update a report
        /// </summary>
        [HttpPut("reports/{id:guid}")]
        public async Task<ActionResult<ReportDto>> UpdateReport(
            Guid id,
            [FromBody] UpdateReportRequest request,
            CancellationToken cancellationToken)
        {
            var report = await _templateService.UpdateReportAsync(id, request, cancellationToken);

            if (report == null)
                return NotFound($"Report with ID {id} not found");

            return Ok(report);
        }

        /// <summary>
        /// Delete a report (soft delete)
        /// </summary>
        [HttpDelete("reports/{id:guid}")]
        public async Task<ActionResult> DeleteReport(
            Guid id,
            CancellationToken cancellationToken)
        {
            var deleted = await _templateService.DeleteReportAsync(id, cancellationToken);

            if (!deleted)
                return NotFound($"Report with ID {id} not found");

            return NoContent();
        }

        #endregion
    }
}
