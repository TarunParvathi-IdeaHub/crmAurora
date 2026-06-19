"use client";

import { permissions } from "@/lib/config/permissions";
import type { PermissionName } from "@/types/permissions";
import { useAuth } from "./useAuth";

function extractDomainFromPath(pathname: string): PermissionName | null {
  const parts = pathname.split("/").filter(Boolean);
  const modulesIndex = parts.indexOf("modules");
  const domain = parts[modulesIndex + 1];

  if (
    domain === "academic" ||
    domain === "crm" ||
    domain === "faculty" ||
    domain === "finance" ||
    domain === "management" ||
    domain === "student"
  ) {
    return domain;
  }

  return null;
}

export function usePermissions() {
  const { user, isLoading } = useAuth();
  const role = user?.role ?? null;

  const canAccessDomain = (domain: PermissionName) => {
    if (isLoading) return true;
    if (!role) return false;
    return (permissions[role] ?? []).includes(domain);
  };

  const canAccessPath = (pathname: string) => {
    if (isLoading) return true;
    const domain = extractDomainFromPath(pathname);
    if (!domain) return true;
    return canAccessDomain(domain);
  };

  return { canAccessDomain, canAccessPath, isLoading };
}