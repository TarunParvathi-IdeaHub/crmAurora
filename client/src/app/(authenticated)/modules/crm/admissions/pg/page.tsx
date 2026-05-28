import ReviewApplicants from "../review-applicants/ReviewApplicants";

export default function PGApplicationsPage() {
  return (
    <div className="p-6">
      <ReviewApplicants
        filter="pg"
        pageTitle="PG Applications"
        pageDescription="View and manage postgraduate programme applications."
      />
    </div>
  );
}
