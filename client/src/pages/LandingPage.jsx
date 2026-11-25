import React from 'react';
import { Link } from 'react-router-dom';
import {
  Atom,
  Sparkles,
  Globe,
  FileText,
  GitCompare,
  ShieldCheck,
  Activity,
  ArrowRight,
  BookOpen,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  {
    icon: Layers,
    title: 'Editable Research Plans',
    desc: 'Decomposes complex questions into sub-questions and an editable multi-step plan you approve before execution.',
  },
  {
    icon: Globe,
    title: 'Live Web + PDF Tools',
    desc: 'Uses Gemini native function calling to autonomously search Tavily, inspect your uploaded PDFs, and query prior knowledge.',
  },
  {
    icon: Activity,
    title: 'Transparent Execution Trace',
    desc: 'Watch every step, tool selection, validated input, observation, retry, and duration in a live timeline.',
  },
  {
    icon: GitCompare,
    title: 'Conflict & Gap Detection',
    desc: 'Compares evidence across sources, flags disagreements explicitly, and marks uncertain or unsupported claims.',
  },
  {
    icon: BookOpen,
    title: 'Cited Structured Reports',
    desc: 'Produces executive summaries, methodology, evidence matrices, open questions, and clickable references.',
  },
  {
    icon: ShieldCheck,
    title: 'Security & Guardrails',
    desc: 'Backend-only API keys, Zod-validated tool arguments, prompt-injection isolation, and human approval gates.',
  },
];

const EXAMPLE_TOPICS = [
  'Compare solid-state vs lithium-ion EV battery manufacturing costs, energy density, and commercialization timelines.',
  'Evaluate the impact of open-weight LLMs on enterprise AI adoption, total cost of ownership, and data governance.',
  'Analyze global semiconductor supply chain resilience strategies between 2022 and 2026 using policy and market data.',
  'Compare mRNA vs viral-vector vaccine platforms in clinical trial efficacy, cold-chain logistics, and manufacturing scale.',
];

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#070B18] text-slate-100 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070B18]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
              <Atom className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white">
                RESEARCHX <span className="text-violet-400">AI</span>
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href="#features"
              className="hidden sm:inline-block text-sm text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hidden sm:inline-block text-sm text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              How It Works
            </a>
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-600/25"
              >
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-600/25"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[780px] h-[420px] rounded-full bg-violet-600/15 blur-[130px]" />
          <div className="absolute top-32 right-10 w-[340px] h-[340px] rounded-full bg-indigo-600/10 blur-[110px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Multi-Tool Research Platform • Powered by Gemini Function Calling</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Your AI Research Partner.
          </h1>
          <p className="mt-4 text-sm sm:text-base font-medium tracking-wide text-violet-300 uppercase">
            Research Smarter. Discover Deeper. Think Better.
          </p>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Enter a complex research question, inspect and edit the AI-generated investigation plan, and watch RESEARCHX AI autonomously search the web, read your uploaded PDFs, verify conflicting claims, and produce a strictly cited report.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to={user ? '/workspace' : '/register'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-xl shadow-violet-600/25 transition-all"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#111936] hover:bg-[#172145] text-slate-200 font-semibold border border-slate-700/80 transition-all"
            >
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="py-20 border-t border-slate-800/70 bg-[#090E20]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Built for Real Evidence, Not Generic Chat
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-400">
              Every research session runs a bounded, observable tool-using loop with schema validation and strict source grounding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-2xl border border-slate-800/90 bg-[#0E152B] p-6 hover:border-violet-500/40 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300 mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-white">{feat.title}</h3>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 border-t border-slate-800/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Autonomous Plan → Execute → Verify Workflow
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: '01',
                title: 'Question & PDFs',
                desc: 'Enter your research question, choose Quick/Standard/Deep depth, and attach relevant PDFs.',
              },
              {
                step: '02',
                title: 'Editable Plan',
                desc: 'Review sub-questions and reorder, edit, or add steps before the agent begins executing.',
              },
              {
                step: '03',
                title: 'Live Tool Loop',
                desc: 'Gemini selects Tavily web search, PDF reader, knowledge base, or calculator with full trace logs.',
              },
              {
                step: '04',
                title: 'Cited Synthesis',
                desc: 'Receive a structured report flagging conflicts, limitations, citations, and follow-up chat.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-slate-800 bg-[#0D1326] p-6 relative"
              >
                <span className="text-xs font-mono font-bold text-violet-400">STEP {item.step}</span>
                <h3 className="text-base font-semibold text-white mt-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Topics */}
      <section className="py-20 border-t border-slate-800/70 bg-[#090E20]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            Example Research Investigations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EXAMPLE_TOPICS.map((topic, i) => (
              <Link
                key={i}
                to={user ? `/workspace?q=${encodeURIComponent(topic)}` : '/register'}
                className="group rounded-2xl border border-slate-800 bg-[#0E152B] p-5 hover:border-violet-500/45 transition-all flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-slate-200 group-hover:text-white leading-relaxed">
                    {topic}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-violet-400 mt-2 font-medium">
                    Investigate topic <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Atom className="w-4 h-4 text-violet-400" />
            <span>RESEARCHX AI — Research Smarter. Discover Deeper. Think Better.</span>
          </div>
          <span>Hackathon Theme 4: Research & Knowledge Agents</span>
        </div>
      </footer>
    </div>
  );
}
