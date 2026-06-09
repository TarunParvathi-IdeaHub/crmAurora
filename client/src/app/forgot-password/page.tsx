'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!credential.trim()) {
      setError('Email or User ID is required.');
      return;
    }

    setIsLoading(true);

    const payload = { emailOrUserId: credential.trim() };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || 'Unable to process your request. Please try again.');
        return;
      }

      setSuccess(data?.message || 'If account exists password reset link sent');
      setCredential('');
      
      // Optionally redirect to login after a delay
      setTimeout(() => {
        router.push('/login');
      }, 3000);
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
            <h2 className="text-[32px] font-bold text-gray-800 mb-2">Forgot Password</h2>
            <p className="text-gray-600 text-sm mb-8">Enter your email or user ID to receive a password reset link.</p>

            <form onSubmit={handleForgotPassword} className="space-y-6">
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
                <label className="text-[15px] font-medium text-gray-700" htmlFor="credential">
                  Email or User ID
                </label>
                <input
                  id="credential"
                  type="text"
                  placeholder="Enter your email or user ID"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:border-[#4d8df1] focus:ring-1 focus:ring-[#4d8df1]"
                  disabled={isLoading || success !== ''}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || success !== ''}
                className="w-full h-12 rounded-lg bg-[#5584f1] text-white text-[16px] font-semibold transition hover:bg-[#436cd9] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Remember your password?{' '}
                  <Link href="/login" className="text-[#5584f1] font-semibold hover:underline">
                    Back to Login
                  </Link>
                </p>
              </div>
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
