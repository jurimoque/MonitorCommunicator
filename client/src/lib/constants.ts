
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

// Color palette for custom instruments
const CUSTOM_COLOR_PALETTE = [
  { bg: "#FFB3BA", text: "#7A1F2F" }, // Light red
  { bg: "#BAFFC9", text: "#1F7A3A" }, // Light green
  { bg: "#BAE1FF", text: "#1F4A7A" }, // Light blue
  { bg: "#FFFFBA", text: "#7A7A1F" }, // Light yellow
  { bg: "#FFDFBA", text: "#7A4F1F" }, // Light orange
  { bg: "#E0BAFF", text: "#4A1F7A" }, // Light purple
  { bg: "#FFB3E6", text: "#7A1F5A" }, // Light pink
  { bg: "#C7FFBA", text: "#2F7A1F" }, // Light lime
  { bg: "#BAD7FF", text: "#1F3A7A" }, // Light sky
  { bg: "#FFCABA", text: "#7A2F1F" }  // Light coral
];

// Function to get color for any instrument (predefined or custom)
export function getInstrumentColor(instrument: string): { bg: string; text: string } {
  // Check if it's a predefined instrument
  if (INSTRUMENT_COLORS[instrument]) {
    return INSTRUMENT_COLORS[instrument];
  }
  
  // Generate a consistent color for custom instruments based on name hash
  let hash = 0;
  for (let i = 0; i < instrument.length; i++) {
    const char = instrument.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const colorIndex = Math.abs(hash) % CUSTOM_COLOR_PALETTE.length;
  return CUSTOM_COLOR_PALETTE[colorIndex];
}
