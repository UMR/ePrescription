# SympCheck — Project Documentation

## Overview
SympCheck is an Angular-based interactive symptom assessment UI that:
- Streams follow-up questions for a short conversational triage.
- Collects vitals and a summarized conversation.
- Submits a final payload to a backend diagnosis API and displays ranked conditions with details.

## Architecture & Flow
1. User starts at the symptom intake screen (`SymptomFormComponent`).
2. Interactive questions are requested from the backend through `InteractiveFlowService`. Answers and skips are stored via `ConversationService` and summarized before moving on.
3. After the chat, vitals (age, sex, BP, heart rate) + conversation summary are sent to `DiagnosisService.analyzeSymptomsAndConversation` → `POST /api/diagnosis/analyze`.
4. Results are displayed as ranked conditions; clicking a condition opens `ConditionDetailsComponent` (data fetched by `ConditionService`).
5. Session state is cached using `SymptomSessionStateService.saveState()` so navigation preserves conversation and form state.

## Key Files & Symbols
- App entry/template: `src/app/app.html`, `src/app/app.ts`  
- Main form: `src/app/pages/symptom-form/symptom-form.component.ts`  
- Interactive flow: `src/app/services/interactive-flow.service.ts`  
- Diagnosis analysis: `src/app/services/diagnosis.service.ts`  
- Condition details: `src/app/services/condition.service.ts` & `src/app/pages/condition-details/condition-details.component.ts`  
- Session persistence: `src/app/services/symptom-session-state.service.ts`  
- Theme management: `src/app/services/theme.service.ts`  
- Environments: `src/environments/environment.ts`, `src/environments/environment.production.ts`  
- Styles: `src/styles.css` and component CSS files

## Environment (dev)
Current values in `src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5156',
  diagnosisThreshold: 0.25,
  apiEndpoints: {
    analysis: '/api/diagnosis/analyze',
    conditions: '/api/diagnosis/condition'
    interactive: '/api/diagnosis/interactive'

  }
};
```

API base + endpoints:
- Final analysis: `{environment.apiBaseUrl}{environment.apiEndpoints.analysis}`  
- Condition details: `{environment.apiBaseUrl}{environment.apiEndpoints.conditions}/:slug`  
- Interactive questions: `{environment.apiBaseUrl}{environment.apiEndpoints.interactive}`

## Running Locally
1. Install dependencies:
   npm install
2. Start dev server:
   ng serve
   - Default: http://localhost:4200
3. Update backend URL or thresholds in `src/environments/environment.ts` if needed.

## Testing
- Unit tests via Angular CLI:
  npm run test -- --watch=false

## Development Notes & Best Practices
- Interactive flow: `InteractiveFlowService` guards against duplicate questions and uses standard HTTP requests rather than SSE.
- Session preservation: call `SymptomSessionStateService.saveState()` before navigation to preserve progress.
- UI gating: stepper prevents final submission until required steps/vitals are filled.
- Theme toggling: uses `data-theme` attribute set by `ThemeService`; CSS variables live in `src/styles.css`.

## Troubleshooting
- CORS/backend unreachable: verify `environment.apiBaseUrl` and proxy config (`proxy.conf.json` if present).
- Repeated questions: verify the backend rotates to new prompts; `InteractiveFlowService` prevents duplicates after four retries.
- Empty results: check backend contract and filtering logic in `DiagnosisService.analyzeSymptomsAndConversation`.

## How to Contribute / Knowledge Share
- Document API changes in the corresponding service files and add/update unit tests (`*.spec.ts`).
- Keep environment values in `src/environments` and reference via `environment`.
- Prefer small PRs with tests for logic changes.

## References
- Project README: `README.md`  
- Angular config: `angular.json`  
- Environments: `src/environments/environment.ts`, `src/environments/environment.production.ts`