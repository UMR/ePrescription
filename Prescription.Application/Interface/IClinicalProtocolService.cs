namespace Prescription.Application.Interface
{
    public interface IClinicalProtocolService
    {
        Task UpdateTreatmentProtocolAsync(Guid diseaseId, Guid drugId,
    string dosage, string frequency, string duration);

        Task UpdateInvestigationProtocolAsync(Guid diseaseId, Guid testId,
            bool isEssential, int priority);

        Task TrainFromHistoricalDataAsync();
        Task<decimal> GetTreatmentSuccessRateAsync(Guid diseaseId, Guid drugId);

    }
}