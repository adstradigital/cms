import CanteenModule from '@/components/Admin/Canteen/CanteenModule';

const VALID_SEGMENTS = new Set([
  'dashboard',
  'menu',
  'inventory',
  'suppliers',
  'staff',
  'reports',
]);

export default async function CanteenPage({ params }) {
  const resolvedParams = await params;
  const rawSegment = resolvedParams?.segment;
  const segment = VALID_SEGMENTS.has(rawSegment) ? rawSegment : 'dashboard';
  return <CanteenModule activeSegment={segment} />;
}
