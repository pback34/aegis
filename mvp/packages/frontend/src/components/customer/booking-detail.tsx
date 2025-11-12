'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi, formatCurrency, getStatusColor, formatStatus, type BookingWithGuard } from '@/lib/jobs-api';
import { JobMap } from '@/components/map/job-map';
import { PaymentStatus } from '@/components/payment/payment-status';
import { PaymentAuthorization } from '@/components/payment/payment-authorization';

interface BookingDetailProps {
  bookingId: string;
}

export default function BookingDetail({ bookingId }: BookingDetailProps) {
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log('Payment authorized:', paymentIntentId);
    setShowPaymentForm(false);
    setPaymentError(null);
    // Refresh booking data to show updated payment status
    queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setPaymentError(error);
  };

  const handleCancelPayment = () => {
    setShowPaymentForm(false);
    setPaymentError(null);
  };

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
  const canAuthorizePayment = booking.guard && booking.paymentStatus === 'pending';

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

      {/* Real-Time Map - Show when guard is assigned */}
      {(booking.status === 'accepted' || booking.status === 'in_progress' || booking.status === 'completed') && booking.guard && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {booking.status === 'in_progress' ? 'Live Guard Location' : 'Service Location Map'}
          </h3>
          <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
            <JobMap
              jobId={booking.id}
              serviceLocation={{
                latitude: booking.serviceLatitude,
                longitude: booking.serviceLongitude,
              }}
              showGuardLocation={booking.status === 'in_progress' || booking.status === 'completed'}
              autoCenter={booking.status === 'in_progress'}
            />
          </div>
          {booking.status === 'in_progress' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                🔵 Tracking your guard in real-time. The map updates automatically every few seconds.
              </p>
            </div>
          )}
        </div>
      )}

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

      {/* Payment Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment</h3>

        <div className="space-y-4">
          {/* Cost Information */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <p className="text-sm text-gray-500">
                {isCompleted ? 'Final Cost' : 'Estimated Cost'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(booking.actualCostCents || booking.estimatedCostCents)}
              </p>
            </div>
          </div>

          {/* Show Payment Authorization Form or Payment Status */}
          {showPaymentForm && canAuthorizePayment ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Authorize Payment</h4>
              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">{paymentError}</p>
                </div>
              )}
              <PaymentAuthorization
                bookingId={booking.id}
                amount={(booking.estimatedCostCents || 0) / 100}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handleCancelPayment}
              />
            </div>
          ) : (
            <>
              {/* Payment Status Display */}
              <PaymentStatus
                status={booking.paymentStatus}
                amount={(booking.estimatedCostCents || 0) / 100}
                capturedAmount={booking.actualCostCents ? booking.actualCostCents / 100 : undefined}
              />

              {/* Authorize Payment Button */}
              {canAuthorizePayment && !showPaymentForm && (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Authorize Payment Now
                </button>
              )}
            </>
          )}

          {booking.paymentIntentId && (
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500">Payment Intent ID</p>
              <p className="text-sm text-gray-700 font-mono break-all">{booking.paymentIntentId}</p>
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
