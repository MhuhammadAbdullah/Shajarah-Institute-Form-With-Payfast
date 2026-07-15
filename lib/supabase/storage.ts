import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/config/env";

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File uploads aren't configured yet - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    this.name = "StorageNotConfiguredError";
  }
}

let cachedClient: ReturnType<typeof createClient> | undefined;

function getStorageClient() {
  if (cachedClient) return cachedClient;

  const env = getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new StorageNotConfiguredError();
  }

  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return cachedClient;
}

/**
 * Uploads a file to the configured Supabase Storage bucket and returns its
 * public URL. Used by the FILE field type in the dynamic registration
 * wizard - the wizard uploads immediately on file selection (not on final
 * submit), so only the resulting URL - never a raw File object - ends up in
 * the autosaved localStorage draft.
 */
export async function uploadRegistrationFile(file: File): Promise<string> {
  const env = getEnv();
  const client = getStorageClient();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const { error } = await client.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data } = client.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
