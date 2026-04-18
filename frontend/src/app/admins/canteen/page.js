'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CanteenRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admins/canteen/dashboard');
  }, [router]);
  return null;
}
