import { ToolLog } from '../models/ToolLog.js';
import { env } from '../config/env.js';
import { webSearchDeclaration, runWebSearch } from './webSearchTool.js';
import { documentReaderDeclaration, runDocumentReader } from './documentReaderTool.js';
import {
  knowledgeBaseSearchDeclaration,
  runKnowledgeBaseSearch,
} from './knowledgeBaseSearchTool.js';
import { calculatorDeclaration, runCalculator } from './calculatorTool.js';

export const TOOL_DECLARATIONS = [
  webSearchDeclaration,
  documentReaderDeclaration,
  knowledgeBaseSearchDeclaration,
  calculatorDeclaration,
];

const TOOL_RUNNERS = {
  webSearch: runWebSearch,
  documentReader: runDocumentReader,
  knowledgeBaseSearch: runKnowledgeBaseSearch,
  calculator: runCalculator,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, timeoutMs, toolName) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => {
        const err = new Error(`Tool "${toolName}" timed out after ${timeoutMs}ms`);
        err.code = 'TOOL_TIMEOUT';
        reject(err);
      }, timeoutMs)
    ),
  ]);
}

function summarizeToolOutput(toolName, result) {
  if (!result) return 'No output returned.';
  if (toolName === 'webSearch') {
    const count = result.results?.length || 0;
    return count > 0
      ? `Found ${count} web sources for "${result.query}": ${result.results
          .slice(0, 2)
          .map((r) => r.title)
          .join(' | ')}`
      : `0 web results found for "${result.query}"`;
  }
  if (toolName === 'documentReader') {
    return `Read "${result.filename}" (${result.pageCount} pages, ${result.wordCount} words, excerpt ${result.excerpt?.length || 0} chars)`;
  }
  if (toolName === 'knowledgeBaseSearch') {
    return `Found ${result.matchCount || 0} knowledge base matches for "${result.query}"`;
  }
  if (toolName === 'calculator') {
    return `${result.expression} = ${result.result}`;
  }
  return 'Tool completed.';
}

/**
 * Validates, executes, retries (on transient errors), and logs a tool invocation to MongoDB.
 */
export async function executeToolWithLogging({
  toolName,
  rawArgs,
  userId,
  researchSessionId,
  stepNumber,
  agentAction,
  maxRetries = 2,
  onEvent,
}) {
  const runner = TOOL_RUNNERS[toolName];
  if (!runner) {
    throw new Error(`Unknown or disallowed tool requested: "${toolName}"`);
  }

  const logDoc = await ToolLog.create({
    userId,
    researchSessionId,
    stepNumber,
    agentAction,
    toolName,
    input: rawArgs || {},
    status: 'running',
    retryCount: 0,
    timestamp: new Date(),
  });

  if (onEvent) {
    onEvent('tool_started', {
      logId: logDoc._id.toString(),
      stepNumber,
      agentAction,
      toolName,
      input: rawArgs,
      status: 'running',
      timestamp: logDoc.timestamp,
    });
  }

  const start = Date.now();
  let lastError = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const output = await withTimeout(
        runner(rawArgs || {}, { userId, researchSessionId }),
        env.toolTimeoutMs,
        toolName
      );

      const duration = Date.now() - start;
      const outputSummary = summarizeToolOutput(toolName, output);

      logDoc.status = retryCount > 0 ? 'retried' : 'success';
      logDoc.retryCount = retryCount;
      logDoc.outputSummary = outputSummary;
      logDoc.duration = duration;
      await logDoc.save();

      if (onEvent) {
        onEvent('tool_completed', {
          logId: logDoc._id.toString(),
          stepNumber,
          agentAction,
          toolName,
          input: rawArgs,
          outputSummary,
          status: logDoc.status,
          retryCount,
          duration,
          timestamp: logDoc.timestamp,
        });
      }

      return {
        ok: true,
        output,
        outputSummary,
        sources: output.sources || [],
        duration,
        retryCount,
      };
    } catch (err) {
      lastError = err;
      const isZodOrNonRetryable =
        err?.name === 'ZodError' || err?.nonRetryable === true || attempt === maxRetries;

      if (isZodOrNonRetryable) {
        break;
      }

      retryCount += 1;
      await sleep(600 * retryCount);
    }
  }

  const duration = Date.now() - start;
  const errorMsg = lastError?.message || 'Tool execution failed';
  logDoc.status = 'failed';
  logDoc.retryCount = retryCount;
  logDoc.error = errorMsg;
  logDoc.outputSummary = `Failed after ${retryCount} retries: ${errorMsg}`;
  logDoc.duration = duration;
  await logDoc.save();

  if (onEvent) {
    onEvent('tool_failed', {
      logId: logDoc._id.toString(),
      stepNumber,
      agentAction,
      toolName,
      input: rawArgs,
      outputSummary: logDoc.outputSummary,
      error: errorMsg,
      status: 'failed',
      retryCount,
      duration,
      timestamp: logDoc.timestamp,
    });
  }

  return {
    ok: false,
    error: errorMsg,
    code: lastError?.code || 'TOOL_ERROR',
    sources: [],
    duration,
    retryCount,
  };
}
