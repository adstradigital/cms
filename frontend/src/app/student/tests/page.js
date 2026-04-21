'use client';

import StudentTestList from '@/components/Student/StudentTests/StudentTestList';
import DashboardLayout from '@/components/layout/DashboardLayout/DashboardLayout';

export default function TestCenterPage() {
  return (
    <DashboardLayout role="student" pageTitle="Online Test">
      <StudentTestList />
    </DashboardLayout>
  );
}
