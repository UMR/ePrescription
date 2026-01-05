
using AgoraIO.Media;
using Microsoft.Extensions.Options;
using Telemedicine.Application.Options;

namespace Telemedicine.Application
{
    public class AgoraTokenService(IOptions<AgoraOptions> options)
    {
        private readonly AgoraOptions _options = options.Value;

        public string GetRTCTokenAsync(string channelName, uint uid)
        {
            var tokenExpirationInSeconds = (uint)(DateTimeOffset.UtcNow.ToUnixTimeSeconds() + _options.TokenLifetimeSeconds);
            var privilegeExpirationInSeconds = (uint)(DateTimeOffset.UtcNow.ToUnixTimeSeconds() + _options.TokenLifetimeSeconds);

            var getToken = RtcTokenBuilder2.buildTokenWithUid(
                _options.AppId,
                _options.AppCertificate,
                channelName,
                uid,
                RtcTokenBuilder2.Role.RolePublisher,
                tokenExpirationInSeconds,
                privilegeExpirationInSeconds
            );

            return getToken;
        }
    }
}
