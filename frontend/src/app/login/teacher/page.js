'use client';
import Login from '@/components/Login/Login';

export default function TeacherLoginPage() {
  return (
    <Login 
      role="staff"
      title="Staff Sign In"
      subtitle="Admin & Staff access only. This URL is confidential."
      brandingTitle={"CMS\nStaff & Admin\nPortal"}
      brandingSubtitle="Restricted access. Authorized personnel only. Do not share this link."
    />
  );
}
