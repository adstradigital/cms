'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentProfile from '@/components/Student/StudentProfile/StudentProfile';

export default function ProfilePage() {
  return (
    <DashboardLayout role="student" pageTitle="My Profile">
      <StudentProfile />
    </DashboardLayout>
  );
}
