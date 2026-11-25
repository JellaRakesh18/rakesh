import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Play,
  Pause,
  Square,
  FileText,
  Upload,
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  Loader2,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { researchService } from '../services/researchService';
import { documentService } from '../services/documentService';
import { adminService } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PlanEditor } from '../components/research/PlanEditor';
import { ExecutionTrace } from '../components/research/ExecutionTrace';
import { ReportViewer } from '../components/research/ReportViewer';
import { StatusBadge } from '../components/common/StatusBadge';
import { ErrorState } from '../components/common/ErrorState';

const DEPTH_OPTIONS = [
  { value: 'quick', label: 'Quick', desc: '3–4 steps • Rapid overview' },
  { value: 'standard', label: 'Standard', desc: '4–5 steps • Balanced depth' },
  { value: 'deep', label: 'Deep', desc: '6–7 steps • Comprehensive audit' },
];

const SAMPLE_SCENARIOS = [
  {
    label: 'EV Battery Comparison',
    depth: 'standard',
    question:
      'Compare solid-state vs lithium-ion EV battery energy density, manufacturing cost per kWh, and commercialization timelines with cited evidence.',
  },
  {
    label: 'Open-Weight Enterprise LLMs',
    depth: 'standard',
    question:
      'Analyze the total cost of ownership, latency, and data governance trade-offs between open-weight LLMs and proprietary frontier APIs for enterprise teams.',
  },
  {
    label: 'Grid Storage Economics',
    depth: 'deep',
    question:
      'Compare sodium-ion and LFP battery technologies for utility-scale grid storage, calculating percentage cost differences and identifying conflicting industry forecasts.',
  },
];

export function ResearchWorkspacePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [question, setQuestion] = useState(searchParams.get('q') || '');
  const [depth, setDepth] = useState(user?.preferences?.defaultDepth || 'standard');
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState(() => {
    const d = searchParams.get('docId');
    return d ? [d] : [];
  });
  const [requireApproval, setRequireApproval] = useState(false);

  const [session, setSession] = useState(null);
  const [plan, setPlan] = useState([]);
  const [toolLogs, setToolLogs] = useState([]);
  const [planning, setPlanning] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [healthInfo, setHealthInfo] = useState(null);

  const eventSourceRef = useRef(null);
  const pollTimerRef = useRef(null);

  const stopStreams = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const refreshSession = useCallback(async (id) => {
    try {
      const data = await researchService.getSession(id);
      setSession(data.session);
      setPlan(data.session.plan || []);
      setToolLogs(data.toolLogs || []);
      return data.session;
    } catch {
      return null;
    }
  }, []);

  const attachLiveStream = useCallback(
    (id) => {
      stopStreams();

      const url = researchService.getStreamUrl(id);
      const es = new EventSource(url);
      eventSourceRef.current = es;

      const parseSseData = (e) => {
        try {
          return e?.data ? JSON.parse(e.data) : null;
        } catch {
          return null;
        }
      };

      es.addEventListener('snapshot', (e) => {
        const data = parseSseData(e);
        if (!data) return;
        if (data.session) {
          setSession(data.session);
          setPlan(Array.isArray(data.session.plan) ? data.session.plan : []);
        }
        if (Array.isArray(data.toolLogs)) setToolLogs(data.toolLogs);
      });

      es.addEventListener('step_update', (e) => {
        const data = parseSseData(e);
        if (!data) return;
        setSession((prev) =>
          prev ? { ...prev, steps: Array.isArray(data.steps) ? data.steps : prev.steps, status: data.status } : prev
        );
        if (Array.isArray(data.plan)) setPlan(data.plan);
      });

      es.addEventListener('tool_started', (e) => {
        const log = parseSseData(e);
        if (!log) return;
        setToolLogs((prev) => {
          const exists = prev.some((item) => (item._id || item.logId) === log.logId);
          return exists ? prev : [...prev, log];
        });
      });

      const upsertToolLog = (e) => {
        const log = parseSseData(e);
        if (!log) return;
        setToolLogs((prev) => {
          const idx = prev.findIndex((item) => (item._id || item.logId) === log.logId);
          if (idx === -1) return [...prev, log];
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...log };
          return copy;
        });
      };

      es.addEventListener('tool_completed', upsertToolLog);
      es.addEventListener('tool_failed', upsertToolLog);

      es.addEventListener('approval_required', (e) => {
        const data = parseSseData(e);
        if (!data) return;
        setSession((prev) =>
          prev ? { ...prev, status: 'awaiting_approval', pendingApproval: data.pendingApproval } : prev
        );
      });

      es.addEventListener('status_change', (e) => {
        const data = parseSseData(e);
        if (!data) return;
        setSession((prev) => (prev ? { ...prev, status: data.status } : prev));
        if (['completed', 'failed', 'cancelled'].includes(data.status)) {
          refreshSession(id);
          stopStreams();
        }
      });

      es.addEventListener('report_ready', (e) => {
        const data = parseSseData(e);
        if (data?.session) {
          setSession(data.session);
          setPlan(Array.isArray(data.session.plan) ? data.session.plan : []);
        }
        refreshSession(id);
        stopStreams();
        showToast({
          type: 'success',
          title: 'Research Completed',
          message: 'Your cited research report is ready.',
        });
      });

      es.addEventListener('error_event', (e) => {
        const data = parseSseData(e);
        setWorkspaceError(data?.error || 'Research execution failed.');
        refreshSession(id);
        stopStreams();
      });

      // Fallback polling every 3s while active in case proxy buffers SSE
      pollTimerRef.current = setInterval(async () => {
        const latest = await refreshSession(id);
        if (latest && ['completed', 'failed', 'cancelled'].includes(latest.status)) {
          stopStreams();
        }
      }, 3000);
    },
    [refreshSession, showToast, stopStreams]
  );

  useEffect(() => {
    documentService
      .list()
      .then((list) => setDocuments(Array.isArray(list) ? list : []))
      .catch(() => {});
    adminService
      .getHealth()
      .then(setHealthInfo)
      .catch(() => {});

    const existingId = searchParams.get('sessionId');
    const rerunId = searchParams.get('rerunId');

    if (existingId) {
      researchService
        .getSession(existingId)
        .then((data) => {
          setSession(data.session);
          setQuestion(data.session.question);
          setDepth(data.session.depth);
          setPlan(data.session.plan || []);
          setToolLogs(data.toolLogs || []);
          setSelectedDocIds(
            (data.session.attachedDocumentIds || []).map((d) => (typeof d === 'string' ? d : d._id))
          );
          if (['running', 'paused', 'awaiting_approval'].includes(data.session.status)) {
            attachLiveStream(data.session._id);
          }
        })
        .catch((err) => setWorkspaceError(err.friendlyMessage));
    } else if (rerunId) {
      researchService
        .getSession(rerunId)
        .then((data) => {
          setQuestion(data.session.question);
          setDepth(data.session.depth);
          setSelectedDocIds(
            (data.session.attachedDocumentIds || []).map((d) => (typeof d === 'string' ? d : d._id))
          );
        })
        .catch(() => {});
    }

    return () => stopStreams();
  }, [attachLiveStream, searchParams, stopStreams]);

  const toggleDoc = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleQuickPdfUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPdf(true);
    try {
      const created = await documentService.upload(file);
      setDocuments((prev) => [created, ...prev]);
      setSelectedDocIds((prev) => [...prev, created._id]);
      showToast({
        type: 'success',
        title: 'PDF attached',
        message: `"${created.filename}" uploaded and selected for this research.`,
      });
    } catch (err) {
      showToast({ type: 'error', title: 'PDF upload failed', message: err.friendlyMessage });
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    if (question.trim().length < 5) {
      showToast({
        type: 'warning',
        title: 'Question too short',
        message: 'Enter at least 5 characters describing your research goal.',
      });
      return;
    }

    setWorkspaceError('');
    setPlanning(true);
    stopStreams();
    setToolLogs([]);

    try {
      const createdSession = await researchService.generatePlan({
        question: question.trim(),
        depth,
        documentIds: selectedDocIds,
      });
      setSession(createdSession);
      setPlan(createdSession.plan || []);
      setSearchParams({ sessionId: createdSession._id });
      showToast({
        type: 'success',
        title: 'Research Plan Ready',
        message: 'Review, edit, or reorder the steps below, then approve execution.',
      });
    } catch (err) {
      setWorkspaceError(err.friendlyMessage);
      showToast({ type: 'error', title: 'Planning failed', message: err.friendlyMessage });
    } finally {
      setPlanning(false);
    }
  };

  const handleStartExecution = async () => {
    if (!plan.length) return;
    setWorkspaceError('');
    setToolLogs([]);
    try {
      const updated = await researchService.executeResearch({
        sessionId: session?._id,
        question: question.trim(),
        depth,
        documentIds: selectedDocIds,
        plan: plan.map((s, idx) => ({
          stepId: s.stepId,
          order: idx + 1,
          title: s.title,
          description: s.description || '',
          toolHint: s.toolHint || 'webSearch',
        })),
        requireApprovalForExternalTools: requireApproval,
      });
      setSession(updated);
      setSearchParams({ sessionId: updated._id });
      attachLiveStream(updated._id);
    } catch (err) {
      setWorkspaceError(err.friendlyMessage);
      showToast({ type: 'error', title: 'Execution failed', message: err.friendlyMessage });
    }
  };

  const handlePause = async () => {
    if (!session) return;
    try {
      const updated = await researchService.pauseSession(session._id);
      setSession(updated);
    } catch (err) {
      showToast({ type: 'error', title: 'Pause failed', message: err.friendlyMessage });
    }
  };

  const handleResume = async () => {
    if (!session) return;
    try {
      const updated = await researchService.resumeSession(session._id);
      setSession(updated);
    } catch (err) {
      showToast({ type: 'error', title: 'Resume failed', message: err.friendlyMessage });
    }
  };

  const handleCancel = async () => {
    if (!session) return;
    try {
      const updated = await researchService.cancelSession(session._id);
      setSession(updated);
      stopStreams();
    } catch (err) {
      showToast({ type: 'error', title: 'Cancel failed', message: err.friendlyMessage });
    }
  };

  const handleApproval = async (approved) => {
    if (!session) return;
    try {
      await researchService.approveAction(session._id, approved);
      setSession((prev) =>
        prev ? { ...prev, status: 'running', pendingApproval: { requested: false } } : prev
      );
    } catch (err) {
      showToast({ type: 'error', title: 'Approval failed', message: err.friendlyMessage });
    }
  };

  const isActive = session && ['running', 'paused', 'awaiting_approval'].includes(session.status);
  const completedStepsCount = plan.filter((s) => s.status === 'completed').length;
  const progressPercent =
    session?.status === 'completed'
      ? 100
      : plan.length > 0
      ? Math.round((completedStepsCount / plan.length) * 100)
      : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-violet-400" />
              Autonomous Research Workspace
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Define your goal, attach PDFs, customize the AI plan, and watch live tool execution.
            </p>
          </div>
          {session && <StatusBadge status={session.status} />}
        </div>

        {workspaceError && <ErrorState message={workspaceError} />}

        {healthInfo &&
          (healthInfo.integrations?.gemini === 'missing_api_key' ||
            healthInfo.integrations?.tavily === 'missing_api_key') && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 flex items-start gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Backend API Key Configuration Needed for Live Research</p>
                <p className="text-amber-100/80 mt-0.5">
                  {healthInfo.integrations?.gemini === 'missing_api_key' &&
                    'GEMINI_API_KEY is not set in server/.env. '}
                  {healthInfo.integrations?.tavily === 'missing_api_key' &&
                    'TAVILY_API_KEY is not set in server/.env. '}
                  PDF uploads, authentication, and history work immediately; add your keys to <code className="font-mono text-amber-300">server/.env</code> and restart the backend for live AI planning & web search.
                </p>
              </div>
            </div>
          )}

        {/* Research Goal Setup Card */}
        <form
          onSubmit={handleGeneratePlan}
          className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6 space-y-5"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-violet-400">
                Research Question or Investigation Goal
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Demo presets:</span>
                {SAMPLE_SCENARIOS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={isActive || planning}
                    onClick={() => {
                      setQuestion(preset.question);
                      setDepth(preset.depth);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-[#131B36] hover:bg-violet-600/20 text-slate-300 hover:text-violet-200 border border-slate-700/80 hover:border-violet-500/40 transition-colors disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isActive || planning}
              placeholder="e.g., Compare the technical feasibility, cost per kWh, and supply chain risks of sodium-ion vs LFP batteries for grid storage in 2026."
              className="w-full rounded-xl bg-[#131B36] border border-slate-700/80 p-4 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 resize-y disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Depth Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Research Depth
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {DEPTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isActive || planning}
                    onClick={() => setDepth(opt.value)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      depth === opt.value
                        ? 'bg-violet-600/20 border-violet-500 text-white'
                        : 'bg-[#131B36]/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* PDF Attachment Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-300">
                  Attach Uploaded PDFs ({selectedDocIds.length} selected)
                </label>
                <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium">
                  {uploadingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingPdf ? 'Uploading...' : 'Upload PDF'}</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    disabled={uploadingPdf || isActive}
                    onChange={handleQuickPdfUpload}
                  />
                </label>
              </div>
              <div className="rounded-xl bg-[#131B36]/70 border border-slate-800 p-2.5 max-h-28 overflow-y-auto space-y-1.5">
                {documents.length === 0 ? (
                  <p className="text-xs text-slate-500 px-2 py-1">
                    No PDFs uploaded yet. Upload one above or proceed with web & knowledge search.
                  </p>
                ) : (
                  documents.map((doc) => {
                    const checked = selectedDocIds.includes(doc._id);
                    return (
                      <label
                        key={doc._id}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs ${
                          checked ? 'bg-violet-500/15 text-violet-200' : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isActive}
                          onChange={() => toggleDoc(doc._id)}
                          className="accent-violet-500"
                        />
                        <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="truncate flex-1">{doc.filename}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {doc.fileMetadata?.pageCount || 1}p
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
            <label className="inline-flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={requireApproval}
                disabled={isActive}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="accent-violet-500 rounded"
              />
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <span>Require human approval before each external web search</span>
            </label>

            <button
              type="submit"
              disabled={planning || isActive}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-600/20 disabled:opacity-50 transition-all"
            >
              {planning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {plan.length > 0 ? 'Regenerate Plan' : 'Generate Research Plan'}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Human Approval Gate Banner */}
        {session?.status === 'awaiting_approval' && session.pendingApproval?.requested && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-200">
                  Approval Required: {session.pendingApproval.toolName}
                </h3>
                <p className="text-xs text-amber-100/80 mt-1">
                  {session.pendingApproval.reason}
                </p>
                <p className="text-xs font-mono text-amber-300 mt-1">
                  Input: {session.pendingApproval.inputSummary}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleApproval(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-200 border border-rose-500/40 text-xs font-semibold"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                onClick={() => handleApproval(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5" /> Approve & Continue
              </button>
            </div>
          </div>
        )}

        {/* Editable Research Plan & Controls */}
        {plan.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Editable Research Plan
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {!isActive
                    ? 'Edit, add, remove, or reorder steps before approving execution.'
                    : 'Executing approved plan steps in real time.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!isActive && (
                  <button
                    type="button"
                    onClick={handleStartExecution}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    Approve & Start Research
                  </button>
                )}

                {session?.status === 'running' && (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold"
                  >
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </button>
                )}

                {session?.status === 'paused' && (
                  <button
                    type="button"
                    onClick={handleResume}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                  >
                    <Play className="w-3.5 h-3.5" /> Resume
                  </button>
                )}

                {isActive && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-200 border border-rose-500/40 text-xs font-semibold"
                  >
                    <Square className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Sub-questions */}
            {session?.subQuestions?.length > 0 && (
              <div className="rounded-xl bg-[#0A0F22] border border-slate-800/80 p-4">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
                  Decomposed Sub-Questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {session.subQuestions.map((sq, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-3 py-1 rounded-lg bg-[#131B36] border border-slate-700/70 text-slate-200"
                    >
                      {idx + 1}. {sq}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Progress Indicator */}
            {(isActive || session?.status === 'completed') && (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span>Execution Progress</span>
                  <span className="font-mono text-violet-300">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <PlanEditor
              plan={plan}
              onChange={setPlan}
              editable={!isActive && session?.status !== 'completed'}
            />
          </div>
        )}

        {/* Agent Execution Trace */}
        {session && (
          <ExecutionTrace steps={session.steps || []} toolLogs={toolLogs} />
        )}

        {/* Final Report Preview */}
        {session?.report && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-5 py-4">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-emerald-200">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <span>Research Report Generated</span>
              </div>
              <Link
                to={`/reports/${session._id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                Open Full Report & Follow-Up Chat
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
            <ReportViewer report={session.report} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
