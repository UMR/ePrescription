using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Prescription.Application.DTOs;
using Prescription.Application.Interface;
using Prescription.Domain.Entities;

namespace Prescription.Application.Services
{
    /// <summary>
    /// Service for managing prescription templates with normalized database structure
    /// </summary>
    public class PrescriptionTemplateService : IPrescriptionTemplateService
    {
        private readonly IApplicationDbContext _context;
        private readonly ITemplateParserService _parserService;

        public PrescriptionTemplateService(
            IApplicationDbContext context,
            ITemplateParserService parserService)
        {
            _context = context;
            _parserService = parserService;
        }

        #region Import Operations

        public async Task<ImportTemplatesResult> ImportFromSourceTableAsync(
            ImportTemplatesRequest request,
            CancellationToken cancellationToken = default)
        {
            var stopwatch = Stopwatch.StartNew();
            var result = new ImportTemplatesResult();

            try
            {
                var dbContext = _context as DbContext;
                if (dbContext == null)
                    throw new InvalidOperationException("DbContext is not available");

                // Clear existing data if requested
                if (request.ClearExisting)
                {
                    await ClearExistingDataAsync(dbContext, cancellationToken);
                }

                // Step 1: Import Reports from the source table
                var reportsImported = await ImportReportsAsync(dbContext, cancellationToken);
                result.ReportsImported = reportsImported;

                // Save reports first so they are available for lookup
                await _context.SaveChangesAsync(cancellationToken);

                // Get all reports for lookup (now includes the newly imported reports)
                var reportLookup = await _context.Reports
                    .ToDictionaryAsync(r => r.OID, r => r.Id, cancellationToken);

                // Dictionaries for deduplication
                var drugLookup = new Dictionary<string, Drug>(StringComparer.OrdinalIgnoreCase);
                var chiefComplaintLookup = new Dictionary<string, ChiefComplaint>(StringComparer.OrdinalIgnoreCase);
                var examinationLookup = new Dictionary<string, Examination>(StringComparer.OrdinalIgnoreCase);
                var adviceLookup = new Dictionary<string, Advice>(StringComparer.OrdinalIgnoreCase);

                // Step 2: Read and parse templates from Chacha_Prescription_Template_Master
                var rawTemplates = await ReadRawTemplatesAsync(dbContext, cancellationToken);

                foreach (var rawTemplate in rawTemplates)
                {
                    try
                    {
                        var parsedData = _parserService.ParseTemplate(rawTemplate);

                        // Skip unknown types and INV (those are just investigation references)
                        if (parsedData.Type == "UNKNOWN" || parsedData.Type == "INV")
                            continue;

                        if (parsedData.Type == "DIS")
                        {
                            ProcessDiseaseTemplate(parsedData, drugLookup, result);
                        }
                        else if (parsedData.Type == "SYN")
                        {
                            ProcessSymptomTemplate(
                                parsedData, drugLookup, chiefComplaintLookup,
                                examinationLookup, adviceLookup, reportLookup, result);
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Error parsing template ID {rawTemplate.Id}: {ex.Message}");
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);
                result.Success = true;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Errors.Add($"Import failed: {ex.Message}");
            }

            stopwatch.Stop();
            result.Duration = stopwatch.Elapsed;
            return result;
        }

        private void ProcessDiseaseTemplate(
            ParsedTemplateData parsedData,
            Dictionary<string, Drug> drugLookup,
            ImportTemplatesResult result)
        {
            // Create Disease entity
            var disease = new Disease
            {
                Id = Guid.NewGuid(),
                SourceId = parsedData.SourceId,
                Shortcut = parsedData.Shortcut,
                Name = parsedData.Name,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Diseases.Add(disease);
            result.DiseasesImported++;

            // Process medications
            foreach (var med in parsedData.Medications)
            {
                var drug = GetOrCreateDrug(med, drugLookup, result);

                var diseaseDrug = new DiseaseDrug
                {
                    Id = Guid.NewGuid(),
                    DiseaseId = disease.Id,
                    DrugId = drug.Id,
                    SortOrder = med.Order,
                    DosageInstructions = med.DosageInstruction,
                    DosageInstructionsEnglish = med.DosageInstructionEnglish,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.DiseaseDrugs.Add(diseaseDrug);
                result.DiseaseDrugLinksCreated++;
            }
        }

        private void ProcessSymptomTemplate(
            ParsedTemplateData parsedData,
            Dictionary<string, Drug> drugLookup,
            Dictionary<string, ChiefComplaint> chiefComplaintLookup,
            Dictionary<string, Examination> examinationLookup,
            Dictionary<string, Advice> adviceLookup,
            Dictionary<int, Guid> reportLookup,
            ImportTemplatesResult result)
        {
            // Create Symptom entity
            var symptom = new Symptom
            {
                Id = Guid.NewGuid(),
                SourceId = parsedData.SourceId,
                Shortcut = parsedData.Shortcut,
                Name = parsedData.Name,
                FollowUp = parsedData.FollowUp,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Symptoms.Add(symptom);
            result.SymptomsImported++;

            // Process Chief Complaints
            int ccOrder = 1;
            foreach (var ccText in parsedData.ChiefComplaints)
            {
                var cc = GetOrCreateChiefComplaint(ccText, chiefComplaintLookup, result);

                var symptomCC = new SymptomChiefComplaint
                {
                    Id = Guid.NewGuid(),
                    SymptomId = symptom.Id,
                    ChiefComplaintId = cc.Id,
                    SortOrder = ccOrder++,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.SymptomChiefComplaints.Add(symptomCC);
                result.SymptomChiefComplaintLinksCreated++;
            }

            // Process Examinations
            int examOrder = 1;
            foreach (var examText in parsedData.Examinations)
            {
                var exam = GetOrCreateExamination(examText, examinationLookup, result);

                var symptomExam = new SymptomExamination
                {
                    Id = Guid.NewGuid(),
                    SymptomId = symptom.Id,
                    ExaminationId = exam.Id,
                    SortOrder = examOrder++,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.SymptomExaminations.Add(symptomExam);
                result.SymptomExaminationLinksCreated++;
            }

            // Process Advices
            int adviceOrder = 1;
            foreach (var adviceText in parsedData.Advices)
            {
                var advice = GetOrCreateAdvice(adviceText, adviceLookup, result);

                var symptomAdvice = new SymptomAdvice
                {
                    Id = Guid.NewGuid(),
                    SymptomId = symptom.Id,
                    AdviceId = advice.Id,
                    SortOrder = adviceOrder++,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.SymptomAdvices.Add(symptomAdvice);
                result.SymptomAdviceLinksCreated++;
            }

            // Process Medications
            foreach (var med in parsedData.Medications)
            {
                var drug = GetOrCreateDrug(med, drugLookup, result);

                var symptomDrug = new SymptomDrug
                {
                    Id = Guid.NewGuid(),
                    SymptomId = symptom.Id,
                    DrugId = drug.Id,
                    SortOrder = med.Order,
                    DosageInstructions = med.DosageInstruction,
                    DosageInstructionsEnglish = med.DosageInstructionEnglish,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.SymptomDrugs.Add(symptomDrug);
                result.SymptomDrugLinksCreated++;
            }

            // Process Investigations
            int invOrder = 1;
            foreach (var invOid in parsedData.InvestigationOIDs)
            {
                if (reportLookup.TryGetValue(invOid, out var reportId))
                {
                    var symptomInv = new SymptomInvestigation
                    {
                        Id = Guid.NewGuid(),
                        SymptomId = symptom.Id,
                        ReportId = reportId,
                        SortOrder = invOrder++,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    };

                    _context.SymptomInvestigations.Add(symptomInv);
                    result.SymptomInvestigationLinksCreated++;
                }
                else
                {
                    result.InvestigationOIDsNotFound++;
                }
            }
        }

        private Drug GetOrCreateDrug(ParsedMedication med, Dictionary<string, Drug> drugLookup, ImportTemplatesResult result)
        {
            var key = med.FullName.Trim().ToLowerInvariant();

            if (!drugLookup.TryGetValue(key, out var drug))
            {
                drug = new Drug
                {
                    Id = Guid.NewGuid(),
                    Name = med.FullName,
                    Form = med.Form,
                    BrandName = med.BrandName,
                    Strength = med.Strength,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                drugLookup[key] = drug;
                _context.Drugs.Add(drug);
                result.DrugsImported++;
            }

            return drug;
        }

        private ChiefComplaint GetOrCreateChiefComplaint(string text, Dictionary<string, ChiefComplaint> lookup, ImportTemplatesResult result)
        {
            var key = text.Trim().ToLowerInvariant();

            if (!lookup.TryGetValue(key, out var cc))
            {
                cc = new ChiefComplaint
                {
                    Id = Guid.NewGuid(),
                    Description = text.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                lookup[key] = cc;
                _context.ChiefComplaints.Add(cc);
                result.ChiefComplaintsImported++;
            }

            return cc;
        }

        private Examination GetOrCreateExamination(string text, Dictionary<string, Examination> lookup, ImportTemplatesResult result)
        {
            var key = text.Trim().ToLowerInvariant();

            if (!lookup.TryGetValue(key, out var exam))
            {
                exam = new Examination
                {
                    Id = Guid.NewGuid(),
                    Description = text.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                lookup[key] = exam;
                _context.Examinations.Add(exam);
                result.ExaminationsImported++;
            }

            return exam;
        }

        private Advice GetOrCreateAdvice(string text, Dictionary<string, Advice> lookup, ImportTemplatesResult result)
        {
            var key = text.Trim().ToLowerInvariant();

            if (!lookup.TryGetValue(key, out var advice))
            {
                advice = new Advice
                {
                    Id = Guid.NewGuid(),
                    Description = text.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                lookup[key] = advice;
                _context.Advices.Add(advice);
                result.AdvicesImported++;
            }

            return advice;
        }

        private async Task ClearExistingDataAsync(DbContext dbContext, CancellationToken cancellationToken)
        {
            // Clear in correct order due to foreign keys
            await dbContext.Database.ExecuteSqlRawAsync(
                @"BEGIN TRAN;

                    DELETE FROM symptom_investigations;
                    DELETE FROM symptom_advices;
                    DELETE FROM symptom_examinations;
                    DELETE FROM symptom_chief_complaints;
                    DELETE FROM symptom_drugs;
                    DELETE FROM disease_drugs;

                    DELETE FROM symptoms;
                    DELETE FROM diseases;
                    DELETE FROM drugs;
                    DELETE FROM chief_complaints;
                    DELETE FROM examinations;
                    DELETE FROM advices;
                    DELETE FROM reports;

                COMMIT;
",
                cancellationToken);
        }

        private async Task<int> ImportReportsAsync(DbContext dbContext, CancellationToken cancellationToken)
        {
            // Read from the Report source table (matches Main DB - Tests.csv structure)
            var sql = @"
                        SELECT
                        [InvID]     AS [OID],
                        [Abbr]      AS [Abbreviation],
                        [Full]      AS [FullName],
                        [Default]   AS [DefaultValue],
                        [Normal]    AS [NormalRange],
                        COALESCE(TRY_CAST([Cost] AS DECIMAL(18,2)), 0) AS [Cost]
                        FROM dbo.[Report]
                        WHERE [InvID] IS NOT NULL;
                        ";

            var reports = new List<Report>();

            using (var command = dbContext.Database.GetDbConnection().CreateCommand())
            {
                command.CommandText = sql;
                await dbContext.Database.OpenConnectionAsync(cancellationToken);

                using var reader = await command.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    reports.Add(new Report
                    {
                        Id = Guid.NewGuid(),
                        OID = reader.GetInt16(0),
                        Abbreviation = reader.IsDBNull(1) ? "" : reader.GetString(1),
                        FullName = reader.IsDBNull(2) ? "" : reader.GetString(2),
                        DefaultValue = reader.IsDBNull(3) ? null : reader.GetString(3),
                        NormalRange = reader.IsDBNull(4) ? null : reader.GetString(4),
                        Cost = reader.IsDBNull(5) ? null : reader.GetDecimal(5),
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }
            }

            _context.Reports.AddRange(reports);
            return reports.Count;
        }

        private async Task<List<RawTemplateRecord>> ReadRawTemplatesAsync(DbContext dbContext, CancellationToken cancellationToken)
        {
            var templates = new List<RawTemplateRecord>();

            var sql = @"
                    SELECT [ID], [Disease], [Treatment]
                    FROM dbo.[Chacha_Prescription_Template_Master]
                    WHERE [Disease] IS NOT NULL
                    ";
            using (var command = dbContext.Database.GetDbConnection().CreateCommand())
            {
                command.CommandText = sql;

                using var reader = await command.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    templates.Add(new RawTemplateRecord
                    {
                        Id = reader.GetInt16(0),
                        Disease = reader.IsDBNull(1) ? "" : reader.GetString(1),
                        Treatment = reader.IsDBNull(2) ? "" : reader.GetString(2)
                    });
                }
            }

            return templates;
        }

        #endregion

        #region Disease Queries

        public async Task<PagedResult<DiseaseListDto>> SearchDiseasesAsync(
            SearchRequest request,
            CancellationToken cancellationToken = default)
        {
            var query = _context.Diseases
                .Where(d => d.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(d =>
                    d.Shortcut.ToLower().Contains(term) ||
                    d.Name.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(d => d.Name)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(d => new DiseaseListDto
                {
                    Id = d.Id,
                    SourceId = d.SourceId,
                    Shortcut = d.Shortcut,
                    Name = d.Name,
                    DrugCount = d.DiseaseDrugs.Count
                })
                .ToListAsync(cancellationToken);

            return new PagedResult<DiseaseListDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };
        }

        public async Task<DiseaseDto?> GetDiseaseByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var disease = await _context.Diseases
                .Include(d => d.DiseaseDrugs.OrderBy(dd => dd.SortOrder))
                    .ThenInclude(dd => dd.Drug)
                .FirstOrDefaultAsync(d => d.Id == id && d.IsActive, cancellationToken);

            return disease != null ? MapDiseaseToDto(disease) : null;
        }

        public async Task<DiseaseDto?> GetDiseaseByShortcutAsync(string shortcut, CancellationToken cancellationToken = default)
        {
            var disease = await _context.Diseases
                .Include(d => d.DiseaseDrugs.OrderBy(dd => dd.SortOrder))
                    .ThenInclude(dd => dd.Drug)
                .FirstOrDefaultAsync(d =>
                    d.Shortcut.ToLower() == shortcut.ToLower() && d.IsActive,
                    cancellationToken);

            return disease != null ? MapDiseaseToDto(disease) : null;
        }

        private DiseaseDto MapDiseaseToDto(Disease disease)
        {
            return new DiseaseDto
            {
                Id = disease.Id,
                SourceId = disease.SourceId,
                Shortcut = disease.Shortcut,
                Name = disease.Name,
                Drugs = disease.DiseaseDrugs.Select(dd => new DrugWithDosageDto
                {
                    Id = dd.Drug.Id,
                    SortOrder = dd.SortOrder,
                    Name = dd.Drug.Name,
                    Form = dd.Drug.Form,
                    BrandName = dd.Drug.BrandName,
                    Strength = dd.Drug.Strength,
                    DosageInstructions = dd.DosageInstructions,
                    DosageInstructionsEnglish = dd.DosageInstructionsEnglish
                }).ToList()
            };
        }

        #endregion

        #region Symptom Queries

        public async Task<PagedResult<SymptomListDto>> SearchSymptomsAsync(
            SearchRequest request,
            CancellationToken cancellationToken = default)
        {
            var query = _context.Symptoms
                .Where(s => s.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(s =>
                    s.Shortcut.ToLower().Contains(term) ||
                    s.Name.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(s => s.Name)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(s => new SymptomListDto
                {
                    Id = s.Id,
                    SourceId = s.SourceId,
                    Shortcut = s.Shortcut,
                    Name = s.Name,
                    ChiefComplaintCount = s.SymptomChiefComplaints.Count,
                    ExaminationCount = s.SymptomExaminations.Count,
                    AdviceCount = s.SymptomAdvices.Count,
                    DrugCount = s.SymptomDrugs.Count,
                    InvestigationCount = s.SymptomInvestigations.Count
                })
                .ToListAsync(cancellationToken);

            return new PagedResult<SymptomListDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };
        }

        public async Task<SymptomDto?> GetSymptomByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var symptom = await _context.Symptoms
                .Include(s => s.SymptomChiefComplaints.OrderBy(sc => sc.SortOrder))
                    .ThenInclude(sc => sc.ChiefComplaint)
                .Include(s => s.SymptomExaminations.OrderBy(se => se.SortOrder))
                    .ThenInclude(se => se.Examination)
                .Include(s => s.SymptomAdvices.OrderBy(sa => sa.SortOrder))
                    .ThenInclude(sa => sa.Advice)
                .Include(s => s.SymptomDrugs.OrderBy(sd => sd.SortOrder))
                    .ThenInclude(sd => sd.Drug)
                .Include(s => s.SymptomInvestigations.OrderBy(si => si.SortOrder))
                    .ThenInclude(si => si.Report)
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActive, cancellationToken);

            return symptom != null ? MapSymptomToDto(symptom) : null;
        }

        public async Task<SymptomDto?> GetSymptomByShortcutAsync(string shortcut, CancellationToken cancellationToken = default)
        {
            var symptom = await _context.Symptoms
                .Include(s => s.SymptomChiefComplaints.OrderBy(sc => sc.SortOrder))
                    .ThenInclude(sc => sc.ChiefComplaint)
                .Include(s => s.SymptomExaminations.OrderBy(se => se.SortOrder))
                    .ThenInclude(se => se.Examination)
                .Include(s => s.SymptomAdvices.OrderBy(sa => sa.SortOrder))
                    .ThenInclude(sa => sa.Advice)
                .Include(s => s.SymptomDrugs.OrderBy(sd => sd.SortOrder))
                    .ThenInclude(sd => sd.Drug)
                .Include(s => s.SymptomInvestigations.OrderBy(si => si.SortOrder))
                    .ThenInclude(si => si.Report)
                .FirstOrDefaultAsync(s =>
                    s.Shortcut.ToLower() == shortcut.ToLower() && s.IsActive,
                    cancellationToken);

            return symptom != null ? MapSymptomToDto(symptom) : null;
        }

        private SymptomDto MapSymptomToDto(Symptom symptom)
        {
            return new SymptomDto
            {
                Id = symptom.Id,
                SourceId = symptom.SourceId,
                Shortcut = symptom.Shortcut,
                Name = symptom.Name,
                FollowUp = symptom.FollowUp,
                ChiefComplaints = symptom.SymptomChiefComplaints.Select(sc => new ChiefComplaintDto
                {
                    Id = sc.ChiefComplaint.Id,
                    SortOrder = sc.SortOrder,
                    Description = sc.ChiefComplaint.Description
                }).ToList(),
                Examinations = symptom.SymptomExaminations.Select(se => new ExaminationDto
                {
                    Id = se.Examination.Id,
                    SortOrder = se.SortOrder,
                    Description = se.Examination.Description
                }).ToList(),
                Advices = symptom.SymptomAdvices.Select(sa => new AdviceDto
                {
                    Id = sa.Advice.Id,
                    SortOrder = sa.SortOrder,
                    Description = sa.Advice.Description
                }).ToList(),
                Drugs = symptom.SymptomDrugs.Select(sd => new DrugWithDosageDto
                {
                    Id = sd.Drug.Id,
                    SortOrder = sd.SortOrder,
                    Name = sd.Drug.Name,
                    Form = sd.Drug.Form,
                    BrandName = sd.Drug.BrandName,
                    Strength = sd.Drug.Strength,
                    DosageInstructions = sd.DosageInstructions,
                    DosageInstructionsEnglish = sd.DosageInstructionsEnglish
                }).ToList(),
                Investigations = symptom.SymptomInvestigations.Select(si => new ReportDto
                {
                    Id = si.Report.Id,
                    OID = si.Report.OID,
                    SortOrder = si.SortOrder,
                    Abbreviation = si.Report.Abbreviation,
                    FullName = si.Report.FullName,
                    DefaultValue = si.Report.DefaultValue,
                    NormalRange = si.Report.NormalRange,
                    Cost = si.Report.Cost
                }).ToList()
            };
        }

        #endregion

        #region Report Queries

        public async Task<List<ReportDto>> GetAllReportsAsync(CancellationToken cancellationToken = default)
        {
            return await _context.Reports
                .Where(r => r.IsActive)
                .OrderBy(r => r.FullName)
                .Select(r => new ReportDto
                {
                    Id = r.Id,
                    OID = r.OID,
                    Abbreviation = r.Abbreviation,
                    FullName = r.FullName,
                    DefaultValue = r.DefaultValue,
                    NormalRange = r.NormalRange,
                    Cost = r.Cost
                })
                .ToListAsync(cancellationToken);
        }

        public async Task<ReportDto?> GetReportByOIDAsync(int oid, CancellationToken cancellationToken = default)
        {
            var report = await _context.Reports
                .FirstOrDefaultAsync(r => r.OID == oid && r.IsActive, cancellationToken);

            return report != null ? new ReportDto
            {
                Id = report.Id,
                OID = report.OID,
                Abbreviation = report.Abbreviation,
                FullName = report.FullName,
                DefaultValue = report.DefaultValue,
                NormalRange = report.NormalRange,
                Cost = report.Cost
            } : null;
        }

        public async Task<ReportDto?> GetReportByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var report = await _context.Reports
                .FirstOrDefaultAsync(r => r.Id == id && r.IsActive, cancellationToken);

            return report != null ? new ReportDto
            {
                Id = report.Id,
                OID = report.OID,
                Abbreviation = report.Abbreviation,
                FullName = report.FullName,
                DefaultValue = report.DefaultValue,
                NormalRange = report.NormalRange,
                Cost = report.Cost
            } : null;
        }

        public async Task<PagedResult<ReportListDto>> SearchReportsAsync(SearchRequest request, CancellationToken cancellationToken = default)
        {
            var query = _context.Reports
                .Where(r => r.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(r =>
                    r.Abbreviation.ToLower().Contains(term) ||
                    r.FullName.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(r => r.FullName)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(r => new ReportListDto
                {
                    Id = r.Id,
                    OID = r.OID,
                    Abbreviation = r.Abbreviation,
                    FullName = r.FullName,
                    Cost = r.Cost,
                    SymptomCount = r.SymptomInvestigations.Count
                })
                .ToListAsync(cancellationToken);

            return new PagedResult<ReportListDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };
        }

        public async Task<ReportDto> CreateReportAsync(CreateReportRequest request, CancellationToken cancellationToken = default)
        {
            var report = new Report
            {
                Id = Guid.NewGuid(),
                OID = request.OID,
                Abbreviation = request.Abbreviation,
                FullName = request.FullName,
                DefaultValue = request.DefaultValue,
                NormalRange = request.NormalRange,
                Cost = request.Cost,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync(cancellationToken);

            return new ReportDto
            {
                Id = report.Id,
                OID = report.OID,
                Abbreviation = report.Abbreviation,
                FullName = report.FullName,
                DefaultValue = report.DefaultValue,
                NormalRange = report.NormalRange,
                Cost = report.Cost
            };
        }

        public async Task<ReportDto?> UpdateReportAsync(Guid id, UpdateReportRequest request, CancellationToken cancellationToken = default)
        {
            var report = await _context.Reports.FirstOrDefaultAsync(r => r.Id == id && r.IsActive, cancellationToken);
            if (report == null) return null;

            if (request.Abbreviation != null) report.Abbreviation = request.Abbreviation;
            if (request.FullName != null) report.FullName = request.FullName;
            if (request.DefaultValue != null) report.DefaultValue = request.DefaultValue;
            if (request.NormalRange != null) report.NormalRange = request.NormalRange;
            if (request.Cost.HasValue) report.Cost = request.Cost;

            report.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return new ReportDto
            {
                Id = report.Id,
                OID = report.OID,
                Abbreviation = report.Abbreviation,
                FullName = report.FullName,
                DefaultValue = report.DefaultValue,
                NormalRange = report.NormalRange,
                Cost = report.Cost
            };
        }

        public async Task<bool> DeleteReportAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var report = await _context.Reports.FirstOrDefaultAsync(r => r.Id == id && r.IsActive, cancellationToken);
            if (report == null) return false;

            report.IsActive = false;
            report.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion

        #region Disease CRUD

        public async Task<DiseaseDto> CreateDiseaseAsync(CreateDiseaseRequest request, CancellationToken cancellationToken = default)
        {
            var disease = new Disease
            {
                Id = Guid.NewGuid(),
                SourceId = _context.Diseases.Max(d => (int?)d.SourceId) != null ? _context.Diseases.Max(d => d.SourceId) + 1 : 1,
                Shortcut = request.Shortcut,
                Name = request.Name,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Diseases.Add(disease);

            int sortOrder = 1;
            foreach (var drugInput in request.Drugs)
            {
                var drug = await GetOrCreateDrugFromInputAsync(drugInput, cancellationToken);

                var diseaseDrug = new DiseaseDrug
                {
                    Id = Guid.NewGuid(),
                    DiseaseId = disease.Id,
                    DrugId = drug.Id,
                    SortOrder = drugInput.SortOrder > 0 ? drugInput.SortOrder : sortOrder++,
                    DosageInstructions = drugInput.DosageInstructions,
                    DosageInstructionsEnglish = drugInput.DosageInstructionsEnglish,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.DiseaseDrugs.Add(diseaseDrug);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return (await GetDiseaseByIdAsync(disease.Id, cancellationToken))!;
        }

        public async Task<DiseaseDto?> UpdateDiseaseAsync(Guid id, UpdateDiseaseRequest request, CancellationToken cancellationToken = default)
        {
            var disease = await _context.Diseases
                .Include(d => d.DiseaseDrugs)
                .FirstOrDefaultAsync(d => d.Id == id && d.IsActive, cancellationToken);

            if (disease == null) return null;

            if (request.Shortcut != null) disease.Shortcut = request.Shortcut;
            if (request.Name != null) disease.Name = request.Name;
            disease.UpdatedAt = DateTime.UtcNow;

            // If drugs are provided, replace existing
            if (request.Drugs != null)
            {
                // Remove existing links
                foreach (var dd in disease.DiseaseDrugs)
                {
                    dd.IsActive = false;
                }

                // Add new links
                int sortOrder = 1;
                foreach (var drugInput in request.Drugs)
                {
                    var drug = await GetOrCreateDrugFromInputAsync(drugInput, cancellationToken);

                    var diseaseDrug = new DiseaseDrug
                    {
                        Id = Guid.NewGuid(),
                        DiseaseId = disease.Id,
                        DrugId = drug.Id,
                        SortOrder = drugInput.SortOrder > 0 ? drugInput.SortOrder : sortOrder++,
                        DosageInstructions = drugInput.DosageInstructions,
                        DosageInstructionsEnglish = drugInput.DosageInstructionsEnglish,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    };

                    _context.DiseaseDrugs.Add(diseaseDrug);
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            return await GetDiseaseByIdAsync(disease.Id, cancellationToken);
        }

        public async Task<bool> DeleteDiseaseAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var disease = await _context.Diseases
                .Include(d => d.DiseaseDrugs)
                .FirstOrDefaultAsync(d => d.Id == id && d.IsActive, cancellationToken);

            if (disease == null) return false;

            disease.IsActive = false;
            disease.UpdatedAt = DateTime.UtcNow;

            foreach (var dd in disease.DiseaseDrugs)
            {
                dd.IsActive = false;
            }

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion

        #region Symptom CRUD

        public async Task<SymptomDto> CreateSymptomAsync(CreateSymptomRequest request, CancellationToken cancellationToken = default)
        {
            var symptom = new Symptom
            {
                Id = Guid.NewGuid(),
                SourceId = _context.Symptoms.Max(s => (int?)s.SourceId) != null ? _context.Symptoms.Max(s => s.SourceId) + 1 : 1,
                Shortcut = request.Shortcut,
                Name = request.Name,
                FollowUp = request.FollowUp,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Symptoms.Add(symptom);

            // Process Chief Complaints
            int ccOrder = 1;
            foreach (var ccText in request.ChiefComplaints)
            {
                var cc = await GetOrCreateChiefComplaintAsync(ccText, cancellationToken);
                _context.SymptomChiefComplaints.Add(new SymptomChiefComplaint
                {
                    Id = Guid.NewGuid(),
                    SymptomId = symptom.Id,
                    ChiefComplaintId = cc.Id,
                    SortOrder = ccOrder++,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            // Process Examinations
            int examOrder = 1;
            foreach (var examText in request.Examinations)
            {
                var exam = await GetOrCreateExaminationAsync(examText, cancellationToken);
                _context.SymptomExaminations.Add(new SymptomExamination
                {
                    Id = Guid.NewGuid(),
                    SymptomId = symptom.Id,
                    ExaminationId = exam.Id,
                    SortOrder = examOrder++,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            // Process Advices
            int adviceOrder = 1;
            foreach (var adviceText in request.Advices)
            {
                var advice = await GetOrCreateAdviceAsync(adviceText, cancellationToken);
                _context.SymptomAdvices.Add(new SymptomAdvice
                {
                    Id = Guid.NewGuid(),
                    SymptomId = symptom.Id,
                    AdviceId = advice.Id,
                    SortOrder = adviceOrder++,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            // Process Drugs
            int drugOrder = 1;
            foreach (var drugInput in request.Drugs)
            {
                var drug = await GetOrCreateDrugFromInputAsync(drugInput, cancellationToken);
                _context.SymptomDrugs.Add(new SymptomDrug
                {
                    Id = Guid.NewGuid(),
                    SymptomId = symptom.Id,
                    DrugId = drug.Id,
                    SortOrder = drugInput.SortOrder > 0 ? drugInput.SortOrder : drugOrder++,
                    DosageInstructions = drugInput.DosageInstructions,
                    DosageInstructionsEnglish = drugInput.DosageInstructionsEnglish,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            // Process Investigations
            int invOrder = 1;
            foreach (var oid in request.InvestigationOIDs)
            {
                var report = await _context.Reports.FirstOrDefaultAsync(r => r.OID == oid && r.IsActive, cancellationToken);
                if (report != null)
                {
                    _context.SymptomInvestigations.Add(new SymptomInvestigation
                    {
                        Id = Guid.NewGuid(),
                        SymptomId = symptom.Id,
                        ReportId = report.Id,
                        SortOrder = invOrder++,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            return (await GetSymptomByIdAsync(symptom.Id, cancellationToken))!;
        }

        public async Task<SymptomDto?> UpdateSymptomAsync(Guid id, UpdateSymptomRequest request, CancellationToken cancellationToken = default)
        {
            var symptom = await _context.Symptoms
                .Include(s => s.SymptomChiefComplaints)
                .Include(s => s.SymptomExaminations)
                .Include(s => s.SymptomAdvices)
                .Include(s => s.SymptomDrugs)
                .Include(s => s.SymptomInvestigations)
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActive, cancellationToken);

            if (symptom == null) return null;

            if (request.Shortcut != null) symptom.Shortcut = request.Shortcut;
            if (request.Name != null) symptom.Name = request.Name;
            if (request.FollowUp != null) symptom.FollowUp = request.FollowUp;
            symptom.UpdatedAt = DateTime.UtcNow;

            // Update Chief Complaints if provided
            if (request.ChiefComplaints != null)
            {
                foreach (var sc in symptom.SymptomChiefComplaints)
                    sc.IsActive = false;

                int ccOrder = 1;
                foreach (var ccText in request.ChiefComplaints)
                {
                    var cc = await GetOrCreateChiefComplaintAsync(ccText, cancellationToken);
                    _context.SymptomChiefComplaints.Add(new SymptomChiefComplaint
                    {
                        Id = Guid.NewGuid(),
                        SymptomId = symptom.Id,
                        ChiefComplaintId = cc.Id,
                        SortOrder = ccOrder++,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }
            }

            // Update Examinations if provided
            if (request.Examinations != null)
            {
                foreach (var se in symptom.SymptomExaminations)
                    se.IsActive = false;

                int examOrder = 1;
                foreach (var examText in request.Examinations)
                {
                    var exam = await GetOrCreateExaminationAsync(examText, cancellationToken);
                    _context.SymptomExaminations.Add(new SymptomExamination
                    {
                        Id = Guid.NewGuid(),
                        SymptomId = symptom.Id,
                        ExaminationId = exam.Id,
                        SortOrder = examOrder++,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }
            }

            // Update Advices if provided
            if (request.Advices != null)
            {
                foreach (var sa in symptom.SymptomAdvices)
                    sa.IsActive = false;

                int adviceOrder = 1;
                foreach (var adviceText in request.Advices)
                {
                    var advice = await GetOrCreateAdviceAsync(adviceText, cancellationToken);
                    _context.SymptomAdvices.Add(new SymptomAdvice
                    {
                        Id = Guid.NewGuid(),
                        SymptomId = symptom.Id,
                        AdviceId = advice.Id,
                        SortOrder = adviceOrder++,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }
            }

            // Update Drugs if provided
            if (request.Drugs != null)
            {
                foreach (var sd in symptom.SymptomDrugs)
                    sd.IsActive = false;

                int drugOrder = 1;
                foreach (var drugInput in request.Drugs)
                {
                    var drug = await GetOrCreateDrugFromInputAsync(drugInput, cancellationToken);
                    _context.SymptomDrugs.Add(new SymptomDrug
                    {
                        Id = Guid.NewGuid(),
                        SymptomId = symptom.Id,
                        DrugId = drug.Id,
                        SortOrder = drugInput.SortOrder > 0 ? drugInput.SortOrder : drugOrder++,
                        DosageInstructions = drugInput.DosageInstructions,
                        DosageInstructionsEnglish = drugInput.DosageInstructionsEnglish,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }
            }

            // Update Investigations if provided
            if (request.InvestigationOIDs != null)
            {
                foreach (var si in symptom.SymptomInvestigations)
                    si.IsActive = false;

                int invOrder = 1;
                foreach (var oid in request.InvestigationOIDs)
                {
                    var report = await _context.Reports.FirstOrDefaultAsync(r => r.OID == oid && r.IsActive, cancellationToken);
                    if (report != null)
                    {
                        _context.SymptomInvestigations.Add(new SymptomInvestigation
                        {
                            Id = Guid.NewGuid(),
                            SymptomId = symptom.Id,
                            ReportId = report.Id,
                            SortOrder = invOrder++,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = true
                        });
                    }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            return await GetSymptomByIdAsync(symptom.Id, cancellationToken);
        }

        public async Task<bool> DeleteSymptomAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var symptom = await _context.Symptoms
                .Include(s => s.SymptomChiefComplaints)
                .Include(s => s.SymptomExaminations)
                .Include(s => s.SymptomAdvices)
                .Include(s => s.SymptomDrugs)
                .Include(s => s.SymptomInvestigations)
                .FirstOrDefaultAsync(s => s.Id == id && s.IsActive, cancellationToken);

            if (symptom == null) return false;

            symptom.IsActive = false;
            symptom.UpdatedAt = DateTime.UtcNow;

            foreach (var sc in symptom.SymptomChiefComplaints) sc.IsActive = false;
            foreach (var se in symptom.SymptomExaminations) se.IsActive = false;
            foreach (var sa in symptom.SymptomAdvices) sa.IsActive = false;
            foreach (var sd in symptom.SymptomDrugs) sd.IsActive = false;
            foreach (var si in symptom.SymptomInvestigations) si.IsActive = false;

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion

        #region Drug CRUD

        public async Task<PagedResult<DrugListDto>> SearchDrugsAsync(SearchRequest request, CancellationToken cancellationToken = default)
        {
            var query = _context.Drugs
                .Where(d => d.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(d =>
                    d.Name.ToLower().Contains(term) ||
                    (d.BrandName != null && d.BrandName.ToLower().Contains(term)) ||
                    (d.Form != null && d.Form.ToLower().Contains(term)));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(d => d.Name)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(d => new DrugListDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    Form = d.Form,
                    BrandName = d.BrandName,
                    Strength = d.Strength,
                    DiseaseCount = d.DiseaseDrugs.Count(dd => dd.IsActive),
                    SymptomCount = d.SymptomDrugs.Count(sd => sd.IsActive)
                })
                .ToListAsync(cancellationToken);

            return new PagedResult<DrugListDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };
        }

        public async Task<DrugDto?> GetDrugByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var drug = await _context.Drugs.FirstOrDefaultAsync(d => d.Id == id && d.IsActive, cancellationToken);
            return drug != null ? new DrugDto
            {
                Id = drug.Id,
                Name = drug.Name,
                Form = drug.Form,
                BrandName = drug.BrandName,
                Strength = drug.Strength
            } : null;
        }

        public async Task<DrugDto> CreateDrugAsync(CreateDrugRequest request, CancellationToken cancellationToken = default)
        {
            var drug = new Drug
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Form = request.Form,
                BrandName = request.BrandName,
                Strength = request.Strength,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Drugs.Add(drug);
            await _context.SaveChangesAsync(cancellationToken);

            return new DrugDto
            {
                Id = drug.Id,
                Name = drug.Name,
                Form = drug.Form,
                BrandName = drug.BrandName,
                Strength = drug.Strength
            };
        }

        public async Task<DrugDto?> UpdateDrugAsync(Guid id, UpdateDrugRequest request, CancellationToken cancellationToken = default)
        {
            var drug = await _context.Drugs.FirstOrDefaultAsync(d => d.Id == id && d.IsActive, cancellationToken);
            if (drug == null) return null;

            if (request.Name != null) drug.Name = request.Name;
            if (request.Form != null) drug.Form = request.Form;
            if (request.BrandName != null) drug.BrandName = request.BrandName;
            if (request.Strength != null) drug.Strength = request.Strength;

            drug.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return new DrugDto
            {
                Id = drug.Id,
                Name = drug.Name,
                Form = drug.Form,
                BrandName = drug.BrandName,
                Strength = drug.Strength
            };
        }

        public async Task<bool> DeleteDrugAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var drug = await _context.Drugs.FirstOrDefaultAsync(d => d.Id == id && d.IsActive, cancellationToken);
            if (drug == null) return false;

            drug.IsActive = false;
            drug.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion

        #region Chief Complaint CRUD

        public async Task<PagedResult<ChiefComplaintListDto>> SearchChiefComplaintsAsync(SearchRequest request, CancellationToken cancellationToken = default)
        {
            var query = _context.ChiefComplaints
                .Where(c => c.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(c => c.Description.ToLower() == term);
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(c => c.Description)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(c => new ChiefComplaintListDto
                {
                    Id = c.Id,
                    Description = c.Description,
                    SymptomCount = c.SymptomChiefComplaints.Count(sc => sc.IsActive)
                })
                .ToListAsync(cancellationToken);

            return new PagedResult<ChiefComplaintListDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };
        }

        public async Task<ChiefComplaintDto?> GetChiefComplaintByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var cc = await _context.ChiefComplaints.FirstOrDefaultAsync(c => c.Id == id && c.IsActive, cancellationToken);
            return cc != null ? new ChiefComplaintDto { Id = cc.Id, Description = cc.Description } : null;
        }

        public async Task<ChiefComplaintDto> CreateChiefComplaintAsync(CreateChiefComplaintRequest request, CancellationToken cancellationToken = default)
        {
            var cc = new ChiefComplaint
            {
                Id = Guid.NewGuid(),
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.ChiefComplaints.Add(cc);
            await _context.SaveChangesAsync(cancellationToken);

            return new ChiefComplaintDto { Id = cc.Id, Description = cc.Description };
        }

        public async Task<ChiefComplaintDto?> UpdateChiefComplaintAsync(Guid id, UpdateChiefComplaintRequest request, CancellationToken cancellationToken = default)
        {
            var cc = await _context.ChiefComplaints.FirstOrDefaultAsync(c => c.Id == id && c.IsActive, cancellationToken);
            if (cc == null) return null;

            cc.Description = request.Description;
            cc.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return new ChiefComplaintDto { Id = cc.Id, Description = cc.Description };
        }

        public async Task<bool> DeleteChiefComplaintAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var cc = await _context.ChiefComplaints.FirstOrDefaultAsync(c => c.Id == id && c.IsActive, cancellationToken);
            if (cc == null) return false;

            cc.IsActive = false;
            cc.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion

        #region Examination CRUD

        public async Task<PagedResult<ExaminationListDto>> SearchExaminationsAsync(SearchRequest request, CancellationToken cancellationToken = default)
        {
            var query = _context.Examinations
                .Where(e => e.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(e => e.Description.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(e => e.Description)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(e => new ExaminationListDto
                {
                    Id = e.Id,
                    Description = e.Description,
                    SymptomCount = e.SymptomExaminations.Count(se => se.IsActive)
                })
                .ToListAsync(cancellationToken);

            return new PagedResult<ExaminationListDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };
        }

        public async Task<ExaminationDto?> GetExaminationByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var exam = await _context.Examinations.FirstOrDefaultAsync(e => e.Id == id && e.IsActive, cancellationToken);
            return exam != null ? new ExaminationDto { Id = exam.Id, Description = exam.Description } : null;
        }

        public async Task<ExaminationDto> CreateExaminationAsync(CreateExaminationRequest request, CancellationToken cancellationToken = default)
        {
            var exam = new Examination
            {
                Id = Guid.NewGuid(),
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Examinations.Add(exam);
            await _context.SaveChangesAsync(cancellationToken);

            return new ExaminationDto { Id = exam.Id, Description = exam.Description };
        }

        public async Task<ExaminationDto?> UpdateExaminationAsync(Guid id, UpdateExaminationRequest request, CancellationToken cancellationToken = default)
        {
            var exam = await _context.Examinations.FirstOrDefaultAsync(e => e.Id == id && e.IsActive, cancellationToken);
            if (exam == null) return null;

            exam.Description = request.Description;
            exam.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return new ExaminationDto { Id = exam.Id, Description = exam.Description };
        }

        public async Task<bool> DeleteExaminationAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var exam = await _context.Examinations.FirstOrDefaultAsync(e => e.Id == id && e.IsActive, cancellationToken);
            if (exam == null) return false;

            exam.IsActive = false;
            exam.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion

        #region Advice CRUD

        public async Task<PagedResult<AdviceListDto>> SearchAdvicesAsync(SearchRequest request, CancellationToken cancellationToken = default)
        {
            var query = _context.Advices
                .Where(a => a.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(request.SearchTerm))
            {
                var term = request.SearchTerm.ToLower();
                query = query.Where(a => a.Description.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(a => a.Description)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(a => new AdviceListDto
                {
                    Id = a.Id,
                    Description = a.Description,
                    SymptomCount = a.SymptomAdvices.Count(sa => sa.IsActive)
                })
                .ToListAsync(cancellationToken);

            return new PagedResult<AdviceListDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize
            };
        }

        public async Task<AdviceDto?> GetAdviceByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var advice = await _context.Advices.FirstOrDefaultAsync(a => a.Id == id && a.IsActive, cancellationToken);
            return advice != null ? new AdviceDto { Id = advice.Id, Description = advice.Description } : null;
        }

        public async Task<AdviceDto> CreateAdviceAsync(CreateAdviceRequest request, CancellationToken cancellationToken = default)
        {
            var advice = new Advice
            {
                Id = Guid.NewGuid(),
                Description = request.Description,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Advices.Add(advice);
            await _context.SaveChangesAsync(cancellationToken);

            return new AdviceDto { Id = advice.Id, Description = advice.Description };
        }

        public async Task<AdviceDto?> UpdateAdviceAsync(Guid id, UpdateAdviceRequest request, CancellationToken cancellationToken = default)
        {
            var advice = await _context.Advices.FirstOrDefaultAsync(a => a.Id == id && a.IsActive, cancellationToken);
            if (advice == null) return null;

            advice.Description = request.Description;
            advice.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return new AdviceDto { Id = advice.Id, Description = advice.Description };
        }

        public async Task<bool> DeleteAdviceAsync(Guid id, CancellationToken cancellationToken = default)
        {
            var advice = await _context.Advices.FirstOrDefaultAsync(a => a.Id == id && a.IsActive, cancellationToken);
            if (advice == null) return false;

            advice.IsActive = false;
            advice.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion

        #region Helper Methods

        private async Task<Drug> GetOrCreateDrugFromInputAsync(DrugDosageInput input, CancellationToken cancellationToken)
        {
            // If DrugId is provided, use existing drug
            if (input.DrugId.HasValue)
            {
                var existing = await _context.Drugs.FirstOrDefaultAsync(d => d.Id == input.DrugId && d.IsActive, cancellationToken);
                if (existing != null) return existing;
            }

            // Otherwise look for existing by name or create new
            if (!string.IsNullOrWhiteSpace(input.Name))
            {
                var existingByName = await _context.Drugs
                    .FirstOrDefaultAsync(d => d.Name.ToLower() == input.Name.ToLower() && d.IsActive, cancellationToken);
                if (existingByName != null) return existingByName;

                var newDrug = new Drug
                {
                    Id = Guid.NewGuid(),
                    Name = input.Name,
                    Form = input.Form,
                    BrandName = input.BrandName,
                    Strength = input.Strength,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.Drugs.Add(newDrug);
                return newDrug;
            }

            throw new ArgumentException("Drug must have either DrugId or Name");
        }

        private async Task<ChiefComplaint> GetOrCreateChiefComplaintAsync(string text, CancellationToken cancellationToken)
        {
            var existing = await _context.ChiefComplaints
                .FirstOrDefaultAsync(c => c.Description.ToLower() == text.ToLower().Trim() && c.IsActive, cancellationToken);
            if (existing != null) return existing;

            var cc = new ChiefComplaint
            {
                Id = Guid.NewGuid(),
                Description = text.Trim(),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _context.ChiefComplaints.Add(cc);
            return cc;
        }

        private async Task<Examination> GetOrCreateExaminationAsync(string text, CancellationToken cancellationToken)
        {
            var existing = await _context.Examinations
                .FirstOrDefaultAsync(e => e.Description.ToLower() == text.ToLower().Trim() && e.IsActive, cancellationToken);
            if (existing != null) return existing;

            var exam = new Examination
            {
                Id = Guid.NewGuid(),
                Description = text.Trim(),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _context.Examinations.Add(exam);
            return exam;
        }

        private async Task<Advice> GetOrCreateAdviceAsync(string text, CancellationToken cancellationToken)
        {
            var existing = await _context.Advices
                .FirstOrDefaultAsync(a => a.Description.ToLower() == text.ToLower().Trim() && a.IsActive, cancellationToken);
            if (existing != null) return existing;

            var advice = new Advice
            {
                Id = Guid.NewGuid(),
                Description = text.Trim(),
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _context.Advices.Add(advice);
            return advice;
        }

        #endregion


    }
}
