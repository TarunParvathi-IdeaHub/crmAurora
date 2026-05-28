import { redirect } from "next/navigation";

export default function LeadsRootPage() {
  redirect("/modules/crm/leads/all");
}
