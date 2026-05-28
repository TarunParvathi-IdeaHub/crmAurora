import ReviewApplicants from "@/app/(authenticated)/modules/crm/admissions/review-applicants/ReviewApplicants";

export default function PhdApplicantsPage() {
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
