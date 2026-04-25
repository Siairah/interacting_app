"use client";

import { useCallback, useEffect, useState } from "react";
import AdminErrorBanner from "@/admin/components/AdminErrorBanner";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import { adminListReports, adminReportsBulk, adminResolveReport } from "@/admin/managementApi";
import { useAdminAuthRedirect } from "@/admin/useAdminAuthRedirect";
import AdminPagination from "../components/AdminPagination";

export default function AdminReportsClient() {
  const tryRedirect = useAdminAuthRedirect();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListReports>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminListReports({
        page,
        search: search.trim() || undefined,
        status: status || undefined,
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
  }, [page, search, status, tryRedirect]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onResolve(id: string) {
    setBusy(true);
    try {
      await adminResolveReport(id);
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBulk(action: "resolve" | "delete_posts") {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete_posts" && !confirm(`Delete post(s) for ${ids.length} report(s)?`)) return;
    setBusy(true);
    try {
      await adminReportsBulk(ids, action);
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
    <AdminPthPageFrame title="Report Management" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Report Management" }]}>
      <AdminErrorBanner message={err} onRetry={() => void load()} />
      {stats ? (
        <div className="row g-2 mb-3 small text-muted">
          <div className="col-auto">Total: {stats.total_reports}</div>
          <div className="col-auto">Pending: {stats.pending_reports}</div>
          <div className="col-auto">Resolved: {stats.resolved_reports}</div>
          <div className="col-auto">Today: {stats.reports_today}</div>
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
              <label className="form-label small mb-0">Status</label>
              <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="col-md-5 d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setPage(1)} disabled={loading}>
                Apply
              </button>
              <button type="button" className="btn btn-success btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("resolve")}>
                Resolve selected
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("delete_posts")}>
                Delete posts (selected)
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
                  <th>Reason</th>
                  <th>Reporter</th>
                  <th>Post</th>
                  <th>Resolved</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No reports
                    </td>
                  </tr>
                ) : (
                  items.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="small" style={{ maxWidth: 200 }}>
                        {r.reason}
                      </td>
                      <td className="small">{r.reporterEmail}</td>
                      <td className="small">{r.postPreview}</td>
                      <td>{r.resolved ? "Y" : "N"}</td>
                      <td className="small">{new Date(r.createdAt).toLocaleString()}</td>
                      <td>
                        {!r.resolved ? (
                          <button type="button" className="btn btn-outline-success btn-sm" disabled={busy} onClick={() => void onResolve(r.id)}>
                            Resolve
                          </button>
                        ) : null}
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
