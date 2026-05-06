import { useCallback, useRef, useState } from "react";
import { fetchOffensiveVillages } from "../api/reports";
import { mockOffensiveVillages } from "../mock/offensiveVillages";
import type { VillageCoordSearchParams } from "../types/report";

interface UseVillageCoordsResult {
  villages: string[];
  loading: boolean;
  error: string | null;
  usingMock: boolean;
  search: (params: VillageCoordSearchParams) => void;
}

export function useVillageCoords(): UseVillageCoordsResult {
  const [villages, setVillages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((params: VillageCoordSearchParams) => {
    abortRef.current?.abort();
    setLoading(true);
    setError(null);
    setUsingMock(false);

    const controller = new AbortController();
    abortRef.current = controller;

    fetchOffensiveVillages(params, controller.signal)
      .then((data) => {
        setVillages(data);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;

        setUsingMock(true);
        setVillages(mockOffensiveVillages);
      })
      .finally(() => setLoading(false));
  }, []);

  return { villages, loading, error, usingMock, search };
}
