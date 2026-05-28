"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/common/Avatar";
import Badge from "@/components/common/Badge";
import Card from "@/components/common/Card";
import { CardSkeleton } from "@/components/common/Loading";
import { useAuth } from "@/lib/hooks/useAuth";
import { useProfile, type DashboardProfile } from "@/providers/ProfileProvider";
import { roleModulesMap, type DashboardModule } from "@/lib/config/dashboardModules";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  HeartPulse,
  Layers,
  ShieldCheck,
  TrendingUp,
  Users,
  UserCog,
  Wallet,
  GraduationCap,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import type { ComponentType } from "react";
import { apiFetch } from "@/lib/utils/apiFetch";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

type School = {
  id: string;
  name: string;
  institutionName: string;
  departments: number;
  programs: number;
  students: number;
  faculty: number;
};

// Module definitions live in @/lib/config/dashboardModules.
// The roleModulesMap is keyed by the raw backend role string (e.g. "College Admin").

const stats = [
  { id: "active-users",     label: "Active Users",     value: "2,481", trend: "+9.4%", icon: Users,          color: "bg-blue-50 text-blue-600"   },
  { id: "programs",         label: "Programs",         value: "128",   trend: "+5.2%", icon: Layers,         color: "bg-blue-50 text-blue-600"   },
  { id: "admission-cycles", label: "Admission Cycles", value: "7",     trend: "+2.1%", icon: ClipboardCheck, color: "bg-sky-50 text-sky-600"      },
  { id: "system-health",    label: "System Health",    value: "99.2%", trend: "+0.6%", icon: HeartPulse,     color: "bg-blue-50 text-blue-600"   },
] as const;

const activityFeed = [
  { id: "a1", icon: ShieldCheck,   color: "bg-blue-50 text-blue-600", description: "Role permissions updated for Dean and HOD hierarchy.",             timestamp: "10 min ago" },
  { id: "a2", icon: ClipboardCheck, color: "bg-sky-50 text-sky-600",   description: "Admission Cycle 2026-27 published and shared with counsellors.", timestamp: "48 min ago" },
  { id: "a3", icon: Building2,     color: "bg-blue-50 text-blue-500",  description: "School of Engineering added 2 new AI-focused departments.",       timestamp: "2 hrs ago"  },
] as const;

// Domain → icon/colour map for module cards
const domainStyle: Record<string, { bg: string; text: string; icon: ComponentType<{ size?: number; className?: string }> }> = {
  academic:   { bg: "bg-blue-50", text: "text-blue-600", icon: BookOpen },
  crm:        { bg: "bg-blue-50", text: "text-blue-600", icon: Users },
  faculty:    { bg: "bg-blue-50", text: "text-blue-500", icon: UserCog },
  finance:    { bg: "bg-blue-50", text: "text-blue-600", icon: Wallet },
  management: { bg: "bg-slate-100", text: "text-slate-600", icon: Building2 },
  student:    { bg: "bg-blue-50", text: "text-blue-500", icon: GraduationCap },
};

const staggerList: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
};

/* ── Stat metric card ── */
function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  trend: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
}) {
  return (
    <Card className="p-5 card-lift">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
        <TrendingUp size={13} />
        <span>{trend} this month</span>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile, setProfile, isProfileLoading, setIsProfileLoading } = useProfile();
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  const displayName =
    profile?.fullName ?? user?.userId ?? user?.email?.split("@")[0] ?? "User";
  const displayRole = profile?.role ?? user?.rawRole ?? "System Administrator";
  const displayEmail = profile?.email ?? user?.email ?? "—";
  const displayInstitution =
    profile?.institution?.institutionName ?? schools[0]?.institutionName ?? "Aurora University";

  const currentModules: DashboardModule[] = roleModulesMap[displayRole] ?? [];
  const isApplicant = user?.role === "Applicant";

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Fetch profile (role-specific endpoint)
  useEffect(() => {
    if (!user?.userId || profile) return;
    let cancelled = false;
    const fetch_ = async () => {
      setIsProfileLoading(true);
      try {
        let profileUrl = `${API_BASE_URL}/api/dashboard/employee/profile`;
        if (user.role === "Applicant") profileUrl = `${API_BASE_URL}/api/dashboard/applicant/profile`;
        else if (user.role === "student") profileUrl = `${API_BASE_URL}/api/dashboard/student/profile`;

        const res = await apiFetch(profileUrl);
        if (res.status === 401) { localStorage.removeItem("erpUser"); window.location.replace("/login"); return; }
        const data = (await res.json().catch(() => null)) as { success?: boolean; data?: DashboardProfile; error?: string } | null;
        const isProfileMissing =
          res.status === 404 && /profile not found/i.test(data?.error ?? "");

        if (!cancelled && res.ok && data?.success && data.data) {
          setProfile(data.data);
        } else if (!cancelled && !isProfileMissing) {
          console.error(
            "Dashboard profile fetch failed:",
            data?.error ?? `HTTP ${res.status}`
          );
        }
      } catch (err) { if (!cancelled) console.error("Dashboard profile API error:", err); }
      finally { if (!cancelled) setIsProfileLoading(false); }
    };
    fetch_();
    return () => { cancelled = true; };
  }, [user, profile, setProfile, setIsProfileLoading]);

  // Fetch schools
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const resp = await apiFetch(`${API_BASE_URL}/api/schools`);
        if (resp.ok) {
          const data = (await resp.json()) as { schools: Array<{ id: string; schoolCode: string; name: string; institutionId: string; institutionName: string; institutionCode: string }> };
          setSchools(
            (data.schools || []).map((s) => ({
              id: s.id,
              name: s.name,
              institutionName: s.institutionName,
              departments: Math.floor(Math.random() * 12) + 5,
              programs:    Math.floor(Math.random() * 45) + 15,
              students:    Math.floor(Math.random() * 5000) + 2000,
              faculty:     Math.floor(Math.random() * 300) + 150,
            }))
          );
        }
      } catch { setSchools([]); }
      finally { setLoadingSchools(false); }
    };
    fetch_();
  }, []);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerList}
      className="w-full space-y-7"
    >
      {/* ── Hero welcome banner ── */}
      <motion.div variants={fadeUp}>
        <div className="gradient-mesh relative overflow-hidden rounded-[28px] border border-white/20 p-6 text-white shadow-[0_20px_50px_rgba(29,78,216,0.18)]">
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/8" />
          <div className="pointer-events-none absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-white/8" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar
                name={isProfileLoading ? (user?.userId ?? "U") : displayName}
                src={profile?.imageUrl ?? null}
                size="xl"
                ring
                className="shrink-0 border-[3px] border-white/35 bg-white/20"
              />
              <div>
                <p className="text-sm font-medium text-white/70">{greeting},</p>
                <h1 className="text-2xl font-bold tracking-tight">
                  {isProfileLoading ? (user?.userId ?? "…") : displayName}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge label={displayRole} variant="ghost" dot />
                  <span className="text-white/50">·</span>
                  <span className="text-sm text-white/70">{displayInstitution}</span>
                </div>
              </div>
            </div>
        </div>
        </div>
      </motion.div>

      {/* ── Stat cards ──
      {!isApplicant && (
        <motion.section variants={fadeUp}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.id}
                label={stat.label}
                value={stat.value}
                trend={stat.trend}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </div>
        </motion.section>
      )} */}

      {/* ── Modules grid ── */}
      <motion.section variants={fadeUp}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Your Modules</h2>
            <p className="mt-0.5 text-sm text-slate-500">Quick access to your assigned modules</p>
          </div>
        </div>

        {isProfileLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : currentModules.length === 0 ? (
          <Card className="p-10 text-center">
            <GraduationCap size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">No modules assigned for your role.</p>
            <p className="mt-1 text-sm text-slate-400">Contact your administrator to request access.</p>
          </Card>
        ) : (
          <motion.div variants={staggerList} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {currentModules.map((module) => {
              const ModIcon = module.icon;
              const ds = domainStyle[(module as DashboardModule & { domain?: string }).domain ?? "management"] ??
                         domainStyle.management;
              const DomainIcon = ds.icon;
              return (
                <motion.div key={module.id} variants={fadeUp}>
                  <Link href={module.path} className="block">
                    <Card className="group cursor-pointer border-blue-100/80 p-5 card-lift hover:border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className={`rounded-xl p-2.5 ${ds.bg} ${ds.text}`}>
                          <ModIcon size={20} />
                        </div>
                        <ArrowRight
                          size={15}
                          className="text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-blue-500"
                        />
                      </div>
                      <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{module.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{module.description}</p>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.section>

      {/* ── Bottom row: Schools + Activity ── */}
      {!isApplicant && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 gap-6 lg:grid-cols-5">

          {/* Schools overview (3/5) 
          <section className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Schools Overview</h2>
              {!loadingSchools && schools.length > 0 && (
                <Badge label={`${schools.length} total`} variant="neutral" />
              )}
            </div>

            {loadingSchools ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : schools.length === 0 ? (
              <Card className="p-8 text-center text-slate-400">No schools found</Card>
            ) : (
              <div className="space-y-3">
                {schools.map((school) => (
                  <Card key={school.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Building2 size={17} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{school.name}</h3>
                          <p className="text-xs text-slate-400">{school.institutionName}</p>
                        </div>
                      </div>
                      <Badge label="Active" variant="success" dot />
                    </div>
                    <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4 text-center text-xs">
                      {[
                        { label: "Depts",    value: school.departments },
                        { label: "Programs", value: school.programs },
                        { label: "Students", value: school.students.toLocaleString() },
                        { label: "Faculty",  value: school.faculty.toLocaleString() },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <dd className="text-base font-bold text-slate-900">{value}</dd>
                          <dt className="mt-0.5 text-slate-400">{label}</dt>
                        </div>
                      ))}
                    </dl>
                  </Card>
                ))}
              </div>
            )}
          </section>
          */}

          {/* Activity feed (2/5) 
          <section className="lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Recent Activity</h2>
            </div>
            <Card className="divide-y divide-slate-100 p-0 overflow-hidden">
              {activityFeed.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3.5 px-5 py-4">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${activity.color}`}>
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 leading-relaxed">{activity.description}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{activity.timestamp}</p>
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
          */}
        </motion.div>
      )}
    </motion.div>
  );
}

