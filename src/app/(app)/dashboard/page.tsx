import Link from "next/link";
import { extractFieldsAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { PROFILE_COMPLETION_KEYS } from "@/lib/profile/definitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DocumentRow, FieldRow, PackRow } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [documentsResult, fieldsResult, packsResult] = await Promise.all([
    supabase
      .from("documents")
      .select("id, user_id, type, filename, storage_path, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("fields")
      .select("id, user_id, key, value, confidence, source_document_id, source_page, updated_at")
      .eq("user_id", user.id),
    supabase
      .from("packs")
      .select("id, user_id, pack_type, status, pdf_storage_path, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
  ]);

  const documents = (documentsResult.data ?? []) as DocumentRow[];
  const fields = (fieldsResult.data ?? []) as FieldRow[];
  const packs = (packsResult.data ?? []) as PackRow[];

  const fieldMap = new Map(fields.map((field) => [field.key, field.value]));
  const completed = PROFILE_COMPLETION_KEYS.filter((key) => (fieldMap.get(key) ?? "").trim().length > 0).length;
  const completion = Math.round((completed / PROFILE_COMPLETION_KEYS.length) * 100);

  const packsWithSignedUrls = await Promise.all(
    packs.map(async (pack) => {
      const signed = await supabase.storage.from("packs").createSignedUrl(pack.pdf_storage_path, 3600);
      return {
        ...pack,
        signedUrl: signed.data?.signedUrl ?? null
      };
    })
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your documents and generated application packs.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Profile completion</h2>
          <span className="text-sm font-medium text-slate-700">{completion}%</span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-brand-600" style={{ width: `${completion}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {completed} of {PROFILE_COMPLETION_KEYS.length} core fields completed.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Uploaded documents</h2>
          <Link
            href="/upload"
            className="rounded-md bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800"
          >
            Upload new
          </Link>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-slate-600">No documents yet.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((document) => (
              <li key={document.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{document.filename}</p>
                    <p className="text-xs text-slate-500">
                      {document.type} • {new Date(document.created_at).toLocaleString()}
                    </p>
                  </div>
                  <form action={extractFieldsAction}>
                    <input type="hidden" name="documentId" value={document.id} />
                    <SubmitButton
                      idleText="Extract fields"
                      loadingText="Extracting..."
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-70"
                    />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Generated packs</h2>
          <Link
            href="/packs"
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            Manage packs
          </Link>
        </div>

        {packsWithSignedUrls.length === 0 ? (
          <p className="text-sm text-slate-600">No packs generated yet.</p>
        ) : (
          <ul className="space-y-3">
            {packsWithSignedUrls.map((pack) => (
              <li key={pack.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{pack.pack_type}</p>
                    <p className="text-xs text-slate-500">
                      {pack.status} • {new Date(pack.created_at).toLocaleString()}
                    </p>
                  </div>
                  {pack.signedUrl ? (
                    <a
                      href={pack.signedUrl}
                      className="rounded-md bg-brand-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-800"
                    >
                      Download PDF
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">Unavailable link</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
