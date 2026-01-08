import { SONIOX_AI_MODEL, SONIOX_API_KEY } from "../app/utils/soniox-constants";

export const environment = {
    production: false,
    apiUrl: 'http://localhost:5086/api',
    soniox: {
        apiKey: SONIOX_API_KEY,
        model: SONIOX_AI_MODEL,
        languageHints: ['en', 'bn']
    }
};
