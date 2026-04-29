'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Megaphone,
  Calendar,
  HandCoins,
  Star,
  BarChart3,
  Plus,
} from 'lucide-react';

const AlumniLayout = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/admins/alumni/overview' },
    { id: 'management', label: 'Alumni', icon: <Users size={18} />, path: '/admins/alumni/management' },
    { id: 'approvals', label: 'Approvals', icon: <UserCheck size={18} />, path: '/admins/alumni/approvals' },
    { id: 'communication', label: 'Communication', icon: <Megaphone size={18} />, path: '/admins/alumni/communication' },
    { id: 'events', label: 'Events', icon: <Calendar size={18} />, path: '/admins/alumni/events' },
    { id: 'contributions', label: 'Contributions', icon: <HandCoins size={18} />, path: '/admins/alumni/contributions' },
    { id: 'highlights', label: 'Highlights', icon: <Star size={18} />, path: '/admins/alumni/highlights' },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} />, path: '/admins/alumni/reports' },
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100%', backgroundColor: 'var(--theme-bg-subtle)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'var(--theme-text)', marginBottom: '4px' }}>
            Alumni Management
          </h1>
          <p style={{ color: 'var(--theme-text-muted)' }}>
            Manage alumni directory, approvals, events, announcements, and engagement reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => router.push('/admins/alumni/management')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--theme-primary)',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: 'var(--theme-shadow-sm)',
            }}
          >
            <Plus size={18} />
            Add Alumni
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: 'var(--theme-bg-white)',
          padding: '6px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: 'var(--theme-shadow-sm)',
          width: 'fit-content',
          overflowX: 'auto',
          maxWidth: '100%',
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'var(--theme-primary-light)' : 'transparent',
                color: isActive ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
                fontWeight: isActive ? '700' : '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        style={{
          backgroundColor: 'var(--theme-bg-white)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--theme-shadow-md)',
          minHeight: '600px',
          border: '1px solid var(--theme-border-subtle)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AlumniLayout;

