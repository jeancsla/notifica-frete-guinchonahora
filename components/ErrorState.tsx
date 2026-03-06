import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Erro ao carregar dados",
  message = "Não foi possível carregar as informações. Tente novamente.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="error-state" role="alert" aria-live="assertive">
      <div className="error-state-icon">
        <AlertCircle size={48} strokeWidth={1.5} />
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <button className="button" onClick={onRetry}>
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
