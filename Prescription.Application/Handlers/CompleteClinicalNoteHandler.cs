using Prescription.Application.Commands;
using Prescription.Application.DTOs;
using Prescription.Application.Interface;
using Prescription.Domain.Services;

namespace Prescription.Application.Handlers
{
    public class CompleteClinicalNoteHandler(
        IClinicalNoteService clinicalNoteService,
        IMedicalContextValidator validator)
    {
        private readonly IClinicalNoteService _clinicalNoteService = clinicalNoteService;
        private readonly IMedicalContextValidator _validator = validator;

        public async Task<ClinicalNoteSummary> Handle(ClinicalNoteCommand command)
        {
            if (!_validator.IsValidMedicalContext(command.ClinicalNote))
            {
                throw new InvalidOperationException(
                    "Only medical-related clinical notes are allowed. Please provide medical context such as patient symptoms, examination findings, or clinical information.");
            }

            return await _clinicalNoteService.CompleteClinicalNoteSummaryAsync(command);
        }
    }
}
