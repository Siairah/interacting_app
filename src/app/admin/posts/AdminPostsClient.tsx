"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminErrorBanner from "@/admin/components/AdminErrorBanner";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import AdminPostInspectModal from "@/admin/components/AdminPostInspectModal";
import { adminDeletePost, adminListPosts, adminLoadCircleFilterOptions, adminPostsBulk } from "@/admin/managementApi";
import { useAdminAuthRedirect } from "@/admin/useAdminAuthRedirect";
import AdminPagination from "../components/AdminPagination";

export default function AdminPostsClient() {
  const tryRedirect = useAdminAuthRedirect();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [hasMedia, setHasMedia] = useState("");
  const [circleId, setCircleId] = useState("");
  /** One queue filter at a time: reported-only posts were missing before union filter. */
  const [attentionFilter, setAttentionFilter] = useState<"" | "needs_attention" | "flagged_only" | "reported_only">("");
  const [approval, setApproval] = useState<"" | "pending" | "approved">("");
  const [inspectPostId, setInspectPostId] = useState<string | null>(null);
  const [circleChoices, setCircleChoices] = useState<{ id: string; name: string }[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListPosts>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = searchParams.get("circle") ?? "";
    setCircleId((prev) => (prev === c ? prev : c));
  }, [searchParams]);

  useEffect(() => {
    const raw = searchParams.get("inspect")?.trim() ?? "";
    if (/^[a-f0-9]{24}$/i.test(raw)) setInspectPostId(raw);
    else setInspectPostId(null);
  }, [searchParams]);

  const openInspect = useCallback(
    (id: string) => {
      setInspectPostId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("inspect", id);
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const closeInspect = useCallback(() => {
    setInspectPostId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("inspect");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    let cancelled = false;
    setCirclesLoading(true);
    adminLoadCircleFilterOptions(30)
      .then((rows) => {
        if (!cancelled) setCircleChoices(rows);
      })
      .catch(() => {
        if (!cancelled) setCircleChoices([]);
      })
      .finally(() => {
        if (!cancelled) setCirclesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCircleFilter = useCallback(
    (id: string) => {
      setCircleId(id);
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("circle", id);
      else params.delete("circle");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminListPosts({
        page,
        search: search.trim() || undefined,
        has_media: hasMedia || undefined,
        circle_id: circleId || undefined,
        needs_attention: attentionFilter === "needs_attention" || undefined,
        flagged_only: attentionFilter === "flagged_only" || undefined,
        reported_only: attentionFilter === "reported_only" || undefined,
        approval: approval || undefined,
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
  }, [page, search, hasMedia, circleId, attentionFilter, approval, tryRedirect]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete(id: string) {
    if (!confirm("Delete this post permanently? Use Review first if you need full context.")) return;
    setBusy(true);
    try {
      await adminDeletePost(id);
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Delete failed");
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
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Bulk failed");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];
  const pag = data?.pagination;
  const stats = data?.stats;

  return (
    <AdminPthPageFrame title="Post Management" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Post Management" }]}>
      <AdminErrorBanner message={err} onRetry={() => void load()} />
      <p className="small text-muted mb-2 text-break d-none d-md-block">
        Superadmin view: <strong>every post</strong> in the system. Use <strong>Needs attention</strong> to list posts that are{" "}
        <em>either</em> in the auto-flag queue <em>or</em> have unresolved user reports (so reported-only items are never hidden).{" "}
        <Link href="/admin/flagged-posts">Flagged posts</Link> is the dedicated moderation queue;{" "}
        <Link href="/admin/reports">Reports</Link> lists raw reports.
      </p>
      <p className="small text-muted mb-2 d-md-none">All posts · filter by circle · <strong>Needs attention</strong> for flags &amp; reports · <Link href="/admin/flagged-posts">Flagged</Link></p>
      {stats ? (
        <div className="row row-cols-2 row-cols-sm-4 g-2 mb-3 small text-muted">
          <div className="col">Posts: {stats.total_posts}</div>
          <div className="col">Today: {stats.posts_today}</div>
          <div className="col">Comments: {stats.total_comments}</div>
          <div className="col">Likes: {stats.total_likes}</div>
        </div>
      ) : null}

      <div className="card shadow mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-lg-3 col-md-6">
              <label className="form-label small mb-0">Circle (group)</label>
              <select className="form-select form-select-sm" value={circleId} disabled={circlesLoading} onChange={(e) => setCircleFilter(e.target.value)}>
                <option value="">All circles</option>
                {circleChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-lg-3 col-md-6">
              <label className="form-label small mb-0">Search (text, author email, circle name)</label>
              <input className="form-control form-control-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-12 col-sm-6 col-lg-2 col-md-4">
              <label className="form-label small mb-0">Media</label>
              <select className="form-select form-select-sm" value={hasMedia} onChange={(e) => setHasMedia(e.target.value)}>
                <option value="">All</option>
                <option value="yes">Has media</option>
                <option value="no">No media</option>
              </select>
            </div>
            <div className="col-lg-2 col-md-4">
              <label className="form-label small mb-0">Approval</label>
              <select className="form-select form-select-sm" value={approval} onChange={(e) => setApproval(e.target.value as "" | "pending" | "approved")}>
                <option value="">All</option>
                <option value="pending">Pending approval</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div className="col-12 col-lg-2 col-md-4">
              <label className="form-label small mb-0">Queue &amp; reports</label>
              <select
                className="form-select form-select-sm"
                value={attentionFilter}
                onChange={(e) => setAttentionFilter(e.target.value as typeof attentionFilter)}
              >
                <option value="">All posts</option>
                <option value="needs_attention">Needs attention (flagged or reported)</option>
                <option value="flagged_only">Flagged queue only</option>
                <option value="reported_only">Reported only (open reports)</option>
              </select>
            </div>
          </div>
          <div className="d-grid gap-2 d-sm-flex flex-wrap mt-3">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setPage(1)} disabled={loading}>
              Apply
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => {
                setSearch("");
                setHasMedia("");
                setAttentionFilter("");
                setApproval("");
                setCircleFilter("");
                setPage(1);
              }}
              disabled={loading}
            >
              Clear filters
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

      <div className="card shadow">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-sm mb-0 align-middle">
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
                  <th>Status</th>
                  <th>Mod / reports</th>
                  <th>C/L/M</th>
                  <th>Date</th>
                  <th style={{ minWidth: 140 }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-muted">
                      No posts
                      {circleId ? " in this circle" : ""}
                      {attentionFilter === "needs_attention"
                        ? " needing attention"
                        : attentionFilter === "flagged_only"
                          ? " in flagged queue"
                          : attentionFilter === "reported_only"
                            ? " with open reports"
                            : ""}
                    </td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr key={p.id} className={p.flagged_pending ? "table-warning" : undefined}>
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
                      <td className="small" style={{ maxWidth: 240 }}>
                        {p.content || "—"}
                      </td>
                      <td className="small">{p.authorEmail}</td>
                      <td className="small">{p.circleName || "—"}</td>
                      <td className="small">
                        <span className={`badge ${p.is_public ? "bg-success" : "bg-secondary"}`}>{p.is_public ? "Public" : "Hidden"}</span>{" "}
                        <span className={`badge ${p.is_approved ? "bg-primary" : "bg-warning text-dark"}`}>{p.is_approved ? "OK" : "Pending"}</span>
                      </td>
                      <td className="small">
                        {p.flagged_pending ? (
                          <span className="badge bg-danger" title={p.moderation_reason || ""}>
                            Flagged
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}{" "}
                        {(p.open_reports ?? 0) > 0 ? (
                          <span className="badge rounded-pill" style={{ background: "#e2e8f0", color: "#334155" }}>
                            {p.open_reports} rep
                          </span>
                        ) : null}
                      </td>
                      <td className="small">
                        {p.commentsCount}/{p.likesCount}/{p.mediaCount}
                      </td>
                      <td className="small text-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                      <td className="text-nowrap">
                        <button type="button" className="btn btn-sm me-1" style={{ borderColor: "#667eea", color: "#5a67d8" }} disabled={busy} onClick={() => openInspect(p.id)}>
                          Review
                        </button>
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

      <AdminPostInspectModal
        postId={inspectPostId}
        onClose={closeInspect}
        onDeleted={() => {
          closeInspect();
          void load();
        }}
      />
    </AdminPthPageFrame>
  );
}
