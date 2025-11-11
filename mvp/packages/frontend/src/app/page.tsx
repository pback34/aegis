'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    // Load user on mount
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Redirect based on user role
        if (user.role === 'CUSTOMER') {
          router.push('/customer');
        } else if (user.role === 'GUARD') {
          router.push('/guard');
        }
      } else {
        // Not authenticated, redirect to login
        router.push('/login');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Show loading state
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <svg
          className="animate-spin h-12 w-12 text-blue-600 mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
