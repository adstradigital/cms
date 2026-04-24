import DashboardLayout from '@/components/layout/DashboardLayout';
import StudentMaterial from '@/components/Student/StudentMaterial/StudentMaterial';

export const metadata = {
  title: 'My Study Materials | CMS',
  description: 'View and download course resources from your teachers',
};

export default function StudentMaterialPage() {
  return (
    <DashboardLayout role="student" pageTitle="Study Material">
      <StudentMaterial />
    </DashboardLayout>
  );
}
