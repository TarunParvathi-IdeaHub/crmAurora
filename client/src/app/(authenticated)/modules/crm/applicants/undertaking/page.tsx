"use client";

import {
  ClipboardCheck,
  Lock,
  CheckCircle2,
  Circle,
  FileSignature,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  BookMarked,
  School,
} from "lucide-react";
import Card from "@/components/common/Card";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

const staggerList: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const slideItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

const unlockSteps = [
  {
    id: 1,
    icon: FileSignature,
    label: "Submit Application",
    description: "Fill in all details and pay the application fee.",
    path: "/modules/crm/applicants/application",
    linkLabel: "Go to Application",
    done: false,
  },
  {
    id: 2,
    icon: CheckCircle2,
    label: "Document Verification",
    description: "Admin team reviews and approves your uploaded documents.",
    done: false,
  },
  {
    id: 3,
    icon: BookMarked,
    label: "AURUM Exam",
    description: "Appear for the AURUM entrance exam and await results.",
    path: "/modules/crm/applicants/aurum",
    linkLabel: "View Exam Details",
    done: false,
  },
  {
    id: 4,
    icon: School,
    label: "Provisional Admission Confirmation",
    description: "Admin confirms provisional admission based on exam performance.",
    done: false,
  },
];

const clauseItems = [
  {
    icon: ShieldCheck,
    title: "Academic Conduct",
    body: "I agree to abide by all academic policies, examination rules, and code of conduct as prescribed by Aurora University.",
  },
  {
    icon: UserCheck,
    title: "Information Accuracy",
    body: "I declare that all information and documents submitted in my application are true, authentic, and complete to the best of my knowledge.",
  },
  {
    icon: AlertCircle,
    title: "Fee & Refund Policy",
    body: "I have read and understood the university's fee structure and refund policy, and agree to the same.",
  },
  {
    icon: BookMarked,
    title: "Rules & Regulations",
    body: "I undertake to follow all academic and non-academic rules and regulations of the university during my period of study.",
  },
];

export default function UndertakingPage() {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerList}
      className="mx-auto max-w-5xl space-y-6 py-2"
    >
      {/* Hero */}
      <motion.div variants={slideItem}>
        <Card className="overflow-hidden border-0 bg-linear-to-r from-emerald-700 via-emerald-600 to-emerald-500 p-0 text-white shadow-xl">
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                <ClipboardCheck size={30} />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-200">Student Declaration</p>
                <h1 className="mt-0.5 text-2xl font-bold md:text-3xl">Undertaking Form</h1>
                <p className="mt-1 text-emerald-100">Admission Cycle 2026–27 · Aurora University</p>
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center backdrop-blur-sm">
              <Lock size={26} className="mx-auto text-white/70" />
              <p className="mt-2 text-sm font-semibold">Locked</p>
              <p className="mt-0.5 text-xs text-emerald-100">Complete steps below to unlock</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Lock notice */}
      <motion.div variants={slideItem}>
        <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-5">
          <Lock size={22} className="mt-0.5 shrink-0 text-slate-500" />
          <div>
            <p className="font-semibold text-slate-800">Undertaking form is currently locked</p>
            <p className="mt-1 text-sm text-slate-600">
              This form will be unlocked once your application is submitted, documents are
              verified, and provisional admission is confirmed by the admissions team. Track
              your progress in the steps below.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Steps to unlock + What is undertaking */}
      <motion.div variants={slideItem} className="grid gap-5 lg:grid-cols-2">
        {/* Steps to unlock */}
        <Card className="p-6">
          <h2 className="mb-5 text-base font-semibold text-slate-900">Steps to Unlock</h2>
          <ol className="space-y-5">
            {unlockSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <li key={step.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                        step.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {step.done ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    {idx < unlockSteps.length - 1 && (
                      <div className="mt-1 h-8 w-px bg-slate-200" />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className={`text-sm font-semibold ${step.done ? "text-emerald-700" : "text-slate-700"}`}>
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{step.description}</p>
                    {"path" in step && step.path && (
                      <Link
                        href={step.path}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
                      >
                        {step.linkLabel} →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {/* What is undertaking */}
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">What is the Undertaking?</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            The Student Admission Undertaking is a formal declaration that every student must
            sign before joining Aurora University. It confirms your acceptance of the
            university's policies and serves as a binding agreement between you and the
            institution.
          </p>
          <div className="mt-5 space-y-3">
            {clauseItems.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* CTA */}
      <motion.div variants={slideItem}>
        <Card className="border-emerald-100 bg-emerald-50 p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Ready to get started?</p>
              <p className="mt-0.5 text-sm text-emerald-700">
                Begin with your application to unlock the undertaking form.
              </p>
            </div>
            <Link
              href="/modules/crm/applicants/application"
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <FileSignature size={15} />
              Start My Application
            </Link>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

