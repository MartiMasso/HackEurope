import { SubmitButton } from "@/components/submit-button";
import { PROFILE_FIELDS } from "@/lib/profile/definitions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveProfileAction } from "./actions";

export default async function ProfilePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("fields")
    .select("key, value")
    .eq("user_id", user.id)
    .in(
      "key",
      PROFILE_FIELDS.map((field) => field.key)
    );

  const values = new Map((data ?? []).map((row) => [row.key, row.value]));

  return (
    <div className="max-w-4xl space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Profile fields</h1>
        <p className="mt-1 text-sm text-slate-600">Edit your structured data. Packs are generated from these fields.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={saveProfileAction} className="grid gap-4 md:grid-cols-2">
          {PROFILE_FIELDS.map((field) => {
            const defaultValue =
              field.key === "email" ? values.get(field.key) ?? user.email ?? "" : values.get(field.key) ?? "";

            return (
              <div key={field.key} className="space-y-1">
                <label htmlFor={field.key} className="block text-sm font-medium text-slate-700">
                  {field.label}
                </label>
                <input
                  id={field.key}
                  name={field.key}
                  placeholder={field.placeholder}
                  defaultValue={defaultValue}
                  className="w-full"
                />
              </div>
            );
          })}

          <div className="md:col-span-2">
            <SubmitButton idleText="Save profile" loadingText="Saving..." />
          </div>
        </form>
      </section>
    </div>
  );
}
