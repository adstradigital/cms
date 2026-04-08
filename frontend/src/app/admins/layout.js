'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout/AdminLayout';

export default function AdminsGlobalLayout({ children }) {
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

    return roleRoutes[roleName] || portalRoutes[portal] || '/login';
  };

  const hasAdminAccess = (userData) => {
    const role = String(userData?.role_name || userData?.role || '').toLowerCase();
    const portal = String(userData?.portal || '').toLowerCase();
    const adminRoles = ['admin', 'super admin', 'super_admin', 'principal'];
    return portal === 'admin' || adminRoles.includes(role);
  };

  useEffect(() => {
    // Wait until auth has finished loading before making redirect decisions
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!hasAdminAccess(user)) {
      router.replace(getDashboardRoute(user));
    }
  }, [user, loading, router]);

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--theme-bg)' }}>
        <p style={{ color: 'var(--theme-text-muted)' }}>Loading...</p>
      </div>
    );
  }

  // Not authenticated or wrong role — redirect is in progress
  if (!user) return null;

  if (!hasAdminAccess(user)) return null;

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
