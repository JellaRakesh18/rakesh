import React, { useState } from 'react';
import { Send, MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import { researchService } from '../../services/researchService';
import { useToast } from '../../context/ToastContext';

export function FollowUpChat({ sessionId, initialMessages = [], onUpdateMessages }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || sending) return;

    const optimisticUser = { role: 'user', content: q, citations: [], createdAt: new Date().toISOString() };
    const nextList = [...messages, optimisticUser];
    setMessages(nextList);
    setInput('');
    setSending(true);

    try {
      const data = await researchService.askFollowUp(sessionId, q);
      const updated = data.conversation?.messages || nextList;
      setMessages(updated);
      onUpdateMessages?.(updated);
    } catch (err) {
      setMessages(messages);
      showToast({
        type: 'error',
        title: 'Follow-up failed',
        message: err.friendlyMessage,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-violet-400" />
          Follow-Up Research Chat
        </h2>
        <span className="text-xs text-slate-400">
          Grounded in this report & verified citations
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-400 bg-[#111936]/50 border border-slate-800/80 rounded-xl p-4">
            Ask a follow-up question to explore deeper implications, clarify conflicting claims, or request comparisons from this research session.
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg._id || idx}
              className={`rounded-xl p-4 text-sm ${
                msg.role === 'user'
                  ? 'bg-violet-600/20 border border-violet-500/30 text-slate-100 ml-8'
                  : 'bg-[#111936] border border-slate-800 text-slate-200 mr-8'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 block mb-1">
                {msg.role === 'user' ? 'You' : 'RESEARCHX AI'}
              </span>
              <p className="whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                {msg.content}
              </p>
              {msg.citations?.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-2">
                  {msg.citations.map((c, cIdx) =>
                    c.url && c.url.startsWith('http') ? (
                      <a
                        key={cIdx}
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25"
                      >
                        {c.title}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span
                        key={cIdx}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        {c.title}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2.5 pt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up question about these findings..."
          disabled={sending}
          className="flex-1 bg-[#131B36] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium disabled:opacity-50 transition-all shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Ask
        </button>
      </form>
    </div>
  );
}
