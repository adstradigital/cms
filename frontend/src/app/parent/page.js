'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ParentDashboard from '@/components/Parent/ParentDashboard/ParentDashboard';

export default function ParentPage() {
  return (
    <DashboardLayout role="parent" pageTitle="Parent Dashboard">
      <ParentDashboard />
    </DashboardLayout>
  );
}
