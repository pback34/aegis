'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/jobs-api';
import { AvailableJobsList } from '@/components/guard/available-jobs-list';
import { useState, useEffect } from 'react';

export default function AvailableJobsPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [guardLocation, setGuardLocation] = useState<{ lat: number; lng: number } | undefined>();

  // Fetch guard's bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guard-bookings'],
    queryFn: jobsApi.listBookings,
    refetchInterval: 5000, // Refresh every 5 seconds for available jobs
  });

  // Get guard's current location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGuardLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Failed to get location:', error);
          // Continue without location - jobs will still be shown but not sorted by distance
        }
      );
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/guard')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">Aegis</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.fullName || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Available Jobs</h2>
          <p className="mt-2 text-gray-600">
            Browse and accept security jobs in your area
          </p>
          {guardLocation && (
            <p className="mt-1 text-sm text-gray-500">
              Jobs sorted by distance from your current location
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-gray-600">Loading available jobs...</p>
            </div>
          </div>
        ) : (
          <AvailableJobsList jobs={bookings || []} guardLocation={guardLocation} />
        )}
      </main>
    </div>
  );
}
