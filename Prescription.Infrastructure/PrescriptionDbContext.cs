using Microsoft.EntityFrameworkCore;
using Prescription.Application.Interface;
using Prescription.Domain.Entities;

namespace Prescription.Infrastructure
{
    public class PrescriptionDbContext : DbContext, IApplicationDbContext
    {
        public PrescriptionDbContext(DbContextOptions<PrescriptionDbContext> options)
            : base(options)
        {
        }

        // Master tables
        public DbSet<Disease> Diseases { get; set; } = null!;
        public DbSet<Symptom> Symptoms { get; set; } = null!;
        public DbSet<Drug> Drugs { get; set; } = null!;
        public DbSet<ChiefComplaint> ChiefComplaints { get; set; } = null!;
        public DbSet<Examination> Examinations { get; set; } = null!;
        public DbSet<Advice> Advices { get; set; } = null!;
        public DbSet<Report> Reports { get; set; } = null!;

        // Junction tables for Disease
        public DbSet<DiseaseDrug> DiseaseDrugs { get; set; } = null!;

        // Junction tables for Symptom
        public DbSet<SymptomChiefComplaint> SymptomChiefComplaints { get; set; } = null!;
        public DbSet<SymptomExamination> SymptomExaminations { get; set; } = null!;
        public DbSet<SymptomAdvice> SymptomAdvices { get; set; } = null!;
        public DbSet<SymptomDrug> SymptomDrugs { get; set; } = null!;
        public DbSet<SymptomInvestigation> SymptomInvestigations { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Disease configuration
            modelBuilder.Entity<Disease>(entity =>
            {
                entity.ToTable("diseases");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.SourceId).IsUnique();
                entity.HasIndex(e => e.Shortcut).IsUnique();
                entity.Property(e => e.Shortcut).HasMaxLength(100).IsUnicode();
                entity.Property(e => e.Name).HasMaxLength(500).IsUnicode();
            });

            // Symptom configuration
            modelBuilder.Entity<Symptom>(entity =>
            {
                entity.ToTable("symptoms");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.SourceId).IsUnique();
                entity.HasIndex(e => e.Shortcut).IsUnique();
                entity.Property(e => e.Shortcut).HasMaxLength(200).IsUnicode();
                entity.Property(e => e.Name).HasMaxLength(500).IsUnicode();
                entity.Property(e => e.FollowUp).HasMaxLength(1000).IsUnicode();
            });

            // Drug configuration
            modelBuilder.Entity<Drug>(entity =>
            {
                entity.ToTable("drugs");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Name);
                entity.Property(e => e.Name).HasMaxLength(500).IsUnicode();
                entity.Property(e => e.Form).HasMaxLength(100).IsUnicode();
                entity.Property(e => e.BrandName).HasMaxLength(300).IsUnicode();
                entity.Property(e => e.Strength).HasMaxLength(200).IsUnicode();
            });

            // ChiefComplaint configuration
            modelBuilder.Entity<ChiefComplaint>(entity =>
            {
                entity.ToTable("chief_complaints");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Description).HasColumnType("nvarchar(max)");
            });

            // Examination configuration
            modelBuilder.Entity<Examination>(entity =>
            {
                entity.ToTable("examinations");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Description).HasColumnType("nvarchar(max)");
            });

            // Advice configuration
            modelBuilder.Entity<Advice>(entity =>
            {
                entity.ToTable("advices");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Description).HasColumnType("nvarchar(max)");
            });

            // Report configuration
            modelBuilder.Entity<Report>(entity =>
            {
                entity.ToTable("reports");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.OID).IsUnique();
                entity.HasIndex(e => e.Abbreviation);
                entity.Property(e => e.FullName).HasMaxLength(500).IsUnicode();
                entity.Property(e => e.Abbreviation).HasMaxLength(100).IsUnicode();
                entity.Property(e => e.DefaultValue).HasMaxLength(500).IsUnicode();
                entity.Property(e => e.NormalRange).HasMaxLength(500).IsUnicode();

                // Add this line for the Cost property
                entity.Property(e => e.Cost).HasPrecision(18, 2);
            });

            // DiseaseDrug junction table
            modelBuilder.Entity<DiseaseDrug>(entity =>
            {
                entity.ToTable("disease_drugs");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.DiseaseId, e.DrugId });
                entity.Property(e => e.DosageInstructions).HasColumnType("nvarchar(max)");
                entity.Property(e => e.DosageInstructionsEnglish).HasColumnType("nvarchar(max)");

                entity.HasOne(e => e.Disease)
                    .WithMany(d => d.DiseaseDrugs)
                    .HasForeignKey(e => e.DiseaseId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Drug)
                    .WithMany(d => d.DiseaseDrugs)
                    .HasForeignKey(e => e.DrugId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SymptomChiefComplaint junction table
            modelBuilder.Entity<SymptomChiefComplaint>(entity =>
            {
                entity.ToTable("symptom_chief_complaints");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.SymptomId, e.ChiefComplaintId });

                entity.HasOne(e => e.Symptom)
                    .WithMany(s => s.SymptomChiefComplaints)
                    .HasForeignKey(e => e.SymptomId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.ChiefComplaint)
                    .WithMany(c => c.SymptomChiefComplaints)
                    .HasForeignKey(e => e.ChiefComplaintId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SymptomExamination junction table
            modelBuilder.Entity<SymptomExamination>(entity =>
            {
                entity.ToTable("symptom_examinations");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.SymptomId, e.ExaminationId });

                entity.HasOne(e => e.Symptom)
                    .WithMany(s => s.SymptomExaminations)
                    .HasForeignKey(e => e.SymptomId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Examination)
                    .WithMany(e => e.SymptomExaminations)
                    .HasForeignKey(e => e.ExaminationId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SymptomAdvice junction table
            modelBuilder.Entity<SymptomAdvice>(entity =>
            {
                entity.ToTable("symptom_advices");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.SymptomId, e.AdviceId });

                entity.HasOne(e => e.Symptom)
                    .WithMany(s => s.SymptomAdvices)
                    .HasForeignKey(e => e.SymptomId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Advice)
                    .WithMany(a => a.SymptomAdvices)
                    .HasForeignKey(e => e.AdviceId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SymptomDrug junction table
            modelBuilder.Entity<SymptomDrug>(entity =>
            {
                entity.ToTable("symptom_drugs");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.SymptomId, e.DrugId });
                entity.Property(e => e.DosageInstructions).HasColumnType("nvarchar(max)");
                entity.Property(e => e.DosageInstructionsEnglish).HasColumnType("nvarchar(max)");

                entity.HasOne(e => e.Symptom)
                    .WithMany(s => s.SymptomDrugs)
                    .HasForeignKey(e => e.SymptomId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Drug)
                    .WithMany(d => d.SymptomDrugs)
                    .HasForeignKey(e => e.DrugId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // SymptomInvestigation junction table
            modelBuilder.Entity<SymptomInvestigation>(entity =>
            {
                entity.ToTable("symptom_investigations");
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => new { e.SymptomId, e.ReportId });

                entity.HasOne(e => e.Symptom)
                    .WithMany(s => s.SymptomInvestigations)
                    .HasForeignKey(e => e.SymptomId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Report)
                    .WithMany(r => r.SymptomInvestigations)
                    .HasForeignKey(e => e.ReportId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}