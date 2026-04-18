import Login from '@/components/Login/Login';

export default function EntryHubPage() {
  return (
    <Login 
      role="student"
      title="Student Portal"
      subtitle="Welcome back! Sign in to view your dashboard, attendance, and grades."
      brandingTitle={"Campus\nLearning\nHub"}
      brandingSubtitle="Access your academic progress, join online sessions, and manage your campus life."
    />
  );
}
