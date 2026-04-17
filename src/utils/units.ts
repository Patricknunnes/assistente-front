import type { UnitType } from "../types/report";

interface UnitInfo {
  label: string;
  emoji: string;
}

export const UNIT_INFO: Record<UnitType, UnitInfo> = {
  SPEAR: { label: "Lanceiro", emoji: "🔱" },
  SWORD: { label: "Espadachim", emoji: "⚔️" },
  AXE: { label: "Viking", emoji: "🪓" },
  SPY: { label: "Explorador", emoji: "👁️" },
  LIGHT: { label: "Cav. Leve", emoji: "🐴" },
  HEAVY: { label: "Cav. Pesada", emoji: "🛡️" },
  RAM: { label: "Aríete", emoji: "🏗️" },
  CATAPULT: { label: "Catapulta", emoji: "💥" },
  SNOB: { label: "Nobre", emoji: "👑" },
  KNIGHT: { label: "Paladino", emoji: "🗡️" },
  MILITIA: { label: "Milícia", emoji: "🏘️" },
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
