'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AlumniPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admins/alumni/overview');
  }, [router]);

  return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>
      Redirecting to Alumni Dashboard...
    </div>
  );
}

