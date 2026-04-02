'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentDashboard from '@/components/Student/StudentDashboard/StudentDashboard';

export default function StudentPage() {
  return (
    <DashboardLayout role="student" pageTitle="Student Dashboard">
      <StudentDashboard />
    </DashboardLayout>
  );
}
