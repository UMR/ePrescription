using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Prescription.Domain.Entities;

namespace Prescription.Application.Interface
{
    public interface IApplicationDbContext
    {
        // Master tables
        DbSet<Disease> Diseases { get; set; }
        DbSet<Symptom> Symptoms { get; set; }
        DbSet<Drug> Drugs { get; set; }
        DbSet<ChiefComplaint> ChiefComplaints { get; set; }
        DbSet<Examination> Examinations { get; set; }
        DbSet<Advice> Advices { get; set; }
        DbSet<Report> Reports { get; set; }

        // Junction tables for Disease
        DbSet<DiseaseDrug> DiseaseDrugs { get; set; }

        // Junction tables for Symptom
        DbSet<SymptomChiefComplaint> SymptomChiefComplaints { get; set; }
        DbSet<SymptomExamination> SymptomExaminations { get; set; }
        DbSet<SymptomAdvice> SymptomAdvices { get; set; }
        DbSet<SymptomDrug> SymptomDrugs { get; set; }
        DbSet<SymptomInvestigation> SymptomInvestigations { get; set; }

        DatabaseFacade Database { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}