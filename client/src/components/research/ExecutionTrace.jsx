import React from 'react';
import {
  Activity,
  Globe,
  FileText,
  Database,
  Calculator,
  Clock,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

const TOOL_ICON = {
  webSearch: Globe,
  documentReader: FileText,
  knowledgeBaseSearch: Database,
  calculator: Calculator,
};

export function ExecutionTrace({ steps = [], toolLogs = [] }) {
  if (steps.length === 0 && toolLogs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-[#0D1326] p-6 text-center">
        <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2.5" />
        <p className="text-sm font-medium text-slate-300">Agent Execution Trace</p>
        <p className="text-xs text-slate-500 mt-1">
          Start research execution to inspect every step, tool call, observation, and duration in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* High-level Execution Steps Timeline */}
      {steps.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-[#0D1326] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />
              Agent Step Timeline
            </h3>
            <span className="text-xs text-slate-400 font-mono">{steps.length} steps</span>
          </div>

          <div className="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
            {steps.map((step) => (
              <div key={step.stepNumber} className="relative">
                <span
                  className={`absolute -left-5 top-1 w-4 h-4 rounded-full flex items-center justify-center border ${
                    step.status === 'completed'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : step.status === 'running'
                      ? 'bg-violet-500/25 border-violet-400 text-violet-300'
                      : step.status === 'failed'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {step.status === 'running' ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : step.status === 'completed' ? (
                    <CheckCircle2 className="w-2.5 h-2.5" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </span>

                <div className="rounded-xl bg-[#111936]/80 border border-slate-800/80 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-violet-400">
                        Step {step.stepNumber}
                      </span>
                      <span className="text-sm font-medium text-slate-100">{step.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {step.durationMs > 0 && (
                        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {step.durationMs}ms
                        </span>
                      )}
                      <StatusBadge status={step.status} />
                    </div>
                  </div>
                  {step.actionSummary && (
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {step.actionSummary}
                    </p>
                  )}
                  {step.error && (
                    <p className="text-xs text-rose-300 mt-1.5 bg-rose-950/40 border border-rose-500/25 rounded-lg px-2.5 py-1.5">
                      {step.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Tool Call Logs */}
      {toolLogs.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-[#0D1326] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Tool Execution & Observation Log
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {toolLogs.length} tool call(s)
            </span>
          </div>

          <div className="space-y-3">
            {toolLogs.map((log, idx) => {
              const Icon = TOOL_ICON[log.toolName] || Activity;
              return (
                <div
                  key={log._id || log.logId || idx}
                  className="rounded-xl bg-[#0A0F22] border border-slate-800/90 p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-violet-300">
                            {log.toolName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Step #{log.stepNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{log.agentAction}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {log.retryCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <RotateCcw className="w-3 h-3" />
                          {log.retryCount} retry
                        </span>
                      )}
                      {log.duration > 0 && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {log.duration}ms
                        </span>
                      )}
                      <StatusBadge status={log.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-lg bg-[#111936]/70 border border-slate-800 p-2.5">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                        Validated Input
                      </span>
                      <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap break-all">
                        {JSON.stringify(log.input || {}, null, 2)}
                      </pre>
                    </div>
                    <div className="rounded-lg bg-[#111936]/70 border border-slate-800 p-2.5">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                        Observed Output Summary
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {log.outputSummary || 'Waiting for tool response...'}
                      </p>
                      {log.error && (
                        <div className="mt-2 flex items-start gap-1.5 text-rose-300">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{log.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
