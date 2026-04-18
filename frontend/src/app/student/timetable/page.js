'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentTimetable from '@/components/Student/StudentTimetable/StudentTimetable';

export default function StudentTimetablePage() {
  return (
    <DashboardLayout role="student" pageTitle="My Timetable">
      <StudentTimetable />
    </DashboardLayout>
  );
}
