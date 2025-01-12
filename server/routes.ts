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

  // Mapa para mantener registro de usuarios por sala
  const roomUsers = new Map<string, Set<string>>();

  // Namespace para las salas de música
  const musicRoom = io.of("/music-room");

  musicRoom.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);
    let currentRoom: string | null = null;

    socket.on("join", (roomId: string) => {
      if (currentRoom) {
        socket.leave(currentRoom);
        const users = roomUsers.get(currentRoom);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) {
            roomUsers.delete(currentRoom);
          }
        }
      }

      socket.join(roomId);
      currentRoom = roomId;

      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId)!.add(socket.id);

      console.log(`Cliente ${socket.id} se unió a la sala ${roomId}`);
      socket.emit("joined", { roomId });
    });

    socket.on("request", async (data: RequestData) => {
      try {
        const request = await db.insert(requests).values({
          roomId: parseInt(data.roomId),
          musician: data.musician,
          instrument: data.musician,
          targetInstrument: data.targetInstrument,
          action: data.action,
        }).returning();

        console.log(`Nueva petición guardada:`, request[0]);

        // Enviar confirmación al remitente
        socket.emit("requestConfirmed", request[0]);

        // Broadcast a todos en la sala
        socket.to(data.roomId).emit("newRequest", request[0]);
      } catch (error) {
        console.error("Error procesando petición:", error);
        socket.emit("error", { message: "Error procesando la petición" });
      }
    });

    socket.on("completeRequest", async ({ roomId, requestId }: { roomId: string, requestId: number }) => {
      try {
        await db.update(requests)
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
        const users = roomUsers.get(currentRoom);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) {
            roomUsers.delete(currentRoom);
          }
        }
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