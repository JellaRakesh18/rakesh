import axios from 'axios';
import { env, isTavilyConfigured } from '../config/env.js';
import { webSearchInputSchema, webSearchOutputSchema } from '../validators/toolValidators.js';
import { sanitizeUntrustedText } from '../services/pdfService.js';

export const webSearchDeclaration = {
  name: 'webSearch',
  description:
    'Search the live web using Tavily Search API to gather current articles, papers, reports, and factual evidence. Returns title, URL, snippet, and published date.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: {
        type: 'STRING',
        description: 'Focused search query string (2-300 chars).',
      },
      maxResults: {
        type: 'INTEGER',
        description: 'Number of results to return (1 to 8, default 5).',
      },
    },
    required: ['query'],
  },
};

export async function runWebSearch(rawArgs) {
  const args = webSearchInputSchema.parse(rawArgs);

  if (!isTavilyConfigured()) {
    const err = new Error(
      'TAVILY_API_KEY is not configured on the backend. Add a valid TAVILY_API_KEY in server/.env to enable live web search.'
    );
    err.code = 'MISSING_TAVILY_KEY';
    err.nonRetryable = true;
    throw err;
  }

  let response;
  try {
    response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: env.tavilyApiKey,
        query: args.query,
        search_depth: 'advanced',
        max_results: args.maxResults,
        include_answer: false,
        include_raw_content: false,
      },
      {
        timeout: env.toolTimeoutMs,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    if (err.response?.status === 429) {
      const rateErr = new Error('Tavily API rate limit exceeded.');
      rateErr.code = 'RATE_LIMIT';
      throw rateErr;
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      const authErr = new Error('Tavily API key is invalid or unauthorized.');
      authErr.code = 'TAVILY_AUTH_ERROR';
      authErr.nonRetryable = true;
      throw authErr;
    }
    throw new Error(`Web search failed: ${err.message}`);
  }

  const rawResults = Array.isArray(response.data?.results) ? response.data.results : [];
  const normalized = rawResults.map((item) => ({
    title: sanitizeUntrustedText(item.title || 'Untitled Source').slice(0, 220),
    url: typeof item.url === 'string' ? item.url : '',
    snippet: sanitizeUntrustedText(item.content || item.snippet || '').slice(0, 1200),
    publishedDate: typeof item.published_date === 'string' ? item.published_date : '',
  }));

  const validated = webSearchOutputSchema.parse({
    query: args.query,
    results: normalized,
  });

  if (validated.results.length === 0) {
    return {
      query: validated.query,
      results: [],
      message: 'No web search results found for this query. Try broadening or rephrasing the query.',
      sources: [],
    };
  }

  const sources = validated.results.map((r, idx) => ({
    id: `web-${Date.now()}-${idx + 1}`,
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    publishedDate: r.publishedDate,
    sourceType: 'web',
  }));

  return {
    query: validated.query,
    resultCount: validated.results.length,
    results: validated.results,
    sources,
  };
}
