import type { UnitType } from "../types/report";

interface UnitInfo {
  label: string;
  assetName: string;
}

export const UNIT_INFO: Record<UnitType, UnitInfo> = {
  SPEAR: { label: "Lanceiro", assetName: "spear" },
  SWORD: { label: "Espadachim", assetName: "sword" },
  AXE: { label: "Viking", assetName: "axe" },
  SPY: { label: "Explorador", assetName: "spy" },
  LIGHT: { label: "Cav. Leve", assetName: "light" },
  HEAVY: { label: "Cav. Pesada", assetName: "heavy" },
  RAM: { label: "Ariete", assetName: "ram" },
  CATAPULT: { label: "Catapulta", assetName: "catapult" },
  SNOB: { label: "Nobre", assetName: "snob" },
  KNIGHT: { label: "Paladino", assetName: "knight" },
  MILITIA: { label: "Milicia", assetName: "militia" },
};

export const UNIT_ORDER: UnitType[] = [
  "SPEAR",
  "SWORD",
  "AXE",
  "SPY",
  "LIGHT",
  "HEAVY",
  "RAM",
  "CATAPULT",
  "SNOB",
  "KNIGHT",
  "MILITIA",
];

const UNIT_ASSET_BASE_URL =
  "https://dsbr.innogamescdn.com/asset/fc2e44c1/graphic/unit";

export function getUnitIconUrl(unit: UnitType): string {
  return `${UNIT_ASSET_BASE_URL}/unit_${UNIT_INFO[unit].assetName}.webp`;
}
