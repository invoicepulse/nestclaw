export type AgentType = 'openclaw' | 'hermes';

export type ContainerStatus = 'provisioning' | 'active' | 'grace_period' | 'deleted' | 'error';

export interface User {
  id: string;
  email: string;
  supabase_id: string;
  polar_customer_id: string | null;
  agent_type: AgentType | null;
  created_at: string;
}

export interface Container {
  id: string;
  user_id: string;
  subdomain: string;
  container_name: string;
  agent_type: AgentType;
  terminal_port: number;
  webui_port: number | null;
  subscription_status: ContainerStatus;
  polar_subscription_id: string;
  deletion_scheduled_at: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface ContainerWithUrls extends Container {
  terminal_url: string;
  webui_url: string | null;
}
