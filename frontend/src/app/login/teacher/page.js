'use client'; 
import Login from '@/components/Login/Login';

export default function TeacherLoginPage() {
  return (
    <Login 
      role="staff"
      title="Faculty Portal"
      subtitle="Exclusively for educators. Manage your classes, attendance, and student performance."
      brandingTitle={"Teacher\nAcademic\nDashboard"}
      brandingSubtitle="Empowering educators with real-time class data, smart attendance tools, and digital lesson planning."
    />
  );
}
