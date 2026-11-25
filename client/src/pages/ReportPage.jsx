import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  RotateCw,
  BookOpen,
  Activity,
  Printer,
  FileJson,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { researchService } from '../services/researchService';
import { ReportViewer } from '../components/research/ReportViewer';
import { ExecutionTrace } from '../components/research/ExecutionTrace';
import { FollowUpChat } from '../components/research/FollowUpChat';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { StatusBadge } from '../components/common/StatusBadge';

export function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [toolLogs, setToolLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('report');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await researchService.getSession(id);
      setSession(data.session);
      setToolLogs(data.toolLogs || []);
      setMessages(data.conversation?.messages || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load research report.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const exportMarkdown = () => {
    if (!session?.report) return;
    const r = session.report;
    const md = [
      `# ${r.title}`,
      `**Question:** ${session.question}`,
      `## Executive Summary\n${r.executiveSummary}`,
      `## Methodology\n${r.methodology}`,
      `## Key Findings\n${(r.keyFindings || [])
        .map((f, i) => `${i + 1}. **(${f.confidence})** ${f.finding} [${(f.citations || []).join(', ')}]`)
        .join('\n')}`,
      `## Detailed Explanations\n${(r.detailedExplanations || [])
        .map((d) => `### ${d.sectionTitle}\n${d.content}`)
        .join('\n\n')}`,
      `## Conflicting Information\n${(r.conflictingInformation || [])
        .map((c) => `- **${c.topic}**: ${c.sourceA} claims "${c.claimA}" vs ${c.sourceB} claims "${c.claimB}". ${c.explanation}`)
        .join('\n') || 'None detected.'}`,
      `## Limitations\n${(r.limitations || []).map((l) => `- ${l}`).join('\n')}`,
      `## Open Research Questions\n${(r.openResearchQuestions || []).map((q) => `- ${q}`).join('\n')}`,
      `## Conclusion\n${r.conclusion}`,
      `## References\n${(r.references || [])
        .map((ref) => `- [${ref.id}] ${ref.title}${ref.url ? ` — ${ref.url}` : ''}`)
        .join('\n')}`,
    ].join('\n\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(r.title || 'research-report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    if (!session?.report) return;
    const blob = new Blob([JSON.stringify(session.report, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(session.report.title || 'research-report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/history"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Research Report</span>
                {session && <StatusBadge status={session.status} />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {session?.question}
              </p>
            </div>
          </div>

          {session && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate(`/workspace?rerunId=${session._id}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
              >
                <RotateCw className="w-3.5 h-3.5" /> Rerun Investigation
              </button>
              {session.report && (
                <>
                  <button
                    onClick={exportMarkdown}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/35 text-violet-200 text-xs font-medium border border-violet-500/35"
                  >
                    <Download className="w-3.5 h-3.5" /> Markdown
                  </button>
                  <button
                    onClick={exportJson}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                  >
                    <FileJson className="w-3.5 h-3.5" /> JSON
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / PDF
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {error && <ErrorState message={error} onRetry={loadReport} />}

        {loading ? (
          <div className="space-y-4">
            <LoadingSkeleton className="h-48 rounded-2xl" />
            <LoadingSkeleton className="h-72 rounded-2xl" />
          </div>
        ) : session ? (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setActiveTab('report')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'report'
                    ? 'bg-violet-600/20 text-violet-200 border border-violet-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" /> Report & Follow-Up
              </button>
              <button
                onClick={() => setActiveTab('trace')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'trace'
                    ? 'bg-violet-600/20 text-violet-200 border border-violet-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" /> Execution Trace ({toolLogs.length} tools)
              </button>
            </div>

            {activeTab === 'report' ? (
              <div className="space-y-8">
                {session.report ? (
                  <>
                    <ReportViewer report={session.report} />
                    <FollowUpChat
                      sessionId={session._id}
                      initialMessages={messages}
                      onUpdateMessages={setMessages}
                    />
                  </>
                ) : (
                  <ErrorState
                    title="Report not generated yet"
                    message={`This session currently has status "${session.status}". Open it in the Research Workspace to complete execution.`}
                    onRetry={() => navigate(`/workspace?sessionId=${session._id}`)}
                  />
                )}
              </div>
            ) : (
              <ExecutionTrace steps={session.steps || []} toolLogs={toolLogs} />
            )}
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
