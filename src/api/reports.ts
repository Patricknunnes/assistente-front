import type { ReportSearchParams, VillageReport } from "../types/report";
import { apiGet } from "./client";

export function fetchWeakestReports(
  params: ReportSearchParams,
  signal?: AbortSignal
): Promise<VillageReport[]> {
  return apiGet<VillageReport[]>("/api/reports/weakest", {
    params: {
      playerName: params.playerName,
      limit: String(params.limit),
      from: params.from,
    },
    signal,
  });
}
