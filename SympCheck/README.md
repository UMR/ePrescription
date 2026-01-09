SympAPI
=======

Overview
--------
SympAPI is a small .NET 8 Web API that interacts with an external LLM inference service to:
- run an interactive follow-up question flow (streaming),
- analyze symptoms and return ranked diagnostic suggestions,
- return detailed information about a medical condition.

The controller `DiagnosisController` is intentionally thin; all external calls, prompt construction, and JSON cleaning are performed in `Services/ExternalModelService` (interface: `IExternalModelService`).

Configuration
-------------
Set these keys in `appsettings.json` or environment variables:
- `GITHUB_TOKEN` - Bearer token for the external model API.
- `GITHUB_MODEL` - Model identifier (example: `openai/gpt-4.1-nano`).

Running
-------
From the project root:

```bash
dotnet run --project SympAPI.csproj
```

The API listens on the configured Kestrel ports; use the `Properties/launchSettings.json` values for development.

High-level flow
---------------
1. Controller validates the incoming request.
2. Controller calls methods on `IExternalModelService`:
   - `StreamInteractiveAsync` for streaming follow-up conversation (SSE chunks).
   - `AnalyzeDiagnosisAsync` to get a ranked list of likely conditions.
   - `GetConditionDetailsAsync` to get structured condition details.
3. The service builds prompts, calls the inference endpoint, extracts/repairs JSON from the LLM output, and returns typed DTOs to the controller.

Endpoints
---------
1) POST `/api/diagnosis/interactive`
- Purpose: run a streamed interactive follow-up session. The API forwards streamed model chunks to the client as Server-Sent Events (SSE).
- Request body: `SymptomRequest` JSON

Example request (`SymptomRequest`):
```json
{
  "Symptom": "Severe headache",
  "Age": 34,
  "Gender": "Female",
  "Temperature": 37.0,
  "BloodPressure": "120/80",
  "HeartRate": 72,
  "Answers": [
    { "Question": "When did it start?", "Answer": "2 days ago" }
  ],
  "SkippedQuestions": ["Do you smoke?"]
}
```
- Response: SSE stream with lines in the form `data: { ... }` (JSON chunk produced by the model). The final object may include a type `"complete"` and a summary.

2) POST `/api/diagnosis/analyze`
- Purpose: analyze collected answers and return a ranked list of probable diagnoses.
- Request body: `DiagnosisRequest` JSON (same fields as `SymptomRequest` but modeled as `DiagnosisRequest`)

Example request (`DiagnosisRequest`):
```json
{
  "Symptom": "Severe headache",
  "Age": 34,
  "Gender": "Female",
  "Temperature": 37.0,
  "BloodPressure": "120/80",
  "HeartRate": 72,
  "Answers": [
    { "Question": "When did it start?", "Answer": "2 days ago" }
  ]
}
```
- Response: JSON array of `DiagnosisResponse` objects

Example response (`DiagnosisResponse`):
```json
[
  {
    "Label": "Migraine",
    "Score": 0.82,
    "Icd": "G43.0",
    "Details": "Recurrent unilateral pulsatile headache with photophobia.",
    "Physician": "Neurology"
  },
  {
    "Label": "Tension-type headache",
    "Score": 0.10,
    "Icd": "G44.2",
    "Details": "Bilateral pressing pain, mild to moderate.",
    "Physician": "Primary Care"
  }
]
```
Notes: The service will try to repair, normalize, and validate the model output. If the model returns simple string-arrays (e.g. `["Migraine", ...]`) or empty placeholder entries, the service attempts to post-process and will retry a few times before failing with HTTP 500.

3) GET `/api/diagnosis/condition/{id}`
- Purpose: return structured detail for a specific condition ID.
- Example response (`ConditionDetailResponse`):
```json
{
  "Id": "asthma",
  "Name": "Asthma",
  "Specialties": ["Pulmonology","Allergy & Immunology"],
  "Description": "Asthma is a chronic inflammatory airway disorder with variable airflow obstruction.",
  "CommonCauses": ["Allergens","Exercise"],
  "RedFlags": ["Severe breathing difficulty"],
  "Investigations": ["Spirometry","Peak flow test"],
  "Disclaimer": "This information is not a diagnosis. Consult a physician."
}
```

Service implementation
----------------------
- `Services/ExternalModelService.cs` contains the logic to build prompts, call the external model API, stream results, extract/repair JSON (helpers: `ExtractFirstJsonBlock`, `FormattedJson`, `CleanJson`), and map to DTOs.
- `Controllers/DiagnosisController.cs` handles HTTP concerns and delegates to the service.

Error handling
--------------
- Client errors (bad request) return HTTP 400 with a JSON `{ "error": "message" }`.
- Rate limits from the external API are translated to HTTP 429 when detected.
- Parsing or inference failures return HTTP 500 with a brief message; the service logs raw model output for debugging.

Extending and testing
---------------------
- Register the service with DI in `Program.cs` (already done).
- Add unit tests by mocking `IHttpClientFactory` or replacing the HTTP call layer with an interface.
- Consider adding Polly-based resiliency and named `HttpClient` configuration for timeouts/retries.

Security and privacy
--------------------
- Avoid logging PII. The service logs model outputs to help debug parsing issues but you should scrub or restrict logs in production.
- Store tokens securely (environment variables, secret managers) rather than checked-in `appsettings.json` in production.

Contact
-------
This README was generated to document the current implementation and endpoints. For more changes (prompts, retries, or post-processing), update `Services/ExternalModelService.cs` and create unit tests for the behavior.
