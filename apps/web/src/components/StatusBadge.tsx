import { cn } from '../lib/utils';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  provisioning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  grace_period: 'bg-gray-500/20 text-gray-400',
  deleted: 'bg-gray-500/20 text-gray-500',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusColors[status] ?? statusColors['deleted'])}>
      {status.replace('_', ' ')}
    </span>
  );
}
