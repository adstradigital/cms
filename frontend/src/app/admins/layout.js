'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminLayout from '@/components/Admin/AdminLayout/AdminLayout';

export default function AdminsGlobalLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until auth has finished loading before making redirect decisions
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Normalize role check
    const role = String(user?.role_name || user?.role || '').toLowerCase();
    const adminRoles = ['admin', 'super admin', 'super_admin', 'principal'];
    
    if (!adminRoles.includes(role)) {
      const roleRoutes = { 
        'staff': '/staff', 
        'student': '/student', 
        'parent': '/parent' 
      };
      router.replace(roleRoutes[role] || '/login');
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

  const role = String(user?.role_name || user?.role || '').toLowerCase();
  const adminRoles = ['admin', 'super admin', 'super_admin', 'principal'];
  if (!adminRoles.includes(role)) return null;

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}
