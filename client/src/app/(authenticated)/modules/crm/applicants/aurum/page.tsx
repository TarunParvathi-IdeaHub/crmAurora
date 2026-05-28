"use client";

import {
  BookOpen,
  Clock,
  FileText,
  HelpCircle,
  CheckCircle2,
  Circle,
  CalendarDays,
  MonitorCheck,
  Timer,
  BarChart2,
} from "lucide-react";
import Card from "@/components/common/Card";
import { motion, type Variants } from "framer-motion";

const staggerList: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const slideItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

const steps = [
  { id: 1, label: "Submit Application", description: "Complete and pay for your application.", done: false },
  { id: 2, label: "Document Verification", description: "Admin team verifies your uploaded documents.", done: false },
  { id: 3, label: "Exam Slot Assigned", description: "Your AURUM exam date and time will appear here.", done: false },
  { id: 4, label: "Appear for Exam", description: "Attend the exam at the assigned venue or online.", done: false },
  { id: 5, label: "Results Declared", description: "Results will be published within 7 working days.", done: false },
];

const examDetails = [
  { icon: Timer, label: "Duration", value: "90 minutes" },
  { icon: MonitorCheck, label: "Mode", value: "Online / Offline" },
  { icon: BarChart2, label: "Total Marks", value: "200" },
  { icon: CalendarDays, label: "Schedule", value: "After verification" },
];

const subjects = [
  { name: "Aptitude & Reasoning", marks: 60, questions: 30 },
  { name: "English Language", marks: 40, questions: 20 },
  { name: "Domain Knowledge", marks: 80, questions: 40 },
  { name: "General Awareness", marks: 20, questions: 10 },
];

const faqs = [
  {
    q: "Is AURUM Exam mandatory?",
    a: "Yes, all applicants must appear for the AURUM entrance examination as part of the admission process.",
  },
  {
    q: "Can I reschedule my exam slot?",
    a: "Rescheduling requests can be submitted to the admissions office at least 48 hours before the exam.",
  },
  {
    q: "What do I need to carry to the exam?",
    a: "Your Admit Card (available here once assigned), a valid government-issued photo ID, and stationery.",
  },
];

export default function AurumExamPage() {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerList}
      className="mx-auto max-w-5xl space-y-6 py-2"
    >
      {/* Hero */}
      <motion.div variants={slideItem}>
        <Card className="overflow-hidden border-0 bg-linear-to-r from-violet-700 via-violet-600 to-violet-500 p-0 text-white shadow-xl">
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                <BookOpen size={30} />
              </div>
              <div>
                <p className="text-sm font-medium text-violet-200">Entrance Examination</p>
                <h1 className="mt-0.5 text-2xl font-bold md:text-3xl">AURUM Exam</h1>
                <p className="mt-1 text-violet-100">Admission Cycle 2026–27 · Aurora University</p>
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center backdrop-blur-sm">
              <p className="text-3xl font-bold">—</p>
              <p className="mt-1 text-sm text-violet-100">Exam date not yet assigned</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Status notice */}
      <motion.div variants={slideItem}>
        <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <Clock size={22} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-800">Exam schedule not yet available</p>
            <p className="mt-1 text-sm text-amber-700">
              Your exam slot will be assigned after your application is submitted and your documents are
              verified by the admissions team. Complete the steps below to unlock your exam schedule.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Exam Details + Progress side-by-side */}
      <motion.div variants={slideItem} className="grid gap-5 lg:grid-cols-2">
        {/* Exam details */}
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Exam Overview</h2>
          <dl className="grid grid-cols-2 gap-4">
            {examDetails.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Icon size={17} />
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-800">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Card>

        {/* Progress steps */}
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Your Progress</h2>
          <ol className="space-y-3">
            {steps.map((step, idx) => (
              <li key={step.id} className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {step.done ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <Circle size={18} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${step.done ? "text-emerald-700" : idx === 0 ? "text-slate-800" : "text-slate-400"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-400">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </motion.div>

      {/* Syllabus */}
      <motion.div variants={slideItem}>
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={18} className="text-violet-600" />
            <h2 className="text-base font-semibold text-slate-900">Exam Syllabus</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left font-semibold text-slate-600">Subject</th>
                  <th className="pb-3 text-right font-semibold text-slate-600">Questions</th>
                  <th className="pb-3 text-right font-semibold text-slate-600">Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <tr key={s.name}>
                    <td className="py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="py-3 text-right text-slate-500">{s.questions}</td>
                    <td className="py-3 text-right text-slate-700 font-semibold">{s.marks}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300">
                  <td className="py-3 font-bold text-slate-900">Total</td>
                  <td className="py-3 text-right font-bold text-slate-900">100</td>
                  <td className="py-3 text-right font-bold text-slate-900">200</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* FAQs */}
      <motion.div variants={slideItem}>
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <HelpCircle size={18} className="text-violet-600" />
            <h2 className="text-base font-semibold text-slate-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">{faq.q}</p>
                <p className="mt-1.5 text-sm text-slate-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

