import { useCallback, useRef, useState } from "react";
import { fetchReportHistory } from "../api/reports";
import { mockReportHistory } from "../mock/reportHistory";
import type { VillageHistorySearchParams, VillageReport } from "../types/report";

interface UseVillageHistoryResult {
  reports: VillageReport[];
  loading: boolean;
  error: string | null;
  usingMock: boolean;
  search: (params: VillageHistorySearchParams) => void;
}

export function useVillageHistory(): UseVillageHistoryResult {
  const [reports, setReports] = useState<VillageReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((params: VillageHistorySearchParams) => {
    abortRef.current?.abort();
    setLoading(true);
    setError(null);
    setUsingMock(false);

    const controller = new AbortController();
    abortRef.current = controller;

    fetchReportHistory(params, controller.signal)
      .then((data) => {
        setReports(data);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;

        setUsingMock(true);
        setReports(mockReportHistory.slice(0, params.limit));
      })
      .finally(() => setLoading(false));
  }, []);

  return { reports, loading, error, usingMock, search };
}
