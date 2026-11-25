import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Trash2,
  RotateCw,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { researchService } from '../services/researchService';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';

export function HistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await researchService.getHistory({
        search: search.trim() || undefined,
        status: statusFilter,
      });
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (err) {
      setError(err?.friendlyMessage || 'Failed to load research history.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await researchService.deleteSession(deleteTarget._id);
      setSessions((prev) => prev.filter((s) => s._id !== deleteTarget._id));
      showToast({
        type: 'success',
        title: 'Session deleted',
        message: 'Research session and execution logs removed.',
      });
      setDeleteTarget(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Delete failed', message: err.friendlyMessage });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <History className="w-6 h-6 text-violet-400" />
              Research History
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Open previous cited reports, ask follow-ups, rerun investigations, or delete sessions.
            </p>
          </div>
          <Link
            to="/workspace"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4" /> New Research
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title or question..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D1326] border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-[#0D1326] border border-slate-800 px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="planned">Planned</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && <ErrorState message={error} onRetry={loadHistory} />}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <LoadingSkeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No matching research sessions"
            description="Adjust your search filter or start a new autonomous research session."
          />
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s._id}
                className="rounded-2xl border border-slate-800 bg-[#0D1326] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-violet-500/35 transition-all"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={s.status} />
                    <span className="text-[11px] font-mono uppercase text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                      {s.depth}
                    </span>
                    <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(s.createdAt).toLocaleString()}
                    </span>
                    {s.metrics?.totalToolCalls > 0 && (
                      <span className="text-xs font-mono text-slate-400">
                        • {s.metrics.totalToolCalls} tool calls
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-white truncate">
                    {s.title || s.question}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{s.question}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/workspace?rerunId=${s._id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rerun
                  </button>
                  <Link
                    to={s.status === 'completed' ? `/reports/${s._id}` : `/workspace?sessionId=${s._id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 text-xs font-medium text-violet-200 border border-violet-500/35"
                  >
                    {s.status === 'completed' ? 'Open Report & Chat' : 'Resume Workspace'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete research session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Research Session"
        message={`Delete "${deleteTarget?.title || 'this research session'}" along with its execution trace and follow-up conversation?`}
        confirmLabel="Delete Session"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
