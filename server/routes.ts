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
      try {
        const roomIdNum = parseInt(roomId);
        if (isNaN(roomIdNum)) {
          throw new Error("ID de sala no válido");
        }

        // Verificar si la sala existe
        const [room] = await db.select()
          .from(rooms)
          .where(eq(rooms.id, roomIdNum));

        if (!room) {
          throw new Error("Sala no encontrada");
        }

        if (currentRoom) {
          socket.leave(currentRoom);
        }

        socket.join(roomId);
        currentRoom = roomId;
        console.log(`Cliente ${socket.id} se unió a la sala ${roomId}`);

        const existingRequests = await db.select()
          .from(requests)
          .where(eq(requests.roomId, roomIdNum))
          .where(eq(requests.completed, false));

        socket.emit("joined", { roomId, name: room.name });

        if (existingRequests.length > 0) {
          socket.emit("initialRequests", existingRequests);
        }
      } catch (error) {
        console.error("Error al unirse a la sala:", error);
        socket.emit("error", { message: error.message });
      }
    });

    socket.on("request", async (data: RequestData) => {
      try {
        const roomIdNum = parseInt(data.roomId);
        if (isNaN(roomIdNum)) {
          throw new Error("ID de sala no válido");
        }

        // Verificar si la sala existe antes de procesar la petición
        const [room] = await db.select()
          .from(rooms)
          .where(eq(rooms.id, roomIdNum));

        if (!room) {
          throw new Error("Sala no encontrada");
        }

        const [request] = await db.insert(requests)
          .values({
            roomId: roomIdNum,
            musician: data.musician,
            instrument: data.instrument,
            targetInstrument: data.targetInstrument,
            action: data.action,
          })
          .returning();

        console.log("Petición guardada:", request);

        // Confirmar al remitente
        socket.emit("requestConfirmed", request);

        // Broadcast a todos en la sala
        socket.to(data.roomId).emit("newRequest", request);
      } catch (error) {
        console.error("Error procesando petición:", error);
        socket.emit("error", { 
          message: error instanceof Error ? error.message : "Error procesando la petición"
        });
      }
    });

    socket.on("completeRequest", async ({ roomId, requestId }: { roomId: string, requestId: number }) => {
      try {
        const roomIdNum = parseInt(roomId);
        if (isNaN(roomIdNum)) {
          throw new Error("ID de sala no válido");
        }

        const [updatedRequest] = await db.update(requests)
          .set({ completed: true })
          .where(eq(requests.id, requestId))
          .returning();

        if (updatedRequest) {
          musicRoom.to(roomId).emit("requestCompleted", { requestId });
        }
      } catch (error) {
        console.error("Error completando petición:", error);
        socket.emit("error", { 
          message: error instanceof Error ? error.message : "Error completando la petición"
        });
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
      const [room] = await db.insert(rooms)
        .values({
          name: req.body.name || 'Sala sin nombre'
        })
        .returning();

      console.log("Nueva sala creada:", room);
      res.json(room);
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