"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// ── Profile shape returned by POST /api/dashboard/profile ────────────────────

export interface DashboardProfile {
  userId: string;
  role: string; // raw backend string, e.g. "College Admin"
  entityId: string; // UUID primary key from the role-specific table (e.g. AdmissionCounsellor.id)
  empId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  designation: string;
  email: string;
  mobileNo: string;
  alternativeMobileNo: string;
  emergencyContact: string;
  address: string;
  bloodGroup: string;
  caste: string;
  imageUrl?: string | null;
  // Applicant-only: maps to studentAdmissionApplicationId, required for save-draft
  applicationId?: string | null;
  institution: {
    id: string;
    institutionName: string;
    institutionCode: string;
    institutionCity: string;
    institutionState: string;
  } | null;
  department: {
    id: string;
    name: string;
    departmentCode: string;
  } | null;
}

// ── Context contract ──────────────────────────────────────────────────────────

interface ProfileContextValue {
  profile: DashboardProfile | null;
  isProfileLoading: boolean;
  setProfile: (profile: DashboardProfile | null) => void;
  setIsProfileLoading: (loading: boolean) => void;
  clearProfile: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Wraps the authenticated section of the app.
 * Stores the full employee profile fetched after login so every downstream
 * component (Navbar, dashboard, module pages) can read it without re-fetching.
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<DashboardProfile | null>(null);
  const [isProfileLoading, setIsProfileLoadingState] = useState(false);

  const setProfile = (p: DashboardProfile | null) => setProfileState(p);
  const setIsProfileLoading = (loading: boolean) =>
    setIsProfileLoadingState(loading);
  const clearProfile = () => setProfileState(null);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isProfileLoading,
        setProfile,
        setIsProfileLoading,
        clearProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/** Must be called from a component rendered inside <ProfileProvider>. */
export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return ctx;
}
