'use client';

import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentForm } from './payment-form';
import { paymentsApi, AuthorizePaymentResponse } from '@/lib/payments-api';

// Load Stripe (singleton)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface PaymentAuthorizationProps {
  bookingId: string;
  amount: number; // Amount in dollars
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

export function PaymentAuthorization({
  bookingId,
  amount,
  onSuccess,
  onError,
  onCancel,
}: PaymentAuthorizationProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Call backend to authorize payment and get clientSecret
    const authorizePayment = async () => {
      try {
        setIsLoading(true);
        const response = await paymentsApi.authorizePayment({
          bookingId,
          amount,
          currency: 'USD',
        });

        if (response.clientSecret) {
          setClientSecret(response.clientSecret);
        } else {
          setError('Failed to initialize payment. No client secret returned.');
          onError('Failed to initialize payment.');
        }
      } catch (err) {
        console.error('Failed to authorize payment:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        onError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    authorizePayment();
  }, [bookingId, amount, onError]);

  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded border text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Initializing payment...</p>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Payment Initialization Failed</h3>
        <p className="text-sm text-red-600 mb-4">{error || 'Unknown error occurred'}</p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        amount={amount}
        bookingId={bookingId}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
      />
    </Elements>
  );
}
