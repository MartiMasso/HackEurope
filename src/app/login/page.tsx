import { redirect } from "next/navigation";
import { signInAction, signUpAction } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
      <div className="grid w-full gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">Use your Paperwork OS account credentials.</p>

          <form action={signInAction} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="sign-in-email">
                Email
              </label>
              <input id="sign-in-email" name="email" type="email" autoComplete="email" required className="w-full" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="sign-in-password">
                Password
              </label>
              <input
                id="sign-in-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full"
              />
            </div>

            <SubmitButton idleText="Sign in" loadingText="Signing in..." className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-70" />
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Create account</h2>
          <p className="mt-2 text-sm text-slate-600">Register with email and password.</p>

          <form action={signUpAction} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="sign-up-email">
                Email
              </label>
              <input id="sign-up-email" name="email" type="email" autoComplete="email" required className="w-full" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="sign-up-password">
                Password
              </label>
              <input
                id="sign-up-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                className="w-full"
              />
            </div>

            <SubmitButton idleText="Create account" loadingText="Creating account..." className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-70" />
          </form>
        </section>
      </div>
    </main>
  );
}
