import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Examinations | CMS Admin',
  description: 'Manage school examinations, grading, and report cards',
};

export default function ExaminationsPage() {
  redirect('/admins/examinations/types');
}
