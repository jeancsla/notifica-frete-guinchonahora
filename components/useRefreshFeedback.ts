import { useCallback, useEffect, useRef, useState } from "react";

type ToastType = "success" | "error";

type ToastState = {
  message: string;
  type: ToastType;
  visible: boolean;
};

type WrapRefreshOptions = {
  successMessage?: string;
  errorMessage?: string;
  silentSuccess?: boolean;
};

export type RefreshFeedback = {
  isRefreshing: boolean;
  lastUpdatedAt: Date | null;
  refreshError: string;
  toast: ToastState;
  wrapRefresh: (
    fn: () => Promise<unknown>,
    options?: WrapRefreshOptions,
  ) => Promise<void>;
  showToast: (message: string, type: ToastType) => void;
  markUpdated: () => void;
};

export default function useRefreshFeedback(): RefreshFeedback {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState("");
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type, visible: true });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
  }, []);

  const markUpdated = useCallback(() => {
    setLastUpdatedAt(new Date());
    setRefreshError("");
  }, []);

  const wrapRefresh = useCallback(
    async (fn: () => Promise<unknown>, options: WrapRefreshOptions = {}) => {
      const {
        successMessage = "Atualizado com sucesso",
        errorMessage = "Falha ao atualizar",
        silentSuccess = false,
      } = options;

      setIsRefreshing(true);
      setRefreshError("");
      try {
        await fn();
        setLastUpdatedAt(new Date());
        if (!silentSuccess) {
          showToast(successMessage, "success");
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : errorMessage;
        setRefreshError(message);
        showToast(errorMessage, "error");
      } finally {
        setIsRefreshing(false);
      }
    },
    [showToast],
  );

  return {
    isRefreshing,
    lastUpdatedAt,
    refreshError,
    toast,
    wrapRefresh,
    showToast,
    markUpdated,
  };
}
