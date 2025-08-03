import { useState, useEffect, useMemo } from 'react';

interface UseLazyRenderOptions {
  items: any[];
  itemsPerPage: number;
  initialLoad: number;
}

export const useLazyRender = <T>({ items, itemsPerPage = 50, initialLoad = 20 }: UseLazyRenderOptions) => {
  const [visibleCount, setVisibleCount] = useState(initialLoad);

  // Reset visible count when items change
  useEffect(() => {
    setVisibleCount(initialLoad);
  }, [items.length, initialLoad]);

  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  const hasMore = visibleCount < items.length;

  const loadMore = () => {
    setVisibleCount(prev => Math.min(prev + itemsPerPage, items.length));
  };

  return {
    visibleItems,
    hasMore,
    loadMore,
    totalCount: items.length,
    visibleCount
  };
};