import Login from '@/components/Login/Login';

export default function StaffLoginPage() {
  return (
    <Login 
      role="staff"
      title="Staff Portal"
      subtitle="Authorized access for teachers and campus personnel."
      brandingTitle={"Empowering\nEducators"}
      brandingSubtitle="Manage your classes, attendance, and academic records with ease."
    />
  );
}
