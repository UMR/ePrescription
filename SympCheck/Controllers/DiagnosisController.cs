using Microsoft.AspNetCore.Mvc;
using SympAPI.Models;
using SympAPI.Services;
using System.Text.Json;

namespace SympAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DiagnosisController : ControllerBase
    {
        private readonly IExternalModelService _modelService;
        private readonly ILogger<DiagnosisController> _logger;

        public DiagnosisController(IExternalModelService modelService, ILogger<DiagnosisController> logger)
        {
            _modelService = modelService;
            _logger = logger;
        }

        [HttpPost("interactive")]
        public async Task<IActionResult> PostInteractiveSession([FromBody] SymptomRequest request, CancellationToken cancellationToken)
        {
            const int initMaxQuestions = 5;
            const int maxTotalFollowUps = 15;
            const string moreYesNoQuestion = "Would you like more follow-up questions?";
            const string numericAskQuestion = "How many additional follow-up questions would you like (enter a number)?";


            _logger.LogInformation("Received request: {Request}", JsonSerializer.Serialize(request));

            if (string.IsNullOrWhiteSpace(request?.Symptom))
            {
                return BadRequest(new { error = "Symptom input required" });
            }

            var answered = (request.Answers ?? new List<FollowUpAnswer>())
                .Where(a => !string.IsNullOrWhiteSpace(a.Answer) &&
                            !string.Equals(a.Answer, "Skipped", StringComparison.OrdinalIgnoreCase) &&
                            !string.Equals(a.Answer, "Prefers not to answer", StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (answered.Count < initMaxQuestions)
            {
                try
                {
                    var response = await _modelService.GetInteractiveResponseAsync(request, cancellationToken);
                    if (response == null)
                    {
                        return StatusCode(500, new { error = "Failed to get response from model" });
                    }
                    return Ok(response);
                }
                catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    _logger.LogWarning(httpEx, "Rate limit from model API while interactive session");
                    return StatusCode(429, new { error = "External API rate limit exceeded" });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during interactive session");
                    return StatusCode(500, new { error = "Internal server error during interactive session" });
                }
            }
            var moreAnswer = answered.FirstOrDefault(a => string.Equals(a.Question?.Trim(), moreYesNoQuestion, StringComparison.OrdinalIgnoreCase));
            if (moreAnswer == null)
            {
                // Ask the yes/no "Would you like more follow-up questions?"
                try
                {
                    var response = await _modelService.GetInteractiveResponseAsync(request, cancellationToken);
                    if (response == null) return StatusCode(500, new { error = "Failed to get response from model" });
                    return Ok(response);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error requesting yes/no follow-up question");
                    return StatusCode(500, new { error = "Internal server error" });
                }
            }

            // If user answered "No" or equivalent, return summary
            if (!string.Equals(moreAnswer.Answer?.Trim(), "Yes", StringComparison.OrdinalIgnoreCase))
            {
                return Ok(new SummaryResponse
                {
                    Symptom = request.Symptom,
                    Answers = answered,
                    SummaryText = "Follow-up finished."
                });
            }

            // User said "Yes" — check if they provided the numeric count
            var numericAnswer = answered.FirstOrDefault(a => string.Equals(a.Question?.Trim(), numericAskQuestion, StringComparison.OrdinalIgnoreCase));
            if (numericAnswer == null)
            {
                // Ask the numeric question
                try
                {
                    var response = await _modelService.GetInteractiveResponseAsync(request, cancellationToken);
                    if (response == null) return StatusCode(500, new { error = "Failed to get response from model" });
                    return Ok(response);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error requesting numeric follow-up question");
                    return StatusCode(500, new { error = "Internal server error" });
                }
            }

            // Parse numeric value
            if (!int.TryParse(numericAnswer.Answer?.Trim(), out var additionalCount) || additionalCount <= 0)
            {
                // If invalid number or zero, return summary
                return Ok(new SummaryResponse
                {
                    Symptom = request.Symptom,
                    Answers = answered,
                    SummaryText = "No additional follow-ups requested."
                });
            }

            var totalRequested = Math.Min(initMaxQuestions + additionalCount, maxTotalFollowUps);
            // Caller should pass back updated Answers between requests; here we simply proceed to request the next follow-up
            try
            {
                // Attach a hint for the service/model by including the desired remaining count as a pseudo-answer
                // (alternatively you can add a property to SymptomRequest; using Answers avoids DTO changes)
                var hint = new FollowUpAnswer { Question = "RequestedAdditionalFollowUps", Answer = totalRequested.ToString() };
                var cloned = new SymptomRequest
                {
                    Symptom = request.Symptom,
                    Age = request.Age,
                    Gender = request.Gender,
                    Temperature = request.Temperature,
                    BloodPressure = request.BloodPressure,
                    HeartRate = request.HeartRate,
                    SkippedQuestions = request.SkippedQuestions,
                    Answers = (request.Answers ?? new List<FollowUpAnswer>()).ToList()
                };
                cloned.Answers.Add(hint);

                var response = await _modelService.GetInteractiveResponseAsync(cloned, cancellationToken);
                if (response == null) return StatusCode(500, new { error = "Failed to get response from model" });
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during extended follow-ups");
                return StatusCode(500, new { error = "Internal server error during interactive session" });
            }
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeDiagnosis([FromBody] DiagnosisRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request?.Symptom))
                return BadRequest(new { error = "Symptom is required" });

            try
            {
                var conditions = await _modelService.DiagnoseSymptomsAsync(request, cancellationToken);
                return Ok(conditions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error analyzing diagnosis");
                return StatusCode(500, new { error = "Internal server error analyzing diagnosis" });
            }
        }

        [HttpGet("condition/{id}")]
        public async Task<IActionResult> GetConditionDetails(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { error = "Condition ID is required" });

            try
            {
                var condition = await _modelService.GetConditionDetailsAsync(id, cancellationToken);
                if (condition == null) return BadRequest(new { error = "Empty or invalid response from inference API" });
                return Ok(condition);
            }
            catch (InvalidOperationException inv)
            {
                return StatusCode(500, new { error = inv.Message });
            }
            catch (HttpRequestException httpEx) when (httpEx.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning(httpEx, "Rate limit hit from external API");
                return StatusCode(429, new { error = "External API rate limit exceeded" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
