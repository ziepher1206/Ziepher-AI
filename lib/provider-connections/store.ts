import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptProviderSecret,
  encryptProviderSecret,
  type EncryptedSecret
} from "@/lib/security/provider-credentials";

export type ProviderKind = "github" | "vercel" | "supabase" | "stripe";
export type ProviderConnectionStatus = "connected" | "needs_attention" | "revoked";

type ProviderConnectionRow = {
  id: string;
  workspace_id: string;
  provider: ProviderKind;
  provider_account_id: string | null;
  display_name: string | null;
  status: ProviderConnectionStatus;
  scopes: string[];
  encrypted_access_token: EncryptedSecret | null;
  encrypted_refresh_token: EncryptedSecret | null;
  access_token_expires_at: string | null;
  refresh_token_expires_at: string | null;
  last_refreshed_at: string | null;
  needs_attention_reason: string | null;
  revoked_at: string | null;
};

export type DecryptedProviderConnection = Omit<
  ProviderConnectionRow,
  "encrypted_access_token" | "encrypted_refresh_token"
> & {
  accessToken: string | null;
  refreshToken: string | null;
};

function decryptRow(row: ProviderConnectionRow): DecryptedProviderConnection {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    provider: row.provider,
    provider_account_id: row.provider_account_id,
    display_name: row.display_name,
    status: row.status,
    scopes: row.scopes ?? [],
    access_token_expires_at: row.access_token_expires_at,
    refresh_token_expires_at: row.refresh_token_expires_at,
    last_refreshed_at: row.last_refreshed_at,
    needs_attention_reason: row.needs_attention_reason,
    revoked_at: row.revoked_at,
    accessToken: row.encrypted_access_token
      ? decryptProviderSecret(row.encrypted_access_token)
      : null,
    refreshToken: row.encrypted_refresh_token
      ? decryptProviderSecret(row.encrypted_refresh_token)
      : null
  };
}

export async function upsertProviderConnection(input: {
  workspaceId: string;
  provider: ProviderKind;
  providerAccountId?: string;
  displayName?: string;
  scopes?: string[];
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
}) {
  const admin = createAdminClient();
  const row = {
    workspace_id: input.workspaceId,
    provider: input.provider,
    provider_account_id: input.providerAccountId ?? null,
    display_name: input.displayName ?? null,
    status: "connected" as const,
    scopes: input.scopes ?? [],
    encrypted_access_token: input.accessToken
      ? encryptProviderSecret(input.accessToken)
      : null,
    encrypted_refresh_token: input.refreshToken
      ? encryptProviderSecret(input.refreshToken)
      : null,
    access_token_expires_at: input.accessTokenExpiresAt ?? null,
    refresh_token_expires_at: input.refreshTokenExpiresAt ?? null,
    last_refreshed_at: new Date().toISOString(),
    needs_attention_reason: null,
    revoked_at: null
  };

  const { data, error } = await admin
    .from("provider_connections")
    .upsert(row, { onConflict: "workspace_id,provider" })
    .select("*")
    .single();

  if (error) throw new Error(`Could not persist provider connection: ${error.message}`);
  return decryptRow(data as ProviderConnectionRow);
}

export async function getProviderConnection(
  workspaceId: string,
  provider: ProviderKind
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw new Error(`Could not load provider connection: ${error.message}`);
  return data ? decryptRow(data as ProviderConnectionRow) : null;
}

export async function markProviderConnectionNeedsAttention(
  workspaceId: string,
  provider: ProviderKind,
  reason: string
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("provider_connections")
    .update({
      status: "needs_attention",
      needs_attention_reason: reason.slice(0, 2000),
      updated_at: new Date().toISOString()
    })
    .eq("workspace_id", workspaceId)
    .eq("provider", provider);

  if (error) throw new Error(`Could not flag provider connection: ${error.message}`);
}

export async function revokeProviderConnection(
  workspaceId: string,
  provider: ProviderKind
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("provider_connections")
    .update({
      status: "revoked",
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      access_token_expires_at: null,
      refresh_token_expires_at: null,
      revoked_at: now,
      updated_at: now
    })
    .eq("workspace_id", workspaceId)
    .eq("provider", provider);

  if (error) throw new Error(`Could not revoke provider connection: ${error.message}`);
}
