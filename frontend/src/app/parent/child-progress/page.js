'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ParentDashboard from '@/components/Parent/ParentDashboard/ParentDashboard';

/**
 * Convenience route for Child Progress.
 * Wraps the unified ParentDashboard with the academics tab active.
 */
export default function ChildProgressPage() {
  return (
    <DashboardLayout role="parent" pageTitle="Child Progress">
      <ParentDashboard defaultTab="academics" />
    </DashboardLayout>
  );
}
