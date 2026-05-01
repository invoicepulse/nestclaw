import { supabase } from './supabase';
import type { ContainerWithUrls, User, ApiResponse } from '@shared/types';

async function authFetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      ...options?.headers,
    },
  });
  return res.json() as Promise<ApiResponse<T>>;
}

export const fetchContainer = () => authFetch<ContainerWithUrls>('/api/containers/me');
export const fetchUser = () => authFetch<User>('/api/users/me');
export const updateAgentType = (agent_type: string) =>
  authFetch<{ agent_type: string }>('/api/users/me/agent-type', {
    method: 'POST',
    body: JSON.stringify({ agent_type }),
  });
