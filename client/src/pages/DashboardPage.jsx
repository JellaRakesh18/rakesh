import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Search,
  BookOpen,
  FileText,
  Activity,
  CheckCircle2,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { researchService } from '../services/researchService';
import { DashboardSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { StatusBadge } from '../components/common/StatusBadge';

export function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completed: 0,
    running: 0,
    failed: 0,
    totalToolCalls: 0,
    totalDocuments: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await researchService.getHistory(query ? { search: query } : {});
      const list = Array.isArray(data?.sessions) ? data.sessions : [];
      setSessions(list);
      setStats({
        totalSessions: data?.stats?.totalSessions ?? list.length,
        completed: data?.stats?.completed ?? 0,
        running: data?.stats?.running ?? 0,
        failed: data?.stats?.failed ?? 0,
        totalToolCalls: data?.stats?.totalToolCalls ?? 0,
        totalDocuments: data?.stats?.totalDocuments ?? 0,
      });
    } catch (err) {
      setError(err?.friendlyMessage || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadDashboard(search);
  };

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const savedReports = safeSessions.filter((s) => s?.status === 'completed' && s?.report);

  const chartData = safeSessions
    .slice(0, 7)
    .reverse()
    .map((s) => {
      const rawTitle = s?.title || s?.question || 'Session';
      return {
        name: rawTitle.slice(0, 14) + (rawTitle.length > 14 ? '…' : ''),
        tools: s?.metrics?.totalToolCalls ?? 0,
        sources: s?.sources?.length ?? 0,
      };
    });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-r from-[#131B38] via-[#10162E] to-[#0D1326] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-violet-400">
              RESEARCHX AI Command Center
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Welcome back, {user?.name?.split(' ')[0] || 'Researcher'}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Launch a new autonomous investigation or continue from your saved cited reports.
            </p>
          </div>
          <Link
            to="/workspace"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-600/25 transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            New Research
          </Link>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your research sessions and reports..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0D1326] border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
          >
            Search
          </button>
        </form>

        {error && <ErrorState message={error} onRetry={() => loadDashboard(search)} />}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Research Sessions',
                  value: stats.totalSessions,
                  icon: BookOpen,
                  color: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
                },
                {
                  label: 'Completed Reports',
                  value: stats.completed,
                  icon: CheckCircle2,
                  color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
                },
                {
                  label: 'Tool Executions',
                  value: stats.totalToolCalls,
                  icon: Activity,
                  color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
                },
                {
                  label: 'Uploaded PDFs',
                  value: stats.totalDocuments,
                  icon: FileText,
                  color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-800/90 bg-[#0D1326] p-5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${stat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart + Saved Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">Recent Research Activity</h2>
                    <p className="text-xs text-slate-400">Tool calls and sources gathered per session</p>
                  </div>
                </div>
                {chartData.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-xs text-slate-500">
                    Run your first research session to visualize tool & source activity.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="tools"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.2}
                        name="Tool Calls"
                      />
                      <Area
                        type="monotone"
                        dataKey="sources"
                        stroke="#22D3EE"
                        fill="#22D3EE"
                        fillOpacity={0.15}
                        name="Sources"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white">Saved Reports</h2>
                  <Link to="/history" className="text-xs text-violet-400 hover:text-violet-300">
                    View all
                  </Link>
                </div>
                {savedReports.length === 0 ? (
                  <p className="text-xs text-slate-500 my-auto text-center">
                    Completed research reports will appear here for quick access.
                  </p>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-60 pr-1">
                    {savedReports.slice(0, 5).map((item) => (
                      <Link
                        key={item._id}
                        to={`/reports/${item._id}`}
                        className="block rounded-xl bg-[#111936] hover:bg-[#172146] border border-slate-800 hover:border-violet-500/40 p-3 transition-all"
                      >
                        <p className="text-xs font-semibold text-slate-100 line-clamp-1">
                          {item.title}
                        </p>
                        <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
                          <span>{item.sources?.length || 0} citations</span>
                          <span className="inline-flex items-center gap-1 text-violet-300">
                            Open <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Research History */}
            <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-white">Recent Research History</h2>
                <Link to="/history" className="text-xs text-violet-400 hover:text-violet-300">
                  Manage History
                </Link>
              </div>

              {safeSessions.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No research sessions yet"
                  description="Start your first autonomous investigation to see your plan, tool execution trace, and cited report here."
                  action={
                    <Link
                      to="/workspace"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                    >
                      Start First Research
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {safeSessions.slice(0, 6).map((s) => (
                    <div
                      key={s?._id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={s?.status || 'planned'} />
                          <span className="text-[11px] font-mono uppercase text-slate-400">
                            {s?.depth || 'standard'}
                          </span>
                          <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {s?.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-100 mt-1 truncate">
                          {s?.title || s?.question || 'Untitled Session'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={s?.status === 'completed' ? `/reports/${s?._id}` : `/workspace?sessionId=${s?._id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-violet-600/25 text-slate-200 hover:text-violet-200 border border-slate-700 hover:border-violet-500/40 text-xs font-medium transition-colors"
                        >
                          {s.status === 'completed' ? 'View Report' : 'Open Workspace'}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
