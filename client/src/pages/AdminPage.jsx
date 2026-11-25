import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Users, Activity, AlertTriangle, BookOpen } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AppLayout } from '../components/layout/AppLayout';
import { adminService } from '../services/adminService';
import { DashboardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';

export function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getOverview();
      setData(res);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load admin monitoring metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-violet-400" />
            Admin System Monitoring
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Platform-wide research sessions, active users, and tool execution reliability.
          </p>
        </div>

        {error && <ErrorState message={error} onRetry={loadOverview} />}

        {loading ? (
          <DashboardSkeleton />
        ) : data ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Active Researchers', value: `${data.stats.activeUsers} / ${data.stats.totalUsers}`, icon: Users },
                { label: 'Research Sessions', value: `${data.stats.completedSessions} / ${data.stats.totalSessions}`, icon: BookOpen },
                { label: 'Total Tool Calls', value: data.stats.totalToolCalls, icon: Activity },
                { label: 'Failed Tool Calls', value: data.stats.failedToolCalls, icon: AlertTriangle },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-800 bg-[#0D1326] p-5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs text-slate-400">{card.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                    </div>
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
                <h2 className="text-base font-semibold text-white mb-4">Tool Usage Breakdown</h2>
                {data.toolBreakdown?.length ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.toolBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="_id" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="total" fill="#8B5CF6" name="Total Calls" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="failed" fill="#F43F5E" name="Failed Calls" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-500">No tool executions recorded yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6">
                <h2 className="text-base font-semibold text-white mb-4">Recent Failed Tool Calls</h2>
                {data.recentToolErrors?.length ? (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {data.recentToolErrors.map((errLog) => (
                      <div
                        key={errLog._id}
                        className="rounded-xl bg-rose-950/20 border border-rose-500/25 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-rose-300 font-semibold">
                            {errLog.toolName}
                          </span>
                          <span className="text-slate-500">
                            {new Date(errLog.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-rose-200 mt-1">{errLog.error}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Zero failed tool calls recorded.</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
