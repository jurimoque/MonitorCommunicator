import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";

interface WebSocketConnection extends WebSocket {
  roomId?: string;
  isAlive?: boolean;
  pingTimeout?: NodeJS.Timeout;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    noServer: true,
    clientTracking: true 
  });

  // Store active connections by room
  const roomConnections = new Map<string, Set<WebSocketConnection>>();

  function removeFromRoom(ws: WebSocketConnection) {
    if (ws.roomId && roomConnections.has(ws.roomId)) {
      const connections = roomConnections.get(ws.roomId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          roomConnections.delete(ws.roomId);
        }
      }
    }
  }

  function broadcastToRoom(roomId: string, message: any) {
    const connections = roomConnections.get(roomId);
    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
    }
  }

  function heartbeat(ws: WebSocketConnection) {
    if (ws.pingTimeout) clearTimeout(ws.pingTimeout);
    ws.isAlive = true;

    // Si no hay respuesta en 45 segundos, terminar la conexión
    ws.pingTimeout = setTimeout(() => {
      console.log(`Cliente en sala ${ws.roomId} no responde, terminando conexión...`);
      ws.terminate();
    }, 45000);
  }

  // Ping clients every 30 seconds
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocketConnection) => {
      if (ws.isAlive === false) {
        console.log(`Cliente inactivo en sala ${ws.roomId}, desconectando...`);
        removeFromRoom(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

    if (pathname.startsWith("/ws/")) {
      wss.handleUpgrade(request, socket, head, (ws: WebSocketConnection) => {
        const roomId = pathname.split("/")[2];
        console.log(`Nuevo cliente conectándose a sala ${roomId}`);

        ws.roomId = roomId;
        ws.isAlive = true;
        heartbeat(ws);

        if (!roomConnections.has(roomId)) {
          roomConnections.set(roomId, new Set());
        }
        roomConnections.get(roomId)!.add(ws);

        console.log(`Cliente conectado exitosamente a sala ${roomId}`);

        ws.on("pong", () => heartbeat(ws));

        ws.on("message", async (message) => {
          try {
            const data = JSON.parse(message.toString());
            console.log(`Mensaje recibido en sala ${roomId}:`, data);

            if (data.type === "request") {
              console.log(`Nueva petición de sonido en sala ${roomId}:`, data.data);

              const request = await db.insert(requests).values({
                roomId: parseInt(data.data.roomId),
                musician: data.data.musician,
                instrument: data.data.musician,
                targetInstrument: data.data.targetInstrument,
                action: data.data.action,
              }).returning();

              console.log(`Petición guardada en base de datos:`, request[0]);

              broadcastToRoom(roomId, {
                type: "request",
                data: request[0]
              });

              // Enviar confirmación al cliente que hizo la petición
              ws.send(JSON.stringify({
                type: "requestConfirmed",
                data: request[0]
              }));
            }
          } catch (error) {
            console.error("Error procesando mensaje:", error);
            ws.send(JSON.stringify({
              type: "error",
              message: "Error procesando el mensaje"
            }));
          }
        });

        ws.on("close", () => {
          console.log(`Cliente desconectado de sala ${roomId}`);
          if (ws.pingTimeout) clearTimeout(ws.pingTimeout);
          removeFromRoom(ws);
        });

        ws.on("error", (error) => {
          console.error(`Error de WebSocket en sala ${roomId}:`, error);
          if (ws.pingTimeout) clearTimeout(ws.pingTimeout);
          removeFromRoom(ws);
        });
      });
    } else {
      socket.destroy();
    }
  });

  // API Routes
  app.post("/api/rooms", async (req, res) => {
    const room = await db.insert(rooms).values({
      name: req.body.name
    }).returning();
    res.json(room[0]);
  });

  app.post("/api/rooms/:roomId/requests/:requestId/complete", async (req, res) => {
    const { roomId, requestId } = req.params;

    try {
      await db.update(requests)
        .set({ completed: true })
        .where(eq(requests.id, parseInt(requestId)))
        .returning();

      broadcastToRoom(roomId, {
        type: "requestCompleted",
        data: { requestId: parseInt(requestId) }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error al completar la petición:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al completar la petición" 
      });
    }
  });

  return httpServer;
}