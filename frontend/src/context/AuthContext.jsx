'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import authApi from '@/api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // Check for existing session on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authApi.getProfile();
      setUser(res.data);
    } catch {
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Defines which roles are allowed per portal
  const portalRoleMap = {
    student: ['student'],
    parent:  ['parent'],
    admin:   ['admin', 'super admin', 'super_admin', 'principal'],
    staff:   ['staff'],
  };

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    const userData = res.data.user;
    const requestedPortal = String(credentials.role || '').toLowerCase();
    const userRole = String(userData?.role_name || userData?.role || '').toLowerCase();

    // Validate that the user's actual role matches the portal they are logging in from
    if (requestedPortal && portalRoleMap[requestedPortal]) {
      const allowedRoles = portalRoleMap[requestedPortal];
      if (!allowedRoles.includes(userRole)) {
        // Determine which portal they SHOULD use
        let correctPortalMsg = 'the correct portal';
        if (['admin', 'super admin', 'super_admin', 'principal'].includes(userRole)) {
          correctPortalMsg = 'Admin Console';
        } else if (userRole === 'staff') {
          correctPortalMsg = 'Staff Portal';
        } else if (userRole === 'student') {
          correctPortalMsg = 'Student Portal';
        } else if (userRole === 'parent') {
          correctPortalMsg = 'Parent Portal';
        }
        throw new Error(`Access denied. Your account is assigned to the ${correctPortalMsg}. Please select the correct tab above.`);
      }
    }

    localStorage.setItem('access_token', res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    setUser(userData);
    router.push(getDashboardRoute(userData));
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) await authApi.logout({ refresh });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
