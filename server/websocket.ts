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
  try {
    const musicRoom = io.of("/music-room");
    console.log("[WebSocket] Namespace /music-room creado");

    musicRoom.on("connection", async (socket) => {
      console.log(`[WebSocket] Cliente conectado: ${socket.id}`);

      const roomId = socket.handshake.query.roomId as string;
      if (!roomId) {
        console.log(`[WebSocket] Cliente ${socket.id}: roomId inválido`);
        socket.disconnect();
        return;
      }

      try {
        const roomIdNum = parseInt(roomId, 10);
        const room = await db.query.rooms.findFirst({
          where: eq(rooms.id, roomIdNum)
        });

        if (!room) {
          console.log(`[WebSocket] Sala ${roomId} no encontrada`);
          throw new Error("Sala no encontrada");
        }

        await socket.join(roomId);
        console.log(`[WebSocket] Cliente ${socket.id} unido a sala ${roomId}`);

        const pendingRequests = await db.query.requests.findMany({
          where: eq(requests.roomId, roomIdNum)
        });
        console.log(`[WebSocket] Enviando ${pendingRequests.length} peticiones pendientes`);

        socket.emit("joined", { room });
        socket.emit("initialRequests", pendingRequests);

        socket.on("request", async (data: RequestData) => {
          try {
            console.log(`[WebSocket] Nueva petición recibida:`, data);
            const [newRequest] = await db.insert(requests)
              .values({
                roomId: roomIdNum,
                musician: data.musician,
                instrument: data.instrument,
                targetInstrument: data.targetInstrument,
                action: data.action,
              })
              .returning();

            console.log(`[WebSocket] Petición creada:`, newRequest);
            musicRoom.to(roomId).emit("newRequest", newRequest);
          } catch (error) {
            console.error(`[WebSocket] Error procesando petición:`, error);
            socket.emit("error", { message: "Error al procesar la petición" });
          }
        });
      } catch (error) {
        console.error(`[WebSocket] Error:`, error);
        socket.emit("error", { 
          message: error instanceof Error ? error.message : "Error interno" 
        });
        socket.disconnect();
      }

      socket.on("disconnect", () => {
        console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
      });
    });

    console.log("[WebSocket] Setup completado exitosamente");
  } catch (error) {
    console.error("[WebSocket] Error fatal en setup:", error);
  }
}