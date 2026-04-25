"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminErrorBanner from "@/admin/components/AdminErrorBanner";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import { adminCommentsBulk, adminDeleteComment, adminListComments } from "@/admin/managementApi";
import { useAdminAuthRedirect } from "@/admin/useAdminAuthRedirect";
import AdminPagination from "../components/AdminPagination";

export default function AdminCommentsClient() {
  const tryRedirect = useAdminAuthRedirect();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const postFromUrl = searchParams.get("post")?.trim() ?? "";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [postIdInput, setPostIdInput] = useState(postFromUrl);
  const [showRemoved, setShowRemoved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListComments>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPostIdInput(postFromUrl);
  }, [postFromUrl]);

  const setPostFilter = useCallback(
    (raw: string) => {
      const id = raw.trim();
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("post", id);
      else params.delete("post");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminListComments({
        page,
        search: search.trim() || undefined,
        post_id: postFromUrl || undefined,
        include_deleted: showRemoved,
      });
      setData(r);
      setSelected(new Set());
    } catch (e) {
      if (!tryRedirect(e)) {
        setErr(e instanceof Error ? e.message : "Failed");
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, postFromUrl, showRemoved, tryRedirect]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete(id: string) {
    if (!confirm("Soft-delete this comment?")) return;
    setBusy(true);
    try {
      await adminDeleteComment(id);
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBulk(action: "soft_delete" | "restore") {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(true);
    try {
      await adminCommentsBulk(ids, action);
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Bulk failed");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];
  const pag = data?.pagination;

  return (
    <AdminPthPageFrame title="Comment Management" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Comment Management" }]}>
      <AdminErrorBanner message={err} onRetry={() => void load()} />
      <p className="small text-muted mb-2">
        Inspect and moderate comments across all posts. Filter by <strong>post ID</strong> (24-char hex) to see every comment on one post—useful after opening{" "}
        <strong>Review</strong> on <Link href="/admin/posts">Post Management</Link>. Circle name is shown when the post still exists.
      </p>
      <div className="card shadow mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small mb-0">Post ID (filter)</label>
              <input
                className="form-control form-control-sm font-monospace"
                placeholder="e.g. from Review panel"
                value={postIdInput}
                onChange={(e) => setPostIdInput(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-0">Search text</label>
              <input className="form-control form-control-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-6 d-flex flex-wrap gap-2 align-items-center">
              <div className="form-check mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="showRemoved"
                  checked={showRemoved}
                  onChange={(e) => {
                    setShowRemoved(e.target.checked);
                    setPage(1);
                  }}
                />
                <label className="form-check-label small" htmlFor="showRemoved">
                  Include removed
                </label>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setPostFilter(postIdInput);
                }}
                disabled={loading}
              >
                Apply
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setPostFilter("")} disabled={loading || !postFromUrl}>
                Clear post filter
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("soft_delete")}>
                Soft-delete selected
              </button>
              <button type="button" className="btn btn-success btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("restore")}>
                Restore selected
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={items.length > 0 && items.every((i) => selected.has(i.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(new Set(items.map((i) => i.id)));
                        else setSelected(new Set());
                      }}
                    />
                  </th>
                  <th>Comment</th>
                  <th>Author</th>
                  <th>Post</th>
                  <th>Circle</th>
                  <th>Removed</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">
                      No comments
                      {postFromUrl ? " for this post" : ""}
                    </td>
                  </tr>
                ) : (
                  items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(c.id);
                            else next.delete(c.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="small" style={{ maxWidth: 260 }}>
                        {c.content}
                      </td>
                      <td className="small">{c.authorEmail}</td>
                      <td className="small">
                        {c.postId ? (
                          <Link href={`/admin/posts?inspect=${c.postId}`} className="text-decoration-none">
                            {c.postPreview || c.postId}
                          </Link>
                        ) : (
                          c.postPreview || "—"
                        )}
                      </td>
                      <td className="small">{c.postCircleName || "—"}</td>
                      <td>{c.is_deleted ? "Y" : "N"}</td>
                      <td className="small">{new Date(c.createdAt).toLocaleString()}</td>
                      <td>
                        <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => void onDelete(c.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {pag ? <AdminPagination page={pag.page} pages={pag.pages} onPage={setPage} /> : null}
      </div>
    </AdminPthPageFrame>
  );
}
