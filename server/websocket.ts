import { z } from "zod";

// Validación de datos de petición
export const requestSchema = z.object({
  roomId: z.string(),
  musician: z.string().min(1, "Músico es requerido"),
  instrument: z.string().min(1, "Instrumento es requerido"),
  targetInstrument: z.string().min(1, "Instrumento objetivo es requerido"),
  action: z.enum(["volume_up", "volume_down", "reverb_up", "reverb_down", "thanks", "assistance"]),
});

export type RequestData = z.infer<typeof requestSchema>;