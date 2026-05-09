export type UnitType =
  | "AXE"
  | "CATAPULT"
  | "HEAVY"
  | "KNIGHT"
  | "LIGHT"
  | "MILITIA"
  | "RAM"
  | "SNOB"
  | "SPEAR"
  | "SPY"
  | "SWORD";

export type Units = Partial<Record<UnitType, number>>;

export interface VillageReport {
  village: string;
  villageId?: number;
  player: string;
  villageUrl?: string;
  reportDate: string;
  wallLevel: number | null;
  towerLevel?: number | null;
  infantryDefenseScore: number;
  cavalryDefenseScore: number;
  archerDefenseScore: number;
  totalDefenseScore: number;
  units: Units;
}

export interface ReportSearchParams {
  playerName: string;
  limit: number;
  from: string;
}

export interface VillageCoordSearchParams {
  playerName?: string;
  from?: string;
}

export interface VillageHistorySearchParams {
  coord: string;
  limit: number;
}
