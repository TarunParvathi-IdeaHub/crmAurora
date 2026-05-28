import ReviewApplicants from "@/app/(authenticated)/modules/crm/admissions/review-applicants/ReviewApplicants";

export default function PGApplicantsPage() {
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
