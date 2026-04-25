"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import AdminErrorBanner from "@/admin/components/AdminErrorBanner";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import { adminAnalytics } from "@/admin/managementApi";
import { useAdminAuthRedirect } from "@/admin/useAdminAuthRedirect";

Chart.register(...registerables);

export default function AdminAnalyticsClient() {
  const tryRedirect = useAdminAuthRedirect();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminAnalytics>> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await adminAnalytics();
      setData(r);
    } catch (e) {
      if (!tryRedirect(e)) {
        setErr(e instanceof Error ? e.message : "Failed to load analytics");
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [tryRedirect]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.trend_30d || !canvasRef.current) return;
    chartRef.current?.destroy();
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const { dates, newUsers, newPosts, engagement } = data.trend_30d;
    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [
          { label: "New users", data: newUsers, borderColor: "rgb(102, 126, 234)", tension: 0.1 },
          { label: "New posts", data: newPosts, borderColor: "rgb(28, 200, 138)", tension: 0.1 },
          { label: "Engagement", data: engagement, borderColor: "rgb(54, 185, 204)", tension: 0.1 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
      },
    });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data?.trend_30d]);

  const s = data?.summary;

  return (
    <AdminPthPageFrame title="Analytics" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Analytics" }]}>
      <AdminErrorBanner message={err} onRetry={() => void load()} />
      {loading && !data ? (
        <p className="text-muted small mb-3">Loading analytics…</p>
      ) : null}
      {s ? (
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card shadow h-100">
              <div className="card-body">
                <div className="text-muted small">Circles</div>
                <div className="h4">{s.circles}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow h-100">
              <div className="card-body">
                <div className="text-muted small">Memberships</div>
                <div className="h4">{s.memberships}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow h-100">
              <div className="card-body">
                <div className="text-muted small">Pending reports</div>
                <div className="h4">{s.pending_reports}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card shadow h-100">
              <div className="card-body">
                <div className="text-muted small">Flagged queue</div>
                <div className="h4">{s.flagged_pending}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="card shadow">
        <div className="card-header bg-white fw-semibold">30-day trend</div>
        <div className="card-body">
          <div style={{ height: 360, position: "relative" }}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </AdminPthPageFrame>
  );
}
