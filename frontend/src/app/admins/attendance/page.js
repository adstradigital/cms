'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import MarkAttendance from '@/modules/admin/attendance/MarkAttendance';

export default function AdminAttendancePage() {
  return (
    <DashboardLayout role="admin" pageTitle="Attendance">
      <MarkAttendance />
    </DashboardLayout>
  );
}
