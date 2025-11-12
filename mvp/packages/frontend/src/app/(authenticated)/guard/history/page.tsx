'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, formatCurrency, formatStatus, getStatusColor } from '@/lib/jobs-api';

export default function JobHistoryPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Fetch guard's bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guard-bookings'],
    queryFn: jobsApi.listBookings,
    refetchInterval: 30000, // Refresh every 30 seconds (less frequent for history)
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filter completed jobs
  const completedJobs =
    bookings?.filter((job) => job.guardId === user?.id && job.status === 'completed') || [];

  // Calculate statistics
  const stats = {
    totalJobs: completedJobs.length,
    totalEarnings: completedJobs.reduce(
      (sum, job) => sum + (job.actualCostCents || job.estimatedCostCents),
      0
    ),
    totalHours: completedJobs.reduce((sum, job) => {
      if (job.actualStart && job.actualEnd) {
        const start = new Date(job.actualStart);
        const end = new Date(job.actualEnd);
        return sum + (end.getTime() - start.getTime()) / 3600000;
      }
      return sum + job.estimatedDurationMinutes / 60;
    }, 0),
    averageEarnings:
      completedJobs.length > 0
        ? completedJobs.reduce(
            (sum, job) => sum + (job.actualCostCents || job.estimatedCostCents),
            0
          ) / completedJobs.length
        : 0,
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
                {user?.name || user?.email}
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
          <h2 className="text-2xl font-bold text-gray-900">Job History</h2>
          <p className="mt-2 text-gray-600">View your completed jobs and earnings</p>
        </div>

        {/* Earnings Summary */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Total Earnings</div>
            <div className="mt-2 text-3xl font-semibold text-green-600">
              {isLoading ? '...' : formatCurrency(stats.totalEarnings)}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Completed Jobs</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {isLoading ? '...' : stats.totalJobs}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Total Hours</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {isLoading ? '...' : stats.totalHours.toFixed(1)}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Average per Job</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {isLoading ? '...' : formatCurrency(stats.averageEarnings)}
            </div>
          </div>
        </div>

        {/* Job History Table */}
        <div className="rounded-lg border border-gray-200 bg-white shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Completed Jobs</h3>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
                <p className="mt-2 text-sm text-gray-600">Loading job history...</p>
              </div>
            </div>
          ) : completedJobs.length === 0 ? (
            <div className="p-8 text-center">
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No completed jobs yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Complete your first job to see it here.
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
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {completedJobs.map((job) => {
                    const scheduledDate = new Date(job.scheduledStart);
                    const duration = job.actualStart && job.actualEnd
                      ? Math.round(
                          (new Date(job.actualEnd).getTime() -
                            new Date(job.actualStart).getTime()) /
                            60000
                        )
                      : job.estimatedDurationMinutes;

                    return (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {scheduledDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {scheduledDate.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">{job.serviceAddress}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {duration} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(job.actualCostCents || job.estimatedCostCents)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                              job.status
                            )}`}
                          >
                            {formatStatus(job.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
