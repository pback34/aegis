'use client';

import { useEffect, useState, useRef } from 'react';
import { jobsApi } from '@/lib/jobs-api';

interface LocationTrackerProps {
  jobId: string;
  isActive: boolean; // Only track when job is active
}

export function LocationTracker({ jobId, isActive }: LocationTrackerProps) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive || !jobId) {
      setIsTracking(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendLocation = async () => {
      if (!('geolocation' in navigator)) {
        setError('Geolocation is not supported by your browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await jobsApi.updateLocation(jobId, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
            });

            setLastUpdate(new Date());
            setError(null);
            setIsTracking(true);
          } catch (err) {
            console.error('Failed to update location:', err);
            setError('Failed to send location update');
          }
        },
        (err) => {
          console.error('Geolocation error:', err);
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError('Location permission denied. Please enable location access.');
              break;
            case err.POSITION_UNAVAILABLE:
              setError('Location information unavailable');
              break;
            case err.TIMEOUT:
              setError('Location request timed out');
              break;
            default:
              setError('Unknown error getting location');
          }
          setIsTracking(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    };

    // Send location immediately
    sendLocation();

    // Then send every 10 seconds
    intervalRef.current = setInterval(sendLocation, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isTracking ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900">Location Tracking Active</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-gray-400"></div>
              <span className="text-sm font-medium text-gray-900">Location Tracking Inactive</span>
            </>
          )}
        </div>

        {lastUpdate && (
          <span className="text-xs text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-2 rounded-md bg-red-50 p-2">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        Your location is shared with the customer every 10 seconds while this job is active.
      </div>
    </div>
  );
}
