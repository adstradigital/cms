'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ParentDashboard from '@/components/Parent/ParentDashboard/ParentDashboard';

export default function HomeworkPage() {
  return (
    <DashboardLayout role="parent" pageTitle="Homework & Assignments">
      <ParentDashboard defaultTab="homework" />
    </DashboardLayout>
  );
}
