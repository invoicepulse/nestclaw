import { useQuery } from '@tanstack/react-query';
import { fetchContainer } from '../lib/api';

export function useContainer() {
  const query = useQuery({
    queryKey: ['container'],
    queryFn: fetchContainer,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.subscription_status;
      return status === 'provisioning' ? 5000 : false;
    },
  });
  return { container: query.data?.data ?? null, error: query.data?.error, isLoading: query.isLoading, refetch: query.refetch };
}
