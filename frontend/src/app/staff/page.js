'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';

export default function StaffPage() {
  return (
    <DashboardLayout role="staff" pageTitle="Staff Dashboard">
      <div style={{ padding: '20px', color: '#fff' }}>
        <h2>Welcome to the Staff Portal</h2>
        <p>Your dashboard is being set up.</p>
      </div>
    </DashboardLayout>
  );
}
