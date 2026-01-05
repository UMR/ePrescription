using Prescription.Application.Commands;
using Prescription.Application.Interface;
using Prescription.Domain.Services;

namespace Prescription.Application.Handlers
{
    public class StreamClinicalNoteHandler(
        IClinicalNoteService clinicalNoteService,
        IMedicalContextValidator validator)
    {
        private readonly IClinicalNoteService _clinicalNoteService = clinicalNoteService;
        private readonly IMedicalContextValidator _validator = validator;

        public IAsyncEnumerable<string> Handle(ClinicalNoteCommand command, CancellationToken cancellationToken)
        {
            if (!_validator.IsValidMedicalContext(command.ClinicalNote))
            {
                throw new InvalidOperationException(
                    "Only medical-related clinical notes are allowed. Please provide medical context such as patient symptoms, examination findings, or clinical information.");
            }

            return _clinicalNoteService.StreamClinicalNoteSummaryAsync(command, cancellationToken);
        }
    }
}
