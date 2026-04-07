import AdminPthPageFrame from "@/admin/components/AdminPthPageFrame";

export default function AdminSettingsPage() {
  return (
    <AdminPthPageFrame title="Profile Settings" breadcrumb={[{ label: "Dashboard", href: "/admin" }, { label: "Profile Settings" }]}>
      <div className="card shadow mb-4">
        <div className="card-header py-3 bg-white fw-semibold">Admin profile</div>
        <div className="card-body">
          <p className="text-muted small mb-0">
            Placeholder for admin profile / password (matches Django navbar link). Wire when backend supports it.
          </p>
        </div>
      </div>
    </AdminPthPageFrame>
  );
}
