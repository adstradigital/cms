import { redirect } from 'next/navigation';

export default function ClassesPage() {
  redirect('/admins/classes/management');
  return null;
}
