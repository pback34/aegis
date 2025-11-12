'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import BookingDetail from '@/components/customer/booking-detail';
import { jobsApi } from '@/lib/jobs-api';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  // Fetch booking to check if we should show the map
  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => jobsApi.getBooking(bookingId),
    refetchInterval: 5000,
  });

  const showMap = booking?.status === 'in_progress' && booking?.guard;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
        >
          ← Back to Bookings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Details - Left Side */}
        <div className="lg:col-span-2">
          <BookingDetail bookingId={bookingId} />
        </div>

        {/* Map - Right Side (only shown when booking is active) */}
        <div className="lg:col-span-1">
          {showMap ? (
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Location</h3>
              <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p className="text-sm">Real-time Map</p>
                  <p className="text-xs mt-1">
                    Map integration will be added in Phase 5 Task 4
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Service Location</span>
                  <span className="text-gray-900 font-medium">📍 Customer</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Guard Location</span>
                  <span className="text-green-600 font-medium">🟢 Live Tracking</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <p className="text-sm text-gray-600">
                {booking?.status === 'pending'
                  ? 'Map will be available once a guard accepts the booking'
                  : booking?.status === 'completed'
                  ? 'Service completed'
                  : 'Map not available for this booking'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
