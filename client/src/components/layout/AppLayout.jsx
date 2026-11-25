import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  History,
  Settings,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Atom,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/workspace', label: 'Research Workspace', icon: Sparkles },
    { to: '/documents', label: 'Documents (PDF)', icon: FileText },
    { to: '/history', label: 'Research History', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', label: 'Admin Monitor', icon: ShieldAlert });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <Link
        to="/dashboard"
        className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/80"
        onClick={() => setMobileOpen(false)}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/25">
          <Atom className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white block leading-none">
            RESEARCHX <span className="text-violet-400">AI</span>
          </span>
          <span className="text-[10px] text-slate-400 tracking-wide">Autonomous Research</span>
        </div>
      </Link>

      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/25 to-indigo-600/15 text-violet-200 border border-violet-500/35 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-violet-600/25 border border-violet-500/40 flex items-center justify-center text-sm font-semibold text-violet-200 shrink-0">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-100 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/70 hover:bg-rose-500/15 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/30 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070B18] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#0B1123] border-r border-slate-800/80 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] bg-[#0B1123] border-r border-slate-800 h-full z-10">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[#0B1123]/90 backdrop-blur-md border-b border-slate-800/80">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Atom className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">
              RESEARCHX <span className="text-violet-400">AI</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
