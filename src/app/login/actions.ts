"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function toErrorRedirect(message: string) {
  return `/login?error=${encodeURIComponent(message)}`;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(toErrorRedirect("Email and password are required."));
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(toErrorRedirect(error.message));
  }

  redirect("/dashboard?success=Signed%20in");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(toErrorRedirect("Email and password are required."));
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(toErrorRedirect(error.message));
  }

  if (data.session) {
    redirect("/dashboard?success=Account%20created");
  }

  redirect("/login?success=Account%20created.%20Check%20your%20email%20for%20confirmation.");
}
