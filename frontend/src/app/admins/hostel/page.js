'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HostelRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admins/hostel/overview');
  }, [router]);

  return null;
}
