import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  port: toInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'production'
      ? ''
      : 'dev_only_insecure_jwt_secret_change_in_env'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  maxUploadSizeMb: toInt(process.env.MAX_UPLOAD_SIZE_MB, 10),
  agentMaxIterations: {
    quick: toInt(process.env.AGENT_MAX_ITERATIONS_QUICK, 6),
    standard: toInt(process.env.AGENT_MAX_ITERATIONS_STANDARD, 10),
    deep: toInt(process.env.AGENT_MAX_ITERATIONS_DEEP, 16),
  },
  toolTimeoutMs: toInt(process.env.TOOL_TIMEOUT_MS, 15000),
  useInMemoryDb: process.env.USE_IN_MEMORY_DB === 'true',
};

export const isGeminiConfigured = () => Boolean(env.geminiApiKey && env.geminiApiKey.trim() && !env.geminiApiKey.includes('your_gemini'));
export const isTavilyConfigured = () => Boolean(env.tavilyApiKey && env.tavilyApiKey.trim() && !env.tavilyApiKey.includes('your_tavily'));

export function validateStartupConfig() {
  if (env.isProd && !env.jwtSecret) {
    throw new Error('JWT_SECRET must be set in production.');
  }
  if (!env.mongodbUri && !env.useInMemoryDb) {
    console.warn('[config] MONGODB_URI is not set. Set MONGODB_URI or USE_IN_MEMORY_DB=true for local testing.');
  }
}
