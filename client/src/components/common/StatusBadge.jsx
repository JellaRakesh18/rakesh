import React from 'react';

const STYLES = {
  planned: 'bg-slate-800/80 text-slate-300 border-slate-600/40',
  pending: 'bg-slate-800/80 text-slate-300 border-slate-600/40',
  running: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
  paused: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  awaiting_approval: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  retried: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
  failed: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  cancelled: 'bg-slate-700/50 text-slate-400 border-slate-600/40',
  skipped: 'bg-slate-700/50 text-slate-400 border-slate-600/40',
};

export function StatusBadge({ status }) {
  const label = (status || 'unknown').replace(/_/g, ' ');
  const cls = STYLES[status] || STYLES.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider border ${cls}`}
    >
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
      )}
      {label}
    </span>
  );
}
