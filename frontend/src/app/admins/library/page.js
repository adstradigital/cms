'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LibraryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admins/library/overview');
  }, [router]);

  return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--theme-text-muted)' }}>
      Redirecting to Library Dashboard...
    </div>
  );
}
