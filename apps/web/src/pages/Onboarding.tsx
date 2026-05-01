import { useState } from 'react';
import { updateAgentType } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const CHECKOUT_URL = import.meta.env['VITE_POLAR_CHECKOUT_URL'] ?? '#';

export default function Onboarding() {
  useAuth();
  const [loading, setLoading] = useState(false);

  const choose = async (type: 'openclaw' | 'hermes') => {
    setLoading(true);
    await updateAgentType(type);
    window.location.href = CHECKOUT_URL;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="max-w-2xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-white">Choose Your Agent</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <button onClick={() => choose('openclaw')} disabled={loading}
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-left hover:border-brand-500 disabled:opacity-50">
            <h3 className="mb-2 text-xl font-bold text-brand-400">OpenClaw</h3>
            <p className="text-sm text-gray-400">Node.js CLI agent with Composio integrations. Browser terminal access.</p>
          </button>
          <button onClick={() => choose('hermes')} disabled={loading}
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-left hover:border-purple-500 disabled:opacity-50">
            <h3 className="mb-2 text-xl font-bold text-purple-400">Hermes</h3>
            <p className="text-sm text-gray-400">Python self-improving agent with Web UI. Telegram, Discord, Slack support.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
