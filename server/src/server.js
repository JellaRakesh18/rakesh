import { env, validateStartupConfig } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createApp } from './app.js';

async function start() {
  validateStartupConfig();
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] RESEARCHX AI listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
