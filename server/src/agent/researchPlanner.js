import { z } from 'zod';
import { generateStructuredJson } from '../services/geminiService.js';

const generatedPlanSchema = z.object({
  title: z.string().min(3).max(200),
  subQuestions: z.array(z.string().min(3)).min(2).max(6),
  plan: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        description: z.string().max(500).default(''),
        toolHint: z
          .enum(['webSearch', 'documentReader', 'knowledgeBaseSearch', 'calculator', 'synthesis'])
          .default('webSearch'),
      })
    )
    .min(3)
    .max(8),
});

export async function createAutonomousResearchPlan({ question, depth, documents }) {
  const stepRange =
    depth === 'quick' ? '3 to 4' : depth === 'deep' ? '6 to 7' : '4 to 5';

  const docSummary =
    documents.length > 0
      ? documents
          .map(
            (d) =>
              `- Document ID: ${d._id.toString()} | Filename: "${d.filename}" | Pages: ${
                d.fileMetadata?.pageCount || 1
              }`
          )
          .join('\n')
      : 'None attached.';

  const systemInstruction = `You are the Research Planner for RESEARCHX AI.
Your job is to understand a user's research goal, decompose it into specific sub-questions, and create a clear, ordered, editable execution plan.
Available backend tools:
- webSearch: live web search via Tavily
- documentReader: read attached user PDFs by documentId
- knowledgeBaseSearch: search the user's prior research reports and uploaded documents
- calculator: deterministic mathematical calculations
- synthesis: cross-check evidence, identify conflicts, and draft the cited final report

Return ONLY valid JSON matching:
{
  "title": "Concise descriptive research title",
  "subQuestions": ["Sub-question 1", "Sub-question 2"],
  "plan": [
    {
      "title": "Short imperative step title",
      "description": "What this step will gather or verify",
      "toolHint": "webSearch | documentReader | knowledgeBaseSearch | calculator | synthesis"
    }
  ]
}`;

  const prompt = `Research Question: "${question}"
Research Depth: ${depth} (create ${stepRange} ordered steps)
Attached User PDF Documents:
${docSummary}

Requirements:
1. If PDF documents are attached, include a step using "documentReader" to inspect them.
2. Include at least one "webSearch" step for current external evidence (unless purely internal).
3. Include a "knowledgeBaseSearch" step when prior saved context could help.
4. Always make the final step a "synthesis" step to compare evidence, detect conflicts, and cite sources.`;

  const raw = await generateStructuredJson({
    systemInstruction,
    prompt,
    temperature: 0.2,
  });

  const parsed = generatedPlanSchema.parse(raw);

  const normalizedPlan = parsed.plan.map((step, index) => ({
    stepId: `step-${Date.now()}-${index + 1}`,
    order: index + 1,
    title: step.title,
    description: step.description,
    toolHint: step.toolHint,
    status: 'pending',
    resultSummary: '',
    error: '',
  }));

  return {
    title: parsed.title,
    subQuestions: parsed.subQuestions,
    plan: normalizedPlan,
  };
}
