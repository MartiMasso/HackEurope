import { redirect } from "next/navigation";
import { AppNavLink } from "@/components/app-nav-link";
import { SubmitButton } from "@/components/submit-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logoutAction } from "./actions";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col md:min-h-screen md:flex-row">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 md:w-64 md:border-b-0 md:border-r">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Paperwork OS</p>
            <p className="mt-1 truncate text-sm text-slate-600">{user.email}</p>
          </div>

          <nav className="space-y-1">
            <AppNavLink href="/dashboard" label="Dashboard" />
            <AppNavLink href="/upload" label="Upload" />
            <AppNavLink href="/profile" label="Profile" />
            <AppNavLink href="/packs" label="Packs" />
          </nav>

          <form action={logoutAction} className="mt-6">
            <SubmitButton
              idleText="Logout"
              loadingText="Logging out..."
              className="w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-70"
            />
          </form>
        </aside>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
