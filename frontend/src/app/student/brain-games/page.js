'use client';

import BrainGamesHub from '@/components/Student/BrainGames/BrainGamesHub';
import DashboardLayout from '@/components/layout/DashboardLayout/DashboardLayout';

export default function BrainGamesPage() {
  return (
    <DashboardLayout role="student" pageTitle="Brain Hub">
      <BrainGamesHub />
    </DashboardLayout>
  );
}
