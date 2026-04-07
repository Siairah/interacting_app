"use client";

type Props = {
  page: number;
  pages: number;
  onPage: (p: number) => void;
};

export default function AdminPagination({ page, pages, onPage }: Props) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Page navigation" className="mt-3">
      <ul className="pagination pagination-sm justify-content-center mb-0">
        <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
          <button type="button" className="page-link" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            «
          </button>
        </li>
        <li className="page-item active">
          <span className="page-link">
            {page} / {pages}
          </span>
        </li>
        <li className={`page-item ${page >= pages ? "disabled" : ""}`}>
          <button type="button" className="page-link" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            »
          </button>
        </li>
      </ul>
    </nav>
  );
}
