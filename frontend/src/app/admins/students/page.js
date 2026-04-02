'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentList from '@/modules/admin/students/StudentList';

export default function AdminStudentsPage() {
  return (
    <DashboardLayout role="admin" pageTitle="Students">
      <StudentList />
    </DashboardLayout>
  );
}
