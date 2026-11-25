import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Atom, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      showToast({ type: 'success', title: 'Welcome back', message: 'Signed in to RESEARCHX AI.' });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B18] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0D1326] p-8 shadow-2xl">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Atom className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">
            RESEARCHX <span className="text-violet-400">AI</span>
          </span>
        </Link>

        <h1 className="text-xl font-bold text-white text-center">Sign in to your account</h1>
        <p className="text-xs text-slate-400 text-center mt-1.5">
          Access your autonomous research workspace, PDFs, and saved reports.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-500/35 bg-rose-950/30 p-3 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="researcher@university.edu"
              className="w-full rounded-xl bg-[#131B36] border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl bg-[#131B36] border border-slate-700/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-violet-600/20 disabled:opacity-60 transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
