"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminErrorBanner from "@/admin/components/AdminErrorBanner";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import {
  adminCirclesBulk,
  adminDeleteCircle,
  adminListCircles,
  adminPostCircleNotice,
  adminSetCircleSuspended,
} from "@/admin/managementApi";
import { useAdminAuthRedirect } from "@/admin/useAdminAuthRedirect";
import AdminPagination from "../components/AdminPagination";

type CircleRow = Awaited<ReturnType<typeof adminListCircles>>["items"][number];

function healthLabel(c: CircleRow): string {
  if (typeof c.health_score === "number" && Number.isFinite(c.health_score)) {
    return `${Math.round(c.health_score)}`;
  }
  const pr = c.pending_reports ?? 0;
  const fp = c.flagged_posts ?? 0;
  if (pr === 0 && fp === 0) return "—";
  const est = Math.max(0, 100 - pr * 4 - fp * 6);
  return `~${Math.round(est)}`;
}

function modHint(c: CircleRow): string {
  const pr = c.pending_reports;
  const fp = c.flagged_posts;
  if (pr == null && fp == null) return "—";
  return `${pr ?? 0} rep · ${fp ?? 0} flag`;
}

export default function AdminCirclesClient() {
  const tryRedirect = useAdminAuthRedirect();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListCircles>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const [noticeCircle, setNoticeCircle] = useState<CircleRow | null>(null);
  const [noticeAudience, setNoticeAudience] = useState<"all_members" | "admins_only">("admins_only");
  const [noticeText, setNoticeText] = useState("");
  const [noticeErr, setNoticeErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminListCircles({ page, search: search.trim() || undefined });
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
  }, [page, search, tryRedirect]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete(id: string) {
    if (!confirm("Delete this circle and detach posts? This cannot be undone.")) return;
    setBusy(true);
    try {
      await adminDeleteCircle(id);
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBulkDelete() {
    const ids = [...selected];
    if (!ids.length || !confirm(`Delete ${ids.length} circle(s)?`)) return;
    setBusy(true);
    try {
      await adminCirclesBulk(ids, "delete");
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Bulk failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSuspend(c: CircleRow, suspended: boolean) {
    if (!suspended) {
      if (!confirm("Unsuspend this circle and allow new posts again?")) return;
      setBusy(true);
      try {
        await adminSetCircleSuspended(c.id, { suspended: false });
        await load();
      } catch (e) {
        if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Suspension failed");
      } finally {
        setBusy(false);
      }
      return;
    }
    const raw =
      typeof window !== "undefined"
        ? window.prompt("Suspend for how many hours? (Cancel = abort, empty = suspend until you unsuspend manually)", "24")
        : null;
    if (raw === null) return;
    let hours: number | undefined;
    if (raw.trim() === "") hours = undefined;
    else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) {
        alert("Enter a positive number of hours or leave empty.");
        return;
      }
      hours = n;
    }
    if (!confirm(`Suspend "${c.name}"${hours ? ` for ${hours}h` : ""}? New posts will be blocked.`)) return;
    setBusy(true);
    try {
      await adminSetCircleSuspended(c.id, { suspended: true, hours });
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Suspension failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitNotice() {
    if (!noticeCircle || !noticeText.trim()) return;
    setNoticeErr(null);
    setBusy(true);
    try {
      await adminPostCircleNotice(noticeCircle.id, {
        message: noticeText.trim(),
        audience: noticeAudience,
      });
      setNoticeCircle(null);
      setNoticeText("");
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setNoticeErr(e instanceof Error ? e.message : "Notice failed");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];
  const pag = data?.pagination;
  const stats = data?.stats;

  return (
    <AdminPthPageFrame title="Circle Management" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Circle Management" }]}>
      <AdminErrorBanner message={err} onRetry={() => void load()} />
      <p className="small text-muted mb-3">
        <strong>Superadmin:</strong> monitor <strong>health</strong> (reports/flags), send <strong>notices</strong> to admins or all members,{" "}
        <strong>suspend</strong> a circle, or open <strong>posts</strong> for that group.
      </p>
      {stats ? (
        <div className="row g-2 mb-3 small text-muted">
          <div className="col-auto">Circles: {stats.total_circles}</div>
          <div className="col-auto">Today: {stats.circles_today}</div>
          <div className="col-auto">Memberships: {stats.total_memberships}</div>
        </div>
      ) : null}

      <div className="card shadow mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small mb-0">Search</label>
              <input className="form-control form-control-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="col-md-8 d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setPage(1)} disabled={loading}>
                Apply
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy || !selected.size} onClick={() => void onBulkDelete()}>
                Delete selected
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
                  <th>Name</th>
                  <th>Health</th>
                  <th>Mod</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th>Members</th>
                  <th>Creator</th>
                  <th>Created</th>
                  <th style={{ minWidth: 280 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-4 text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-4 text-muted">
                      No circles
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
                      <td className="fw-medium">{c.name}</td>
                      <td className="small">{healthLabel(c)}</td>
                      <td className="small text-muted">{modHint(c)}</td>
                      <td className="small">
                        {c.suspended ? (
                          <span className="badge bg-warning text-dark">Suspended</span>
                        ) : (
                          <span className="badge bg-success">Active</span>
                        )}
                        {c.suspendedUntil ? (
                          <div className="text-muted small mt-1">Until {new Date(c.suspendedUntil).toLocaleString()}</div>
                        ) : null}
                      </td>
                      <td>{c.visibility}</td>
                      <td>{c.memberCount}</td>
                      <td className="small">{c.creatorEmail}</td>
                      <td className="small">{new Date(c.createdAt).toLocaleString()}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <Link className="btn btn-outline-primary btn-sm" href={`/admin/circles/${encodeURIComponent(c.id)}`}>
                            View
                          </Link>
                          <Link className="btn btn-outline-primary btn-sm" href={`/admin/posts?circle=${encodeURIComponent(c.id)}`}>
                            Posts
                          </Link>
                          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy} onClick={() => { setNoticeCircle(c); setNoticeErr(null); }}>
                            Notice
                          </button>
                          {c.suspended ? (
                            <button type="button" className="btn btn-outline-success btn-sm" disabled={busy} onClick={() => void onSuspend(c, false)}>
                              Unsuspend
                            </button>
                          ) : (
                            <button type="button" className="btn btn-outline-warning btn-sm" disabled={busy} onClick={() => void onSuspend(c, true)}>
                              Suspend
                            </button>
                          )}
                          <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => void onDelete(c.id)}>
                            Delete
                          </button>
                        </div>
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

      {noticeCircle ? (
        <div className="modal show d-block" tabIndex={-1} style={{ background: "rgba(15,23,42,0.45)" }} role="dialog" aria-modal>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title">Notice — {noticeCircle.name}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setNoticeCircle(null)} />
              </div>
              <div className="modal-body">
                {noticeErr ? <div className="alert alert-danger py-2 small">{noticeErr}</div> : null}
                <label className="form-label small">Audience</label>
                <select className="form-select form-select-sm mb-2" value={noticeAudience} onChange={(e) => setNoticeAudience(e.target.value as "all_members" | "admins_only")}>
                  <option value="admins_only">Circle admins only</option>
                  <option value="all_members">All members</option>
                </select>
                <label className="form-label small">Message</label>
                <textarea className="form-control form-control-sm" rows={4} value={noticeText} onChange={(e) => setNoticeText(e.target.value)} placeholder="Message delivered as in-app notification…" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNoticeCircle(null)} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-sm" disabled={busy || !noticeText.trim()} onClick={() => void submitNotice()}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPthPageFrame>
  );
}
