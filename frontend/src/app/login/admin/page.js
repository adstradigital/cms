'use client';
import Login from '@/components/Login/Login';

export default function AdminLoginPage() {
  return (
    <Login
      role="admin"
      title="Admin Portal"
      subtitle="Welcome back! Sign in to access the admin dashboard and management tools."
      brandingTitle={"Campus\nManagement\nSystem"}
      brandingSubtitle="Welcome to the Admin Console. Manage students, staff, canteen, hostel, and campus operations."
    />
  );
}
