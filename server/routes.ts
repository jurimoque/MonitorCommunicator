import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { rooms, requests, customInstruments } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { requestSchema, RequestData } from "./websocket";

export function registerRoutes(app: Express): Server {
  // Track clients by room
  const roomClients: Map<string, Set<WebSocket>> = new Map();

  // Broadcast helper so both HTTP & WS flows can notify clients
  function broadcastToRoom(roomId: string, message: string) {
    const roomSet = roomClients.get(roomId);
    console.log(`[Broadcast] Attempting to broadcast to room: ${roomId}`);
    if (roomSet) {
      console.log(`[Broadcast] Found ${roomSet.size} client(s) in room ${roomId}.`);
      let clientIndex = 0;
      roomSet.forEach((client) => {
        clientIndex++;
        console.log(`[Broadcast] -> Client ${clientIndex}: readyState is ${client.readyState}.`);
        if (client.readyState === WebSocket.OPEN) {
          try {
            console.log(`[Broadcast] -> Client ${clientIndex}: Sending message: ${message}`);
            client.send(message);
          } catch (e) {
            console.error(`[Broadcast] -> Client ${clientIndex}: FAILED to send message. Error:`, e);
          }
        } else {
          console.log(`[Broadcast] -> Client ${clientIndex}: SKIPPED (not open).`);
        }
      });
    } else {
      console.log(`[Broadcast] No clients found for room ${roomId}.`);
    }
  }

  // API Routes
  // Buscar o crear sala
  app.post("/api/rooms/find-or-create", async (req, res, next) => {
    try {
      const rawName = (req.body.name || "Sala sin nombre").toString().trim();
      const roomName = rawName.length ? rawName : "Sala sin nombre";
      
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

  // Crear una petición (vía HTTP) y propagarla por WebSocket
  app.post("/api/rooms/:roomId/requests", async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const roomIdNum = parseInt(roomId, 10);

      if (isNaN(roomIdNum)) {
        res.status(400).json({ message: "ID de sala inválido" });
        return;
      }

      // Reutilizamos el schema de WS para validar el payload
      const parsedRequest = requestSchema.parse({
        ...req.body,
        roomId,
      });

      const [newRequest] = await db.insert(requests)
        .values({
          roomId: roomIdNum,
          musician: parsedRequest.musician,
          instrument: parsedRequest.instrument,
          targetInstrument: parsedRequest.targetInstrument,
          action: parsedRequest.action,
        })
        .returning();

      broadcastToRoom(roomId, JSON.stringify({
        type: 'newRequest',
        data: newRequest,
      }));

      res.status(201).json(newRequest);
    } catch (error) {
      console.error("[API] Error creando petición:", error);
      next(error);
    }
  });
  
  // Buscar salas por nombre
  app.get("/api/rooms/search", async (req, res, next) => {
    try {
      const raw = (req.query.name as string | undefined)?.toString().trim();
      if (!raw) {
        res.status(400).json({ message: "Nombre requerido" });
        return;
      }

      let room = await db.query.rooms.findFirst({
        where: eq(rooms.name, raw),
      });

      if (!room && /^\d+$/.test(raw)) {
        const roomIdNum = parseInt(raw, 10);
        room = await db.query.rooms.findFirst({
          where: eq(rooms.id, roomIdNum),
        });
      }

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

      // Propagar a todos los clientes de la sala via WebSocket
      if (wss) {
        broadcastToRoom(roomId, JSON.stringify({
          type: 'newInstrument',
          data: instrument
        }));
      }

      res.json(instrument);
    } catch (error) {
      console.error("[API] Error creando instrumento:", error);
      next(error);
    }
  });

  // Get room details by ID
  app.get("/api/rooms/:roomId", async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const roomIdNum = parseInt(roomId, 10);

      if (isNaN(roomIdNum)) {
        res.status(400).json({ message: "ID de sala inválido" });
        return;
      }

      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomIdNum)
      });

      if (room) {
        res.json(room);
      } else {
        res.status(404).json({ message: "Sala no encontrada" });
      }
    } catch (error) {
      console.error("[API] Error obteniendo detalles de la sala:", error);
      next(error);
    }
  });

  const server = createServer(app);

  // Manejar errores del servidor HTTP
  server.on('error', (error: Error) => {
    console.error('[Server] Error en servidor HTTP:', error);
  });

  // Setup WebSocket server on a distinct path
  const wss = new WebSocketServer({ 
    server: server, 
    path: '/ws',
    perMessageDeflate: false,
    maxPayload: 16 * 1024 * 1024,
    clientTracking: true,
    verifyClient: (info: any) => {
      console.log('[WebSocket] Verificando cliente:', info.origin, info.req.url);
      return true; // Accept all connections for now
    }
  });
  
  console.log('[WebSocket] Servidor WebSocket configurado en path /ws');
  
  // Handle WebSocket server errors
  wss.on('error', (error) => {
    console.error('[WebSocket] Error en servidor WebSocket:', error);
  });
  
  wss.on('connection', async (ws, req) => {
    console.log('[WebSocket] Cliente conectado');
    console.log('[WebSocket] Request URL:', req.url);
    console.log('[WebSocket] Request headers:', req.headers);
    
    // Parse the URL to get the roomId
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    
    console.log('[WebSocket] Room ID extraído:', roomId);
    
    if (!roomId) {
      console.log('[WebSocket] Cliente sin roomId');
      ws.close(1008, 'RoomId es obligatorio');
      return;
    }
    
    try {
      console.log('[WebSocket] PASO 1: Parseando roomId...');
      const roomIdNum = parseInt(roomId, 10);
      if (isNaN(roomIdNum)) {
        throw new Error("RoomId debe ser un número");
      }
      console.log(`[WebSocket] PASO 1: ✅ roomIdNum = ${roomIdNum}`);

      // Check if room exists, if not create it
      console.log('[WebSocket] PASO 2: Buscando sala en la DB...');
      let room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomIdNum)
      });
      console.log(`[WebSocket] PASO 2: ${room ? `✅ Sala encontrada: ${room.name}` : '⚠️  Sala no encontrada'}`);

      if (!room) {
        console.log(`[WebSocket] PASO 2.1: Creando nueva sala...`);
        [room] = await db.insert(rooms)
          .values({ name: `Sala ${roomId}` })
          .returning();
        console.log(`[WebSocket] PASO 2.1: ✅ Nueva sala creada: ${room.name}`);
      }

      // Add client to room
      console.log('[WebSocket] PASO 3: Agregando cliente a roomClients...');
      if (!roomClients.has(roomId)) {
        roomClients.set(roomId, new Set());
      }
      roomClients.get(roomId)?.add(ws);
      console.log(`[WebSocket] PASO 3: ✅ Cliente agregado. Total clientes en sala ${roomId}: ${roomClients.get(roomId)?.size}`);

      // Send initial data
      console.log('[WebSocket] PASO 4: Obteniendo peticiones pendientes...');
      const pendingRequests = await db.query.requests.findMany({
        where: eq(requests.roomId, roomIdNum)
      });
      console.log(`[WebSocket] PASO 4: ✅ Encontradas ${pendingRequests.length} peticiones`);

      // Filter only non-completed requests
      const activeRequests = pendingRequests.filter(req => !req.completed);
      console.log(`[WebSocket] PASO 4: ${activeRequests.length} peticiones activas`);

      console.log('[WebSocket] PASO 5: Enviando initialRequests al cliente...');
      ws.send(JSON.stringify({
        type: 'initialRequests',
        data: activeRequests
      }));
      console.log('[WebSocket] PASO 5: ✅ Mensaje initialRequests enviado');

      // Send initial custom instruments
      console.log('[WebSocket] PASO 6: Obteniendo instrumentos personalizados...');
      const existingInstruments = await db.query.customInstruments.findMany({
        where: eq(customInstruments.roomId, roomIdNum)
      });
      console.log(`[WebSocket] PASO 6: ✅ Encontrados ${existingInstruments.length} instrumentos`);

      if (existingInstruments.length > 0) {
        console.log('[WebSocket] PASO 7: Enviando initialInstruments al cliente...');
        ws.send(JSON.stringify({
          type: 'initialInstruments',
          data: existingInstruments
        }));
        console.log('[WebSocket] PASO 7: ✅ Mensaje initialInstruments enviado');
      }

      console.log('[WebSocket] ✅ CONEXIÓN COMPLETADA EXITOSAMENTE');
      
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
      console.error('[WebSocket] ❌ ERROR CAPTURADO:');
      console.error('[WebSocket] Error tipo:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[WebSocket] Error mensaje:', error instanceof Error ? error.message : error);
      console.error('[WebSocket] Error stack:', error instanceof Error ? error.stack : 'N/A');
      console.error('[WebSocket] Error completo:', JSON.stringify(error, null, 2));
      ws.close(1011, 'Error interno');
    }
  });

  return server;
}
