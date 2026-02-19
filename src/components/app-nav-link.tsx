"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavLinkProps = {
  href: string;
  label: string;
};

export function AppNavLink({ href, label }: AppNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-brand-100 text-brand-900"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
}
