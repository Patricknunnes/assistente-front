import type {
  ReportSearchParams,
  VillageCoordSearchParams,
  VillageHistorySearchParams,
  VillageReport,
} from "../types/report";
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

export function fetchOffensiveVillages(
  params: VillageCoordSearchParams,
  signal?: AbortSignal
): Promise<string[]> {
  return apiGet<string[]>("/api/reports/offensive-villages", {
    params: {
      playerName: params.playerName ?? "",
      from: params.from ?? "",
    },
    signal,
  });
}

export function fetchReportHistory(
  params: VillageHistorySearchParams,
  signal?: AbortSignal
): Promise<VillageReport[]> {
  return apiGet<VillageReport[]>("/api/reports/report-history", {
    params: {
      coord: params.coord,
      limit: String(params.limit),
    },
    signal,
  });
}
