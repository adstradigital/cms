import StaffShell from '@/components/Admin/StaffManagement/StaffShell';
import TasksEvents from '@/components/Admin/StaffManagement/TasksEvents';

export default function TasksPage() {
  return (
    <StaffShell 
      title="Tasks, Events & Clubs" 
      subtitle="Manage school-wide events, clubs, and tracking of specific staff delegations."
    >
      <TasksEvents />
    </StaffShell>
  );
}
