"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_EMAIL, clearAdminSession } from "@/admin/auth";
import { adminNavItems, isAdminNavActive } from "@/admin/nav.config";
import styles from "@/admin/adminPth.module.css";

function NavItems({
  pathname,
  exitAdmin,
  dismissOffcanvas,
}: {
  pathname: string | null;
  exitAdmin: () => void;
  dismissOffcanvas?: boolean;
}) {
  const dismissProps = dismissOffcanvas
    ? ({ "data-bs-dismiss": "offcanvas" } as const)
    : {};

  return (
    <ul className="nav flex-column px-2 pt-lg-3">
      {adminNavItems.map((item) => {
        if (item.internal === false) {
          return (
            <li className="nav-item" key={item.href + item.label}>
              <button
                type="button"
                className={`${styles.navLink} ${styles.exitLink}`}
                onClick={() => {
                  exitAdmin();
                }}
                {...dismissProps}
              >
                <i className={`fas ${item.icon}`} aria-hidden />
                {item.label}
              </button>
            </li>
          );
        }
        const active = pathname != null && isAdminNavActive(pathname, item.href);
        return (
          <li className="nav-item" key={item.href + item.label}>
            <Link
              href={item.href}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
              {...dismissProps}
            >
              <i className={`fas ${item.icon}`} aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function exitAdmin() {
    clearAdminSession();
    router.replace("/");
  }

  return (
    <div className={styles.root}>
      <nav
        className={`navbar navbar-expand-lg navbar-dark fixed-top ${styles.topNavbar}`}
      >
        <div className="container-fluid">
          <button
            className="btn btn-outline-light d-lg-none me-2"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#adminOffcanvas"
            aria-controls="adminOffcanvas"
            aria-label="Open sidebar"
          >
            <i className="fas fa-bars" />
          </button>
          <Link className={`navbar-brand ${styles.navbarBrand} text-truncate flex-shrink-1 me-1`} style={{ maxWidth: "min(52vw, 220px)" }} href="/admin">
            <i className="fas fa-shield-alt d-none d-sm-inline" aria-hidden />
            <span className="d-none d-sm-inline">Chautari Admin</span>
            <span className="d-sm-none">Admin</span>
            <span className={`badge rounded-pill ms-1 ms-md-2 d-none d-md-inline ${styles.superadminBadge}`}>Superadmin</span>
          </Link>
          <button
            className="navbar-toggler d-lg-none"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#adminTopNav"
            aria-controls="adminTopNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="adminTopNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle text-white d-flex align-items-center"
                  href="#"
                  id="adminUserDropdown"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="fas fa-user-circle me-2" aria-hidden />
                  <span className="text-truncate" style={{ maxWidth: "200px" }}>
                    {ADMIN_EMAIL}
                  </span>
                </a>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="adminUserDropdown">
                  <li>
                    <Link className="dropdown-item" href="/admin/settings">
                      <i className="fas fa-user-cog me-2" />
                      Profile Settings
                    </Link>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <button type="button" className="dropdown-item text-danger" onClick={exitAdmin}>
                      <i className="fas fa-sign-out-alt me-2" />
                      Logout
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="offcanvas offcanvas-start text-bg-dark" tabIndex={-1} id="adminOffcanvas">
        <div className="offcanvas-header border-bottom border-secondary">
          <h5 className="offcanvas-title">Admin menu</h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>
        <div className="offcanvas-body p-0">
          <NavItems pathname={pathname} exitAdmin={exitAdmin} dismissOffcanvas />
        </div>
      </div>

      <div className={styles.belowNav}>
        <aside className={`d-none d-lg-block ${styles.sidebar}`}>
          <div className={styles.sidebarInner}>
            <NavItems pathname={pathname} exitAdmin={exitAdmin} />
          </div>
        </aside>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
