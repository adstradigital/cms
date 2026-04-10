'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Login from '@/components/Login/Login';

// A premium, modern loading component for the root entry
const SplashLoader = () => (
  <div style={{
    position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', 
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--theme-bg, #f8fafc)', zIndex: 9999
  }}>
    <div style={{
      width: '40px', height: '40px', border: '3px solid var(--theme-border, #e2e8f0)', 
      borderTopColor: 'var(--color-primary, #3b82f6)', borderRadius: '50%',
      animation: 'spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite'
    }} />
    <style>{`
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

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
    // If not loading and user exists, lock the UI and redirect
    if (!loading && user) {
      setIsRedirecting(true);
      router.replace(getDashboardRoute(user));
    }
  }, [user, loading, router]);

  // Lock the UI rendering while Auth resolves or Router navigates
  if (loading || isRedirecting) {
    return <SplashLoader />;
  }

  // Only show the payload (Login) when we know 100% they are unauthenticated
  return <Login />;
}
