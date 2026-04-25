import { Suspense } from "react";
import AdminPostsClient from "./AdminPostsClient";

export default function AdminPostsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-muted small">Loading post tools…</div>}>
      <AdminPostsClient />
    </Suspense>
  );
}
