'use client';

import StudentQuizList from '@/components/Student/StudentQuizzes/StudentQuizList';
import DashboardLayout from '@/components/layout/DashboardLayout/DashboardLayout';

export default function QuizCenterPage() {
  return (
    <DashboardLayout role="student" pageTitle="Quiz Center">
      <StudentQuizList />
    </DashboardLayout>
  );
}
