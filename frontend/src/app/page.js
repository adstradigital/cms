'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Login from '@/components/Login/Login';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If already logged in, redirect to the correct dashboard
    if (user) {
      const roleName = String(user.role_name || user.role || '').toLowerCase();
      const roleRoutes = {
        'admin': '/admins',
        'super admin': '/admins',
        'super_admin': '/admins',
        'principal': '/admins',
        'staff': '/staff',
        'student': '/student',
        'parent': '/parent',
      };
      router.replace(roleRoutes[roleName] || '/');
    }
  }, [user, loading, router]);

  // Show login page (whether loading or not logged in)
  return <Login />;
}
