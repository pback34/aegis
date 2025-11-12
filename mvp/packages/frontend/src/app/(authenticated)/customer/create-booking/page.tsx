import CreateBookingForm from '@/components/customer/create-booking-form';

export default function CreateBookingPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Booking</h1>
        <p className="mt-2 text-gray-600">
          Request a security guard for your location. Fill in the details below and we'll match you with an available guard.
        </p>
      </div>

      <CreateBookingForm />
    </div>
  );
}
