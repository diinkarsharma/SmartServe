import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';




export const ai = genkit({
  plugins: [googleAI()], // This will use the GOOGLE_GENAI_API_KEY from .env
  model: 'googleai/gemini-2.0-flash',
});

