import { useCallback, useRef, useState } from "react";
import { fetchWeakestReports } from "../api/reports";
import { mockReports } from "../mock/reports";
import type { ReportSearchParams, VillageReport } from "../types/report";

interface UseReportsResult {
  reports: VillageReport[];
  loading: boolean;
  error: string | null;
  usingMock: boolean;
  search: (params: ReportSearchParams) => void;
}

export function useReports(): UseReportsResult {
  const [reports, setReports] = useState<VillageReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((params: ReportSearchParams) => {
    abortRef.current?.abort();
    setLoading(true);
    setError(null);
    setUsingMock(false);

    const controller = new AbortController();
    abortRef.current = controller;

    fetchWeakestReports(params, controller.signal)
      .then((data) => {
        setReports(data);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;

        // API indisponivel - fallback para mock
        setUsingMock(true);
        setReports(mockReports.slice(0, params.limit));
      })
      .finally(() => setLoading(false));
  }, []);

  return { reports, loading, error, usingMock, search };
}
