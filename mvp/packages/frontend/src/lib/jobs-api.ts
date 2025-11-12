import { apiClient } from './api-client';

// Types based on backend API
export interface CreateBookingRequest {
  serviceLatitude: number;
  serviceLongitude: number;
  serviceAddress: string;
  scheduledStart: string; // ISO 8601 date-time
  estimatedDurationMinutes: number;
}

export interface BookingResponse {
  id: string;
  customerId: string;
  guardId?: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  serviceLatitude: number;
  serviceLongitude: number;
  serviceAddress: string;
  scheduledStart: string;
  actualStart?: string;
  actualEnd?: string;
  estimatedDurationMinutes: number;
  estimatedCostCents: number;
  actualCostCents?: number;
  paymentIntentId?: string;
  paymentStatus: 'pending' | 'authorized' | 'captured' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface BookingWithGuard extends BookingResponse {
  guard?: {
    id: string;
    name: string;
    phone?: string;
  };
}

export interface LocationResponse {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracyMeters: number;
}

// API Functions
export const jobsApi = {
  /**
   * Create a new booking (Customer only)
   */
  createBooking: async (data: CreateBookingRequest): Promise<BookingResponse> => {
    const response = await apiClient.post('/jobs', data);
    return response.data;
  },

  /**
   * Get a specific booking by ID
   */
  getBooking: async (jobId: string): Promise<BookingWithGuard> => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  /**
   * List all bookings for the current user (filtered by role)
   * - Customer: sees their created bookings
   * - Guard: sees bookings they can accept or have accepted
   */
  listBookings: async (): Promise<BookingResponse[]> => {
    const response = await apiClient.get('/jobs');
    return response.data;
  },

  /**
   * Accept a booking (Guard only)
   */
  acceptBooking: async (jobId: string): Promise<BookingResponse> => {
    const response = await apiClient.post(`/jobs/${jobId}/accept`);
    return response.data;
  },

  /**
   * Complete a booking (Guard only)
   */
  completeBooking: async (jobId: string): Promise<BookingResponse> => {
    const response = await apiClient.post(`/jobs/${jobId}/complete`);
    return response.data;
  },

  /**
   * Get current location for an active booking
   */
  getCurrentLocation: async (jobId: string): Promise<LocationResponse> => {
    const response = await apiClient.get(`/jobs/${jobId}/location`);
    return response.data;
  },

  /**
   * Update guard location (Guard only)
   */
  updateLocation: async (
    jobId: string,
    data: { latitude: number; longitude: number; accuracyMeters: number }
  ): Promise<LocationResponse> => {
    const response = await apiClient.post(`/jobs/${jobId}/location`, data);
    return response.data;
  },
};

// Helper functions
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

export const getStatusColor = (status: BookingResponse['status']): string => {
  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    case 'accepted':
      return 'text-blue-600 bg-blue-50';
    case 'in_progress':
      return 'text-green-600 bg-green-50';
    case 'completed':
      return 'text-gray-600 bg-gray-50';
    case 'cancelled':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export const formatStatus = (status: BookingResponse['status']): string => {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatPaymentStatus = (status: BookingResponse['paymentStatus']): string => {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const calculateEstimatedCost = (durationMinutes: number): number => {
  // Pricing: $30/hour = $0.50/minute = 50 cents/minute
  const ratePerMinute = 50;
  return durationMinutes * ratePerMinute;
};
