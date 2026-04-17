export interface Units {
  AXE: number;
  CATAPULT: number;
  HEAVY: number;
  KNIGHT: number;
  LIGHT: number;
  MILITIA: number;
  RAM: number;
  SNOB: number;
  SPEAR: number;
  SPY: number;
  SWORD: number;
}

export type UnitType = keyof Units;

export interface VillageReport {
  village: string;
  player: string;
  reportDate: string;
  wallLevel: number | null;
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
