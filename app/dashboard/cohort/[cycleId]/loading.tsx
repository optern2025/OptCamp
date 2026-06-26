export default function CohortLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <div className="border-b border-surface-800 bg-surface-900/50 pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-4 w-32 bg-surface-800 rounded animate-pulse mb-6" />
          <div className="h-8 w-64 bg-surface-800 rounded animate-pulse mb-3" />
          <div className="h-5 w-48 bg-surface-800 rounded animate-pulse mb-6" />
          <div className="flex gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-8 w-20 bg-surface-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-surface-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-surface-800 rounded-xl animate-pulse" />
          <div className="h-56 bg-surface-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </main>
  );
}
