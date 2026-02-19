"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function QueryToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (!success && !error) {
      return;
    }

    if (success) {
      toast.success(success);
    }

    if (error) {
      toast.error(error);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("success");
    params.delete("error");

    const cleaned = params.toString();
    router.replace(cleaned ? `${pathname}?${cleaned}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return null;
}
