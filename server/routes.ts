import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { requestSchema, RequestData } from "./websocket";

export function registerRoutes(app: Express): Server {
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

  app.post("/api/rooms/:roomId/requests/:requestId/complete", async (req, res, next) => {
    try {
      const { roomId, requestId } = req.params;
      const requestIdNum = parseInt(requestId, 10);

      if (isNaN(requestIdNum)) {
        res.status(400).json({ message: "ID de petición inválido" });
        return;
      }

      const [updatedRequest] = await db.update(requests)
        .set({ completed: true })
        .where(eq(requests.id, requestIdNum))
        .returning();
      
      // Send WebSocket notification to all clients in the room
      if (wss && updatedRequest) {
        broadcastToRoom(roomId, JSON.stringify({
          type: 'requestCompleted',
          data: updatedRequest
        }));
      }
      
      res.json({ message: "Petición completada" });
    } catch (error) {
      console.error("[API] Error completando petición:", error);
      next(error);
    }
  });

  // Add a clear all requests endpoint
  app.post("/api/rooms/:roomId/requests/clear", async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const roomIdNum = parseInt(roomId, 10);

      if (isNaN(roomIdNum)) {
        res.status(400).json({ message: "ID de sala inválido" });
        return;
      }

      const updatedRequests = await db.update(requests)
        .set({ completed: true })
        .where(eq(requests.roomId, roomIdNum))
        .returning();
      
      // Send WebSocket notification to all clients in the room
      if (wss) {
        broadcastToRoom(roomId, JSON.stringify({
          type: 'allRequestsCompleted',
          roomId: roomId
        }));
      }
      
      res.json({ message: "Todas las peticiones completadas", count: updatedRequests ? updatedRequests.length : 0 });
    } catch (error) {
      console.error("[API] Error limpiando peticiones:", error);
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
  
  // Track clients by room
  const roomClients: Map<string, Set<WebSocket>> = new Map();
  
  // Broadcast to all clients in a room
  function broadcastToRoom(roomId: string, message: string) {
    const roomSet = roomClients.get(roomId);
    if (roomSet) {
      roomSet.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }
  
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
      const roomIdNum = parseInt(roomId, 10);
      if (isNaN(roomIdNum)) {
        throw new Error("RoomId debe ser un número");
      }
      
      // Check if room exists, if not create it
      let room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomIdNum)
      });
      
      if (!room) {
        console.log(`[WebSocket] Sala ${roomId} no encontrada, creando nueva sala`);
        [room] = await db.insert(rooms)
          .values({ name: `Sala ${roomId}` })
          .returning();
        console.log(`[WebSocket] Nueva sala creada: ${room.name}`);
      }
      
      // Add client to room
      if (!roomClients.has(roomId)) {
        roomClients.set(roomId, new Set());
      }
      roomClients.get(roomId)?.add(ws);
      
      // Send initial data
      const pendingRequests = await db.query.requests.findMany({
        where: eq(requests.roomId, roomIdNum)
      });
      
      // Filter only non-completed requests
      const activeRequests = pendingRequests.filter(req => !req.completed);
      
      console.log(`[WebSocket] Enviando ${activeRequests.length} peticiones activas de ${pendingRequests.length} totales`);
      
      ws.send(JSON.stringify({
        type: 'initialRequests',
        data: activeRequests
      }));
      
      // Handle messages from client
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'request') {
            // Validar datos de la petición
            const validatedData = requestSchema.parse(data.data);
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
            
            // Broadcast to all clients in the room
            broadcastToRoom(roomId, JSON.stringify({
              type: 'newRequest',
              data: newRequest
            }));
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