export function Spinner({ className = "" }) {
  return <span className={`spinner ${className}`.trim()} aria-hidden="true" />;
}

export function LoadingButton({
  className = "",
  loading,
  loadingLabel,
  children,
  ...props
}) {
  return (
    <button
      className={className}
      disabled={loading || props.disabled}
      aria-busy={loading ? "true" : "false"}
      {...props}
    >
      {loading ? (
        <span className="button-loading-content">
          <Spinner />
          <span>{loadingLabel}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function InlineRefreshStatus({
  isLoading,
  isValidating,
  error,
  lastUpdatedAt,
}) {
  const busy = isLoading || isValidating;

  return (
    <div
      className={`refresh-status${error ? " error" : ""}`}
      role="status"
      aria-live="polite"
    >
      {busy ? <Spinner className="refresh-status-spinner" /> : null}
      {error
        ? `Erro: ${error}`
        : isLoading
          ? "Carregando dados..."
          : isValidating
            ? "Atualizando em segundo plano..."
            : lastUpdatedAt
              ? "Atualizado agora"
              : ""}
    </div>
  );
}

export function SkeletonBlock({ height = 16, width = "100%", className = "" }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{ height: `${height}px`, width }}
      aria-hidden="true"
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card">
      <SkeletonBlock width="140px" height={16} />
      <SkeletonBlock width="90px" height={38} className="skeleton-gap" />
      <SkeletonBlock width="180px" height={14} className="skeleton-gap-sm" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 6 }) {
  return (
    <div className="table-wrap" aria-hidden="true">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, idx) => (
              <th key={`th-${idx}`}>
                <SkeletonBlock width="80px" height={10} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={`tr-${rowIdx}`}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={`td-${rowIdx}-${colIdx}`}>
                  <SkeletonBlock
                    width={`${55 + ((rowIdx + colIdx) % 30)}%`}
                    height={12}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
