'use client';

interface PaymentStatusProps {
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'cancelled';
  amount?: number; // Amount in dollars
  capturedAmount?: number; // Amount actually captured in dollars
  failureReason?: string;
}

export function PaymentStatus({
  status,
  amount,
  capturedAmount,
  failureReason,
}: PaymentStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'authorized':
        return 'bg-yellow-100 text-yellow-800';
      case 'captured':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Payment Pending';
      case 'authorized':
        return 'Payment Authorized';
      case 'captured':
        return 'Payment Complete';
      case 'failed':
        return 'Payment Failed';
      case 'cancelled':
        return 'Payment Cancelled';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'pending':
        return 'Awaiting payment authorization';
      case 'authorized':
        return 'Payment authorized but not yet captured. You will be charged when the job is completed.';
      case 'captured':
        return 'Payment has been processed successfully.';
      case 'failed':
        return failureReason || 'Payment processing failed. Please contact support.';
      case 'cancelled':
        return 'Payment was cancelled.';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'authorized':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'captured':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-4 rounded border">
      <h3 className="text-lg font-semibold mb-3">Payment Status</h3>

      <div className="space-y-3">
        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </span>
        </div>

        {/* Status Description */}
        <p className="text-sm text-gray-600">{getStatusDescription()}</p>

        {/* Amount Information */}
        {amount !== undefined && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {status === 'authorized' ? 'Authorized Amount:' : 'Total Amount:'}
              </span>
              <span className="font-semibold">${amount.toFixed(2)}</span>
            </div>

            {status === 'captured' && capturedAmount !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Charged Amount:</span>
                <span className="font-semibold text-green-600">${capturedAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Test Mode Warning */}
        {(status === 'authorized' || status === 'captured') && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <strong>Test Mode:</strong> This is a test payment. No real money will be charged.
          </div>
        )}
      </div>
    </div>
  );
}
