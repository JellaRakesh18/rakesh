import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  Edit3,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

const TOOL_OPTIONS = [
  { value: 'webSearch', label: 'Web Search (Tavily)' },
  { value: 'documentReader', label: 'Document Reader (PDF)' },
  { value: 'knowledgeBaseSearch', label: 'Knowledge Base Search' },
  { value: 'calculator', label: 'Safe Calculator' },
  { value: 'synthesis', label: 'Synthesis & Verification' },
];

export function PlanEditor({ plan, onChange, editable }) {
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newToolHint, setNewToolHint] = useState('webSearch');

  const moveStep = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= plan.length) return;
    const copy = [...plan];
    const [removed] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, removed);
    onChange(copy.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const updateStep = (index, field, value) => {
    const copy = plan.map((s, idx) => (idx === index ? { ...s, [field]: value } : s));
    onChange(copy);
  };

  const removeStep = (index) => {
    if (plan.length <= 1) return;
    const copy = plan.filter((_, idx) => idx !== index);
    onChange(copy.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const addStep = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const step = {
      stepId: `step-${Date.now()}-${plan.length + 1}`,
      order: plan.length + 1,
      title: newTitle.trim(),
      description: newDesc.trim(),
      toolHint: newToolHint,
      status: 'pending',
    };
    onChange([...plan, step]);
    setNewTitle('');
    setNewDesc('');
  };

  const renderStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    if (status === 'running') return <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
    return <Clock className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  return (
    <div className="space-y-3">
      {plan.map((step, index) => (
        <div
          key={step.stepId || index}
          className={`rounded-xl border p-4 transition-all ${
            step.status === 'running'
              ? 'bg-violet-950/25 border-violet-500/50 shadow-lg shadow-violet-900/10'
              : 'bg-[#0E152B] border-slate-800/90'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-1">{renderStatusIcon(step.status)}</div>
              <div className="flex-1 min-w-0 space-y-2">
                {editable ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-xs font-mono text-violet-400 shrink-0">
                        STEP {index + 1}
                      </span>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        className="flex-1 bg-[#141D38] border border-slate-700/70 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                        placeholder="Step title"
                      />
                      <select
                        value={step.toolHint || 'webSearch'}
                        onChange={(e) => updateStep(index, 'toolHint', e.target.value)}
                        className="bg-[#141D38] border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                      >
                        {TOOL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={step.description || ''}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                      className="w-full bg-[#141D38]/70 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
                      placeholder="Step goal / details"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-violet-400">STEP {index + 1}</span>
                      <h4 className="text-sm font-semibold text-slate-100">{step.title}</h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                        {step.toolHint}
                      </span>
                      <StatusBadge status={step.status} />
                    </div>
                    {step.description && (
                      <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                    )}
                    {step.resultSummary && (
                      <p className="text-xs text-emerald-300/90 bg-emerald-950/30 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                        {step.resultSummary}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {editable && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === plan.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  disabled={plan.length <= 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
                  title="Remove step"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {editable && (
        <form
          onSubmit={addStep}
          className="rounded-xl border border-dashed border-slate-700/80 bg-[#0B1123]/70 p-3.5 flex flex-col sm:flex-row gap-2.5"
        >
          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0 sm:px-1">
            <Edit3 className="w-3.5 h-3.5 text-violet-400" />
            <span>Add Step:</span>
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Step title (e.g. Compare market growth stats)"
            className="flex-1 bg-[#141D38] border border-slate-700/70 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Optional description"
            className="flex-1 bg-[#141D38] border border-slate-700/70 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
          />
          <select
            value={newToolHint}
            onChange={(e) => setNewToolHint(e.target.value)}
            className="bg-[#141D38] border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
          >
            {TOOL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/35 text-violet-200 border border-violet-500/40 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </form>
      )}
    </div>
  );
}
