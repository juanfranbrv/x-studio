import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';

// Initialize Google AI provider with the API key
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Initialize Groq provider
const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

// Export the Gemini model to use for brand DNA analysis (Primary)
export const model = google('gemini-flash-latest');

// Export the Groq model (Fallback)
export const groqModel = groq('llama-3.1-8b-instant');
