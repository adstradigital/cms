import HostelModule from '@/components/Admin/Hostel/HostelModule';

const VALID_SEGMENTS = new Set([
  'overview',
  'rooms',
  'allocations',
  'attendance',
  'visitors',
  'mess',
  'fees',
  'directory',
  'analytics',
]);

export default async function HostelPage({ params }) {
  const resolvedParams = await params;
  const rawSegment = resolvedParams?.segment;
  const segment = VALID_SEGMENTS.has(rawSegment) ? rawSegment : 'overview';
  return <HostelModule segment={segment} />;
}
