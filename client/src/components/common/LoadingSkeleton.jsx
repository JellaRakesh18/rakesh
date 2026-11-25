import React from 'react';

export function LoadingSkeleton({ className = 'h-6 w-full' }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-800/70 border border-slate-700/30 ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <LoadingSkeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LoadingSkeleton className="h-72 lg:col-span-2 rounded-2xl" />
        <LoadingSkeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
