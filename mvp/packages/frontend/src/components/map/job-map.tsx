'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import type { ViewStateChangeEvent } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { subscribeToJobLocation, LocationUpdateEvent } from '@/lib/ably-client';
import { getMapConfig } from '@/lib/map-config';

interface JobMapProps {
  jobId: string;
  serviceLocation: {
    latitude: number;
    longitude: number;
  };
  initialGuardLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  showGuardLocation?: boolean;
  autoCenter?: boolean;
}

export function JobMap({
  jobId,
  serviceLocation,
  initialGuardLocation,
  showGuardLocation = true,
  autoCenter = true,
}: JobMapProps) {
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [ablyKey, setAblyKey] = useState<string>('');
  const [guardLocation, setGuardLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialGuardLocation || null);
  const [viewState, setViewState] = useState({
    longitude: serviceLocation.longitude,
    latitude: serviceLocation.latitude,
    zoom: 14,
  });
  const [configError, setConfigError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Load map configuration
  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      try {
        const config = await getMapConfig();
        if (mounted) {
          setMapboxToken(config.mapboxToken);
          setAblyKey(config.ablyKey);
          setConnectionStatus('connected');
        }
      } catch (error) {
        console.error('Failed to load map config:', error);
        if (mounted) {
          setConfigError('Failed to load map configuration');
          setConnectionStatus('error');
        }
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to real-time location updates
  useEffect(() => {
    if (!ablyKey || !showGuardLocation) {
      return;
    }

    const handleLocationUpdate = (data: LocationUpdateEvent) => {
      setGuardLocation({
        latitude: data.latitude,
        longitude: data.longitude,
      });

      // Auto-center on guard location
      if (autoCenter) {
        setViewState((prev) => ({
          ...prev,
          longitude: data.longitude,
          latitude: data.latitude,
        }));
      }
    };

    const handleError = (error: any) => {
      console.error('Ably connection error:', error);
      setConnectionStatus('error');
    };

    const unsubscribe = subscribeToJobLocation(
      ablyKey,
      jobId,
      handleLocationUpdate,
      handleError
    );

    return () => {
      unsubscribe();
    };
  }, [ablyKey, jobId, showGuardLocation, autoCenter]);

  const handleRecenterOnGuard = useCallback(() => {
    if (guardLocation) {
      setViewState((prev) => ({
        ...prev,
        longitude: guardLocation.longitude,
        latitude: guardLocation.latitude,
        zoom: 15,
      }));
    }
  }, [guardLocation]);

  const handleRecenterOnService = useCallback(() => {
    setViewState((prev) => ({
      ...prev,
      longitude: serviceLocation.longitude,
      latitude: serviceLocation.latitude,
      zoom: 15,
    }));
  }, [serviceLocation]);

  if (configError) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">{configError}</p>
          <p className="text-sm text-gray-600 mt-2">Please refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        mapboxAccessToken={mapboxToken}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <NavigationControl />

        {/* Service Location Marker (Blue - Customer's location) */}
        <Marker
          longitude={serviceLocation.longitude}
          latitude={serviceLocation.latitude}
        >
          <div className="relative">
            <div className="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded shadow">
                Service Location
              </span>
            </div>
          </div>
        </Marker>

        {/* Guard Location Marker (Green - Guard's real-time location) */}
        {showGuardLocation && guardLocation && (
          <Marker
            longitude={guardLocation.longitude}
            latitude={guardLocation.latitude}
          >
            <div className="relative">
              <div className="w-8 h-8 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs font-medium text-gray-700 bg-white px-2 py-1 rounded shadow">
                  Guard Location
                </span>
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* Control Buttons */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <button
          onClick={handleRecenterOnService}
          className="bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-2 rounded shadow-lg border border-gray-200"
          title="Center on service location"
        >
          📍 Service
        </button>
        {showGuardLocation && guardLocation && (
          <button
            onClick={handleRecenterOnGuard}
            className="bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-2 rounded shadow-lg border border-gray-200"
            title="Center on guard location"
          >
            🛡️ Guard
          </button>
        )}
      </div>

      {/* Connection Status Indicator */}
      {showGuardLocation && (
        <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-xs font-medium text-gray-700">
              {connectionStatus === 'connected'
                ? 'Live Tracking'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Connection Error'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
