import Link from "next/link";
import shellStyles from "@/admin/adminPth.module.css";

type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  breadcrumb: Crumb[];
  children: React.ReactNode;
};

export default function AdminPthPageFrame({ title, breadcrumb, children }: Props) {
  return (
    <>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          {breadcrumb.map((c, i) => (
            <li
              key={`${c.label}-${i}`}
              className={`breadcrumb-item${c.href ? "" : " active"}`}
              aria-current={c.href ? undefined : "page"}
            >
              {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
            </li>
          ))}
        </ol>
      </nav>

      <div className={shellStyles.pageHeadingRow}>
        <h1 className={`h2 ${shellStyles.pageH2}`}>{title}</h1>
      </div>

      {children}
    </>
  );
}
