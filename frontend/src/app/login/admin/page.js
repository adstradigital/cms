'use client';
import Login from '@/components/Login/Login';

export default function AdminLoginPage() {
  return (
    <Login
      role="admin"
      title="Admin Console"
      subtitle="Secure access for system administrators and institutional management."
      brandingTitle={"Central\nManagement\nConsole"}
      brandingSubtitle="Full control over campus operations, staff payroll, fee structures, and system security."
    />
  );
}
