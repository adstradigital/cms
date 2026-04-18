'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentFees from '@/components/Student/StudentFees/StudentFees';

export default function StudentFeesPage() {
  return (
    <DashboardLayout role="student" pageTitle="Fees & Payments">
      <StudentFees />
    </DashboardLayout>
  );
}
