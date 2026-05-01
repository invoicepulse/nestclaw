import { Link } from 'react-router-dom';
import { Lightning, Terminal, Robot } from '@phosphor-icons/react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="flex flex-col items-center px-4 pb-20 pt-32 text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight md:text-6xl">
          Your AI Agent, <span className="text-brand-400">Always On.</span>
        </h1>
        <p className="mb-8 max-w-xl text-lg text-gray-400">
          Get your own isolated AI agent running 24/7 in the cloud. Browser terminal access. No DevOps required.
        </p>
        <p className="mb-6 text-3xl font-bold text-brand-400">$2.99/month</p>
        <Link to="/login" className="rounded-lg bg-brand-600 px-8 py-3 text-lg font-semibold hover:bg-brand-700">
          Get Started
        </Link>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-4xl gap-6 px-4 pb-20 md:grid-cols-3">
        {[
          { icon: <Lightning size={32} />, title: 'Always On 24/7', desc: 'Your agent runs continuously in an isolated Docker container.' },
          { icon: <Terminal size={32} />, title: 'Browser Terminal', desc: 'Access via any browser. No SSH client needed.' },
          { icon: <Robot size={32} />, title: 'Choose Your Agent', desc: 'OpenClaw (Node.js) or Hermes (Python) — your pick.' },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="mb-3 text-brand-400">{f.icon}</div>
            <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
            <p className="text-sm text-gray-400">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Agent Comparison */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <h2 className="mb-8 text-center text-3xl font-bold">Choose Your Agent</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-3 text-xl font-bold text-brand-400">OpenClaw</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>✓ Node.js CLI-first AI agent</li>
              <li>✓ Composio — 500+ integrations</li>
              <li>✓ Browser terminal access</li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-3 text-xl font-bold text-purple-400">Hermes</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>✓ Python self-improving agent</li>
              <li>✓ Full Web UI included</li>
              <li>✓ Telegram, Discord, Slack, WhatsApp</li>
              <li>✓ Browser terminal + Web UI</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-4 pb-20 text-center">
        <h2 className="mb-8 text-3xl font-bold">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {['1. Sign Up', '2. Choose Agent', '3. Get Your URL'].map((step) => (
            <div key={step} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-lg font-semibold text-brand-400">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} NestClaw. All rights reserved.
      </footer>
    </div>
  );
}
