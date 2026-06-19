import ReviewApplicants from "../review-applicants/ReviewApplicants";

export default function ReviewApplicationsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Review Applications</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and process all incoming applicant submissions.
        </p>
      </div>
      <ReviewApplicants />
    </div>
  );
}
