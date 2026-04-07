"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import { adminDeletePost, adminListPosts, adminPostsBulk } from "@/admin/managementApi";
import AdminPagination from "../components/AdminPagination";

export default function AdminPostsClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [hasMedia, setHasMedia] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListPosts>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminListPosts({
        page,
        search: search.trim() || undefined,
        has_media: hasMedia || undefined,
      });
      setData(r);
      setSelected(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search, hasMedia]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete(id: string) {
    if (!confirm("Delete this post permanently?")) return;
    setBusy(true);
    try {
      await adminDeletePost(id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBulk(action: "delete" | "hide" | "show") {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete" && !confirm(`Delete ${ids.length} post(s)?`)) return;
    setBusy(true);
    try {
      await adminPostsBulk(ids, action);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk failed");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];
  const pag = data?.pagination;
  const stats = data?.stats;

  return (
    <AdminPthPageFrame title="Post Management" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Post Management" }]}>
      {stats ? (
        <div className="row g-2 mb-3 small text-muted">
          <div className="col-auto">Posts: {stats.total_posts}</div>
          <div className="col-auto">Today: {stats.posts_today}</div>
          <div className="col-auto">Comments: {stats.total_comments}</div>
          <div className="col-auto">Likes: {stats.total_likes}</div>
        </div>
      ) : null}

      <div className="card shadow mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small mb-0">Search</label>
              <input className="form-control form-control-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-0">Media</label>
              <select className="form-select form-select-sm" value={hasMedia} onChange={(e) => setHasMedia(e.target.value)}>
                <option value="">All</option>
                <option value="yes">Has media</option>
                <option value="no">No media</option>
              </select>
            </div>
            <div className="col-md-5 d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setPage(1)} disabled={loading}>
                Apply
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setSearch("");
                  setHasMedia("");
                  setPage(1);
                }}
                disabled={loading}
              >
                Clear
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("delete")}>
                Delete selected
              </button>
              <button type="button" className="btn btn-warning btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("hide")}>
                Hide selected
              </button>
              <button type="button" className="btn btn-success btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("show")}>
                Show selected
              </button>
            </div>
          </div>
        </div>
      </div>

      {err ? <div className="alert alert-danger py-2 small">{err}</div> : null}

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
                  <th>Content</th>
                  <th>Author</th>
                  <th>Circle</th>
                  <th>Public</th>
                  <th>C/L/M</th>
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
                      No posts
                    </td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(p.id);
                            else next.delete(p.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="small" style={{ maxWidth: 200 }}>
                        {p.content || "—"}
                      </td>
                      <td className="small">{p.authorEmail}</td>
                      <td className="small">{p.circleName || "—"}</td>
                      <td>{p.is_public ? "Y" : "N"}</td>
                      <td className="small">
                        {p.commentsCount}/{p.likesCount}/{p.mediaCount}
                      </td>
                      <td className="small">{new Date(p.createdAt).toLocaleString()}</td>
                      <td>
                        <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => void onDelete(p.id)}>
                          Delete
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
