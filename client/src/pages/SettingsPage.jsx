import React, { useState } from 'react';
import { Settings, Shield, LogOut, Save, Loader2, User } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [defaultDepth, setDefaultDepth] = useState(user?.preferences?.defaultDepth || 'standard');
  const [theme, setTheme] = useState(user?.preferences?.theme || 'navy-violet');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        preferences: { defaultDepth, theme },
      });
      showToast({
        type: 'success',
        title: 'Settings saved',
        message: 'Your profile and research preferences have been updated.',
      });
    } catch (err) {
      showToast({ type: 'error', title: 'Update failed', message: err.friendlyMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-violet-400" />
            Settings & Account
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your profile, default research depth, theme, and security posture.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6 space-y-5"
        >
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-violet-400" /> Profile & Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-[#131B36] border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full rounded-xl bg-[#10162D] border border-slate-800 px-3.5 py-2.5 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Default Research Depth
              </label>
              <select
                value={defaultDepth}
                onChange={(e) => setDefaultDepth(e.target.value)}
                className="w-full rounded-xl bg-[#131B36] border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
              >
                <option value="quick">Quick</option>
                <option value="standard">Standard</option>
                <option value="deep">Deep</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Interface Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full rounded-xl bg-[#131B36] border border-slate-700/80 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
              >
                <option value="navy-violet">Dark Navy & Violet (Default)</option>
                <option value="midnight-indigo">Midnight Indigo</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
            <span>
              Role: <strong className="text-violet-300 uppercase">{user?.role}</strong> • Joined{' '}
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
            </span>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </form>

        {/* Privacy & Security */}
        <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6 space-y-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" /> Privacy & Security Architecture
          </h2>
          <ul className="text-xs sm:text-sm text-slate-300 space-y-2 list-disc pl-5">
            <li>All Gemini and Tavily API keys are stored exclusively on the backend server.</li>
            <li>Uploaded PDFs and research histories are strictly isolated by authenticated owner ID.</li>
            <li>All model-generated tool arguments are validated with Zod schemas before execution.</li>
            <li>Retrieved web snippets and PDF text are wrapped in untrusted data delimiters to mitigate prompt injection.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-rose-500/25 bg-rose-950/15 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Session Sign Out</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clears your local JWT token and returns to the sign-in screen.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 text-rose-200 border border-rose-500/35 text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
