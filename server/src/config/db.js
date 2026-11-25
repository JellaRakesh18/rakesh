import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;
let listenersAttached = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[db] MongoDB reconnected.');
  });
}

export async function connectDatabase({ maxRetries = 3 } = {}) {
  mongoose.set('strictQuery', true);
  attachConnectionListeners();

  let uri = env.mongodbUri;

  if (!uri && env.useInMemoryDb && !env.isProd) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.log('[db] Connected to local MongoMemoryServer (development mode)');
  }

  if (!uri) {
    throw new Error('MONGODB_URI is required to connect to MongoDB.');
  }

  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log('[db] MongoDB connection established');
      return mongoose.connection;
    } catch (err) {
      lastError = err;
      console.warn(`[db] Connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await sleep(1500 * attempt);
      }
    }
  }

  throw lastError;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}
