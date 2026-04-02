'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StaffDashboard from '@/modules/staff/dashboard';

export default function StaffPage() {
  return (
    <DashboardLayout role="staff" pageTitle="Staff Dashboard">
      <StaffDashboard />
    </DashboardLayout>
  );
}
