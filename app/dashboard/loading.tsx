export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      {/* Hero skeleton */}
      <div className="border-b border-surface-800 bg-surface-900/50 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-4 w-24 bg-surface-800 rounded animate-pulse mb-3" />
          <div className="h-9 w-72 bg-surface-800 rounded animate-pulse mb-4" />
          <div className="h-5 w-96 bg-surface-800 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-48 bg-surface-800 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-64 bg-surface-800 rounded-xl animate-pulse" />
            <div className="h-48 bg-surface-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
