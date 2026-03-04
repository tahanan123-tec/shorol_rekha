import React from 'react';
import { Navigation } from '../components/Navigation';
import InventoryOverview from '../components/InventoryOverview';

const InventoryPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <InventoryOverview />
      </div>
    </div>
  );
};

export default InventoryPage;
