import { useState, useMemo, useEffect } from 'react';

export default function usePagination(items = [], initialPageSize = 10, initialPage = 1) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto adjust page when items change or filter narrows list
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    if (safeItems.length === 0) return [];
    const start = (currentPage - 1) * pageSize;
    return safeItems.slice(start, start + pageSize);
  }, [safeItems, currentPage, pageSize]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  return {
    currentPage,
    setCurrentPage: goToPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedItems,
    startIndex,
    endIndex,
    nextPage: () => goToPage(currentPage + 1),
    prevPage: () => goToPage(currentPage - 1),
    canNextPage: currentPage < totalPages,
    canPrevPage: currentPage > 1,
  };
}
