'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentAssignments from '@/components/Student/StudentAssignments/StudentAssignments';

export default function StudentAssignmentsPage() {
  return (
    <DashboardLayout role="student" pageTitle="Assignments & Homework">
      <StudentAssignments />
    </DashboardLayout>
  );
}
