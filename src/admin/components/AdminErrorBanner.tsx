"use client";

import Link from "next/link";

type Props = {
  message: string | null;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function AdminErrorBanner({ message, onRetry, retryLabel = "Retry" }: Props) {
  if (!message) return null;
  return (
    <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3" role="alert">
      <span className="mb-0">{message}</span>
      <div className="d-flex flex-wrap gap-2">
        {onRetry ? (
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
        <Link href="/" className="btn btn-sm btn-primary">
          Home / Log in
        </Link>
      </div>
    </div>
  );
}
