export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5156',
  diagnosisThreshold: 0.25,
  enableVerboseLogging: false,
  apiEndpoints: {
    analysis: '/api/diagnosis/analyze',
    conditions: '/api/diagnosis/condition',
    interactive: '/api/diagnosis/interactive',
  },
};
