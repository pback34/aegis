'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/jobs-api';
import { ActiveJobView } from '@/components/guard/active-job-view';

export default function ActiveJobPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Fetch guard's bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guard-bookings'],
    queryFn: jobsApi.listBookings,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Find the active job (accepted or in_progress)
  const activeJob = bookings?.find(
    (job) =>
      job.guardId === user?.id && (job.status === 'accepted' || job.status === 'in_progress')
  );

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
          <h2 className="text-2xl font-bold text-gray-900">Active Job</h2>
          <p className="mt-2 text-gray-600">Manage your current security job</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-gray-600">Loading active job...</p>
            </div>
          </div>
        ) : activeJob ? (
          <ActiveJobView job={activeJob} />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <div className="text-gray-400">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active job</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any active jobs at the moment.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/guard/available-jobs')}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Browse Available Jobs
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
