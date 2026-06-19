export default function NotificationCenter() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        <li>Your dashboard is now unified for all roles.</li>
        <li>Module visibility is controlled through role-based permissions.</li>
        <li>Unauthorized module URLs are blocked by shared route guard logic.</li>
      </ul>
    </section>
  );
}