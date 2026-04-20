'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ParentDashboard from '@/components/Parent/ParentDashboard/ParentDashboard';

export default function AttendancePage() {
  return (
    <DashboardLayout role="parent" pageTitle="Attendance Logs">
      <ParentDashboard defaultTab="attendance" />
    </DashboardLayout>
  );
}
