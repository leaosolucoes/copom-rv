import { lazy, Suspense } from 'react';

// Fix lazy loading for mobile compatibility  
const ComplaintsListComponent = lazy(() => 
  import('./ComplaintsList').then(module => ({ 
    default: module.ComplaintsList 
  }))
);

export const ComplaintsListLazy = () => {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Carregando denúncias...</p>
      </div>
    }>
      <ComplaintsListComponent />
    </Suspense>
  );
};