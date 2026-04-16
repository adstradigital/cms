'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Library, 
  Book, 
  RefreshCcw, 
  LayoutDashboard, 
  Settings as SettingsIcon,
  Plus
} from 'lucide-react';

const LibraryLayout = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/admins/library/overview' },
    { id: 'management', label: 'Book Management', icon: <Book size={18} />, path: '/admins/library/management' },
    { id: 'shelves', label: 'Shelf Management', icon: <Library size={18} />, path: '/admins/library/shelves' },
    { id: 'issue', label: 'Issue System', icon: <RefreshCcw size={18} />, path: '/admins/library/issue' },
    { id: 'fines', label: 'Fine Management', icon: <SettingsIcon size={18} />, path: '/admins/library/fines' },
    { id: 'reports', label: 'Reports', icon: <LayoutDashboard size={18} />, path: '/admins/library/reports' },
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100%', backgroundColor: 'var(--theme-bg-subtle)' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: 'var(--theme-text)',
            marginBottom: '4px'
          }}>Library Management</h1>
          <p style={{ color: 'var(--theme-text-muted)' }}>Manage books, track circulation, and monitor bookshelf capacity.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--theme-primary)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '500',
            cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <Plus size={18} />
            Quick Issue
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        backgroundColor: 'var(--theme-bg-white)', 
        padding: '6px', 
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: 'var(--theme-shadow-sm)',
        width: 'fit-content'
      }}>
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
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'var(--theme-primary-light)' : 'transparent',
                color: isActive ? 'var(--theme-primary)' : 'var(--theme-text-muted)',
                fontWeight: isActive ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{
        backgroundColor: 'var(--theme-bg-white)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: 'var(--theme-shadow-md)',
        minHeight: '600px',
        border: '1px solid var(--theme-border-subtle)'
      }}>
        {children}
      </div>
    </div>
  );
};

export default LibraryLayout;
