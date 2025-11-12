'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, formatCurrency } from '@/lib/jobs-api';
import { useEffect } from 'react';

export default function GuardDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Fetch guard's bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guard-bookings'],
    queryFn: jobsApi.listBookings,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Calculate statistics
  const stats = {
    available: bookings?.filter((b) => b.status === 'pending' && !b.guardId).length || 0,
    active: bookings?.filter((b) => b.guardId === user?.id && (b.status === 'accepted' || b.status === 'in_progress')).length || 0,
    completed: bookings?.filter((b) => b.guardId === user?.id && b.status === 'completed').length || 0,
    totalEarnings: bookings
      ?.filter((b) => b.guardId === user?.id && b.status === 'completed')
      .reduce((sum, b) => sum + (b.actualCostCents || b.estimatedCostCents), 0) || 0,
  };

  // Find active job ID
  const activeJob = bookings?.find(
    (b) => b.guardId === user?.id && (b.status === 'accepted' || b.status === 'in_progress')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
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
          <h2 className="text-2xl font-bold text-gray-900">Guard Dashboard</h2>
          <p className="mt-2 text-gray-600">Welcome, {user?.fullName || 'Guard'}!</p>
        </div>

        {/* Statistics Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Available Jobs</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {isLoading ? '...' : stats.available}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Active Jobs</div>
            <div className="mt-2 text-3xl font-semibold text-green-600">
              {isLoading ? '...' : stats.active}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Completed</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {isLoading ? '...' : stats.completed}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Total Earnings</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {isLoading ? '...' : formatCurrency(stats.totalEarnings)}
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Available Jobs</h3>
            <p className="mt-2 text-sm text-gray-600">
              Browse and accept available security jobs
            </p>
            <div className="mt-4">
              <button
                onClick={() => router.push('/guard/available-jobs')}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                View Jobs ({stats.available})
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Active Job</h3>
            <p className="mt-2 text-sm text-gray-600">
              {activeJob
                ? 'You have an active job'
                : 'No active job at the moment'}
            </p>
            <div className="mt-4">
              <button
                onClick={() => activeJob && router.push('/guard/active-job')}
                disabled={!activeJob}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                  activeJob
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {activeJob ? 'View Active Job' : 'No Active Job'}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">History</h3>
            <p className="mt-2 text-sm text-gray-600">
              View past jobs and earnings
            </p>
            <div className="mt-4">
              <button
                onClick={() => router.push('/guard/history')}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                View History ({stats.completed})
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
