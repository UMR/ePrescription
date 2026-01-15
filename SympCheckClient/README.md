# SympCheck

SympCheck is an AI-powered, interactive symptom assessment experience built with Angular and backed by a .NET analytics API. It guides users through a short conversational triage (up to five follow-up questions), collects vitals, and then submits everything to the diagnosis service to show ranked conditions with specialist recommendations.

## Key Features
 
- **Conversational Symptom Intake** – Streams follow-up questions through `InteractiveFlowService` and captures all answers for later review.
- **Vitals + Summary Review** – After the chat, users proceed through the stepper to enter age, gender, vitals, and review a summary of the conversation before analysis.
- **Condition Analysis** – `DiagnosisService` sends the collected payload to `/api/diagnosis/analyze` and renders the ranked conditions with details and “View Full Details” links.
- **Session Preservation** – `SymptomSessionStateService` caches the current interaction so users can navigate to a detail page and return without losing their answers.

## End-to-End Workflow

1. **Symptom Intake & Question Loop** – `InteractiveConversationComponent` bootstraps the chat by seeding `InteractiveFlowService.startConversation()`. That service posts to `environment.apiEndpoints.interactive`, records answers with `ConversationService`, and advances phases with `ConversationStateService` to enforce the five-question minimum.
2. **Automatic Step Transitions** – `SymptomFormComponent` watches `ConversationStateService.state$`. When the phase flips to `complete`, the component builds the conversational summary, refreshes the live sidebar history, and swaps the UI to the demographics step.
3. **Demographics Capture** – `DemographicsFormComponent` emits updated vitals, age, and gender as the user steps through the form. Those values are held in `SymptomFormComponent` until the user submits.
4. **Diagnosis Submission** – `SymptomFormComponent.submitAnalysis()` builds a `DiagnosisRequest` from the recorded answers plus demographics and calls `DiagnosisService.analyzeSymptomsAndConversation()`, which posts to `/api/diagnosis/analyze` and filters results by the configured score threshold.
5. **Results Review & Caching** – `DiagnosisResultsComponent` renders the ranked conditions. The parent stores the full `CachedDiagnosisState` via `DiagnosisCacheService`, which also mirrors the payload in `sessionStorage` so returning from condition details can rebuild the UI without replaying the interview.
6. **Condition Details & Theming** – Selecting a condition navigates to `ConditionDetailsComponent`, which relies on `ConditionService.getConditionDetails()` to fetch the API summary and uses `ThemeService` to stay in sync with the header’s light/dark preference.

## Getting Started

```bash
npm install
ng serve
```

The app runs at `http://localhost:4200/`. API calls go through the Angular proxy (`proxy.conf.json`) to avoid CORS with the .NET backend running on `http://localhost:5156`.
## Testing

- **Unit tests:** `npm run test -- --watch=false`
- **Linting / formatting:** Use your preferred tooling; no automated linter is configured.

## Building for Production

```bash
ng build --configuration production
```

Build artifacts land under `dist/` and are optimized for performance.

## Service Responsibilities

| Service | Responsibility |
| --- | --- |
| `InteractiveFlowService` | Orchestrates the interactive conversation, posts to the interactive API, and decides whether to show questions, prompts, or the final summary. |
| `ConversationService` | Tracks asked, skipped, and answered questions so duplicates can be skipped and the summary can be reconstructed later. |
| `ConversationStateService` | Maintains the finite-state machine (initial, asking, more-questions prompt, additional, complete) and enforces the five-question baseline plus optional follow-ups. |
| `DiagnosisService` | Posts the final payload to `/api/diagnosis/analyze`, normalizes varied response shapes, and filters conditions by the environment’s score threshold. |
| `DiagnosisCacheService` | Stores a `CachedDiagnosisState` in both memory (BehaviorSubject) and `sessionStorage` so symptom, demographics, and results survive navigation to condition details. |
| `ConditionService` | Calls `/api/diagnosis/conditions/:name` to load extended write-ups for each condition detail page. |
| `SymptomSessionStateService` | Exposes a BehaviorSubject that can persist the full multi-step session (symptoms, vitals, results) for future cross-route scenarios. |
| `ThemeService` | Persists the user’s light/dark preference in `localStorage` and updates the document attribute so the header and detail page stay synchronized. |

## Development Notes

- The loader animations mimic heartbeat ECGs.
- The stepper prevents proceeding to analysis until five questions are answered.
- The summary and diagnosis views remain visible in the review/results steps with detail buttons for each condition.

## Future Enhancements

- **Authentication & Profiles** – Add secure user sign-in with tenant-aware roles plus profile storage for demographics and recurring vitals.
- **Patient Data Integration** – Enrich the assessment with historical data pulled from internal EMR services or external partner APIs.
- **Exportable Diagnosis Reports** – Provide downloadable PDFs/JSON summaries of the final diagnosis, conversation history, vitals, and recommended specialists.


