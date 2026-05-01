import { useAuth } from '../hooks/useAuth';
import { useContainer } from '../hooks/useContainer';
import { ContainerCard } from '../components/ContainerCard';
import { SpinnerGap } from '@phosphor-icons/react';
import { useAuthStore } from '../store/auth';

export default function Dashboard() {
  const { user } = useAuth();
  const { container, isLoading } = useContainer();
  const signOut = useAuthStore((s) => s.signOut);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <SpinnerGap size={32} className="animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
          <button onClick={signOut} className="text-sm text-gray-400 hover:text-white">Sign Out</button>
        </div>

        {container?.subscription_status === 'provisioning' ? (
          <div className="flex flex-col items-center rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
            <SpinnerGap size={48} className="mb-4 animate-spin text-brand-400" />
            <p className="text-lg font-medium text-white">Setting up your agent...</p>
            <p className="text-sm text-gray-400">This takes less than 60 seconds</p>
          </div>
        ) : container ? (
          <ContainerCard container={container} />
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
            <p className="text-gray-400">No active container. Complete onboarding to get started.</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="https://polar.sh/settings" target="_blank" rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white">Manage Billing →</a>
        </div>
      </div>
    </div>
  );
}
