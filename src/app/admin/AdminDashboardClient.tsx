"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { fetchAdminDashboard, type AdminDashboardPayload } from "@/admin/adminApi";
import AdminErrorBanner from "@/admin/components/AdminErrorBanner";
import { useAdminAuthRedirect } from "@/admin/useAdminAuthRedirect";
import shellStyles from "@/admin/adminPth.module.css";
import dashStyles from "@/admin/pthDashboard.module.css";

Chart.register(...registerables);

function formatStat(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString() : "—";
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export default function AdminDashboardClient() {
  const tryRedirect = useAdminAuthRedirect();
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [data, setData] = useState<AdminDashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchAdminDashboard();
      setData(payload);
    } catch (e) {
      if (tryRedirect(e)) {
        setData(null);
        return;
      }
      const msg = e instanceof Error ? e.message : "Failed to load stats";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tryRedirect]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.trend_data || !canvasRef.current) return;

    chartRef.current?.destroy();
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const { dates, user_trend, post_trend, engagement_trend } = data.trend_data;

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [
          {
            label: "New Users",
            data: user_trend,
            borderColor: "rgb(102, 126, 234)",
            tension: 0.1,
          },
          {
            label: "New Posts",
            data: post_trend,
            borderColor: "rgb(28, 200, 138)",
            tension: 0.1,
          },
          {
            label: "Engagement",
            data: engagement_trend,
            borderColor: "rgb(54, 185, 204)",
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data?.trend_data]);

  const u = data?.user_stats;
  const p = data?.post_stats;
  const en = data?.engagement_stats;
  const m = data?.moderation_stats;
  const g = data?.growth_rates;

  return (
    <div className={dashStyles.dashboardScroll}>
      <div className={shellStyles.pageHeadingRow}>
        <h1 className={`h2 ${shellStyles.pageH2}`}>Admin Dashboard</h1>
      </div>

      <AdminErrorBanner message={error} onRetry={() => void load()} />

      <div className="row g-3">
        <div className="col-6 col-xl-3 col-md-6">
          <div className={`card shadow h-100 py-2 ${dashStyles.borderLeftPrimary}`}>
            <div className="card-body">
              <div className="row g-0 align-items-center">
                <div className="col me-2">
                  <div className={`${dashStyles.textXs} fw-bold text-primary text-uppercase mb-1`}>Users</div>
                  <div className={`h5 mb-0 fw-bold ${dashStyles.textGray800}`}>
                    {loading && !data ? "…" : formatStat(u?.total_users ?? 0)}
                  </div>
                  <div className={`${dashStyles.textXs} mt-2`}>
                    <span className="fw-bold text-success">+{formatStat(u?.new_users_today ?? 0)}</span> today
                    <br />
                    <span className="text-info">{formatStat(u?.online_users ?? 0)}</span> online now
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-users fa-2x text-secondary opacity-50" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3 col-md-6">
          <div className={`card shadow h-100 py-2 ${dashStyles.borderLeftSuccess}`}>
            <div className="card-body">
              <div className="row g-0 align-items-center">
                <div className="col me-2">
                  <div className={`${dashStyles.textXs} fw-bold text-success text-uppercase mb-1`}>Posts</div>
                  <div className={`h5 mb-0 fw-bold ${dashStyles.textGray800}`}>
                    {loading && !data ? "…" : formatStat(p?.total_posts ?? 0)}
                  </div>
                  <div className={`${dashStyles.textXs} mt-2`}>
                    <span className="fw-bold text-success">+{formatStat(p?.posts_today ?? 0)}</span> today
                    <br />
                    <span className="text-info">{formatStat(p?.posts_with_media ?? 0)}</span> with media
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-newspaper fa-2x text-secondary opacity-50" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-xl-3 col-md-6">
          <div className={`card shadow h-100 py-2 ${dashStyles.borderLeftInfo}`}>
            <div className="card-body">
              <div className="row g-0 align-items-center">
                <div className="col me-2">
                  <div className={`${dashStyles.textXs} fw-bold text-info text-uppercase mb-1`}>Engagement</div>
                  <div className={`h5 mb-0 fw-bold ${dashStyles.textGray800}`}>
                    {loading && !data
                      ? "…"
                      : formatStat((en?.total_likes ?? 0) + (en?.total_comments ?? 0))}
                  </div>
                  <div className={`${dashStyles.textXs} mt-2`}>
                    <span className="text-success">{formatStat(en?.likes_today ?? 0)}</span> likes today
                    <br />
                    <span className="text-info">{formatStat(en?.comments_today ?? 0)}</span> comments today
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-heart fa-2x text-secondary opacity-50" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className={`card shadow h-100 py-2 ${dashStyles.borderLeftWarning}`}>
            <div className="card-body">
            <div className="row g-0 align-items-center">
                <div className="col me-2">
                  <div className={`${dashStyles.textXs} fw-bold text-warning text-uppercase mb-1`}>Moderation</div>
                  <div className={`h5 mb-0 fw-bold ${dashStyles.textGray800}`}>
                    {loading && !data ? "…" : formatStat(m?.flagged_posts ?? 0)}
                  </div>
                  <div className={`${dashStyles.textXs} mt-2`}>
                    <span className="text-danger">{formatStat(m?.pending_reports ?? 0)}</span> pending reports
                    <br />
                    <span className="text-warning">+{formatStat(m?.reports_today ?? 0)}</span> reports today
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-flag fa-2x text-secondary opacity-50" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-8 col-lg-7">
          <div className="card shadow mb-0 mb-lg-4 h-100">
            <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between bg-white">
              <h6 className={`m-0 ${dashStyles.cardTitlePrimary}`}>Activity Trends (Last 7 Days)</h6>
            </div>
            <div className="card-body">
              <div className={dashStyles.chartWrap}>
                <canvas ref={canvasRef} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-4 col-lg-5">
          <div className="card shadow mb-4 h-100">
            <div className="card-header py-3 bg-white">
              <h6 className={`m-0 ${dashStyles.cardTitlePrimary}`}>Daily Growth</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <h4 className="small fw-bold">
                  Users <span className="float-end">{loading ? "—" : `${g?.users ?? 0}%`}</span>
                </h4>
                <div className="progress">
                  <div
                    className="progress-bar bg-primary"
                    role="progressbar"
                    style={{ width: `${clampPct(g?.users ?? 0)}%` }}
                  />
                </div>
              </div>
              <div className="mb-3">
                <h4 className="small fw-bold">
                  Posts <span className="float-end">{loading ? "—" : `${g?.posts ?? 0}%`}</span>
                </h4>
                <div className="progress">
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{ width: `${clampPct(g?.posts ?? 0)}%` }}
                  />
                </div>
              </div>
              <div>
                <h4 className="small fw-bold">
                  Engagement <span className="float-end">{loading ? "—" : `${g?.engagement ?? 0}%`}</span>
                </h4>
                <div className="progress">
                  <div
                    className="progress-bar bg-info"
                    role="progressbar"
                    style={{ width: `${clampPct(g?.engagement ?? 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card shadow h-100">
            <div className="card-header py-3 bg-white">
              <h6 className={`m-0 ${dashStyles.cardTitlePrimary}`}>Latest Posts</h6>
            </div>
            <div className="card-body">
              {(data?.recent_activity.latest_posts ?? []).length === 0 ? (
                <p className={`small ${dashStyles.textGray500} mb-0`}>No posts yet.</p>
              ) : (
                data?.recent_activity.latest_posts.map((post, idx, arr) => (
                  <div key={post.id} className="mb-3">
                    <div className={`small ${dashStyles.textGray500}`}>{formatDateTime(post.createdAt)}</div>
                    <div className="text-break">{post.content || "(no text)"}</div>
                    <div className="small text-break">by {post.authorLabel}</div>
                    {idx < arr.length - 1 ? <hr /> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card shadow h-100">
            <div className="card-header py-3 bg-white">
              <h6 className={`m-0 ${dashStyles.cardTitlePrimary}`}>Recent Reports</h6>
            </div>
            <div className="card-body">
              {(data?.recent_activity.latest_reports ?? []).length === 0 ? (
                <p className={`small ${dashStyles.textGray500} mb-0`}>No pending reports.</p>
              ) : (
                data?.recent_activity.latest_reports.map((report, idx, arr) => (
                  <div key={report.id} className="mb-3">
                    <div className={`small ${dashStyles.textGray500}`}>{formatDateTime(report.createdAt)}</div>
                    <div className="text-break">{report.reason}</div>
                    <div className="small text-break">reported by {report.reporterLabel}</div>
                    {idx < arr.length - 1 ? <hr /> : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
