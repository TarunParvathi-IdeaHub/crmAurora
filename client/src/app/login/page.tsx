'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000';

export default function LoginPage() {
  const router = useRouter();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!credential.trim() || !password.trim()) {
      setError('Email/User ID and password are required.');
      return;
    }

    setIsLoading(true);

    const payload = credential.includes('@')
      ? { email: credential.trim(), password: password.trim() }
      : { userId: credential.trim(), password: password.trim() };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || 'Login failed. Please check your credentials.');
        return;
      }

      // Guard: only navigate when the auth state has actually been persisted.
      // If data is null (e.g. malformed JSON on a slow connection), navigating
      // to /dashboard would immediately redirect back to /login because
      // useAuth reads localStorage and finds nothing.
      if (!data?.userId && !data?.email) {
        setError('Login failed: unexpected response from server.');
        return;
      }

      localStorage.setItem('erpUser', JSON.stringify(data));
      router.push('/dashboard');
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
            <h2 className="text-[32px] font-bold text-gray-800 mb-8">Login</h2>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                  <p className="text-sm">{error}</p>
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
                />
              </div>

              <div className="space-y-2">
                <label className="text-[15px] font-medium text-gray-700" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 pr-12 text-gray-800 placeholder:text-gray-400 focus:border-[#4d8df1] focus:ring-1 focus:ring-[#4d8df1]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
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
                <div className="flex justify-end pt-1">
                  <a href="#" className="text-[13px] text-[#5584f1] font-medium hover:underline">
                    Forgot password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-lg bg-[#5584f1] text-white text-[16px] font-semibold transition hover:bg-[#436cd9] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>

              <div className="flex justify-center items-center pt-6 mt-6 border-t border-gray-100">
                <span className="text-[14px] text-gray-600">
                  Don't have an account? Contact college administrator to get access.
                </span>
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
