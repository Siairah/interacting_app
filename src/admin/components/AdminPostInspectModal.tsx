"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PostMedia from "@/components/PostMedia";
import { adminDeletePost, adminGetPostDetail, type AdminPostDetail } from "@/admin/managementApi";
import { useAdminAuthRedirect } from "@/admin/useAdminAuthRedirect";

type Props = {
  postId: string | null;
  onClose: () => void;
  onDeleted: () => void;
};

export default function AdminPostInspectModal({ postId, onClose, onDeleted }: Props) {
  const tryRedirect = useAdminAuthRedirect();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [post, setPost] = useState<AdminPostDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setErr(null);
    setPost(null);
    try {
      const r = await adminGetPostDetail(postId);
      setPost(r.post);
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Failed to load post");
    } finally {
      setLoading(false);
    }
  }, [postId, tryRedirect]);

  useEffect(() => {
    if (postId) void load();
  }, [postId, load]);

  useEffect(() => {
    if (!postId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [postId]);

  async function onConfirmDelete() {
    if (!postId || !post) return;
    if (!confirm("Permanently delete this post and related data? Review reports and comments above first.")) return;
    setBusy(true);
    try {
      await adminDeletePost(postId);
      onDeleted();
    } catch (e) {
      if (!tryRedirect(e)) setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (!postId) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-2 p-md-3"
      style={{ zIndex: 1050, background: "rgba(15, 23, 42, 0.48)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-post-inspect-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card shadow-lg border-0 w-100"
        style={{ maxWidth: "min(920px, 100%)", maxHeight: "min(92vh, 900px)", overflow: "hidden", display: "flex", flexDirection: "column" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="card-header d-flex align-items-center justify-content-between py-2"
          style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "#fff" }}
        >
          <h2 className="h6 mb-0" id="admin-post-inspect-title">
            Review post
          </h2>
          <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={onClose} />
        </div>
        <div className="card-body overflow-auto small" style={{ flex: 1 }}>
          {loading ? (
            <p className="text-muted mb-0 py-4 text-center">Loading full post, reports, and comments…</p>
          ) : err ? (
            <p className="text-danger mb-0">{err}</p>
          ) : post ? (
            <>
              <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
                <span className={`badge ${post.is_public ? "bg-success" : "bg-secondary"}`}>{post.is_public ? "Public" : "Hidden"}</span>
                <span className={`badge ${post.is_approved ? "bg-primary" : "bg-warning text-dark"}`}>
                  {post.is_approved ? "Approved" : "Pending approval"}
                </span>
                {(post.open_reports_count ?? 0) > 0 ? (
                  <span className="badge bg-danger">{post.open_reports_count} open report(s)</span>
                ) : (
                  <span className="badge text-bg-light border">No open reports</span>
                )}
                {post.moderation && !post.moderation.reviewed_by_admin ? (
                  <span className="badge bg-warning text-dark">In flagged queue</span>
                ) : null}
              </div>
              <dl className="row mb-3 small">
                <dt className="col-sm-3 text-muted">Author</dt>
                <dd className="col-sm-9">{post.authorEmail || "—"}</dd>
                <dt className="col-sm-3 text-muted">Circle</dt>
                <dd className="col-sm-9">{post.circle ? post.circle.name : "—"}</dd>
                <dt className="col-sm-3 text-muted">Posted</dt>
                <dd className="col-sm-9">{new Date(post.createdAt).toLocaleString()}</dd>
                <dt className="col-sm-3 text-muted">Engagement</dt>
                <dd className="col-sm-9">
                  {post.commentsCount} comments · {post.likesCount} likes · {post.media.length} media
                </dd>
              </dl>

              <h3 className="h6 border-bottom pb-1">Content</h3>
              <p className="mb-3" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {post.content || "—"}
              </p>

              {post.media.length > 0 ? (
                <>
                  <h3 className="h6 border-bottom pb-1">Media</h3>
                  <p className="text-muted small mb-2">Preview matches what members see (Cloudinary URLs).</p>
                  <div className="mb-3">
                    <PostMedia
                      mediaFiles={post.media.map((m) => ({ file: m.file, type: m.type }))}
                      postId={post.id}
                    />
                  </div>
                </>
              ) : null}

              {post.moderation ? (
                <>
                  <h3 className="h6 border-bottom pb-1">Moderation queue</h3>
                  <div className="mb-3 p-2 rounded" style={{ background: "#fffbeb", border: "1px solid #fcd34d" }}>
                    <div>
                      <strong>Reason:</strong> {post.moderation.reason}
                    </div>
                    {post.moderation.text ? (
                      <div className="mt-1">
                        <strong>Note:</strong> {post.moderation.text}
                      </div>
                    ) : null}
                    <div className="mt-1 text-muted">
                      {post.moderation.reviewed_by_admin ? "Reviewed" : "Awaiting superadmin review"} ·{" "}
                      {new Date(post.moderation.createdAt).toLocaleString()}
                    </div>
                  </div>
                </>
              ) : null}

              <h3 className="h6 border-bottom pb-1">User reports ({post.reports.length})</h3>
              {post.reports.length === 0 ? (
                <p className="text-muted mb-3">No reports on this post.</p>
              ) : (
                <div className="table-responsive mb-3">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>When</th>
                        <th>Reporter</th>
                        <th>Reason</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {post.reports.map((r) => (
                        <tr key={r.id}>
                          <td className="text-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                          <td>{r.reporterEmail || "—"}</td>
                          <td>{r.reason || "—"}</td>
                          <td>{r.resolved ? <span className="text-success">Resolved</span> : <span className="text-danger">Open</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 className="h6 border-bottom pb-1">Comments ({post.comments.length} loaded)</h3>
              {post.comments.length === 0 ? (
                <p className="text-muted mb-0">No comments.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0 align-middle">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>When</th>
                        <th>Author</th>
                        <th>Text</th>
                        <th>Removed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {post.comments.map((c) => (
                        <tr key={c.id} className={c.is_deleted ? "table-secondary" : undefined}>
                          <td className="text-nowrap small">{new Date(c.createdAt).toLocaleString()}</td>
                          <td className="small">{c.authorEmail || "—"}</td>
                          <td className="small" style={{ maxWidth: 360, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {c.content || "—"}
                          </td>
                          <td>{c.is_deleted ? "Y" : "N"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-muted mt-2 mb-0 small">
                Manage comments in bulk on{" "}
                <Link href={`/admin/comments?post=${post.id}`}>Comment Management</Link> (filtered to this post).
              </p>
            </>
          ) : null}
        </div>
        <div className="card-footer bg-light d-flex flex-wrap gap-2 justify-content-between align-items-center py-2">
          <span className="text-muted small font-monospace">ID: {postId}</span>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={busy}>
              Close
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => void onConfirmDelete()} disabled={busy || loading || !post}>
              Delete post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
