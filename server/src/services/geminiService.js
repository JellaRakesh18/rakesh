import { GoogleGenAI } from '@google/genai';
import { env, isGeminiConfigured } from '../config/env.js';
import { AppError } from '../middleware/errorMiddleware.js';

let clientInstance = null;

function getClient() {
  if (!isGeminiConfigured()) {
    throw new AppError(
      'GEMINI_API_KEY is not configured on the backend. Add a valid GEMINI_API_KEY in server/.env.',
      503,
      'GEMINI_NOT_CONFIGURED'
    );
  }
  if (!clientInstance) {
    clientInstance = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return clientInstance;
}

export async function generateStructuredJson({
  systemInstruction,
  prompt,
  temperature = 0.2,
}) {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '';
    if (!rawText.trim()) {
      throw new Error('Gemini returned an empty JSON response.');
    }

    // Strip markdown code fences if present despite responseMimeType
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.status === 429) {
      throw new AppError('Gemini API rate limit exceeded. Please retry shortly.', 429, 'GEMINI_RATE_LIMIT');
    }
    throw new AppError(`Gemini AI request failed: ${err.message}`, 502, 'GEMINI_ERROR');
  }
}

export async function generateWithTools({
  systemInstruction,
  contents,
  declarations,
  temperature = 0.2,
}) {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents,
      config: {
        systemInstruction,
        temperature,
        tools: [{ functionDeclarations: declarations }],
      },
    });

    const candidateContent = response.candidates?.[0]?.content || null;
    const functionCalls = Array.isArray(response.functionCalls)
      ? response.functionCalls
      : (candidateContent?.parts || [])
          .filter((p) => Boolean(p.functionCall))
          .map((p) => p.functionCall);

    return {
      text: response.text || '',
      functionCalls,
      candidateContent,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.status === 429) {
      const rateErr = new AppError('Gemini API rate limit exceeded.', 429, 'GEMINI_RATE_LIMIT');
      rateErr.retryable = true;
      throw rateErr;
    }
    throw new AppError(`Gemini orchestration call failed: ${err.message}`, 502, 'GEMINI_ERROR');
  }
}

export async function generateFollowUpResponse({
  systemInstruction,
  contents,
  temperature = 0.25,
}) {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents,
      config: {
        systemInstruction,
        temperature,
      },
    });
    return response.text || 'I could not generate a follow-up answer from the available context.';
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Gemini follow-up failed: ${err.message}`, 502, 'GEMINI_ERROR');
  }
}
