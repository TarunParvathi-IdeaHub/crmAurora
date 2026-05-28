import ReviewApplicants from "../review-applicants/ReviewApplicants";

export default function UGApplicationsPage() {
  return (
    <div className="p-6">
      <ReviewApplicants
        filter="ug"
        pageTitle="UG Applications"
        pageDescription="View and manage undergraduate programme applications."
      />
    </div>
  );
}
