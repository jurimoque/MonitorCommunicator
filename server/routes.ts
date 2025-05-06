import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // API Routes
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
  const wss = new WebSocketServer({ server: server, path: '/ws' });
  
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
    
    // Parse the URL to get the roomId
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    
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
      
      // Check if room exists
      const room = await db.query.rooms.findFirst({
        where: eq(rooms.id, roomIdNum)
      });
      
      if (!room) {
        console.log(`[WebSocket] Sala ${roomId} no encontrada`);
        ws.close(1008, 'Sala no encontrada');
        return;
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
      
      ws.send(JSON.stringify({
        type: 'initialRequests',
        data: activeRequests
      }));
      
      // Handle messages from client
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'request') {
            // Insert new request
            const requestData = data.data;
            const roomIdNum = parseInt(requestData.roomId, 10);
            
            const [newRequest] = await db.insert(requests)
              .values({
                roomId: roomIdNum,
                musician: requestData.musician,
                instrument: requestData.instrument,
                targetInstrument: requestData.targetInstrument,
                action: requestData.action,
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