import ExpensesPage from '@/components/Admin/Finance/Expenses/ExpensesPage';

export const metadata = { title: 'Expenses | Finance', description: 'Manage expense categories, entries and approvals' };

export default function ExpensesRoute() {
  return <ExpensesPage />;
}
