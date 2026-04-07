"use client";

import { useCallback, useEffect, useState } from "react";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import { adminListUsers, adminToggleUser, adminUsersBulk } from "@/admin/managementApi";
import AdminPagination from "../components/AdminPagination";

export default function AdminUsersClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListUsers>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminListUsers({ page, search: search.trim() || undefined, status: status || undefined });
      setData(r);
      setSelected(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onToggle(id: string) {
    setBusy(true);
    try {
      await adminToggleUser(id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBulk(action: "activate" | "deactivate") {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`Apply ${action} to ${ids.length} user(s)?`)) return;
    setBusy(true);
    try {
      await adminUsersBulk(ids, action);
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
    <AdminPthPageFrame title="User Management" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "User Management" }]}>
      {stats ? (
        <div className="row g-2 mb-3 small text-muted">
          <div className="col-auto">Total: {stats.total_users}</div>
          <div className="col-auto">Active: {stats.active_users}</div>
          <div className="col-auto">New (30d): {stats.new_users_30d}</div>
          <div className="col-auto">Online ~: {stats.online_users}</div>
        </div>
      ) : null}

      <div className="card shadow mb-3">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small mb-0">Search</label>
              <input
                className="form-control form-control-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Email, phone, name"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-0">Status</label>
              <select className="form-select form-select-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
                  setStatus("");
                  setPage(1);
                }}
                disabled={loading}
              >
                Clear
              </button>
              <button type="button" className="btn btn-success btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("activate")}>
                Activate selected
              </button>
              <button type="button" className="btn btn-warning btn-sm" disabled={busy || !selected.size} onClick={() => void onBulk("deactivate")}>
                Deactivate selected
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
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Active</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No users
                    </td>
                  </tr>
                ) : (
                  items.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(u.id);
                            else next.delete(u.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phone || "—"}</td>
                      <td>{u.isActive ? "Yes" : "No"}</td>
                      <td className="small">{new Date(u.createdAt).toLocaleString()}</td>
                      <td>
                        <button type="button" className="btn btn-outline-primary btn-sm" disabled={busy} onClick={() => void onToggle(u.id)}>
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {pag ? <AdminPagination page={pag.page} pages={pag.pages} onPage={(p) => setPage(p)} /> : null}
      </div>
    </AdminPthPageFrame>
  );
}
