using System.ClientModel;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using OpenAI;
using OpenAI.Chat;
using Prescription.Application.Handlers;
using Prescription.Application.Interface;
using Prescription.Application.Services;
using Prescription.Domain.Services;

namespace Prescription.Application
{
    public static class ConfigureChatClient
    {
        public static WebApplicationBuilder AddApplicationServices(this WebApplicationBuilder builder)
        {
            var endpoint = builder.Configuration["GitHubAI:Endpoint"] ?? "https://models.github.ai/inference";
            var model = builder.Configuration["GitHubAI:Model"] ?? "openai/gpt-4o";
            var githubToken = builder.Configuration["GitHubAI:Token"] ?? throw new InvalidOperationException("GitHubAI:Token (GitHub Personal Access Token) is required");

            builder.Services.AddSingleton(sp =>
            {
                var credential = new ApiKeyCredential(githubToken);
                var options = new OpenAIClientOptions
                {
                    Endpoint = new Uri(endpoint)
                };
                var client = new OpenAIClient(credential, options);
                return client.GetChatClient(model);
            });

            builder.Services.AddSingleton<IMedicalContextValidator, MedicalContextValidator>();
            builder.Services.AddScoped<IClinicalNoteService, ClinicalNoteService>();
            builder.Services.AddScoped<IOcrService, OcrService>();
            builder.Services.AddScoped<StreamClinicalNoteHandler>();
            builder.Services.AddScoped<CompleteClinicalNoteHandler>();
            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    policy.WithOrigins("http://localhost:4200")
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            return builder;
        }
    }
}
