import LeadsTable from "../_components/LeadsTable";

export default function PhdLeadsPage() {
  return (
    <div className="p-6">
      <LeadsTable
        filter="phd"
        pageTitle="Phd Leads"
        pageDescription="View and manage doctoral programme leads."
      />
    </div>
  );
}
