using Microsoft.AspNetCore.Mvc;
using Prescription.Application.Commands;
using Prescription.Application.DTOs;
using Prescription.Application.Handlers;
using Prescription.Presentation.Utilities;

namespace Prescription.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly StreamClinicalNoteHandler _streamHandler;
        private readonly CompleteClinicalNoteHandler _completeHandler;
        private readonly ILogger<ChatController> _logger;

        public ChatController(
            StreamClinicalNoteHandler streamHandler,
            CompleteClinicalNoteHandler completeHandler,
            ILogger<ChatController> logger)
        {
            _streamHandler = streamHandler;
            _completeHandler = completeHandler;
            _logger = logger;
        }

        [HttpPost("stream")]
        public async Task StreamChat([FromBody] ChatRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Prompt))
            {
                Response.StatusCode = 400;
                await Response.WriteAsync("Clinical note is required", cancellationToken);
                return;
            }

            SseHelper.ConfigureSseResponse(Response);

            try
            {
                var command = new ClinicalNoteCommand { ClinicalNote = request.Prompt };

                await foreach (var chunk in _streamHandler.Handle(command, cancellationToken))
                {
                    await SseHelper.WriteDataAsync(Response, chunk, cancellationToken);
                }

                await SseHelper.WriteCompletionAsync(Response, cancellationToken);
            }
            catch (InvalidOperationException ex)
            {
                Response.StatusCode = 400;
                await Response.WriteAsync(ex.Message, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Stream cancelled by client");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during streaming");
                await SseHelper.WriteErrorAsync(Response, ex.Message, cancellationToken);
            }
        }

        [HttpPost("complete")]
        public async Task<IActionResult> CompleteChat([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Prompt))
            {
                return BadRequest(new { error = "Clinical note is required" });
            }

            try
            {
                var command = new ClinicalNoteCommand { ClinicalNote = request.Prompt };
                var result = await _completeHandler.Handle(command);

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during completion");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
