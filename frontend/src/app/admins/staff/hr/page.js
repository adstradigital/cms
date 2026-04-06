import StaffShell from '@/components/Admin/StaffManagement/StaffShell';
import StaffHR from '@/components/Admin/StaffManagement/StaffHR';

export default function StaffHrPage() {
  return (
    <StaffShell 
      title="Attendance & HR" 
      subtitle="Manage staff attendance, leaves, and monthly work reports."
    >
      <StaffHR />
    </StaffShell>
  );
}
