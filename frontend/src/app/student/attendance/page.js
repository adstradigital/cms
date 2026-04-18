'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentAttendance from '@/components/Student/StudentAttendance/StudentAttendance';

export default function StudentAttendancePage() {
  return (
    <DashboardLayout role="student" pageTitle="Attendance Analytics">
      <StudentAttendance />
    </DashboardLayout>
  );
}
