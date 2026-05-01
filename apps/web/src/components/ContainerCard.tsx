import type { ContainerWithUrls } from '@shared/types';
import { StatusBadge } from './StatusBadge';
import { Terminal, Globe } from '@phosphor-icons/react';

export function ContainerCard({ container }: { container: ContainerWithUrls }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{container.subdomain}.nestclaw.io</h2>
        <StatusBadge status={container.subscription_status} />
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Agent: <span className="font-medium text-white">{container.agent_type}</span> · Created: {new Date(container.created_at).toLocaleDateString()}
      </p>
      <div className="flex gap-3">
        <a href={container.terminal_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Terminal size={18} /> Open Terminal
        </a>
        {container.webui_url && (
          <a href={container.webui_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            <Globe size={18} /> Open Web UI
          </a>
        )}
      </div>
    </div>
  );
}
