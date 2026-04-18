'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import CanteenModule from '@/components/Admin/Canteen/CanteenModule';

const CanteenPage = () => {
  const params = useParams();
  const segment = params.segment;
  return <CanteenModule activeSegment={segment} />;
};

export default CanteenPage;
