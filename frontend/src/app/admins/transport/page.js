'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TransportRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admins/transport/overview');
  }, [router]);

  return null;
}
