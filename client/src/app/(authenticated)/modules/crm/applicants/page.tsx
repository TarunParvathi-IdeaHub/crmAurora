"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function ApplicantsPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === "Applicant") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Applicant — redirect in progress, render nothing
  if (!user || user.role === "Applicant") return null;

  // Other roles (admin, counsellor, etc.) — applicant management list (future feature)
  return (
    <div className="p-8 text-center text-slate-500">
      Applicant management module coming soon.
    </div>
  );
}

