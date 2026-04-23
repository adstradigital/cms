import Login from '@/components/Login/Login';

export default function AdminLoginPage() {
  return (
    <Login 
      role="admin"
      title="Admin Console"
      subtitle="Secure gateway for system administrators and management."
      brandingTitle={"System\nArchitecture\nControl"}
      brandingSubtitle="Oversee campus operations, manage users, and configure institution-wide settings."
    />
  );
}
