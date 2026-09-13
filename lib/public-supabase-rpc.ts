import { requireServerEnv } from "@/lib/env";

export async function publicSupabaseRpc<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const url = requireServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireServerEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: key,
      "content-type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload
      ? String((payload as { message?: unknown }).message ?? "Request failed.")
      : "Request failed.";
    throw new Error(message);
  }
  return payload as T;
}
