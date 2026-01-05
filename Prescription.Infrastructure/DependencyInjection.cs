using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Prescription.Application.Interface;
using Prescription.Application.Services;

namespace Prescription.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            services.AddDbContext<PrescriptionDbContext>(options =>
                options.UseSqlServer(connectionString, sql => sql.MigrationsAssembly("Prescription.Infrastructure"))
                .UseSnakeCaseNamingConvention()
                .EnableSensitiveDataLogging()
                .EnableDetailedErrors());

            services.AddScoped<IApplicationDbContext>(provider =>
                provider.GetRequiredService<PrescriptionDbContext>());
            services.AddScoped<ITemplateParserService, TemplateParserService>();
            services.AddScoped<IPrescriptionTemplateService, PrescriptionTemplateService>();

            return services;
        }
    }
}