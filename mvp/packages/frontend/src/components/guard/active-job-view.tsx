'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookingWithGuard,
  jobsApi,
  formatCurrency,
  formatStatus,
  getStatusColor,
  formatPaymentStatus,
} from '@/lib/jobs-api';
import { useRouter } from 'next/navigation';
import { LocationTracker } from './location-tracker';
import { JobMap } from '@/components/map/job-map';
import { PaymentStatus } from '@/components/payment/payment-status';

interface ActiveJobViewProps {
  job: BookingWithGuard;
}

export function ActiveJobView({ job }: ActiveJobViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const completeJobMutation = useMutation({
    mutationFn: () => jobsApi.completeBooking(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-bookings'] });
      alert('Job completed successfully!');
      router.push('/guard');
    },
    onError: (error) => {
      console.error('Failed to complete job:', error);
      alert('Failed to complete job. Please try again.');
    },
  });

  const handleCompleteJob = () => {
    if (confirm('Mark this job as completed?')) {
      completeJobMutation.mutate();
    }
  };

  // Calculate elapsed time if job is in progress
  useEffect(() => {
    if (job.status === 'in_progress' && job.actualStart) {
      const updateElapsed = () => {
        const start = new Date(job.actualStart!);
        const now = new Date();
        const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);
        setElapsedMinutes(minutes);
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [job.status, job.actualStart]);

  const scheduledDate = new Date(job.scheduledStart);
  const isJobActive = job.status === 'accepted' || job.status === 'in_progress';

  return (
    <div className="space-y-6">
      {/* Job Status Banner */}
      <div
        className={`rounded-lg p-4 ${
          job.status === 'in_progress'
            ? 'bg-green-50 border border-green-200'
            : 'bg-blue-50 border border-blue-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {job.status === 'in_progress' ? 'Job In Progress' : 'Job Accepted'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {job.status === 'in_progress'
                ? 'Keep tracking your location until the job is completed'
                : 'Start the job when you arrive at the location'}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(
              job.status
            )}`}
          >
            {formatStatus(job.status)}
          </span>
        </div>
      </div>

      {/* Location Tracker */}
      <LocationTracker jobId={job.id} isActive={isJobActive} />

      {/* Job Details */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-gray-500">Service Location</div>
            <div className="mt-1 text-sm text-gray-900">{job.serviceAddress}</div>
            <div className="mt-1 text-xs text-gray-500">
              {job.serviceLatitude.toFixed(6)}, {job.serviceLongitude.toFixed(6)}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500">Scheduled Start</div>
            <div className="mt-1 text-sm text-gray-900">
              {scheduledDate.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className="mt-1 text-sm text-gray-900">
              {scheduledDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500">Estimated Duration</div>
            <div className="mt-1 text-sm text-gray-900">
              {job.estimatedDurationMinutes} minutes
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500">Estimated Pay</div>
            <div className="mt-1 text-lg font-semibold text-green-600">
              {formatCurrency(job.estimatedCostCents)}
            </div>
          </div>

          {job.status === 'in_progress' && (
            <>
              <div>
                <div className="text-sm font-medium text-gray-500">Time Elapsed</div>
                <div className="mt-1 text-sm text-gray-900">{elapsedMinutes} minutes</div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">Current Earnings</div>
                <div className="mt-1 text-lg font-semibold text-green-600">
                  {formatCurrency(elapsedMinutes * 50)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>

        <PaymentStatus
          status={job.paymentStatus}
          amount={(job.estimatedCostCents || 0) / 100}
          capturedAmount={job.actualCostCents ? job.actualCostCents / 100 : undefined}
        />

        {job.paymentStatus === 'authorized' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💳 Payment is authorized and will be automatically captured when you complete this job.
            </p>
          </div>
        )}

        {job.paymentStatus === 'pending' && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Payment has not been authorized yet. Customer needs to authorize payment before you can complete the job.
            </p>
          </div>
        )}
      </div>

      {/* Real-Time Location Map */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Service Location & Your Position
        </h3>
        <div className="h-[500px] rounded-lg overflow-hidden border border-gray-200">
          <JobMap
            jobId={job.id}
            serviceLocation={{
              latitude: job.serviceLatitude,
              longitude: job.serviceLongitude,
            }}
            showGuardLocation={true}
            autoCenter={false}
          />
        </div>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            📍 The blue marker shows the service location where you need to be.
            The green marker shows your current position (updated automatically).
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCompleteJob}
          disabled={completeJobMutation.isPending}
          className={`rounded-md px-6 py-3 text-sm font-medium text-white ${
            completeJobMutation.isPending
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {completeJobMutation.isPending ? 'Completing...' : 'Complete Job'}
        </button>
      </div>

      {/* Job Metadata */}
      <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">Job ID:</span> {job.id}
          </div>
          <div>
            <span className="font-medium">Customer ID:</span> {job.customerId}
          </div>
          <div>
            <span className="font-medium">Created:</span>{' '}
            {new Date(job.createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Updated:</span>{' '}
            {new Date(job.updatedAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
