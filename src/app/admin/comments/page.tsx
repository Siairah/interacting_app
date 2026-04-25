import { Suspense } from "react";
import AdminCommentsClient from "./AdminCommentsClient";

export default function AdminCommentsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-muted small">Loading comments…</div>}>
      <AdminCommentsClient />
    </Suspense>
  );
}
