import { useEffect, useRef, useState } from "react";

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

  const showToast = (message, type) => {
    setToast({ message, type, visible: true });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
  };

  const wrapRefresh = async (fn) => {
    setIsRefreshing(true);
    setRefreshError("");
    try {
      await fn();
      setLastUpdatedAt(new Date());
      showToast("Atualizado com sucesso", "success");
    } catch (error) {
      const message = error?.message || "Falha ao atualizar";
      setRefreshError(message);
      showToast("Falha ao atualizar", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    isRefreshing,
    lastUpdatedAt,
    refreshError,
    toast,
    wrapRefresh,
    showToast,
  };
}
