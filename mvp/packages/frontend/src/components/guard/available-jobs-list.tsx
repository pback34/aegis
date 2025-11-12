'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookingResponse, jobsApi, formatCurrency, formatStatus, getStatusColor } from '@/lib/jobs-api';
import { useRouter } from 'next/navigation';

interface AvailableJobsListProps {
  jobs: BookingResponse[];
  guardLocation?: { lat: number; lng: number };
}

export function AvailableJobsList({ jobs, guardLocation }: AvailableJobsListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);

  const acceptJobMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.acceptBooking(jobId),
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['guard-bookings'] });
      // Navigate to active job page
      router.push('/guard/active-job');
    },
    onError: (error) => {
      console.error('Failed to accept job:', error);
      alert('Failed to accept job. Please try again.');
    },
    onSettled: () => {
      setAcceptingJobId(null);
    },
  });

  const handleAcceptJob = (jobId: string) => {
    if (confirm('Accept this job?')) {
      setAcceptingJobId(jobId);
      acceptJobMutation.mutate(jobId);
    }
  };

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter only pending jobs without a guard
  const availableJobs = jobs.filter((job) => job.status === 'pending' && !job.guardId);

  // Sort jobs by distance (if guard location is available) or scheduled start time
  const sortedJobs = [...availableJobs].sort((a, b) => {
    if (guardLocation) {
      const distA = calculateDistance(
        guardLocation.lat,
        guardLocation.lng,
        a.serviceLatitude,
        a.serviceLongitude
      );
      const distB = calculateDistance(
        guardLocation.lat,
        guardLocation.lng,
        b.serviceLatitude,
        b.serviceLongitude
      );
      return distA - distB;
    }
    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
  });

  if (sortedJobs.length === 0) {
    return (
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">No available jobs</h3>
        <p className="mt-1 text-sm text-gray-500">
          Check back later for new job opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedJobs.map((job) => {
        const scheduledDate = new Date(job.scheduledStart);
        const distance = guardLocation
          ? calculateDistance(
              guardLocation.lat,
              guardLocation.lng,
              job.serviceLatitude,
              job.serviceLongitude
            )
          : null;

        const isAccepting = acceptingJobId === job.id;

        return (
          <div key={job.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-medium text-gray-900">Security Job</h3>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                      job.status
                    )}`}
                  >
                    {formatStatus(job.status)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Location</div>
                    <div className="mt-1 text-sm text-gray-900">{job.serviceAddress}</div>
                    {distance !== null && (
                      <div className="mt-1 text-xs text-gray-500">
                        {distance.toFixed(1)} km away
                      </div>
                    )}
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
                    <div className="text-sm font-medium text-gray-500">Duration</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {job.estimatedDurationMinutes} minutes
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-500">Pay</div>
                    <div className="mt-1 text-lg font-semibold text-green-600">
                      {formatCurrency(job.estimatedCostCents)}
                    </div>
                    <div className="text-xs text-gray-500">
                      (${(job.estimatedCostCents / 100 / job.estimatedDurationMinutes * 60).toFixed(2)}/hour)
                    </div>
                  </div>
                </div>
              </div>

              <div className="ml-6">
                <button
                  onClick={() => handleAcceptJob(job.id)}
                  disabled={isAccepting}
                  className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                    isAccepting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isAccepting ? 'Accepting...' : 'Accept Job'}
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-4 text-xs text-gray-500">
              <div>
                <span className="font-medium">Job ID:</span> {job.id.slice(0, 8)}...
              </div>
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(job.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
