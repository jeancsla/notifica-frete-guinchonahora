import { useEffect, useRef, useState } from "react";
import Router from "next/router";

const START_DELAY_MS = 120;
const MIN_VISIBLE_MS = 280;

export default function RouteLoadingBar() {
  const [visible, setVisible] = useState(false);
  const startRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleSinceRef = useRef(0);

  useEffect(() => {
    function handleStart() {
      if (startRef.current) {
        clearTimeout(startRef.current);
      }

      startRef.current = setTimeout(() => {
        visibleSinceRef.current = Date.now();
        setVisible(true);
      }, START_DELAY_MS);
    }

    function handleDone() {
      if (startRef.current) {
        clearTimeout(startRef.current);
        startRef.current = null;
      }

      if (!visible) {
        return;
      }

      const elapsed = Date.now() - visibleSinceRef.current;
      const remaining = Math.max(MIN_VISIBLE_MS - elapsed, 0);

      setTimeout(() => {
        setVisible(false);
      }, remaining);
    }

    Router.events.on("routeChangeStart", handleStart);
    Router.events.on("routeChangeComplete", handleDone);
    Router.events.on("routeChangeError", handleDone);

    return () => {
      if (startRef.current) {
        clearTimeout(startRef.current);
      }
      Router.events.off("routeChangeStart", handleStart);
      Router.events.off("routeChangeComplete", handleDone);
      Router.events.off("routeChangeError", handleDone);
    };
  }, [visible]);

  return (
    <div className="route-loading" aria-hidden="true">
      <div className={`route-loading-bar${visible ? " visible" : ""}`} />
    </div>
  );
}
