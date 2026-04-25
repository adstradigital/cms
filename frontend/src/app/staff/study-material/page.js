import DashboardLayout from '@/components/layout/DashboardLayout';
import MaterialUpload from '@/components/Teacher/StudyMaterial/MaterialUpload';

export const metadata = {
  title: 'Study Material Management | CMS',
  description: 'Manage and upload academic resources for students',
};

export default function StudyMaterialPage() {
  return (
    <DashboardLayout role="staff" pageTitle="Study Material">
      <MaterialUpload />
    </DashboardLayout>
  );
}
