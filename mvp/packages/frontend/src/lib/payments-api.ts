import { apiClient } from './api-client';

// Types based on backend API
export interface AuthorizePaymentRequest {
  bookingId: string;
  amount: number; // Amount in dollars
  currency?: string; // Optional, defaults to 'USD'
}

export interface AuthorizePaymentResponse {
  paymentId: string;
  bookingId: string;
  stripePaymentIntentId: string;
  clientSecret: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface CapturePaymentRequest {
  paymentId: string;
  amount?: number; // Optional, defaults to full authorized amount
}

export interface CapturePaymentResponse {
  paymentId: string;
  bookingId: string;
  stripePaymentIntentId: string;
  amount: number;
  platformFee: number;
  guardPayout: number;
  status: string;
  capturedAt: string;
}

// API Functions
export const paymentsApi = {
  /**
   * Authorize a payment (Customer only)
   * This creates a Stripe payment intent and holds the funds but doesn't charge the customer yet
   */
  authorizePayment: async (data: AuthorizePaymentRequest): Promise<AuthorizePaymentResponse> => {
    const response = await apiClient.post('/payments/authorize', data);
    return response.data;
  },

  /**
   * Capture an authorized payment (Guard completes job)
   * This actually charges the customer
   */
  capturePayment: async (data: CapturePaymentRequest): Promise<CapturePaymentResponse> => {
    const response = await apiClient.post('/payments/capture', data);
    return response.data;
  },
};
