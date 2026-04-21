'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ParentDashboard from '@/components/Parent/ParentDashboard/ParentDashboard';

/**
 * Convenience route for Payments.
 * Wraps the unified ParentDashboard with the fees tab active.
 */
export default function ParentPaymentsPage() {
  return (
    <DashboardLayout role="parent" pageTitle="Payments & Fees">
      <ParentDashboard defaultTab="fees" />
    </DashboardLayout>
  );
}
