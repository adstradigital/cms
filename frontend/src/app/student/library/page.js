'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentLibrary from '@/components/Student/StudentLibrary/StudentLibrary';

export default function StudentLibraryPage() {
  return (
    <DashboardLayout role="student" pageTitle="Digital Library">
      <StudentLibrary />
    </DashboardLayout>
  );
}
