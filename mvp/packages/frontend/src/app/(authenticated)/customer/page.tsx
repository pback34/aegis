'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';

export default function CustomerDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
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
          <h2 className="text-2xl font-bold text-gray-900">Customer Dashboard</h2>
          <p className="mt-2 text-gray-600">Welcome, {user?.name || 'Customer'}!</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Create Booking</h3>
            <p className="mt-2 text-sm text-gray-600">
              Book a security guard for your location
            </p>
            <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              New Booking
            </button>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">My Bookings</h3>
            <p className="mt-2 text-sm text-gray-600">
              View and manage your bookings
            </p>
            <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              View All
            </button>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium text-gray-900">Profile</h3>
            <p className="mt-2 text-sm text-gray-600">
              Update your account information
            </p>
            <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Edit Profile
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="text-lg font-semibold text-blue-900">
            Phase 5 Task 1 Complete!
          </h3>
          <p className="mt-2 text-sm text-blue-700">
            Authentication UI is ready. Customer dashboard features will be implemented in Task 2.
          </p>
        </div>
      </main>
    </div>
  );
}
