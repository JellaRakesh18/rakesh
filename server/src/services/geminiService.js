import { GoogleGenAI } from '@google/genai';
import { env, isGeminiConfigured } from '../config/env.js';
import { AppError } from '../middleware/errorMiddleware.js';

let clientInstance = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getClient() {
  if (!isGeminiConfigured()) {
    const err = new AppError(
      'GEMINI_API_KEY is not configured on the backend. Add a valid GEMINI_API_KEY in server/.env.',
      503,
      'GEMINI_NOT_CONFIGURED'
    );
    err.exposeInProd = true;
    throw err;
  }
  if (!clientInstance) {
    clientInstance = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return clientInstance;
}

function getCandidateModels() {
  return [...new Set([env.geminiModel, 'gemini-3.5-flash-lite', 'gemini-3.7-flash'].filter(Boolean))];
}

function isTransientOrModelError(err) {
  const status = err?.status || err?.code;
  const msg = String(err?.message || '').toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    status === 404 ||
    status === 500 ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('not_found') ||
    msg.includes('no longer available')
  );
}

async function callWithRetryAndFallback(ai, buildParams) {
  const models = getCandidateModels();
  let lastErr = null;

  for (let i = 0; i < models.length; i += 1) {
    const model = models[i];
    try {
      return await ai.models.generateContent(buildParams(model));
    } catch (err) {
      lastErr = err;
      if (!isTransientOrModelError(err)) {
        throw err;
      }
      // Brief pause only on rate-limit before switching to next fallback model
      if (err?.status === 429) {
        await sleep(500);
      }
    }
    console.warn(`[gemini] Model "${model}" unavailable (${lastErr?.message?.slice(0, 120)}); switching to fallback...`);
  }

  throw lastErr;
}

function mapGeminiError(err, prefix) {
  if (err instanceof AppError) return err;
  const msg = String(err?.message || '');
  const lower = msg.toLowerCase();

  if (err?.status === 429 || lower.includes('429') || lower.includes('quota')) {
    const rateErr = new AppError(
      'Gemini API rate limit or quota reached. Please wait a moment and try again.',
      429,
      'GEMINI_RATE_LIMIT'
    );
    rateErr.exposeInProd = true;
    rateErr.retryable = true;
    return rateErr;
  }

  if (err?.status === 503 || lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand')) {
    const unavailErr = new AppError(
      'Gemini AI is temporarily experiencing high demand across fallback models. Please retry in a few seconds.',
      503,
      'GEMINI_UNAVAILABLE'
    );
    unavailErr.exposeInProd = true;
    unavailErr.retryable = true;
    return unavailErr;
  }

  const mapped = new AppError(`${prefix}: ${msg}`, 502, 'GEMINI_ERROR');
  return mapped;
}

export async function generateStructuredJson({
  systemInstruction,
  prompt,
  temperature = 0.2,
}) {
  const ai = getClient();
  try {
    const response = await callWithRetryAndFallback(ai, (model) => ({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature,
        responseMimeType: 'application/json',
      },
    }));

    const rawText = response.text || '';
    if (!rawText.trim()) {
      throw new Error('Gemini returned an empty JSON response.');
    }

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    throw mapGeminiError(err, 'Gemini AI request failed');
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
    const response = await callWithRetryAndFallback(ai, (model) => ({
      model,
      contents,
      config: {
        systemInstruction,
        temperature,
        tools: [{ functionDeclarations: declarations }],
      },
    }));

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
    throw mapGeminiError(err, 'Gemini orchestration call failed');
  }
}

export async function generateFollowUpResponse({
  systemInstruction,
  contents,
  temperature = 0.25,
}) {
  const ai = getClient();
  try {
    const response = await callWithRetryAndFallback(ai, (model) => ({
      model,
      contents,
      config: {
        systemInstruction,
        temperature,
      },
    }));
    return response.text || 'I could not generate a follow-up answer from the available context.';
  } catch (err) {
    throw mapGeminiError(err, 'Gemini follow-up failed');
  }
}
