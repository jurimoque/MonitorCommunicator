import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // API Routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const [room] = await db.insert(rooms)
        .values({ name: req.body.name || 'Sala sin nombre' })
        .returning();
      res.json(room);
    } catch (error) {
      console.error("[API] Error creando sala:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/rooms/:roomId/requests/:requestId/complete", async (req, res) => {
    try {
      const { roomId, requestId } = req.params;
      await db.update(requests)
        .set({ completed: true })
        .where(eq(requests.id, parseInt(requestId, 10)))
        .returning();
      res.json({ message: "Petición completada" });
    } catch (error) {
      console.error("[API] Error completando petición:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  return createServer(app);
}