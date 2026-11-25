import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

export async function connectDatabase() {
  mongoose.set('strictQuery', true);

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

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log('[db] MongoDB connection established');
  return mongoose.connection;
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
