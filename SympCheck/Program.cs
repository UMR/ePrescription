using Serilog;
using SympAPI.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File(
        path: "Logs/app-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 14,
        shared: true
    )
    .CreateLogger();

builder.Host.UseSerilog();


builder.Services.AddHttpClient("HuggingFace", client =>
{
    client.BaseAddress = new Uri("https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli");
});


// register ExternalModelService and IHttpClientFactory usage
builder.Services.AddScoped<IExternalModelService, ExternalModelService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("Content-Type"); ;
    });
});

builder.Services.AddControllers();

var app = builder.Build();
app.UseCors("AllowAll");
app.MapControllers();

app.Run();
