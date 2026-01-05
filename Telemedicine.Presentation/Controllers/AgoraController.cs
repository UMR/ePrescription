using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Telemedicine.Application;
using Telemedicine.Application.Options;

namespace Telemedicine.Presentation.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AgoraController(ILogger<AgoraController> logger, AgoraTokenService tokenService, IOptions<AgoraOptions> options) : ControllerBase
    {
        private readonly ILogger<AgoraController> _logger = logger;
        private readonly AgoraTokenService _agoraTokenService = tokenService;
        private readonly AgoraOptions _agoraOptions = options.Value;

        [HttpGet("rtc-token")]
        public IActionResult GetRtcToken([FromQuery] string channelName, [FromQuery] string userId)
        {
            if (string.IsNullOrWhiteSpace(channelName) || string.IsNullOrWhiteSpace(userId))
                return BadRequest("channelName and userId are required.");

            if (!uint.TryParse(userId, out var uid))
                uid = (uint)Math.Abs(userId.GetHashCode());

            var token = _agoraTokenService.GetRTCTokenAsync(channelName, uid);

            return Ok(new
            {
                appId = _agoraOptions.AppId,
                channelName,
                uid,
                token,
                expiresIn = _agoraOptions.TokenLifetimeSeconds
            });
        }
    }
}