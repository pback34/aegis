'use client';

import { useState, FormEvent, useEffect } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';

interface PaymentFormProps {
  amount: number; // Amount in dollars
  bookingId: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

export function PaymentForm({ amount, bookingId, onSuccess, onError, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (stripe && elements) {
      setIsReady(true);
    }
  }, [stripe, elements]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm the payment using Stripe Elements
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed. Please try again.');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'requires_capture') {
        // Payment authorized successfully (manual capture mode)
        onSuccess(paymentIntent.id);
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded (should not happen with manual capture, but handle it)
        onSuccess(paymentIntent.id);
        setIsProcessing(false);
      } else {
        onError(`Payment authorization failed. Status: ${paymentIntent?.status || 'unknown'}`);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      onError('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-4 rounded border">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
          <p className="text-sm text-gray-600">
            Amount to authorize: <span className="font-bold">${amount.toFixed(2)}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Your card will be authorized but not charged until the job is completed.
          </p>
        </div>

        {isReady ? (
          <PaymentElement />
        ) : (
          <div className="py-4 text-center text-gray-500">
            Loading payment form...
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={!stripe || !isReady || isProcessing}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : `Authorize $${amount.toFixed(2)}`}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center">
        You will not be charged until the security guard completes your job.
      </p>

      <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded text-center">
        <strong>Test Mode:</strong> Use test card 4242 4242 4242 4242, any future expiry, any CVC
      </div>
    </form>
  );
}
