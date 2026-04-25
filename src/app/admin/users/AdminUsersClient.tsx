"use client";

import { useCallback, useEffect, useState } from "react";
import AdminErrorBanner from "@/admin/components/AdminErrorBanner";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import {
  adminBanUser,
  adminDeleteUserAccount,
  adminListUsers,
  adminSendUserWarning,
  adminToggleUser,
  adminUsersBulk,
} from "@/admin/managementApi";
import { useAdminAuthRedirect } from "@/admin/useAdminAuthRedirect";
import AdminPagination from "../components/AdminPagination";
import styles from "./adminUsers.module.css";

type UserItem = Awaited<ReturnType<typeof adminListUsers>>["items"][number];

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? "bg-success" : "bg-secondary"}`}>{active ? "Active" : "Inactive"}</span>
  );
}

export default function AdminUsersClient() {
  const tryRedirect = useAdminAuthRedirect();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminListUsers>> | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminListUsers({
        page,
        search: appliedSearch.trim() || undefined,
        status: appliedStatus || undefined,
      });
      setData(r);
      setSelected(new Set());
    } catch (e) {
      if (!tryRedirect(e)) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, appliedStatus, tryRedirect]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters() {
    setAppliedSearch(searchInput);
    setAppliedStatus(statusInput);
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    setStatusInput("");
    setAppliedSearch("");
    setAppliedStatus("");
    setPage(1);
  }

  async function onToggle(id: string) {
    setBusy(true);
    try {
      await adminToggleUser(id);
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Toggle failed");
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
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Bulk failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBanUser(u: UserItem) {
    if (u.isBanned) {
      if (!confirm(`Remove ban for ${u.email}?`)) return;
      setBusy(true);
      try {
        await adminBanUser(u.id, { banned: false });
        await load();
      } catch (e) {
        if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Ban update failed");
      } finally {
        setBusy(false);
      }
      return;
    }
    const reason =
      typeof window !== "undefined" ? window.prompt("Ban reason (shown at login)", "Policy violation") : null;
    if (reason === null) return;
    const hoursRaw =
      typeof window !== "undefined" ? window.prompt("Hours until auto-unban (empty = permanent)", "") : null;
    if (hoursRaw === null) return;
    let hours: number | undefined;
    if (hoursRaw.trim() === "") hours = undefined;
    else {
      const n = Number(hoursRaw);
      if (!Number.isFinite(n) || n <= 0) {
        alert("Enter a positive number of hours or leave empty for a permanent ban.");
        return;
      }
      hours = n;
    }
    setBusy(true);
    try {
      await adminBanUser(u.id, { banned: true, reason: reason || "Policy violation", hours });
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Ban failed");
    } finally {
      setBusy(false);
    }
  }

  async function onWarnUser(u: UserItem) {
    const msg = typeof window !== "undefined" ? window.prompt(`In-app warning to ${u.email}`, "") : null;
    if (msg === null || !String(msg).trim()) return;
    setBusy(true);
    try {
      await adminSendUserWarning(u.id, String(msg).trim());
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Warning failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteAccount(u: UserItem) {
    if (!confirm(`Permanently delete ${u.email}? Posts and related data will be removed.`)) return;
    if (!confirm("This cannot be undone. Delete account?")) return;
    setBusy(true);
    try {
      await adminDeleteUserAccount(u.id);
      await load();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];
  const pag = data?.pagination;
  const stats = data?.stats;

  const selectionHint =
    selected.size > 0 ? (
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3 pt-3 border-top small">
        <span className="text-muted">
          <strong>{selected.size}</strong> selected — bulk actions apply to this page only.
        </span>
        <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setSelected(new Set())}>
          Clear selection
        </button>
      </div>
    ) : null;

  return (
    <AdminPthPageFrame title="User Management" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "User Management" }]}>
      <AdminErrorBanner message={err} onRetry={() => void load()} />
      <p className="small text-muted mb-3">
        Search by <strong>email</strong>, <strong>phone</strong>, or <strong>profile name</strong>. Superadmin can <strong>warn</strong> (in-app notification), <strong>ban</strong> (blocks login; optional timed ban), or{" "}
        <strong>delete</strong> the account and owned posts. On phones the list uses <strong>cards</strong>.
      </p>

      {stats ? (
        <dl className="row g-2 mb-3">
          <div className="col-6 col-md-3">
            <div className={styles.statTile}>
              <dt>Total users</dt>
              <dd>{stats.total_users.toLocaleString()}</dd>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className={styles.statTile}>
              <dt>Active</dt>
              <dd>{stats.active_users.toLocaleString()}</dd>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className={styles.statTile}>
              <dt>New (30d)</dt>
              <dd>{stats.new_users_30d.toLocaleString()}</dd>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className={styles.statTile}>
              <dt>Active ~5m</dt>
              <dd title="Users with recent activity (updated in last 5 minutes)">{stats.online_users.toLocaleString()}</dd>
            </div>
          </div>
        </dl>
      ) : null}

      <div className="card shadow-sm mb-3">
        <div className="card-body py-3">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-lg-5">
              <label className="form-label small mb-0" htmlFor="admin-user-search">
                Search
              </label>
              <input
                id="admin-user-search"
                className="form-control form-control-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
                placeholder="Email, phone, or name"
                autoComplete="off"
              />
            </div>
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label small mb-0" htmlFor="admin-user-status">
                Status
              </label>
              <select
                id="admin-user-status"
                className="form-select form-select-sm"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-12 col-lg-4">
              <div className={styles.toolbarActions}>
                <button type="button" className="btn btn-primary btn-sm" onClick={applyFilters} disabled={loading}>
                  Apply filters
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearFilters} disabled={loading}>
                  Clear
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  disabled={busy || !selected.size}
                  onClick={() => void onBulk("activate")}
                >
                  Activate
                </button>
                <button
                  type="button"
                  className="btn btn-warning btn-sm"
                  disabled={busy || !selected.size}
                  onClick={() => void onBulk("deactivate")}
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
          {selectionHint}
        </div>
      </div>

      <div className="card shadow">
        <div className="card-body p-0">
          {/* Desktop / tablet: table */}
          <div className="d-none d-md-block">
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col" style={{ width: 40 }}>
                      <span className="visually-hidden">Select all</span>
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        title="Select all on this page"
                        checked={items.length > 0 && items.every((i) => selected.has(i.id))}
                        onChange={(e) => {
                          if (e.target.checked) setSelected(new Set(items.map((i) => i.id)));
                          else setSelected(new Set());
                        }}
                      />
                    </th>
                    <th scope="col">User</th>
                    <th scope="col" className="d-none d-lg-table-cell">
                      Phone
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-nowrap">
                      Joined
                    </th>
                    <th scope="col" className="text-end" style={{ minWidth: 220 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        Loading…
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5 text-muted">
                        No users match these filters
                      </td>
                    </tr>
                  ) : (
                    items.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selected.has(u.id)}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(u.id);
                              else next.delete(u.id);
                              setSelected(next);
                            }}
                            aria-label={`Select ${u.email}`}
                          />
                        </td>
                        <td className="small" style={{ maxWidth: 280 }}>
                          <div className="fw-semibold text-break">{u.email}</div>
                          {u.displayName ? <div className="text-muted small">{u.displayName}</div> : null}
                          <div className="d-lg-none text-muted small mt-1">{u.phone || "—"}</div>
                        </td>
                        <td className="small d-none d-lg-table-cell">{u.phone || "—"}</td>
                        <td>
                          <div className="d-flex flex-column gap-1 align-items-start">
                            <ActiveBadge active={u.isActive} />
                            {u.isBanned ? (
                              <span className="badge bg-danger" title={u.banReason || ""}>
                                Banned
                                {u.bannedUntil ? ` · ${new Date(u.bannedUntil).toLocaleDateString()}` : ""}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="small text-nowrap">{new Date(u.createdAt).toLocaleString()}</td>
                        <td className="text-end">
                          <div className="d-flex flex-wrap gap-1 justify-content-end">
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              disabled={busy}
                              onClick={() => void onToggle(u.id)}
                            >
                              Toggle
                            </button>
                            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy} onClick={() => void onWarnUser(u)}>
                              Warn
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${u.isBanned ? "btn-outline-success" : "btn-outline-danger"}`}
                              disabled={busy}
                              onClick={() => void onBanUser(u)}
                            >
                              {u.isBanned ? "Unban" : "Ban"}
                            </button>
                            <button type="button" className="btn btn-outline-dark btn-sm" disabled={busy} onClick={() => void onDeleteAccount(u)}>
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

          {/* Mobile: cards */}
          <div className="d-md-none p-2 p-sm-3">
            {loading ? (
              <p className="text-center text-muted py-5 mb-0">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-center text-muted py-5 mb-0">No users match these filters</p>
            ) : (
              <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
                {items.map((u) => (
                  <li key={u.id} className={styles.userCard}>
                    <div className="d-flex gap-2 align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-1 flex-shrink-0"
                        checked={selected.has(u.id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(u.id);
                          else next.delete(u.id);
                          setSelected(next);
                        }}
                        aria-label={`Select ${u.email}`}
                      />
                      <div className="flex-grow-1 min-w-0">
                        <div className={styles.email}>{u.email}</div>
                        {u.displayName ? <div className={styles.displayName}>{u.displayName}</div> : null}
                        <div className={`${styles.meta} mt-1`}>{u.phone ? u.phone : "No phone"}</div>
                        <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                          <ActiveBadge active={u.isActive} />
                          {u.isBanned ? <span className="badge bg-danger">Banned</span> : null}
                          <span className={styles.meta}>{new Date(u.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="d-grid gap-2 mt-3">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm py-2"
                            disabled={busy}
                            onClick={() => void onToggle(u.id)}
                          >
                            Toggle active
                          </button>
                          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={busy} onClick={() => void onWarnUser(u)}>
                            Send warning
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${u.isBanned ? "btn-outline-success" : "btn-outline-danger"}`}
                            disabled={busy}
                            onClick={() => void onBanUser(u)}
                          >
                            {u.isBanned ? "Unban" : "Ban"}
                          </button>
                          <button type="button" className="btn btn-outline-dark btn-sm" disabled={busy} onClick={() => void onDeleteAccount(u)}>
                            Delete account
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {pag ? (
          <div className="card-footer bg-transparent border-top-0 pt-0 pb-3">
            <AdminPagination page={pag.page} pages={pag.pages} onPage={(p) => setPage(p)} />
          </div>
        ) : null}
      </div>
    </AdminPthPageFrame>
  );
}
