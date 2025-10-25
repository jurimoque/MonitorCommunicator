import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { rooms, requests, customInstruments } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { requestSchema } from "./websocket";

export function registerRoutes(app: Express) {
  app.post("/api/rooms/find-or-create", async (req, res, next) => {
    try {
      const roomName = req.body.name || 'Sala sin nombre';
      const existingRoom = await db.query.rooms.findFirst({ where: eq(rooms.name, roomName) });
      if (existingRoom) {
        res.json({ ...existingRoom, isExisting: true });
        return;
      }
      const [room] = await db.insert(rooms).values({ name: roomName }).returning();
      res.json({ ...room, isExisting: false });
    } catch (error) { next(error); }
  });

  app.get("/api/rooms/search", async (req, res, next) => {
    try {
      const name = req.query.name as string;
      if (!name) return res.status(400).json({ message: "Nombre requerido" });
      const room = await db.query.rooms.findFirst({ where: eq(rooms.name, name) });
      if (room) res.json(room);
      else res.status(404).json({ message: "Sala no encontrada" });
    } catch (error) { next(error); }
  });

  app.get("/api/rooms/:roomId", async (req, res, next) => {
    try {
      const roomIdNum = parseInt(req.params.roomId, 10);
      if (isNaN(roomIdNum)) return res.status(400).json({ message: "ID de sala inválido" });
      const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomIdNum) });
      if (room) res.json(room);
      else res.status(404).json({ message: "Sala no encontrada" });
    } catch (error) { next(error); }
  });

  app.post("/api/rooms/:roomId/instruments", async (req, res, next) => {
    try {
      const roomIdNum = parseInt(req.params.roomId, 10);
      const { name } = req.body;
      if (isNaN(roomIdNum) || !name?.trim()) return res.status(400).json({ message: "Datos inválidos" });

      const existing = await db.query.customInstruments.findFirst({ where: and(eq(customInstruments.roomId, roomIdNum), eq(customInstruments.name, name.trim())) });
      if (existing) {
        res.json(existing);
        return;
      }
      const [instrument] = await db.insert(customInstruments).values({ roomId: roomIdNum, name: name.trim() }).returning();
      broadcastToRoom(req.params.roomId, JSON.stringify({ type: 'newInstrument', data: instrument }));
      res.json(instrument);
    } catch (error) { next(error); }
  });

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const roomClients = new Map<string, Set<WebSocket>>();

  function broadcastToRoom(roomId: string, message: string) {
    roomClients.get(roomId)?.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    });
  }

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    if (!roomId) return ws.close(1008, 'RoomId es obligatorio');

    if (!roomClients.has(roomId)) roomClients.set(roomId, new Set());
    roomClients.get(roomId)!.add(ws);

    try {
      const roomIdNum = parseInt(roomId, 10);
      const [pendingRequests, existingInstruments] = await Promise.all([
        db.query.requests.findMany({ where: and(eq(requests.roomId, roomIdNum), eq(requests.completed, false)) }),
        db.query.customInstruments.findMany({ where: eq(customInstruments.roomId, roomIdNum) })
      ]);
      ws.send(JSON.stringify({ type: 'initialRequests', data: pendingRequests }));
      if (existingInstruments.length > 0) {
        ws.send(JSON.stringify({ type: 'initialInstruments', data: existingInstruments }));
      }
    } catch (error) { ws.close(1011, 'Error interno'); }

    ws.on('message', async (message) => {
      try {
        const { type, data } = JSON.parse(message.toString());
        const roomIdNum = parseInt(roomId, 10);

        switch (type) {
          case 'request': {
            const validatedData = requestSchema.parse(data);
            const [newRequest] = await db.insert(requests).values({ ...validatedData, roomId: roomIdNum }).returning();
            broadcastToRoom(roomId, JSON.stringify({ type: 'newRequest', data: newRequest }));
            break;
          }
          case 'completeRequest': {
            const { requestId } = data;
            const [updatedRequest] = await db.update(requests).set({ completed: true }).where(eq(requests.id, requestId)).returning();
            if (updatedRequest) broadcastToRoom(roomId, JSON.stringify({ type: 'requestCompleted', data: updatedRequest }));
            break;
          }
          case 'clearAllRequests': {
            await db.update(requests).set({ completed: true }).where(eq(requests.roomId, roomIdNum));
            broadcastToRoom(roomId, JSON.stringify({ type: 'allRequestsCompleted', roomId }));
            break;
          }
        }
      } catch (error) { console.error('Error procesando mensaje:', error); }
    });

    ws.on('close', () => {
      roomClients.get(roomId)?.delete(ws);
    });
  });

  return server;
}
