import LeadsTable from "../_components/LeadsTable";

export default function AllLeadsPage() {
  return (
    <div className="p-6">
      <LeadsTable
        filter="all"
        pageTitle="All Leads"
        pageDescription="View and manage all leads for your institution."
      />
    </div>
  );
}
