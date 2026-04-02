'use client';
import Login from '@/components/Login/Login';

export default function StudentLoginPage() {
  return (
    <Login 
      role="student"
      title="Student Portal"
      subtitle="Welcome back! Sign in to view your dashboard, attendance, and grades."
      brandingTitle={"Campus\nManagement\nSystem"}
      brandingSubtitle="Welcome to the single-tenant portal. Access your academic dashboard, attendance, and campus operations."
    />
  );
}
