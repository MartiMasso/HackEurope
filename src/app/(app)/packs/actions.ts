"use server";

import { redirect } from "next/navigation";
import { generateApplicationPackPdf } from "@/lib/packs/generatePack";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function normalizePackType(packType: string) {
  return packType.toLowerCase().replace(/\s+/g, "-");
}

export async function generatePackAction(formData: FormData) {
  const packType = String(formData.get("packType") ?? "University Application Pack");
  const supabase = createServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [fieldsResult, documentsResult] = await Promise.all([
    supabase.from("fields").select("key, value").eq("user_id", user.id),
    supabase
      .from("documents")
      .select("id, user_id, type, filename, storage_path, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
  ]);

  if (fieldsResult.error) {
    redirect(`/packs?error=${encodeURIComponent(fieldsResult.error.message)}`);
  }

  if (documentsResult.error) {
    redirect(`/packs?error=${encodeURIComponent(documentsResult.error.message)}`);
  }

  const profile = Object.fromEntries((fieldsResult.data ?? []).map((row) => [row.key, row.value]));
  const documents = documentsResult.data ?? [];

  const pdfBytes = await generateApplicationPackPdf({
    packType,
    profile,
    documents
  });

  const pdfPath = `${user.id}/${Date.now()}-${normalizePackType(packType)}.pdf`;

  const { error: uploadError } = await supabase.storage.from("packs").upload(pdfPath, Buffer.from(pdfBytes), {
    contentType: "application/pdf",
    upsert: false
  });

  if (uploadError) {
    redirect(`/packs?error=${encodeURIComponent(uploadError.message)}`);
  }

  const { error: insertError } = await supabase.from("packs").insert({
    user_id: user.id,
    pack_type: packType,
    status: "generated",
    pdf_storage_path: pdfPath
  });

  if (insertError) {
    redirect(`/packs?error=${encodeURIComponent(insertError.message)}`);
  }

  redirect(`/packs?success=${encodeURIComponent(`Pack generated: ${packType}`)}`);
}
