"use client";

import { Bell, Lock, Moon, Palette, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";

const sections = [
  {
    id: "account",
    icon: User,
    label: "Account",
    description: "Manage your personal information and linked identity.",
    badge: null,
  },
  {
    id: "security",
    icon: Lock,
    label: "Security",
    description: "Password, two-factor authentication, and active sessions.",
    badge: null,
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    description: "Configure how and when you receive alerts and emails.",
    badge: "3 new",
  },
  {
    id: "appearance",
    icon: Palette,
    label: "Appearance",
    description: "Customize the theme, density, and language preferences.",
    badge: null,
  },
  {
    id: "privacy",
    icon: Shield,
    label: "Privacy & Data",
    description: "Control your data, audit logs, and third-party integrations.",
    badge: null,
  },
];

export default function SettingsPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="mt-1 inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your account preferences and system configuration.
          </p>
        </div>
      </div>

      {/* Settings sections */}
      <div className="space-y-3">
        {sections.map(({ id, icon: Icon, label, description, badge }) => (
          <Card
            key={id}
            className="group flex cursor-pointer items-center gap-4 p-5 card-lift"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                {badge && <Badge label={badge} variant="info" />}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Card>
        ))}
      </div>

      {/* Danger zone */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Danger Zone
        </h2>
        <Card className="border-rose-200/60 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Delete account</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Permanently remove your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              Delete
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
