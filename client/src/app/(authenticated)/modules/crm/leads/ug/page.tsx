import LeadsTable from "../_components/LeadsTable";

export default function UGLeadsPage() {
  return (
    <div className="p-6">
      <LeadsTable
        filter="ug"
        pageTitle="UG Leads"
        pageDescription="View and manage undergraduate programme leads."
      />
    </div>
  );
}
