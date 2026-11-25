import { runAutonomousResearch } from './researchOrchestrator.js';
import { ResearchSession } from '../models/ResearchSession.js';

const activeRuns = new Map();

function getOrCreateRunEntry(sessionId) {
  const key = sessionId.toString();
  if (!activeRuns.has(key)) {
    activeRuns.set(key, {
      running: false,
      cancelled: false,
      paused: false,
      pauseResolvers: [],
      approvalResolver: null,
      sseClients: new Set(),
    });
  }
  return activeRuns.get(key);
}

export function subscribeToSessionStream(sessionId, res) {
  const entry = getOrCreateRunEntry(sessionId);
  entry.sseClients.add(res);
  return () => {
    entry.sseClients.delete(res);
    if (!entry.running && entry.sseClients.size === 0) {
      activeRuns.delete(sessionId.toString());
    }
  };
}

function emitToSession(sessionId, eventName, data) {
  const entry = activeRuns.get(sessionId.toString());
  if (!entry) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of entry.sseClients) {
    try {
      client.write(payload);
    } catch {
      entry.sseClients.delete(client);
    }
  }
}

export function startResearchRun({ sessionId, userId }) {
  const key = sessionId.toString();
  const entry = getOrCreateRunEntry(key);
  if (entry.running) {
    return false;
  }

  entry.running = true;
  entry.cancelled = false;
  entry.paused = false;

  const control = {
    isCancelled: () => entry.cancelled,
    isPaused: () => entry.paused,
    waitWhilePaused: () =>
      new Promise((resolve) => {
        if (!entry.paused || entry.cancelled) return resolve();
        entry.pauseResolvers.push(resolve);
      }),
    waitForApproval: () =>
      new Promise((resolve) => {
        entry.approvalResolver = resolve;
      }),
  };

  const emit = (eventName, payload) => emitToSession(key, eventName, payload);

  // Fire and forget in background; errors are captured & persisted inside runAutonomousResearch
  runAutonomousResearch({ sessionId, userId, control, emit })
    .catch((err) => {
      emit('error_event', { error: err.message });
    })
    .finally(() => {
      entry.running = false;
      if (entry.sseClients.size === 0) {
        activeRuns.delete(key);
      }
    });

  return true;
}

export async function pauseResearchRun(sessionId, userId) {
  const key = sessionId.toString();
  const entry = activeRuns.get(key);
  if (entry && entry.running) {
    entry.paused = true;
  }
  const session = await ResearchSession.findOneAndUpdate(
    { _id: sessionId, userId, status: 'running' },
    { status: 'paused' },
    { new: true }
  );
  if (session) emitToSession(key, 'status_change', { status: 'paused' });
  return session;
}

export async function resumeResearchRun(sessionId, userId) {
  const key = sessionId.toString();
  const entry = activeRuns.get(key);
  if (entry) {
    entry.paused = false;
    while (entry.pauseResolvers.length > 0) {
      const resolve = entry.pauseResolvers.shift();
      resolve();
    }
  }
  const session = await ResearchSession.findOneAndUpdate(
    { _id: sessionId, userId, status: 'paused' },
    { status: 'running' },
    { new: true }
  );
  if (session) emitToSession(key, 'status_change', { status: 'running' });
  return session;
}

export async function cancelResearchRun(sessionId, userId) {
  const key = sessionId.toString();
  const entry = activeRuns.get(key);
  if (entry) {
    entry.cancelled = true;
    entry.paused = false;
    while (entry.pauseResolvers.length > 0) {
      entry.pauseResolvers.shift()();
    }
    if (entry.approvalResolver) {
      entry.approvalResolver(false);
      entry.approvalResolver = null;
    }
  }
  const session = await ResearchSession.findOneAndUpdate(
    { _id: sessionId, userId, status: { $in: ['planned', 'running', 'paused', 'awaiting_approval'] } },
    { status: 'cancelled', errorMessage: 'Cancelled by user.' },
    { new: true }
  );
  if (session) emitToSession(key, 'status_change', { status: 'cancelled' });
  return session;
}

export function resolveApprovalRun(sessionId, approved) {
  const entry = activeRuns.get(sessionId.toString());
  if (entry && entry.approvalResolver) {
    const resolve = entry.approvalResolver;
    entry.approvalResolver = null;
    resolve(Boolean(approved));
    return true;
  }
  return false;
}
