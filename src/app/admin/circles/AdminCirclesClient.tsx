"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import { adminCirclesBulk, adminDeleteCircle, adminListCircles } from "@/admin/managementApi";
import AdminPagination from "../components/AdminPagination";

export default function AdminCirclesClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListCircles>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminListCircles({ page, search: search.trim() || undefined });
      setData(r);
      setSelected(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

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
      setErr(e instanceof Error ? e.message : "Failed");
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
      setErr(e instanceof Error ? e.message : "Bulk failed");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];
  const pag = data?.pagination;
  const stats = data?.stats;

  return (
    <AdminPthPageFrame title="Circle Management" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Circle Management" }]}>
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
                  <th>Name</th>
                  <th>Visibility</th>
                  <th>Members</th>
                  <th>Creator</th>
                  <th>Created</th>
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
                      <td>{c.visibility}</td>
                      <td>{c.memberCount}</td>
                      <td className="small">{c.creatorEmail}</td>
                      <td className="small">{new Date(c.createdAt).toLocaleString()}</td>
                      <td>
                        <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={() => void onDelete(c.id)}>
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
