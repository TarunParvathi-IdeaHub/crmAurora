import { notFound } from "next/navigation";
import LeadsTable from "../_components/LeadsTable";
import type { LeadFilter } from "../_components/LeadsTable";

// ── Study-level route config ──────────────────────────────────────────────────
// URL:  /modules/crm/leads/<studyLevel>
// e.g.  /modules/crm/leads/ug   → UG leads only
//       /modules/crm/leads/pg   → PG leads only
//       /modules/crm/leads/phd  → Phd leads only
//       /modules/crm/leads/all  → all leads

const LEVEL_CONFIG: Record<
  string,
  { filter: LeadFilter; title: string; description: string }
> = {
  all: {
    filter: "all",
    title: "All Leads",
    description: "View and manage all leads for your institution.",
  },
  ug: {
    filter: "ug",
    title: "UG Leads",
    description: "View and manage undergraduate programme leads.",
  },
  pg: {
    filter: "pg",
    title: "PG Leads",
    description: "View and manage postgraduate programme leads.",
  },
  phd: {
    filter: "phd",
    title: "Phd Leads",
    description: "View and manage doctoral programme leads.",
  },
};

interface PageProps {
  params: Promise<{ studyLevel: string }>;
}

export default async function StudyLevelLeadsPage({ params }: PageProps) {
  const { studyLevel } = await params;
  const config = LEVEL_CONFIG[studyLevel.toLowerCase()];

  // Unknown study level → 404
  if (!config) notFound();

  return (
    <div className="p-6">
      <LeadsTable
        filter={config.filter}
        pageTitle={config.title}
        pageDescription={config.description}
      />
    </div>
  );
}
