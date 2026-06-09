'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';

const PASSWORD_HAS_UPPERCASE = /[A-Z]/;
const PASSWORD_HAS_NUMBER = /\d/;
const PASSWORD_HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  const hasUppercase = useMemo(() => PASSWORD_HAS_UPPERCASE.test(newPassword), [newPassword]);
  const hasNumber = useMemo(() => PASSWORD_HAS_NUMBER.test(newPassword), [newPassword]);
  const hasSpecial = useMemo(() => PASSWORD_HAS_SPECIAL.test(newPassword), [newPassword]);
  const hasMinLength = useMemo(() => newPassword.length >= 8, [newPassword]);
  const passwordsMatch = useMemo(
    () => confirmPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );

  const isFormValid = hasUppercase && hasNumber && hasSpecial && hasMinLength && passwordsMatch;

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsTokenValid(false);
        setIsVerifyingToken(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.valid) {
          setIsTokenValid(false);
          setError('Reset Password Link Expired');
          return;
        }

        setIsTokenValid(true);
      } catch {
        setIsTokenValid(false);
        setError('Reset Password Link Expired');
      } finally {
        setIsVerifyingToken(false);
      }
    };

    void verifyToken();
  }, [token]);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Reset Password Link Expired');
      return;
    }

    if (!isFormValid) {
      setError('Please satisfy password requirements and ensure passwords match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || 'Unable to reset password.');
        return;
      }

      setSuccess('Password reset successful. Redirecting to login...');
      setTimeout(() => {
        router.replace('/login');
      }, 1500);
    } catch {
      setError('Unable to connect to the backend. Please ensure the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifyingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-10 w-10 rounded-full border-[3px] border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex overflow-hidden bg-linear-to-br from-[#d4e6fc] via-[#eef4fc] to-[#6099ef]">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <circle cx="85%" cy="5%" r="35%" fill="#2b509f" opacity="0.9" />
          <circle cx="95%" cy="20%" r="25%" fill="#4d8df1" opacity="0.9" />
          <circle cx="75%" cy="15%" r="20%" fill="none" stroke="#a3c4f3" strokeWidth="45" opacity="0.7" />
          <circle cx="82%" cy="25%" r="18%" fill="none" stroke="#3664c3" strokeWidth="35" opacity="0.6" />
        </svg>
      </div>

      <div className="relative z-10 flex w-full h-screen">
        <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end lg:pr-16 px-4">
          <div className="w-full max-w-105 p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-0 bg-white">
            <h2 className="text-[32px] font-bold text-gray-800 mb-2">Reset Password</h2>

            {!isTokenValid ? (
              <div className="mt-4 space-y-4">
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  <p className="text-sm">Reset Password Link Expired</p>
                </div>
                <Link href="/forgot-password" className="inline-block text-[#5584f1] font-semibold hover:underline">
                  Request a new reset link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6 mt-6">
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
                      {showNew ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-800 mb-2">Password must include:</p>
                    <ul className="space-y-1 text-sm">
                      <li className={hasUppercase ? 'text-emerald-700' : 'text-rose-600'}>
                        {hasUppercase ? '✓' : '•'} One uppercase letter
                      </li>
                      <li className={hasNumber ? 'text-emerald-700' : 'text-rose-600'}>
                        {hasNumber ? '✓' : '•'} One number
                      </li>
                      <li className={hasSpecial ? 'text-emerald-700' : 'text-rose-600'}>
                        {hasSpecial ? '✓' : '•'} One special character
                      </li>
                      <li className={hasMinLength ? 'text-emerald-700' : 'text-rose-600'}>
                        {hasMinLength ? '✓' : '•'} Minimum 8 chars
                      </li>
                      <li className={passwordsMatch ? 'text-emerald-700' : 'text-rose-600'}>
                        {passwordsMatch ? '✓' : '•'} Passwords match
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[15px] font-medium text-gray-700" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
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
                      {showConfirm ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || isLoading || Boolean(success)}
                  className="w-full h-12 rounded-lg bg-[#5584f1] text-white text-[16px] font-semibold transition hover:bg-[#436cd9] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
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
