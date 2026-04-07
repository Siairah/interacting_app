"use client";

import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";
import { adminAnalytics } from "@/admin/managementApi";

Chart.register(...registerables);

export default function AdminAnalyticsClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminAnalytics>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await adminAnalytics();
        if (!cancelled) setData(r);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          { label: "New users", data: newUsers, borderColor: "rgb(78, 115, 223)", tension: 0.1 },
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
      {err ? <div className="alert alert-danger">{err}</div> : null}
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
