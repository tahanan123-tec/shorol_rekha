export const OrderCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
);

export const MenuItemSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
    <div className="h-32 bg-gray-200 rounded mb-4"></div>
    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
    <div className="h-10 bg-gray-200 rounded"></div>
  </div>
);

export const StatusTimelineSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
);

export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);
