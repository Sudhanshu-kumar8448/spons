export default function AdminPage() {
  return (
    <div className="space-y-6 bg-color-400">
      <h2 className="text-2xl font-bold text-gray-900">Admin</h2>
      <p className="text-gray-600">
        This page is only visible to users with the ADMIN role.
      </p>

      {/* Placeholder admin overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Tenants", "Users", "Events", "Revenue"].map((label) => (
          <div key={label} className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">{label}</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
