'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';

const PASSWORD_HAS_UPPERCASE = /[A-Z]/;
const PASSWORD_HAS_NUMBER = /\d/;
const PASSWORD_HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const hasUppercase = useMemo(() => PASSWORD_HAS_UPPERCASE.test(newPassword), [newPassword]);
  const hasNumber = useMemo(() => PASSWORD_HAS_NUMBER.test(newPassword), [newPassword]);
  const hasSpecial = useMemo(() => PASSWORD_HAS_SPECIAL.test(newPassword), [newPassword]);
  const hasMinLength = useMemo(() => newPassword.trim().length >= 8, [newPassword]);
  const newPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecial;
  const confirmPasswordValid = confirmPassword.length > 0 && confirmPassword === newPassword;
  const isFormValid =
    currentPassword.trim().length > 0 &&
    newPasswordValid &&
    confirmPasswordValid;

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('All password fields are required.');
      return;
    }

    if (!newPasswordValid) {
      setError('New password must be at least 8 characters long and include uppercase, number, and special character.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('New password and confirm password must match.');
      return;
    }

    setIsLoading(true);

    try {
      const storedUser = JSON.parse(localStorage.getItem('erpUser') || '{}');

      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          oldPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
          userId: storedUser.userId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || 'Unable to change password.');
        return;
      }

      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => null);

      localStorage.clear();
      sessionStorage.clear();

      router.replace('/login');
    } catch {
      setError('Unable to connect to the backend. Please ensure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden bg-linear-to-br from-[#d4e6fc] via-[#eef4fc] to-[#6099ef]">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <circle cx="85%" cy="5%" r="35%" fill="#2b509f" opacity="0.9" />
          <circle cx="95%" cy="20%" r="25%" fill="#4d8df1" opacity="0.9" />
          <circle cx="75%" cy="15%" r="20%" fill="none" stroke="#a3c4f3" strokeWidth="45" opacity="0.7" />
          <circle cx="82%" cy="25%" r="18%" fill="none" stroke="#3664c3" strokeWidth="35" opacity="0.6" />
          <circle cx="90%" cy="10%" r="3%" fill="none" stroke="#a3c4f3" strokeWidth="15" />
          <circle cx="93%" cy="30%" r="2%" fill="none" stroke="#8cb4f5" strokeWidth="12" />
          <path d="M 50% 100% Q 70% 80%, 100% 70% L 100% 100% Z" fill="#3664c3" opacity="0.9" />
          <path d="M 60% 100% Q 80% 85%, 100% 80% L 100% 100% Z" fill="#2b509f" />
        </svg>
      </div>

      <div className="relative z-10 flex w-full h-screen">
        <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end lg:pr-16 px-4">
          <div className="w-full max-w-105 p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-0 bg-white">
            <h2 className="text-[32px] font-bold text-gray-800 mb-8">Change Password</h2>

            <form onSubmit={handleChangePassword} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg">
                  <p className="text-sm">{success}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[15px] font-medium text-gray-700" htmlFor="currentPassword">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-12 text-gray-800 placeholder:text-gray-400 focus:border-[#4d8df1] focus:ring-1 focus:ring-[#4d8df1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700"
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showCurrent ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path d="M3 3l18 18" strokeLinecap="round" />
                        <path
                          d="M10.59 10.59A2 2 0 0 0 12 14a2 2 0 0 0 1.41-.59"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.36 5.37A10.89 10.89 0 0 1 12 5c4.5 0 8.1 2.6 9.5 7-.57 1.8-1.54 3.29-2.8 4.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.7 6.7C4.98 7.86 3.64 9.67 2.5 12c1.4 4.4 5 7 9.5 7 1.18 0 2.3-.18 3.34-.53"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path
                          d="M2.5 12C3.9 7.6 7.5 5 12 5s8.1 2.6 9.5 7c-1.4 4.4-5 7-9.5 7s-8.1-2.6-9.5-7Z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[15px] font-medium text-gray-700" htmlFor="newPassword">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-12 text-gray-800 placeholder:text-gray-400 focus:border-[#4d8df1] focus:ring-1 focus:ring-[#4d8df1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700"
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path d="M3 3l18 18" strokeLinecap="round" />
                        <path
                          d="M10.59 10.59A2 2 0 0 0 12 14a2 2 0 0 0 1.41-.59"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.36 5.37A10.89 10.89 0 0 1 12 5c4.5 0 8.1 2.6 9.5 7-.57 1.8-1.54 3.29-2.8 4.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.7 6.7C4.98 7.86 3.64 9.67 2.5 12c1.4 4.4 5 7 9.5 7 1.18 0 2.3-.18 3.34-.53"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path
                          d="M2.5 12C3.9 7.6 7.5 5 12 5s8.1 2.6 9.5 7c-1.4 4.4-5 7-9.5 7s-8.1-2.6-9.5-7Z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-800 mb-2">Password must include:</p>
                    <ul className="space-y-1 text-sm">
                      <li className={hasMinLength ? 'text-emerald-700' : 'text-rose-600'}>
                        {hasMinLength ? '✓' : '•'} At least 8 characters
                      </li>
                      <li className={hasUppercase ? 'text-emerald-700' : 'text-rose-600'}>
                        {hasUppercase ? '✓' : '•'} At least one uppercase letter
                      </li>
                      <li className={hasNumber ? 'text-emerald-700' : 'text-rose-600'}>
                        {hasNumber ? '✓' : '•'} At least one number
                      </li>
                      <li className={hasSpecial ? 'text-emerald-700' : 'text-rose-600'}>
                        {hasSpecial ? '✓' : '•'} At least one special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[15px] font-medium text-gray-700" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-12 text-gray-800 placeholder:text-gray-400 focus:border-[#4d8df1] focus:ring-1 focus:ring-[#4d8df1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path d="M3 3l18 18" strokeLinecap="round" />
                        <path
                          d="M10.59 10.59A2 2 0 0 0 12 14a2 2 0 0 0 1.41-.59"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.36 5.37A10.89 10.89 0 0 1 12 5c4.5 0 8.1 2.6 9.5 7-.57 1.8-1.54 3.29-2.8 4.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.7 6.7C4.98 7.86 3.64 9.67 2.5 12c1.4 4.4 5 7 9.5 7 1.18 0 2.3-.18 3.34-.53"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path
                          d="M2.5 12C3.9 7.6 7.5 5 12 5s8.1 2.6 9.5 7c-1.4 4.4-5 7-9.5 7s-8.1-2.6-9.5-7Z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`mt-2 text-sm ${confirmPasswordValid ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {confirmPasswordValid
                      ? 'Passwords match.'
                      : 'Confirm password must exactly match the new password.'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full h-12 rounded-lg bg-[#5584f1] text-white text-[16px] font-semibold transition hover:bg-[#436cd9] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isLoading ? 'Updating...' : 'Change Password'}
              </button>

            </form>
          </div>
        </div>

        <div className="hidden lg:flex w-1/2 relative justify-center items-end h-full">
          <img
            src="/students.png"
            alt="Graduation Students"
            className="w-auto h-[85vh] max-h-[85vh] object-contain object-bottom -mb-2 z-10 mix-blend-multiply"
          />
        </div>
      </div>
    </div>
  );
}
