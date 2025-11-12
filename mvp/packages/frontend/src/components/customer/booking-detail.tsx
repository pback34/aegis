'use client';

import { useQuery } from '@tanstack/react-query';
import { jobsApi, formatCurrency, getStatusColor, formatStatus, formatPaymentStatus, type BookingWithGuard } from '@/lib/jobs-api';

interface BookingDetailProps {
  bookingId: string;
}

export default function BookingDetail({ bookingId }: BookingDetailProps) {
  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => jobsApi.getBooking(bookingId),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Booking</h3>
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : 'Booking not found'}
        </p>
      </div>
    );
  }

  const isActive = booking.status === 'in_progress';
  const isCompleted = booking.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
            <p className="mt-1 text-sm text-gray-500">ID: {booking.id}</p>
          </div>
          <span
            className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(
              booking.status
            )}`}
          >
            {formatStatus(booking.status)}
          </span>
        </div>
      </div>

      {/* Service Location */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Location</h3>
        <div className="space-y-2">
          <p className="text-gray-700">{booking.serviceAddress}</p>
          <p className="text-sm text-gray-500">
            Coordinates: {booking.serviceLatitude.toFixed(6)}, {booking.serviceLongitude.toFixed(6)}
          </p>
        </div>
      </div>

      {/* Schedule Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Scheduled Start</p>
            <p className="text-gray-900 font-medium">
              {new Date(booking.scheduledStart).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="text-gray-900 font-medium">{booking.estimatedDurationMinutes} minutes</p>
          </div>
          {booking.actualStart && (
            <div>
              <p className="text-sm text-gray-500">Actual Start</p>
              <p className="text-gray-900 font-medium">
                {new Date(booking.actualStart).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
          {booking.actualEnd && (
            <div>
              <p className="text-sm text-gray-500">Actual End</p>
              <p className="text-gray-900 font-medium">
                {new Date(booking.actualEnd).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guard Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Guard</h3>
        {booking.guard ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white rounded-full h-12 w-12 flex items-center justify-center font-bold">
                {booking.guard.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-gray-900 font-medium">{booking.guard.fullName}</p>
                {booking.guard.phone && (
                  <p className="text-sm text-gray-500">{booking.guard.phone}</p>
                )}
              </div>
            </div>
            {isActive && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium">
                  🟢 Guard is currently on duty
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              {booking.status === 'pending'
                ? 'Waiting for a guard to accept this booking...'
                : 'No guard assigned'}
            </p>
          </div>
        )}
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {isCompleted ? 'Final Cost' : 'Estimated Cost'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(booking.actualCostCents || booking.estimatedCostCents)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 text-right">Payment Status</p>
              <p className="text-right">
                <span
                  className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    booking.paymentStatus === 'captured'
                      ? 'bg-green-100 text-green-800'
                      : booking.paymentStatus === 'authorized'
                      ? 'bg-blue-100 text-blue-800'
                      : booking.paymentStatus === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {formatPaymentStatus(booking.paymentStatus)}
                </span>
              </p>
            </div>
          </div>

          {booking.paymentIntentId && (
            <div>
              <p className="text-xs text-gray-500">Payment Intent ID</p>
              <p className="text-sm text-gray-700 font-mono">{booking.paymentIntentId}</p>
            </div>
          )}

          {booking.paymentStatus === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Payment will be authorized when a guard accepts your booking.
              </p>
            </div>
          )}

          {booking.paymentStatus === 'authorized' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Payment has been authorized. It will be captured when the service is completed.
              </p>
            </div>
          )}

          {booking.paymentStatus === 'captured' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Payment has been successfully processed. Thank you!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timestamps */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p>Created: {new Date(booking.createdAt).toLocaleString()}</p>
        <p>Last Updated: {new Date(booking.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
