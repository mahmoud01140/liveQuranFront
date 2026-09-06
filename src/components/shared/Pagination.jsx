import { useMemo } from 'react';
import { ChevronRight, ChevronLeft, MoreHorizontal } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  showRange = true,
  showPageSize = false,
  itemName = 'عنصر',
  className = '',
}) {
  // Generate page numbers with smart ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [currentPage, totalPages]);

  // If no pages at all or only 1 empty page without page-size option, don't show
  if (totalPages <= 1 && (!totalItems || totalItems === 0)) {
    return null;
  }

  // Calculate item range e.g. 1 - 10 of 45
  const startItem = totalItems ? Math.min((currentPage - 1) * (pageSize || 10) + 1, totalItems) : null;
  const endItem = totalItems ? Math.min(currentPage * (pageSize || 10), totalItems) : null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-2 text-sm text-gray-600 select-none ${className}`}
      dir="rtl"
    >
      {/* Range and count info */}
      <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 order-2 sm:order-1">
        {showRange && totalItems !== undefined && totalItems > 0 && (
          <span>
            عرض <strong className="text-gray-800 font-semibold">{startItem}</strong> -{' '}
            <strong className="text-gray-800 font-semibold">{endItem}</strong> من أصل{' '}
            <strong className="text-gray-800 font-semibold">{totalItems}</strong> {itemName}
          </span>
        )}

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-xs text-gray-400">لكل صفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange?.(1);
              }}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-primary-400 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page controls (only if totalPages > 1) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 order-1 sm:order-2">
          {/* Previous button (in RTL, Right arrow goes previous) */}
          <button
            type="button"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs sm:text-sm font-medium shadow-xs"
            aria-label="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="hidden sm:inline">السابق</span>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 mx-1">
            {pageNumbers.map((p, idx) => {
              if (p === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-gray-400"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </span>
                );
              }

              const isActive = p === currentPage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange?.(p)}
                  className={`w-7 sm:w-8 h-7 sm:h-8 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-sm scale-105'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next button (in RTL, Left arrow goes next) */}
          <button
            type="button"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs sm:text-sm font-medium shadow-xs"
            aria-label="الصفحة التالية"
          >
            <span className="hidden sm:inline">التالي</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
