'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ParentDashboard from '@/modules/parent/dashboard';

export default function ParentPage() {
  return (
    <DashboardLayout role="parent" pageTitle="Parent Dashboard">
      <ParentDashboard />
    </DashboardLayout>
  );
}
