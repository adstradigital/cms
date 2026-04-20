'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ParentDashboard from '@/components/Parent/ParentDashboard/ParentDashboard';

export default function TransportPage() {
  return (
    <DashboardLayout role="parent" pageTitle="Live Transport Tracker">
      <ParentDashboard defaultTab="transport" />
    </DashboardLayout>
  );
}
