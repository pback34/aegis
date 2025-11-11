'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RegisterForm } from '@/components/auth/register-form';
import { useAuthStore } from '@/lib/auth-store';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render the form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <RegisterForm />
    </div>
  );
}
