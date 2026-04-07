"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import { adminFlaggedBulk, adminListFlagged, adminReviewFlagged } from "@/admin/managementApi";
import AdminPagination from "../components/AdminPagination";

export default function AdminFlaggedClient() {
  const [page, setPage] = useState(1);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListFlagged>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminListFlagged({ page, pending: pendingOnly });
      setData(r);
      setSelected(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, pendingOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onReview(id: string, action: "approve" | "delete") {
    if (action === "delete" && !confirm("Delete this post and moderation entry?")) return;
    setBusy(true);
    try {
      await adminReviewFlagged(id, action);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBulk(action: "approve" | "delete") {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete" && !confirm(`Delete ${ids.length} flagged item(s)?`)) return;
    setBusy(true);
    try {
      await adminFlaggedBulk(ids, action);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk failed");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];
  const pag = data?.pagination;

  return (
    <AdminPthPageFrame title="Flagged Post" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Flagged Post" }]}>
      <div className="card shadow mb-3">
        <div className="card-body py-3 d-flex flex-wrap gap-3 align-items-center">
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="pendingOnly"
              checked={pendingOnly}
              onChange={(e) => {
                setPendingOnly(e.target.checked);
                setPage(1);
              }}
            />
            <label className="form-check-label small" htmlFor="pendingOnly">
              Pending review only
            </label>
          </div>
            <button type="button" className="btn btn-success btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("approve")}>
              Approve selected
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("delete")}>
              Delete selected
            </button>
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
                  <th>Reason</th>
                  <th>Post</th>
                  <th>Author</th>
                  <th>Reviewed</th>
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
                      No items
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="small">{row.reason}</td>
                      <td className="small" style={{ maxWidth: 180 }}>
                        {row.postPreview}
                      </td>
                      <td className="small">{row.postAuthorEmail || "—"}</td>
                      <td>{row.reviewed_by_admin ? "Y" : "N"}</td>
                      <td className="small">{new Date(row.createdAt).toLocaleString()}</td>
                      <td className="d-flex flex-column gap-1">
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm"
                          disabled={busy || row.reviewed_by_admin}
                          onClick={() => void onReview(row.id, "approve")}
                        >
                          Approve
                        </button>
                        <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => void onReview(row.id, "delete")}>
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
