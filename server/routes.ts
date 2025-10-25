import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { rooms, requests, customInstruments } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { requestSchema, RequestData } from "./websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  // Buscar o crear sala
  app.post("/api/rooms/find-or-create", async (req, res, next) => {
    try {
      const roomName = req.body.name || 'Sala sin nombre';
      
      // Primero buscar si ya existe una sala con ese nombre
      const existingRoom = await db.query.rooms.findFirst({
        where: eq(rooms.name, roomName)
      });
      
      if (existingRoom) {
        console.log(`[API] Sala encontrada: ${existingRoom.name} (ID: ${existingRoom.id})`);
        res.json({ ...existingRoom, isExisting: true });
        return;
      }
      
      // Si no existe, crear nueva sala
      const [room] = await db.insert(rooms)
        .values({ name: roomName })
        .returning();
      console.log(`[API] Nueva sala creada: ${room.name} (ID: ${room.id})`);
      res.json({ ...room, isExisting: false });
    } catch (error) {
      console.error("[API] Error buscando/creando sala:", error);
      next(error);
    }
  });

  // Crear sala nueva (forzar)
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
  
  // Buscar salas por nombre
  app.get("/api/rooms/search", async (req, res, next) => {
    try {
      const name = req.query.name as string;
      if (!name) {
        res.status(400).json({ message: "Nombre requerido" });
        return;
      }
      
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.name, name)
      });
      
      if (room) {
        res.json(room);
      } else {
        res.status(404).json({ message: "Sala no encontrada" });
      }
    } catch (error) {
      console.error("[API] Error buscando sala:", error);
      next(error);
    }
  });

  // Obtener instrumentos personalizados de una sala
  app.get("/api/rooms/:roomId/instruments", async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const roomIdNum = parseInt(roomId, 10);

      if (isNaN(roomIdNum)) {
        res.status(400).json({ message: "ID de sala inválido" });
        return;
      }

      const instruments = await db.query.customInstruments.findMany({
        where: eq(customInstruments.roomId, roomIdNum)
      });

      res.json(instruments);
    } catch (error) {
      console.error("[API] Error obteniendo instrumentos:", error);
      next(error);
    }
  });

  // Crear un instrumento personalizado en una sala
  app.post("/api/rooms/:roomId/instruments", async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const roomIdNum = parseInt(roomId, 10);

      if (isNaN(roomIdNum)) {
        res.status(400).json({ message: "ID de sala inválido" });
        return;
      }

      const { name } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ message: "Nombre de instrumento requerido" });
        return;
      }

      // Verificar si ya existe un instrumento con ese nombre en esta sala
      const existing = await db.query.customInstruments.findFirst({
        where: and(
          eq(customInstruments.roomId, roomIdNum),
          eq(customInstruments.name, name.trim())
        )
      });

      if (existing) {
        res.json(existing); // Si ya existe, devolverlo
        return;
      }

      // Crear nuevo instrumento
      const [instrument] = await db.insert(customInstruments)
        .values({ roomId: roomIdNum, name: name.trim() })
        .returning();

      console.log(`[API] Instrumento creado: ${instrument.name} en sala ${roomId}`);

      // Propagar a todos los clientes de la sala via WebSocket
      if (wss) {
        const message = JSON.stringify({
          type: 'newInstrument',
          data: instrument
        });
        console.log(`[API] Enviando broadcast de newInstrument: ${message}`);
        broadcastToRoom(roomId, message);
      }

      res.json(instrument);
    } catch (error) {
      console.error("[API] Error creando instrumento:", error);
      next(error);
    }
  });

  const server = createServer(app);
// ... (resto del archivo sin cambios hasta la conexión) ...
      // Send initial custom instruments
      const existingInstruments = await db.query.customInstruments.findMany({
        where: eq(customInstruments.roomId, roomIdNum)
      });

      console.log(`[WebSocket] Encontrados ${existingInstruments.length} instrumentos para sala ${roomId}`);

      if (existingInstruments.length > 0) {
        const message = JSON.stringify({
          type: 'initialInstruments',
          data: existingInstruments
        });
        console.log(`[WebSocket] Enviando initialInstruments: ${message}`);
        ws.send(message);
      }
      
      // Handle messages from client
      ws.on('message', async (message) => {
        console.log('[WebSocket] Raw message received:', message.toString()); // RAW LOG
        try {
          const parsedMessage = JSON.parse(message.toString());
          const { type, data } = parsedMessage;

          switch (type) {
            case 'request': {
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
              
              broadcastToRoom(roomId, JSON.stringify({
                type: 'newRequest',
                data: newRequest
              }));
              break;
            }

            case 'completeRequest': {
              const { requestId } = data;
              const requestIdNum = parseInt(requestId, 10);
              if (isNaN(requestIdNum)) return;

              const [updatedRequest] = await db.update(requests)
                .set({ completed: true })
                .where(eq(requests.id, requestIdNum))
                .returning();
              
              if (updatedRequest) {
                broadcastToRoom(roomId, JSON.stringify({
                  type: 'requestCompleted',
                  data: updatedRequest
                }));
              }
              break;
            }

            case 'clearAllRequests': {
              const roomIdNum = parseInt(roomId, 10);
              if(isNaN(roomIdNum)) return;

              await db.update(requests)
                .set({ completed: true })
                .where(eq(requests.roomId, roomIdNum));
              
              broadcastToRoom(roomId, JSON.stringify({
                type: 'allRequestsCompleted',
                roomId: roomId
              }));
              break;
            }

            default:
              console.log(`[WebSocket] Received unknown message type: ${type}`);
          }
        } catch (error) {
          console.error('[WebSocket] Error procesando mensaje:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        console.log('[WebSocket] Cliente desconectado');
        roomClients.get(roomId)?.delete(ws);
        if (roomClients.get(roomId)?.size === 0) {
          roomClients.delete(roomId);
        }
      });
      
    } catch (error) {
      console.error('[WebSocket] Error:', error);
      ws.close(1011, 'Error interno');
    }
  });

  return server;
}