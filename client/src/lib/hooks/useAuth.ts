"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeRole } from "@/lib/utils/role";
import type { Role } from "@/types/role";

type AuthUser = {
  userId?: string;
  email?: string;
  role?: Role;     // normalized camelCase (e.g. "collegeAdmin")
  rawRole?: string; // raw backend string (e.g. "College Admin") — used for API calls
  message?: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const toOptionalString = (value: unknown) => (typeof value === "string" ? value : undefined);

  useEffect(() => {
    const raw = localStorage.getItem("erpUser");

    if (!raw) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      setUser({
        userId: toOptionalString(parsed.userId),
        email: toOptionalString(parsed.email),
        role: normalizeRole(parsed.role) ?? undefined,
        rawRole: toOptionalString(parsed.role),
        message: toOptionalString(parsed.message),
      });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user?.userId || user?.email), [user]);

  return { user, isAuthenticated, isLoading };
}