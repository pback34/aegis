'use client';

import { useRouter } from 'next/navigation';
import BookingsList from '@/components/customer/bookings-list';

export default function BookingsPage() {
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-2 text-gray-600">
            View and manage your security guard bookings
          </p>
        </div>
        <button
          onClick={() => router.push('/customer/create-booking')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          + Create New Booking
        </button>
      </div>

      <BookingsList />
    </div>
  );
}
