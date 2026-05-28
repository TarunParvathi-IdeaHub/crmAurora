import LeadsTable from "../_components/LeadsTable";

export default function PGLeadsPage() {
  return (
    <div className="p-6">
      <LeadsTable
        filter="pg"
        pageTitle="PG Leads"
        pageDescription="View and manage postgraduate programme leads."
      />
    </div>
  );
}
