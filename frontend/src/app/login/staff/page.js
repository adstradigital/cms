'use client';
import Login from '@/components/Login/Login';

export default function StaffLoginPage() {
  return (
    <Login 
      role="staff"
      title="Staff Portal"
      subtitle="Authorized personnel only. Manage school operations and staff resources."
      brandingTitle={"Staff\nManagement\nHub"}
      brandingSubtitle="Streamlining administrative tasks and operational efficiency for the school staff."
    />
  );
}
