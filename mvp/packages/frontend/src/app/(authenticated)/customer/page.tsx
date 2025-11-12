'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '@/lib/jobs-api';

export default function CustomerDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Fetch bookings to show stats
  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: jobsApi.listBookings,
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const stats = {
    total: bookings?.length || 0,
    pending: bookings?.filter((b) => b.status === 'pending').length || 0,
    active: bookings?.filter((b) => b.status === 'in_progress').length || 0,
    completed: bookings?.filter((b) => b.status === 'completed').length || 0,
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Customer Dashboard</h2>
          <p className="mt-2 text-gray-600">Welcome, {user?.fullName || 'Customer'}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="rounded-full bg-yellow-100 p-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="mt-2 text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.completed}</p>
              </div>
              <div className="rounded-full bg-gray-100 p-3">
                <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Create Booking</h3>
            <p className="mt-2 text-sm text-gray-600">
              Book a security guard for your location
            </p>
            <button
              onClick={() => router.push('/customer/create-booking')}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              New Booking
            </button>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">My Bookings</h3>
            <p className="mt-2 text-sm text-gray-600">
              View and manage your bookings
            </p>
            <button
              onClick={() => router.push('/customer/bookings')}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View All
            </button>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Profile</h3>
            <p className="mt-2 text-sm text-gray-600">
              Update your account information
            </p>
            <button className="mt-4 rounded-md bg-gray-400 px-4 py-2 text-sm font-medium text-white cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-green-50 border border-green-200 p-6">
          <h3 className="text-lg font-semibold text-green-900">
            Phase 5 Task 2 Complete!
          </h3>
          <p className="mt-2 text-sm text-green-700">
            Customer dashboard with booking creation and management features is now ready. You can create bookings, view your booking list with filters, and see detailed booking information.
          </p>
        </div>
      </main>
    </div>
  );
}
