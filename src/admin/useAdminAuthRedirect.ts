"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { AdminAuthError } from "@/admin/adminFetch";
import { clearAdminSession } from "@/admin/auth";

/**
 * Call from admin page catch blocks. Returns true if the user was redirected home (session cleared).
 */
export function useAdminAuthRedirect() {
  const router = useRouter();
  return useCallback(
    (error: unknown): boolean => {
      if (error instanceof AdminAuthError) {
        clearAdminSession();
        router.replace("/");
        return true;
      }
      const msg = error instanceof Error ? error.message : String(error);
      if (/session expired|log in again|admin session required|access denied|unauthorized/i.test(msg)) {
        clearAdminSession();
        router.replace("/");
        return true;
      }
      return false;
    },
    [router]
  );
}
