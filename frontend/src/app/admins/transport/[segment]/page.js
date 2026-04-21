import TransportModule from '@/components/Admin/Transport/TransportModule';

const VALID_SEGMENTS = new Set([
  'overview',
  'buses',
  'routes',
  'tracking',
  'students',
  'fees',
  'complaints',
  'analytics',
]);

export default async function TransportPage({ params }) {
  const resolved = await params;
  const raw = resolved?.segment;
  const segment = VALID_SEGMENTS.has(raw) ? raw : 'overview';
  return <TransportModule segment={segment} />;
}
