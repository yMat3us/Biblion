export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="route-loading page-container max-w-7xl"
    >
      <span className="sr-only">Carregando seu espaço no Biblion…</span>

      <header className="loading-folio" aria-hidden="true">
        <div className="loading-folio__index">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="skeleton h-px flex-1 rounded" />
        </div>
        <div className="skeleton h-11 w-[34rem] max-w-full rounded-md sm:h-14" />
        <div className="mt-5 max-w-2xl space-y-2.5">
          <div className="skeleton h-3.5 w-full rounded" />
          <div className="skeleton h-3.5 w-4/5 rounded" />
        </div>
      </header>

      <section className="loading-ledger" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="loading-ledger__entry">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-3.5 w-2/5 rounded" />
              <div className="skeleton h-3 w-3/5 rounded" />
            </div>
          </div>
        ))}
      </section>

      <section className="loading-records" aria-hidden="true">
        <div className="loading-records__heading">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-6 w-48 rounded" />
        </div>
        <div className="loading-records__list">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="loading-record">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div className="skeleton h-9 w-9 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="skeleton h-4 w-3/5 rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
              </div>
              <div className="skeleton hidden h-7 w-20 rounded-full sm:block" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
