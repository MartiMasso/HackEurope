import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

function getEnvVar(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
    getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as CookieOptions);
            });
          } catch {
            // Ignore in server components where setting cookies is not allowed.
          }
        }
      }
    }
  );
}
