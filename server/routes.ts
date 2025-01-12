import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";

interface RequestData {
  roomId: string;
  musician: string;
  instrument: string;
  targetInstrument: string;
  action: string;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
    }
  });

  const musicRoom = io.of("/music-room");

  musicRoom.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);
    let currentRoom: string | null = null;

    socket.on("join", async (roomId: string) => {
      if (!roomId) {
        socket.emit("error", { message: "ID de sala no válido" });
        return;
      }

      if (currentRoom) {
        socket.leave(currentRoom);
      }

      socket.join(roomId);
      currentRoom = roomId;
      console.log(`Cliente ${socket.id} se unió a la sala ${roomId}`);

      try {
        const existingRequests = await db.select()
          .from(requests)
          .where(eq(requests.roomId, parseInt(roomId)))
          .where(eq(requests.completed, false));

        socket.emit("joined", { roomId });

        if (existingRequests.length > 0) {
          socket.emit("initialRequests", existingRequests);
        }
      } catch (error) {
        console.error("Error cargando peticiones existentes:", error);
        socket.emit("error", { message: "Error cargando peticiones existentes" });
      }
    });

    socket.on("request", async (data: RequestData) => {
      try {
        const roomIdNum = parseInt(data.roomId);
        if (isNaN(roomIdNum)) {
          throw new Error("ID de sala no válido");
        }

        const request = await db.insert(requests)
          .values({
            roomId: roomIdNum,
            musician: data.musician,
            instrument: data.instrument,
            targetInstrument: data.targetInstrument,
            action: data.action,
          })
          .returning();

        console.log("Petición guardada:", request[0]);

        // Enviar confirmación al remitente
        socket.emit("requestConfirmed", request[0]);

        // Broadcast a todos en la sala
        socket.to(data.roomId).emit("newRequest", request[0]);
      } catch (error) {
        console.error("Error procesando petición:", error);
        socket.emit("error", { message: "Error procesando la petición: " + error.message });
      }
    });

    socket.on("completeRequest", async ({ roomId, requestId }: { roomId: string, requestId: number }) => {
      try {
        const [updatedRequest] = await db.update(requests)
          .set({ completed: true })
          .where(eq(requests.id, requestId))
          .returning();

        musicRoom.to(roomId).emit("requestCompleted", { requestId });
      } catch (error) {
        console.error("Error completando petición:", error);
        socket.emit("error", { message: "Error completando la petición" });
      }
    });

    socket.on("disconnecting", () => {
      if (currentRoom) {
        console.log(`Cliente ${socket.id} desconectado de sala ${currentRoom}`);
      }
    });
  });

  // API Routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const room = await db.insert(rooms).values({
        name: req.body.name || 'Default Room'
      }).returning();
      res.json(room[0]);
    } catch (error) {
      console.error("Error creando sala:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error creando la sala" 
      });
    }
  });

  return httpServer;
}