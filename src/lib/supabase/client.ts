"use client";

import { createBrowserClient } from "@supabase/ssr";

function getEnvVar(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClientSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
      getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }

  return browserClient;
}
