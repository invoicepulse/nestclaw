import { pgTable, text, uuid, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  supabase_id: text('supabase_id').unique().notNull(),
  polar_customer_id: text('polar_customer_id'),
  agent_type: text('agent_type'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const containers = pgTable('containers', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  subdomain: text('subdomain').unique().notNull(),
  container_name: text('container_name').unique().notNull(),
  agent_type: text('agent_type').notNull(),
  terminal_port: integer('terminal_port').notNull(),
  webui_port: integer('webui_port'),
  subscription_status: text('subscription_status').notNull().default('provisioning'),
  polar_subscription_id: text('polar_subscription_id').notNull(),
  deletion_scheduled_at: timestamp('deletion_scheduled_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  last_seen_at: timestamp('last_seen_at'),
});
