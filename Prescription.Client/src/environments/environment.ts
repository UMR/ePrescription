import { SONIOX_AI_MODEL } from "../app/utils/soniox-constants";

export const environment = {
    production: false,
    apiUrl: 'http://localhost:5086/api',
    soniox: {
        apiKey: 'dd54d8952b404ff3a8115c037df4fba8a00767fa9c54b173637668e4efbfe59a',
        model: SONIOX_AI_MODEL,
        languageHints: ['en', 'bn']
    }
};
