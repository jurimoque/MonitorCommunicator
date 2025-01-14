import { Server as SocketIOServer } from "socket.io";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";
import { log } from "./vite";

interface RequestData {
  roomId: string;
  musician: string;
  instrument: string;
  targetInstrument: string;
  action: string;
}

export function setupWebSocket(io: SocketIOServer) {
  const musicRoom = io.of("/music-room");

  musicRoom.on("connection", async (socket) => {
    log(`[Socket.IO] Cliente conectado: ${socket.id}`);

    try {
      // Manejar unirse a sala directamente desde la query de conexión
      const roomId = socket.handshake.query.roomId as string;
      if (roomId) {
        await handleRoomJoin(socket, roomId);
      }

      // Eventos del socket
      socket.on("request", async (data: RequestData) => {
        try {
          await handleRequest(socket, data);
        } catch (error) {
          handleError(socket, error);
        }
      });

      socket.on("disconnect", (reason) => {
        log(`[Socket.IO] Cliente desconectado: ${socket.id}, razón: ${reason}`);
      });

    } catch (error) {
      handleError(socket, error);
    }
  });

  // Funciones de manejo de eventos
  async function handleRoomJoin(socket: any, roomId: string) {
    const roomIdNum = parseInt(roomId, 10);
    if (isNaN(roomIdNum)) {
      throw new Error("ID de sala inválido");
    }

    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomIdNum)
    });

    if (!room) {
      throw new Error("Sala no encontrada");
    }

    // Unirse a la sala de Socket.IO
    await socket.join(roomId);
    log(`[Socket.IO] Cliente ${socket.id} unido a sala ${roomId}`);

    // Obtener y enviar peticiones pendientes
    const pendingRequests = await db.query.requests.findMany({
      where: eq(requests.roomId, roomIdNum)
    });

    socket.emit("joined", {
      roomId,
      name: room.name,
      timestamp: new Date().toISOString()
    });

    const activeRequests = pendingRequests.filter(req => !req.completed);
    socket.emit("initialRequests", activeRequests);
  }

  async function handleRequest(socket: any, data: RequestData) {
    const roomIdNum = parseInt(data.roomId, 10);
    if (isNaN(roomIdNum)) {
      throw new Error("ID de sala inválido");
    }

    // Verificar que la sala existe
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomIdNum)
    });

    if (!room) {
      throw new Error("Sala no encontrada");
    }

    // Insertar nueva petición
    const [newRequest] = await db.insert(requests)
      .values({
        roomId: roomIdNum,
        musician: data.musician,
        instrument: data.instrument,
        targetInstrument: data.targetInstrument,
        action: data.action,
      })
      .returning();

    log(`[Socket.IO] Nueva petición creada en sala ${roomIdNum}: ${JSON.stringify(newRequest)}`);

    // Notificar a todos en la sala
    musicRoom.to(data.roomId).emit("newRequest", newRequest);
  }

  function handleError(socket: any, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    log(`[Socket.IO] Error: ${errorMessage}`);
    socket.emit("error", { message: errorMessage });
  }
}