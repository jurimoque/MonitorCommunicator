import { Server as SocketIOServer } from "socket.io";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Validación de datos de petición
const requestSchema = z.object({
  roomId: z.string(),
  musician: z.string().min(1, "Músico es requerido"),
  instrument: z.string().min(1, "Instrumento es requerido"),
  targetInstrument: z.string().min(1, "Instrumento objetivo es requerido"),
  action: z.enum(["volume_up", "volume_down", "reverb_up", "reverb_down"]),
});

type RequestData = z.infer<typeof requestSchema>;

export function setupWebSocket(io: SocketIOServer) {
  try {
    const musicRoom = io.of("/music-room");
    console.log("[WebSocket] Namespace /music-room creado");

    // Mantener registro de conexiones por sala
    const roomConnections = new Map<string, Set<string>>();

    // Configuración global de Socket.IO
    io.engine.on("connection_error", (err) => {
      console.error("[WebSocket] Error de conexión:", err);
    });

    musicRoom.on("connection", async (socket) => {
      console.log(`[WebSocket] Cliente conectado: ${socket.id}`);

      // Validar roomId
      const roomId = socket.handshake.query.roomId;
      if (!roomId || Array.isArray(roomId)) {
        console.log(`[WebSocket] Cliente ${socket.id}: roomId inválido`);
        socket.emit("error", { message: "RoomId inválido" });
        socket.disconnect();
        return;
      }

      try {
        const roomIdNum = parseInt(roomId, 10);
        if (isNaN(roomIdNum)) {
          throw new Error("RoomId debe ser un número");
        }

        // Verificar si la sala existe
        const room = await db.query.rooms.findFirst({
          where: eq(rooms.id, roomIdNum)
        });

        if (!room) {
          console.log(`[WebSocket] Sala ${roomId} no encontrada`);
          throw new Error("Sala no encontrada");
        }

        // Registrar conexión en la sala
        if (!roomConnections.has(roomId)) {
          roomConnections.set(roomId, new Set());
        }
        roomConnections.get(roomId)?.add(socket.id);

        await socket.join(roomId);
        console.log(`[WebSocket] Cliente ${socket.id} unido a sala ${roomId}`);

        // Enviar peticiones pendientes
        const pendingRequests = await db.query.requests.findMany({
          where: eq(requests.roomId, roomIdNum)
        });
        console.log(`[WebSocket] Enviando ${pendingRequests.length} peticiones pendientes`);

        socket.emit("joined", { room });
        socket.emit("initialRequests", pendingRequests);

        // Manejar nuevas peticiones
        socket.on("request", async (data: unknown) => {
          try {
            console.log(`[WebSocket] Nueva petición recibida:`, data);

            // Validar datos de la petición
            const validatedData = requestSchema.parse(data);
            const roomIdNum = parseInt(validatedData.roomId, 10);

            const [newRequest] = await db.insert(requests)
              .values({
                roomId: roomIdNum,
                musician: validatedData.musician,
                instrument: validatedData.instrument,
                targetInstrument: validatedData.targetInstrument,
                action: validatedData.action,
              })
              .returning();

            console.log(`[WebSocket] Petición creada:`, newRequest);
            musicRoom.to(roomId).emit("newRequest", newRequest);
          } catch (error) {
            console.error(`[WebSocket] Error procesando petición:`, error);
            let errorMessage = "Error al procesar la petición";
            if (error instanceof z.ZodError) {
              errorMessage = error.errors.map(e => e.message).join(", ");
            }
            socket.emit("error", { message: errorMessage });
          }
        });

        // Manejar desconexión
        socket.on("disconnect", () => {
          console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
          roomConnections.get(roomId)?.delete(socket.id);
          if (roomConnections.get(roomId)?.size === 0) {
            roomConnections.delete(roomId);
          }
        });

        // Manejar errores de socket
        socket.on("error", (error) => {
          console.error(`[WebSocket] Error en socket ${socket.id}:`, error);
          socket.emit("error", { message: "Error en la conexión" });
        });

      } catch (error) {
        console.error(`[WebSocket] Error:`, error);
        socket.emit("error", { 
          message: error instanceof Error ? error.message : "Error interno" 
        });
        socket.disconnect();
      }
    });

    // Monitoreo de estado general
    const monitoringInterval = setInterval(() => {
      const connectedRooms = Array.from(roomConnections.entries()).map(([roomId, connections]) => ({
        roomId,
        connections: connections.size
      }));
      console.log("[WebSocket] Estado de conexiones:", connectedRooms);
    }, 60000);

    // Limpieza de recursos al cerrar el servidor
    io.on("close", () => {
      clearInterval(monitoringInterval);
      roomConnections.clear();
    });

    console.log("[WebSocket] Setup completado exitosamente");
  } catch (error) {
    console.error("[WebSocket] Error fatal en setup:", error);
    throw error;
  }
}