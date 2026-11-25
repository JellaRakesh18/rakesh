import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Compass,
  Link2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const CONFIDENCE_BADGE = {
  high: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  medium: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
  low: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  uncertain: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
};

const SUPPORT_BADGE = {
  supported: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  partially_supported: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  unsupported: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
};

export function ReportViewer({ report }) {
  if (!report) return null;

  const references = report.references || [];
  const sourceTypeCounts = ['web', 'document', 'knowledge_base', 'calculation'].map((type) => ({
    type: type.replace('_', ' '),
    count: references.filter((r) => r.sourceType === type).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header & Executive Summary */}
      <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-[#121A36] to-[#0B1124] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-wrap items-center gap-2 text-xs text-violet-300 font-medium mb-2">
          <BookOpen className="w-4 h-4" />
          <span>Structured Cited Research Report</span>
          <span className="text-slate-600">•</span>
          <span>{references.length} verified source(s)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {report.title}
        </h1>

        <div className="mt-5 rounded-xl bg-[#090F21]/80 border border-slate-800 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-2">
            Executive Summary
          </h2>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line">
            {report.executiveSummary}
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-[#090F21]/50 border border-slate-800/80 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            Research Methodology
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{report.methodology}</p>
        </div>
      </div>

      {/* Key Findings + Source Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Key Findings
          </h2>
          <div className="space-y-3">
            {(report.keyFindings || []).map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#111936]/75 border border-slate-800/90 p-4 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-violet-400">Finding #{idx + 1}</span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium uppercase ${
                      CONFIDENCE_BADGE[item.confidence] || CONFIDENCE_BADGE.medium
                    }`}
                  >
                    {item.confidence} confidence
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{item.finding}</p>
                {item.citations?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.citations.map((cid) => (
                      <a
                        key={cid}
                        href={`#ref-${cid}`}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors"
                      >
                        [{cid}]
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6 flex flex-col">
          <h2 className="text-base font-semibold text-white mb-1">Evidence Source Mix</h2>
          <p className="text-xs text-slate-400 mb-4">
            Distribution of verified sources collected by the agent tools.
          </p>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sourceTypeCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Explanations */}
      {report.detailedExplanations?.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6 space-y-5">
          <h2 className="text-base font-semibold text-white">Detailed Analysis & Explanations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.detailedExplanations.map((sec, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#111936]/70 border border-slate-800/80 p-5 space-y-2.5"
              >
                <h3 className="text-sm font-semibold text-violet-200">{sec.sectionTitle}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {sec.content}
                </p>
                {sec.citations?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sec.citations.map((cid) => (
                      <a
                        key={cid}
                        href={`#ref-${cid}`}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-violet-300 border border-slate-700 hover:border-violet-500"
                      >
                        [{cid}]
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflicting Information */}
      <div className="rounded-2xl border border-amber-500/25 bg-[#121324] p-6">
        <h2 className="text-base font-semibold text-amber-200 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Conflicting Information & Source Disagreements
        </h2>
        {report.conflictingInformation?.length > 0 ? (
          <div className="space-y-4">
            {report.conflictingInformation.map((c, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#0D1120] border border-amber-500/25 p-4 space-y-3"
              >
                <h3 className="text-sm font-semibold text-white">{c.topic}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3">
                    <span className="font-mono text-amber-300 block mb-1">
                      Claim A ({c.sourceA})
                    </span>
                    <p className="text-slate-200">{c.claimA}</p>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3">
                    <span className="font-mono text-cyan-300 block mb-1">
                      Claim B ({c.sourceB})
                    </span>
                    <p className="text-slate-200">{c.claimB}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-amber-200">Assessment:</strong> {c.explanation}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-400">
            No major direct contradictions were detected across the retrieved sources, though scope and publication dates may vary.
          </p>
        )}
      </div>

      {/* Evidence Verification Matrix */}
      {report.evidenceAndCitations?.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Claim-by-Claim Evidence Verification
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 pr-4 font-medium">Claim</th>
                  <th className="pb-3 pr-4 font-medium">Support Status</th>
                  <th className="pb-3 font-medium">Citations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {report.evidenceAndCitations.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-3 pr-4 text-slate-200 leading-relaxed">{row.claim}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium uppercase ${
                          SUPPORT_BADGE[row?.supportLevel] || SUPPORT_BADGE.partially_supported
                        }`}
                      >
                        {(row?.supportLevel || 'partially_supported').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {row.sourceIds?.length > 0 ? (
                          row.sourceIds.map((id) => (
                            <a
                              key={id}
                              href={`#ref-${id}`}
                              className="font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30"
                            >
                              [{id}]
                            </a>
                          ))
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Limitations, Open Questions, Conclusion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
          <h2 className="text-sm font-semibold text-white mb-3">Limitations & Uncertainty</h2>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc pl-5">
            {(report.limitations || []).map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-violet-400" />
            Open Research Questions
          </h2>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-300 list-disc pl-5">
            {(report.openResearchQuestions || []).map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400 mb-2">
          Conclusion
        </h2>
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
          {report.conclusion}
        </p>
      </div>

      {/* References */}
      <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-violet-400" />
          Verified References ({references.length})
        </h2>
        {references.length === 0 ? (
          <p className="text-xs text-slate-400">No external or document references recorded.</p>
        ) : (
          <div className="space-y-2.5">
            {references.map((ref) => (
              <div
                key={ref.id}
                id={`ref-${ref.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-[#111936]/70 border border-slate-800 px-4 py-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="font-mono font-semibold text-violet-300 shrink-0">
                    [{ref.id}]
                  </span>
                  <div className="min-w-0">
                    <p className="text-slate-100 font-medium truncate">{ref.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="uppercase font-mono">{ref.sourceType}</span>
                      {ref.publishedDate && <span>• {ref.publishedDate}</span>}
                    </div>
                  </div>
                </div>
                {ref.url && ref.url.startsWith('http') && (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-violet-300 hover:text-violet-200 shrink-0 font-medium"
                  >
                    Open Source <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
