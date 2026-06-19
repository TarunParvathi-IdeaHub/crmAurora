"use client";

import type { Role } from "@/types/role";
import { useAuth } from "./useAuth";

export function useRole(): Role | null {
  const { user } = useAuth();
  return user?.role ?? null;
}