
export const INSTRUMENTS = [
  "Batería",
  "Bajo",
  "Guitarra",
  "Teclados",
  "Voz Principal",
  "Coros",
  "Percusión"
] as const;

export const INSTRUMENT_COLORS: Record<string, { bg: string; text: string }> = {
  "Batería": { bg: "#FF9B9B", text: "#7A2828" },
  "Bajo": { bg: "#9BB4FF", text: "#1A3682" },
  "Guitarra": { bg: "#FFD89B", text: "#8B5E1F" },
  "Teclados": { bg: "#B39BFF", text: "#4A1F8B" },
  "Voz Principal": { bg: "#9BFFC4", text: "#1F8B4A" },
  "Coros": { bg: "#FF9BE4", text: "#8B1F6E" },
  "Percusión": { bg: "#E4FF9B", text: "#5E8B1F" }
};
