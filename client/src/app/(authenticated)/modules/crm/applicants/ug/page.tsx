import ReviewApplicants from "@/app/(authenticated)/modules/crm/admissions/review-applicants/ReviewApplicants";

export default function UGApplicantsPage() {
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
