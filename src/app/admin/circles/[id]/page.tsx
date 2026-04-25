import { Suspense } from "react";
import AdminCircleDetailClient from "./AdminCircleDetailClient";

export default function AdminCircleDetailPage() {
  return (
    <Suspense fallback={<div className="p-4 text-muted small">Loading circle…</div>}>
      <AdminCircleDetailClient />
    </Suspense>
  );
}
