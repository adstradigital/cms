'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Login from '@/components/Login/Login';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const getDashboardRoute = (userData) => {
    const roleName = String(userData?.role_name || userData?.role || '').toLowerCase();
    const portal = String(userData?.portal || '').toLowerCase();

    const roleRoutes = {
      'admin': '/admins',
      'super admin': '/admins',
      'super_admin': '/admins',
      'principal': '/admins',
      'staff': '/staff',
      'student': '/student',
      'parent': '/parent',
    };

    const portalRoutes = {
      admin: '/admins',
      student: '/student',
      parent: '/parent',
    };

    return roleRoutes[roleName] || portalRoutes[portal] || '/';
  };

  useEffect(() => {
    if (loading) return;

    // If already logged in, redirect to the correct dashboard
    if (user) {
      router.replace(getDashboardRoute(user));
    }
  }, [user, loading, router]);

  // Show login page (whether loading or not logged in)
  return <Login />;
}
