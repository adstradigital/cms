'use client';

import StudentSettings from '@/components/Student/StudentSettings/StudentSettings';
import DashboardLayout from '@/components/layout/DashboardLayout/DashboardLayout';

export default function SettingsPage() {
  return (
    <DashboardLayout role="student" pageTitle="System Settings">
      <StudentSettings />
    </DashboardLayout>
  );
}
