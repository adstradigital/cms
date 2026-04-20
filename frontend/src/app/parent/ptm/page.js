'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ParentDashboard from '@/components/Parent/ParentDashboard/ParentDashboard';

export default function PTMPage() {
  return (
    <DashboardLayout role="parent" pageTitle="PTM Scheduler">
      <ParentDashboard defaultTab="ptm" />
    </DashboardLayout>
  );
}
