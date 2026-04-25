"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAdminSession, getAdminToken, isAdminAuthenticated } from "@/admin/auth";
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    const flagged = isAdminAuthenticated();
    if (!flagged || !token) {
      if (flagged && !token) clearAdminSession();
      router.replace("/");
      return;
    }
    setOk(true);
  }, [router]);

  if (!ok) {
    return (
      <div
        className="d-flex align-items-center justify-content-center gap-2"
        style={{ minHeight: "100dvh", background: "#f8f9fa", color: "#6c757d" }}
      >
        <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden />
        Checking admin access…
      </div>
    );
  }

  return <>{children}</>;
}
