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

export function setupWebSocket(io: SocketIOServer) {
  const musicRoom = io.of("/music-room");

  musicRoom.on("connection", (socket) => {
    console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

    socket.on("join", async (roomId: string) => {
      try {
        const roomIdNum = parseInt(roomId, 10);
        if (isNaN(roomIdNum)) {
          throw new Error("ID de sala no válido");
        }

        const room = await db.query.rooms.findFirst({
          where: eq(rooms.id, roomIdNum)
        });

        if (!room) {
          throw new Error("Sala no encontrada");
        }

        await socket.join(roomId);
        console.log(`[Socket.IO] Cliente ${socket.id} se unió a la sala ${roomId}`);

        const pendingRequests = await db.query.requests.findMany({
          where: eq(requests.roomId, roomIdNum)
        });

        socket.emit("joined", { 
          roomId: roomId,
          name: room.name 
        });

        socket.emit("initialRequests", pendingRequests);
      } catch (error) {
        console.error("[Socket.IO] Error al unirse a la sala:", error);
        socket.emit("error", {
          message: error instanceof Error ? error.message : "Error al unirse a la sala"
        });
      }
    });

    socket.on("request", async (data: RequestData) => {
      try {
        const roomIdNum = parseInt(data.roomId, 10);
        if (isNaN(roomIdNum)) {
          throw new Error("ID de sala no válido");
        }

        const [newRequest] = await db.insert(requests)
          .values({
            roomId: roomIdNum,
            musician: data.musician,
            instrument: data.instrument,
            targetInstrument: data.targetInstrument,
            action: data.action,
          })
          .returning();

        socket.emit("requestConfirmed", newRequest);
        musicRoom.to(data.roomId).emit("newRequest", newRequest);

      } catch (error) {
        console.error("[Socket.IO] Error procesando petición:", error);
        socket.emit("error", {
          message: error instanceof Error ? error.message : "Error procesando la petición"
        });
      }
    });

    socket.on("completeRequest", async (requestId: number) => {
      try {
        const [updatedRequest] = await db.update(requests)
          .set({ completed: true })
          .where(eq(requests.id, requestId))
          .returning();

        if (updatedRequest) {
          musicRoom.emit("requestCompleted", { requestId });
        }
      } catch (error) {
        console.error("[Socket.IO] Error completando petición:", error);
        socket.emit("error", {
          message: error instanceof Error ? error.message : "Error completando la petición"
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
    });
  });
}
