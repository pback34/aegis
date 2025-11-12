'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { jobsApi, calculateEstimatedCost, formatCurrency } from '@/lib/jobs-api';

interface CreateBookingFormProps {
  onSuccess?: (bookingId: string) => void;
}

export default function CreateBookingForm({ onSuccess }: CreateBookingFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    serviceAddress: '',
    serviceLatitude: '',
    serviceLongitude: '',
    scheduledStart: '',
    estimatedDurationMinutes: 60,
  });

  const [useManualCoordinates, setUseManualCoordinates] = useState(false);

  const createBookingMutation = useMutation({
    mutationFn: jobsApi.createBooking,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        router.push(`/customer/bookings/${data.id}`);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const lat = parseFloat(formData.serviceLatitude);
    const lng = parseFloat(formData.serviceLongitude);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates or use geocoding');
      return;
    }

    if (!formData.scheduledStart) {
      alert('Please select a date and time');
      return;
    }

    await createBookingMutation.mutateAsync({
      serviceAddress: formData.serviceAddress,
      serviceLatitude: lat,
      serviceLongitude: lng,
      scheduledStart: new Date(formData.scheduledStart).toISOString(),
      estimatedDurationMinutes: formData.estimatedDurationMinutes,
    });
  };

  const estimatedCostCents = calculateEstimatedCost(formData.estimatedDurationMinutes);

  // Simple geocoding function (for MVP - in production, use Google Maps/Mapbox Geocoding API)
  const handleGeocode = async () => {
    if (!formData.serviceAddress) {
      alert('Please enter an address first');
      return;
    }

    try {
      // For MVP, we'll use a simple geocoding service
      // In production, integrate with Mapbox or Google Maps Geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          formData.serviceAddress
        )}&format=json&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        setFormData({
          ...formData,
          serviceLatitude: data[0].lat,
          serviceLongitude: data[0].lon,
        });
        setUseManualCoordinates(true);
      } else {
        alert('Address not found. Please try a different address or enter coordinates manually.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to geocode address. Please enter coordinates manually.');
    }
  };

  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
    { value: 240, label: '4 hours' },
    { value: 360, label: '6 hours' },
    { value: 480, label: '8 hours' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Address Input */}
      <div>
        <label htmlFor="serviceAddress" className="block text-sm font-medium text-gray-700 mb-2">
          Service Address *
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="serviceAddress"
            value={formData.serviceAddress}
            onChange={(e) => setFormData({ ...formData, serviceAddress: e.target.value })}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="123 Main St, City, State 12345"
            required
          />
          <button
            type="button"
            onClick={handleGeocode}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Geocode
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Enter the address where you need security services
        </p>
      </div>

      {/* Coordinates (Manual Entry or Auto-filled) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="serviceLatitude" className="block text-sm font-medium text-gray-700 mb-2">
            Latitude *
          </label>
          <input
            type="number"
            id="serviceLatitude"
            step="any"
            value={formData.serviceLatitude}
            onChange={(e) => setFormData({ ...formData, serviceLatitude: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="37.7749"
            required
          />
        </div>
        <div>
          <label htmlFor="serviceLongitude" className="block text-sm font-medium text-gray-700 mb-2">
            Longitude *
          </label>
          <input
            type="number"
            id="serviceLongitude"
            step="any"
            value={formData.serviceLongitude}
            onChange={(e) => setFormData({ ...formData, serviceLongitude: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="-122.4194"
            required
          />
        </div>
      </div>

      {/* Date & Time Picker */}
      <div>
        <label htmlFor="scheduledStart" className="block text-sm font-medium text-gray-700 mb-2">
          Scheduled Start Time *
        </label>
        <input
          type="datetime-local"
          id="scheduledStart"
          value={formData.scheduledStart}
          onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          min={new Date().toISOString().slice(0, 16)}
          required
        />
        <p className="mt-1 text-sm text-gray-500">
          When do you need the security guard to arrive?
        </p>
      </div>

      {/* Duration Selector */}
      <div>
        <label htmlFor="estimatedDurationMinutes" className="block text-sm font-medium text-gray-700 mb-2">
          Estimated Duration *
        </label>
        <select
          id="estimatedDurationMinutes"
          value={formData.estimatedDurationMinutes}
          onChange={(e) => setFormData({ ...formData, estimatedDurationMinutes: parseInt(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          {durationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          How long do you need security services?
        </p>
      </div>

      {/* Cost Estimate */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Estimated Cost</p>
            <p className="text-xs text-blue-700 mt-1">Based on $30/hour rate</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(estimatedCostCents)}</p>
        </div>
      </div>

      {/* Error Message */}
      {createBookingMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Failed to create booking. Please try again.
          </p>
          <p className="text-xs text-red-600 mt-1">
            {createBookingMutation.error instanceof Error
              ? createBookingMutation.error.message
              : 'Unknown error'}
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={createBookingMutation.isPending}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {createBookingMutation.isPending ? 'Creating Booking...' : 'Create Booking'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
