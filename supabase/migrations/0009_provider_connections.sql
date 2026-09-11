-- Persistent encrypted provider connections.
-- Browser roles cannot read provider credentials; all secret material is encrypted by the app before storage.

create table if not exists public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  provider_account_id text,
  display_name text,
  status text not null default 'connected',
  scopes text[] not null default '{}',
  encrypted_access_token jsonb,
  encrypted_refresh_token jsonb,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  last_refreshed_at timestamptz,
  needs_attention_reason text,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_connections_provider_check
    check (provider in ('github','vercel','supabase','stripe')),
  constraint provider_connections_status_check
    check (status in ('connected','needs_attention','revoked')),
  constraint provider_connections_access_envelope_check
    check (
      encrypted_access_token is null or (
        encrypted_access_token->>'v' = '1' and
        encrypted_access_token->>'alg' = 'aes-256-gcm' and
        encrypted_access_token ? 'iv' and
        encrypted_access_token ? 'tag' and
        encrypted_access_token ? 'ciphertext'
      )
    ),
  constraint provider_connections_refresh_envelope_check
    check (
      encrypted_refresh_token is null or (
        encrypted_refresh_token->>'v' = '1' and
        encrypted_refresh_token->>'alg' = 'aes-256-gcm' and
        encrypted_refresh_token ? 'iv' and
        encrypted_refresh_token ? 'tag' and
        encrypted_refresh_token ? 'ciphertext'
      )
    )
);

create unique index if not exists provider_connections_workspace_provider_uidx
  on public.provider_connections(workspace_id, provider);

create index if not exists provider_connections_status_idx
  on public.provider_connections(status, updated_at);

alter table public.provider_connections enable row level security;

revoke all on table public.provider_connections from public, anon, authenticated;
grant select, insert, update, delete on table public.provider_connections to service_role;
