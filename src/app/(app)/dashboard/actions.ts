"use server";

import { redirect } from "next/navigation";
import { extractFieldsFromDocument } from "@/lib/extraction/extract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function extractFieldsAction(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");

  if (!documentId) {
    redirect("/dashboard?error=Missing%20document%20id");
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, type, filename, storage_path")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();

  if (documentError || !document) {
    redirect(`/dashboard?error=${encodeURIComponent(documentError?.message ?? "Document not found")}`);
  }

  const signedUrlResult = await supabase.storage.from("vault").createSignedUrl(document.storage_path, 300);

  if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
    redirect(
      `/dashboard?error=${encodeURIComponent(signedUrlResult.error?.message ?? "Unable to access file")}`
    );
  }

  const extractedFields = await extractFieldsFromDocument({
    documentType: document.type,
    fileUrl: signedUrlResult.data.signedUrl,
    filename: document.filename
  });

  const now = new Date().toISOString();
  const rows = extractedFields.map((field) => ({
    user_id: user.id,
    key: field.key,
    value: field.value,
    confidence: field.confidence,
    source_document_id: document.id,
    source_page: field.sourcePage,
    updated_at: now
  }));

  const { error: upsertError } = await supabase.from("fields").upsert(rows, {
    onConflict: "user_id,key"
  });

  if (upsertError) {
    redirect(`/dashboard?error=${encodeURIComponent(upsertError.message)}`);
  }

  redirect(`/dashboard?success=${encodeURIComponent(`Extracted ${rows.length} fields from ${document.filename}`)}`);
}
