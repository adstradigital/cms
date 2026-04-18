'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentResults from '@/components/Student/StudentResults/StudentResults';

export default function StudentResultsPage() {
  return (
    <DashboardLayout role="student" pageTitle="My Academic Results">
      <StudentResults />
    </DashboardLayout>
  );
}
