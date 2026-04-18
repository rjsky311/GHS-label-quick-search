import { useCallback, useEffect, useState } from "react";
import {
  loadObservabilityEvents,
  recordObservabilityEvent,
  exportObservabilityReport,
  OBSERVABILITY_UPDATE_EVENT,
} from "@/utils/observability";

export default function useObservability() {
  const [eventCount, setEventCount] = useState(() => loadObservabilityEvents().length);

  useEffect(() => {
    const sync = () => setEventCount(loadObservabilityEvents().length);

    window.addEventListener(OBSERVABILITY_UPDATE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(OBSERVABILITY_UPDATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const logEvent = useCallback((type, payload) => {
    return recordObservabilityEvent(type, payload);
  }, []);

  const exportReport = useCallback((options) => {
    return exportObservabilityReport(options);
  }, []);

  return {
    eventCount,
    logEvent,
    exportReport,
  };
}
