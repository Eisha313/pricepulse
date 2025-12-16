'use client';

export function ProductSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      {/* Image placeholder */}
      <div className="h-48 bg-gray-200" />

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <div className="h-6 bg-gray-200 rounded mb-2" />
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />

        {/* Link */}
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />

        {/* Price */}
        <div className="flex justify-between items-end mb-4">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        </div>

        {/* Chart toggle */}
        <div className="h-8 bg-gray-100 rounded border-t border-gray-100" />

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <div className="flex-1 h-9 bg-gray-200 rounded" />
          <div className="flex-1 h-9 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
