import Login from '@/components/Login/Login';

export default function ParentLoginPage() {
  return (
    <Login 
      role="parent"
      title="Parent Portal"
      subtitle="Welcome! Sign in to monitor your ward's academic journey."
      brandingTitle={"Nurturing\nFutures\nTogether"}
      brandingSubtitle="Access attendance records, grades, and fee details for your children in one secure place."
    />
  );
}
