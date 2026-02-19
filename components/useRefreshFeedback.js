import { useCallback, useEffect, useRef, useState } from "react";

export default function useRefreshFeedback() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [refreshError, setRefreshError] = useState("");
  const [toast, setToast] = useState({
    message: "",
    type: "success",
    visible: false,
  });
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message, type) => {
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
    async (fn, options = {}) => {
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
        const message = error?.message || errorMessage;
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
