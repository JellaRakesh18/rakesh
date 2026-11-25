import { getDatabaseStatus } from '../config/db.js';
import { isGeminiConfigured, isTavilyConfigured } from '../config/env.js';

export function healthCheck(_req, res) {
  const dbStatus = getDatabaseStatus();
  const ok = dbStatus === 'connected';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    service: 'researchx-ai-backend',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    integrations: {
      gemini: isGeminiConfigured() ? 'configured' : 'missing_api_key',
      tavily: isTavilyConfigured() ? 'configured' : 'missing_api_key',
    },
  });
}
