import { lazy, Suspense } from 'react';

const ComplaintsListComponent = lazy(() => 
  import('./ComplaintsList').then(module => ({ default: module.ComplaintsList }))
);

export const ComplaintsListLazy = () => {
  return (
    <Suspense fallback={
      <div className="flex flex-col space-y-4 p-4">
        <div className="h-4 bg-muted rounded animate-pulse"></div>
        <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
        <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
      </div>
    }>
      <ComplaintsListComponent />
    </Suspense>
  );
};