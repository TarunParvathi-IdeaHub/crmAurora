import ReviewApplicants from "../review-applicants/ReviewApplicants";

export default function PhdApplicationsPage() {
  return (
    <div className="p-6">
      <ReviewApplicants
        filter="phd"
        pageTitle="Phd Applications"
        pageDescription="View and manage doctoral programme applications."
      />
    </div>
  );
}
