import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // API Routes
  app.post("/api/rooms", async (req, res, next) => {
    try {
      const [room] = await db.insert(rooms)
        .values({ name: req.body.name || 'Sala sin nombre' })
        .returning();
      res.json(room);
    } catch (error) {
      console.error("[API] Error creando sala:", error);
      next(error);
    }
  });

  app.post("/api/rooms/:roomId/requests/:requestId/complete", async (req, res, next) => {
    try {
      const { roomId, requestId } = req.params;
      const requestIdNum = parseInt(requestId, 10);

      if (isNaN(requestIdNum)) {
        res.status(400).json({ message: "ID de petición inválido" });
        return;
      }

      await db.update(requests)
        .set({ completed: true })
        .where(eq(requests.id, requestIdNum))
        .returning();
      res.json({ message: "Petición completada" });
    } catch (error) {
      console.error("[API] Error completando petición:", error);
      next(error);
    }
  });

  const server = createServer(app);

  // Manejar errores del servidor HTTP
  server.on('error', (error: Error) => {
    console.error('[Server] Error en servidor HTTP:', error);
  });

  return server;
}