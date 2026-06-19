"use client";

import { useState, useRef } from "react";
import Avatar from "@/components/common/Avatar";
import { useProfile } from "@/providers/ProfileProvider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

export default function ProfilePage() {
  const { profile, setProfile } = useProfile();
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [mobileNo, setMobileNo] = useState(profile?.mobileNo ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(profile?.imageUrl ?? null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!profile) {
    return <div className="p-8">Loading profile...</div>;
  }

  const handleImageSelect = (file?: File) => {
    const f = file ?? fileRef.current?.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImagePreview(url);
  };

  const handleUploadImage = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return null;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", f);
      const resp = await fetch(`${API_BASE_URL}/api/s3test/profile-image`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.message || "Image upload failed");
        return null;
      }
      return data.imageUrl as string;
    } catch (err: any) {
      setError(err?.message || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      let imageUrl = profile.imageUrl ?? null;
      if (fileRef.current?.files?.length) {
        const uploaded = await handleUploadImage();
        if (uploaded) imageUrl = uploaded;
      }

      const payload: Record<string, unknown> = {
        designation: profile.designation,
        empId: profile.empId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        mobileNo: mobileNo.trim(),
      };

      const resp = await fetch(`${API_BASE_URL}/api/employees/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(data.message || "Failed to update profile");
        setSaving(false);
        return;
      }

      // Update local profile state for immediate UI feedback (image stored in frontend only)
      const updated = {
        ...profile,
        firstName: payload.firstName as string,
        lastName: payload.lastName as string,
        fullName: `${payload.firstName} ${payload.lastName}`.trim(),
        email: payload.email as string,
        mobileNo: payload.mobileNo as string,
        imageUrl,
      };

      setProfile(updated as any);
      setSuccess("Profile updated successfully");
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Profile</h2>
      <p className="mt-1 text-sm text-slate-500">Update your name, email, phone and profile image.</p>

      <div className="mt-6 flex flex-col items-start gap-6 md:flex-row md:items-start">
        <div className="flex-shrink-0">
          <Avatar name={`${profile.fullName}`} src={imagePreview} className="h-28 w-28 text-2xl" />
          <div className="mt-3">
            <input ref={fileRef} type="file" accept="image/*" onChange={() => handleImageSelect()} />
          </div>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Mobile No</label>
              <input value={mobileNo} onChange={(e) => setMobileNo(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => { setFirstName(profile.firstName); setLastName(profile.lastName); setEmail(profile.email); setMobileNo(profile.mobileNo); setImagePreview(profile.imageUrl ?? null); if (fileRef.current) fileRef.current.value = ""; }} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600">
              Reset
            </button>
          </div>

          {error && <div className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
          {success && <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
        </div>
      </div>
    </div>
  );
}