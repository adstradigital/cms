'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import CanteenModule from '@/components/Admin/Canteen/CanteenModule';

const CanteenPage = () => {
  const params = useParams();
  const segment = params.segment;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Canteen Management</h1>
        <p className="text-gray-600">Manage daily menus, price charts, inventory, and college mess operations.</p>
      </div>
      
      <CanteenModule activeSegment={segment} />
    </div>
  );
};

export default CanteenPage;
