"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeFileName(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadDocumentAction(formData: FormData) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const documentType = String(formData.get("documentType") ?? "general");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/upload?error=Please%20select%20a%20file");
  }

  const path = `${user.id}/${Date.now()}-${safeFileName(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("vault").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    redirect(`/upload?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error: insertError } = await supabase.from("documents").insert({
    user_id: user.id,
    type: documentType,
    filename: file.name,
    storage_path: path
  });

  if (insertError) {
    redirect(`/upload?error=${encodeURIComponent(insertError.message)}`);
  }

  redirect(`/dashboard?success=${encodeURIComponent(`Uploaded ${file.name}`)}`);
}
