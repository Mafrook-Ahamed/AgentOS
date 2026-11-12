export default function PageLoading() {
  return <main className="page-loading" aria-label="Loading page">
    <div className="loading-heading"><div className="skeleton skeleton-kicker"/><div className="skeleton skeleton-title"/><div className="skeleton skeleton-subtitle"/></div>
    <div className="loading-metrics"><div className="skeleton skeleton-card"/><div className="skeleton skeleton-card"/><div className="skeleton skeleton-card"/></div>
    <div className="skeleton skeleton-panel"/>
  </main>;
}
