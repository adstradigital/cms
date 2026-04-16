'use client';
import Login from '@/components/Login/Login';

export default function ParentLoginPage() {
  return (
    <Login
      role="parent"
      title="Parent Portal"
      subtitle="Stay connected with your child's education and track their academic journey."
      brandingTitle={"Parent\nConnection\nPortal"}
      brandingSubtitle="View grades, attendance, fee history, and institutional notifications in one secure place."
    />
  );
}
