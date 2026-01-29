
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Prescription.Application;
using Prescription.Application.Interface;
using Prescription.Application.Services;
using Prescription.Infrastructure;
using System;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy =
            System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = true;
    });

builder.AddApplicationServices();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<ISummaryService, SummaryService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Medical Prescription System API",
        Version = "v1",
        Description = "API for medical prescription system with AI-powered auto-fill and auto-complete features",
        Contact = new OpenApiContact
        {
            Name = "Medical System Team",
            Email = "support@medicalsystem.com"
        }
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});

builder.Services.AddMemoryCache();

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PrescriptionDbContext>();

    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Medical System API V1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseResponseCompression();
app.UseCors();
app.UseAuthorization();
app.MapControllers();

app.Run();