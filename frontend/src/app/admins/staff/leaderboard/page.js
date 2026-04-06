import StaffShell from '@/components/Admin/StaffManagement/StaffShell';
import TeacherLeaderboard from '@/components/Admin/StaffManagement/TeacherLeaderboard';

export default function LeaderboardPage() {
  return (
    <StaffShell 
      title="Teacher Leaderboard" 
      subtitle="Performance rankings based on exam pass rates, parent marks, and assignment completion."
    >
      <TeacherLeaderboard />
    </StaffShell>
  );
}
