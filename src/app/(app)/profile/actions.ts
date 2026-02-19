"use server";

import { redirect } from "next/navigation";
import { PROFILE_FIELDS } from "@/lib/profile/definitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function saveProfileAction(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date().toISOString();
  const rows = PROFILE_FIELDS.map((field) => {
    const value = String(formData.get(field.key) ?? "").trim();

    return {
      user_id: user.id,
      key: field.key,
      value,
      confidence: value ? 1 : null,
      source_document_id: null,
      source_page: null,
      updated_at: now
    };
  });

  const { error } = await supabase.from("fields").upsert(rows, {
    onConflict: "user_id,key"
  });

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/profile?success=Profile%20saved");
}
