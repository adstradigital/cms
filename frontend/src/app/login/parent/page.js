'use client';
import Login from '@/components/Login/Login';

export default function ParentLoginPage() {
  return (
    <Login 
      role="parent"
      title="Parent Portal"
      subtitle="Welcome back! Sign in to view your child's progress, attendance, and fee details."
      brandingTitle={"Campus\nManagement\nSystem"}
      brandingSubtitle="Welcome to the parent portal. Connect with your child's academic journey."
    />
  );
}
