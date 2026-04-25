"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminErrorBanner from "@/admin/components/AdminErrorBanner";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import {
  adminGetCircleDetail,
  adminPostCircleNotice,
  adminPostCircleWarning,
  adminSetCircleSuspended,
} from "@/admin/managementApi";
import { useAdminAuthRedirect } from "@/admin/useAdminAuthRedirect";
import AdminPagination from "../../components/AdminPagination";

export default function AdminCircleDetailClient() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const tryRedirect = useAdminAuthRedirect();

  const [postsPage, setPostsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminGetCircleDetail>> | null>(null);
  const [busy, setBusy] = useState(false);

  const [noticeOpen, setNoticeOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [audience, setAudience] = useState<"all_members" | "admins_only">("admins_only");
  const [msg, setMsg] = useState("");
  const [modalErr, setModalErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await adminGetCircleDetail(id, { posts_page: postsPage, posts_limit: 12 });
      setData(r);
    } catch (e) {
      if (!tryRedirect(e)) {
        setErr(e instanceof Error ? e.message : "Failed");
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id, postsPage, tryRedirect]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendNotice() {
    if (!msg.trim()) return;
    setModalErr(null);
    setBusy(true);
    try {
      await adminPostCircleNotice(id, { message: msg.trim(), audience });
      setNoticeOpen(false);
      setMsg("");
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setModalErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendWarning() {
    if (!msg.trim()) return;
    setModalErr(null);
    setBusy(true);
    try {
      await adminPostCircleWarning(id, { message: msg.trim(), audience });
      setWarnOpen(false);
      setMsg("");
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setModalErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function setSuspended(suspended: boolean, hours?: number) {
    const verb = suspended ? "Suspend" : "Restore";
    if (!confirm(`${verb} this circle?`)) return;
    setBusy(true);
    try {
      await adminSetCircleSuspended(id, suspended ? { suspended: true, hours: hours ?? 24 } : { suspended: false });
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const c = data?.circle;
  const pag = c?.posts_pagination;

  return (
    <AdminPthPageFrame
      title={c?.name ?? "Circle"}
      breadcrumb={[
        { label: "Dashboard", href: "/admin" },
        { label: "Circle Management", href: "/admin/circles" },
        { label: c?.name ?? "Detail" },
      ]}
    >
      <AdminErrorBanner message={err} onRetry={() => void load()} />

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Link href="/admin/circles" className="btn btn-outline-secondary btn-sm">
          ← All circles
        </Link>
        {id ? (
          <a className="btn btn-outline-primary btn-sm" href={`/circle/${id}`} target="_blank" rel="noopener noreferrer">
            Open in app
          </a>
        ) : null}
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !c} onClick={() => { setNoticeOpen(true); setWarnOpen(false); setModalErr(null); setMsg(""); }}>
          Broadcast notice
        </button>
        <button type="button" className="btn btn-warning btn-sm text-dark" disabled={busy || !c} onClick={() => { setWarnOpen(true); setNoticeOpen(false); setModalErr(null); setMsg(""); }}>
          Issue warning
        </button>
        {c?.suspended ? (
          <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => void setSuspended(false)}>
            Unsuspend
          </button>
        ) : (
          <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => void setSuspended(true, 24)}>
            Suspend 24h
          </button>
        )}
      </div>

      {loading && !c ? (
        <p className="text-muted">Loading…</p>
      ) : c ? (
        <>
          <p className="small text-muted mb-3">
            Superadmin overview: moderation health, members, and <strong>every post</strong> in this circle with comment counts and SightEngine-style health per row. Use{" "}
            <strong>Review</strong> to open full post, reports, and comments.
          </p>

          <div className="row g-2 mb-3">
            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body py-2 small">
                  <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem" }}>
                    Health
                  </div>
                  <div className="fs-5 fw-bold">{Math.round(c.moderation.health_score)}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body py-2 small">
                  <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem" }}>
                    Pending reports
                  </div>
                  <div className="fs-5 fw-bold">{c.moderation.pending_reports}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body py-2 small">
                  <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem" }}>
                    Flagged queue
                  </div>
                  <div className="fs-5 fw-bold">{c.moderation.flagged_posts}</div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body py-2 small">
                  <div className="text-muted text-uppercase" style={{ fontSize: "0.65rem" }}>
                    Status
                  </div>
                  <div className="fw-bold">{c.suspended ? <span className="text-warning">Suspended</span> : <span className="text-success">Active</span>}</div>
                  {c.suspendedUntil ? <div className="text-muted small">Until {new Date(c.suspendedUntil).toLocaleString()}</div> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body small">
              <div className="fw-semibold mb-1">{c.name}</div>
              <div className="text-muted mb-2">{c.description || "No description"}</div>
              <div>
                Visibility: <strong>{c.visibility}</strong> · Members: <strong>{c.memberCount}</strong> · Creator: {c.creatorEmail}
              </div>
            </div>
          </div>

          <h2 className="h6 mb-2">Posts in this circle</h2>
          <div className="card shadow mb-3">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Preview</th>
                      <th>Author</th>
                      <th>C/L/M</th>
                      <th>Rep</th>
                      <th>Health</th>
                      <th>Flags</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {c.posts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-4">
                          No posts
                        </td>
                      </tr>
                    ) : (
                      c.posts.map((p) => (
                        <tr key={p.id}>
                          <td className="small" style={{ maxWidth: 220 }}>
                            {p.content || "—"}
                          </td>
                          <td className="small">{p.authorEmail}</td>
                          <td className="small">
                            {p.commentsCount}/{p.likesCount}/{p.mediaCount}
                          </td>
                          <td className="small">{p.open_reports}</td>
                          <td className="small">{Math.round(p.health_score)}</td>
                          <td className="small">
                            {p.flagged_pending ? <span className="badge bg-danger">Flagged</span> : <span className="text-muted">—</span>}
                          </td>
                          <td className="text-nowrap">
                            <Link className="btn btn-sm btn-outline-primary" href={`/admin/posts?inspect=${p.id}`}>
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {pag && pag.pages > 1 ? (
              <div className="card-footer bg-transparent border-0 pt-0">
                <AdminPagination page={pag.page} pages={pag.pages} onPage={setPostsPage} />
              </div>
            ) : null}
          </div>

          <h2 className="h6 mb-2">Members (sample)</h2>
          <div className="card shadow-sm">
            <div className="card-body p-0">
              <ul className="list-group list-group-flush small">
                {c.members.map((m) => (
                  <li key={m.userId} className="list-group-item d-flex justify-content-between align-items-center">
                    <span>{m.email}</span>
                    {m.is_admin ? <span className="badge bg-primary">Admin</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : null}

      {(noticeOpen || warnOpen) && (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(15,23,42,0.45)" }} role="dialog" aria-modal>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title">{warnOpen ? "Issue warning" : "Broadcast notice"}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => { setNoticeOpen(false); setWarnOpen(false); }} />
              </div>
              <div className="modal-body">
                {modalErr ? <div className="alert alert-danger py-2 small">{modalErr}</div> : null}
                <label className="form-label small">Audience</label>
                <select className="form-select form-select-sm mb-2" value={audience} onChange={(e) => setAudience(e.target.value as "all_members" | "admins_only")}>
                  <option value="admins_only">Circle admins only</option>
                  <option value="all_members">All members</option>
                </select>
                <label className="form-label small">Message</label>
                <textarea className="form-control form-control-sm" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setNoticeOpen(false); setWarnOpen(false); }} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy || !msg.trim()}
                  onClick={() => void (warnOpen ? sendWarning() : sendNotice())}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPthPageFrame>
  );
}
