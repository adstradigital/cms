'use client';

import StudentSupport from '@/components/Student/StudentSupport/StudentSupport';
import DashboardLayout from '@/components/layout/DashboardLayout/DashboardLayout';

export default function SupportPage() {
  return (
    <DashboardLayout role="student" pageTitle="Help & Support">
      <StudentSupport />
    </DashboardLayout>
  );
}
