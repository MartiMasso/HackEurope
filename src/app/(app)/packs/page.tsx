import { SubmitButton } from "@/components/submit-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PackRow } from "@/lib/types";
import { generatePackAction } from "./actions";

const PACK_TEMPLATES = ["University Application Pack", "Rental Application Pack"] as const;

export default async function PacksPage() {
  const supabase = createServerSupabaseClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: packsData } = await supabase
    .from("packs")
    .select("id, user_id, pack_type, status, pdf_storage_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const packs = (packsData ?? []) as PackRow[];

  const packsWithSignedUrls = await Promise.all(
    packs.map(async (pack) => {
      const signedResult = await supabase.storage.from("packs").createSignedUrl(pack.pdf_storage_path, 3600);
      return {
        ...pack,
        signedUrl: signedResult.data?.signedUrl ?? null
      };
    })
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Packs</h1>
        <p className="mt-1 text-sm text-slate-600">Generate and download reusable application PDF packs.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Generate pack</h2>
        <form action={generatePackAction} className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <select name="packType" defaultValue={PACK_TEMPLATES[0]} className="md:w-80">
            {PACK_TEMPLATES.map((template) => (
              <option key={template} value={template}>
                {template}
              </option>
            ))}
          </select>
          <SubmitButton idleText="Generate PDF" loadingText="Generating..." />
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Generated packs</h2>

        {packsWithSignedUrls.length === 0 ? (
          <p className="text-sm text-slate-600">No packs yet.</p>
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
                    <span className="text-xs text-slate-500">Download link unavailable</span>
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
