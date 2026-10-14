import { GoogleGenAI } from '@google/genai';
import { config } from '../../config/env.js';

/**
 * Thin wrapper around the official @google/genai SDK.
 * The rest of the app only needs  client.generateJson({ system, prompt, schema }) → object.
 *
 * Tests replace the real client with a fake one (setGeminiClientFactory), so the whole
 * AI flow (retry, validation, cache, limits, fallback) is tested without calling Google.
 */

export class AiResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AiResponseError';
  }
}

let factoryOverride = null;
let realClient = null;

/** Tests only: pass a function that returns a fake client, or null to restore the real one. */
export const setGeminiClientFactory = (factory) => {
  factoryOverride = factory;
};

const createRealClient = () => {
  const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  return {
    model: config.gemini.model,
    async generateJson({ system, prompt, schema, temperature = 0.6 }) {
      const response = await ai.models.generateContent({
        model: config.gemini.model,
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          temperature,
          httpOptions: { timeout: config.gemini.timeoutMs },
        },
      });
      const text = response.text;
      if (!text) throw new AiResponseError('Gemini returned an empty answer.');
      try {
        return JSON.parse(text);
      } catch {
        throw new AiResponseError('Gemini returned text that is not valid JSON.');
      }
    },
  };
};

/** The Gemini client, or null when no GEMINI_API_KEY is configured. */
export const getGeminiClient = () => {
  if (factoryOverride) return factoryOverride();
  if (!config.gemini.apiKey) return null;
  realClient ??= createRealClient();
  return realClient;
};

/** Short, human explanation of a Gemini failure (shown to the user as a notice). */
export const describeGeminiError = (err, model = config.gemini.model) => {
  const status = Number(err?.status ?? err?.code);
  const message = String(err?.message ?? '');
  if (err?.name === 'AbortError' || /timed? ?out|timeout/i.test(message)) return 'Gemini took too long to answer';
  if (status === 429 || /quota|rate limit|RESOURCE_EXHAUSTED/i.test(message)) return 'Gemini’s free-tier limit is used up for now';
  if (/API key not valid|API_KEY_INVALID/i.test(message) || status === 401) return 'the Gemini API key is not valid (check GEMINI_API_KEY)';
  if (status === 404 || /not found/i.test(message)) return `the Gemini model "${model}" was not found (check GEMINI_MODEL)`;
  if (status === 403) return 'Gemini refused the request (check the API key permissions)';
  if (status >= 500) return 'Gemini is having trouble right now';
  if (err?.name === 'AiResponseError' || err?.name === 'ItineraryError') return 'Gemini’s answer did not pass our checks';
  return 'Gemini could not be reached';
};
