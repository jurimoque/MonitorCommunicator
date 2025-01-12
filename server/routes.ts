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
  clientId?: string;
}

interface RoomState {
  connections: Set<WebSocketConnection>;
  lastActivity: number;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    noServer: true,
    clientTracking: true 
  });

  const roomStates = new Map<string, RoomState>();

  function removeFromRoom(ws: WebSocketConnection) {
    if (!ws.roomId || !roomStates.has(ws.roomId)) return;

    const state = roomStates.get(ws.roomId)!;
    state.connections.delete(ws);
    console.log(`Cliente ${ws.clientId} removido de sala ${ws.roomId}. Clientes restantes: ${state.connections.size}`);

    if (state.connections.size === 0) {
      roomStates.delete(ws.roomId);
      console.log(`Sala ${ws.roomId} eliminada`);
    }
  }

  function broadcastToRoom(roomId: string, message: any) {
    const state = roomStates.get(roomId);
    if (!state) return;

    const messageStr = JSON.stringify(message);
    let sent = 0;

    state.connections.forEach((client: WebSocketConnection) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          sent++;
        } catch (error) {
          console.error(`Error enviando mensaje a cliente ${client.clientId}:`, error);
          client.terminate();
          removeFromRoom(client);
        }
      }
    });

    console.log(`Mensaje enviado a ${sent} clientes en sala ${roomId}`);
    state.lastActivity = Date.now();
  }

  function heartbeat(ws: WebSocketConnection) {
    if (ws.pingTimeout) clearTimeout(ws.pingTimeout);
    ws.isAlive = true;

    ws.pingTimeout = setTimeout(() => {
      if (!ws.isAlive) {
        console.log(`Cliente ${ws.clientId} no responde, terminando conexión...`);
        ws.terminate();
      }
    }, 120000); // 2 minutos de timeout
  }

  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocketConnection) => {
      if (!ws.isAlive) {
        console.log(`Cliente ${ws.clientId} inactivo, desconectando...`);
        removeFromRoom(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        console.error(`Error enviando ping a cliente ${ws.clientId}:`, error);
        removeFromRoom(ws);
        ws.terminate();
      }
    });
  }, 60000); // Ping cada minuto

  wss.on("close", () => {
    clearInterval(interval);
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

    if (!pathname.startsWith("/ws/")) {
      socket.destroy();
      return;
    }

    const roomId = pathname.split("/")[2];
    if (!roomId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws: WebSocketConnection) => {
      const clientId = Math.random().toString(36).substring(7);
      console.log(`Nuevo cliente ${clientId} conectándose a sala ${roomId}`);

      ws.roomId = roomId;
      ws.clientId = clientId;
      ws.isAlive = true;
      heartbeat(ws);

      if (!roomStates.has(roomId)) {
        roomStates.set(roomId, {
          connections: new Set(),
          lastActivity: Date.now()
        });
      }

      const state = roomStates.get(roomId)!;
      state.connections.add(ws);
      state.lastActivity = Date.now();

      ws.on("pong", () => heartbeat(ws));

      ws.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`Mensaje recibido de cliente ${clientId}:`, data);

          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            return;
          }

          if (data.type === "request") {
            try {
              const request = await db.insert(requests).values({
                roomId: parseInt(roomId),
                musician: data.data.musician,
                instrument: data.data.musician,
                targetInstrument: data.data.targetInstrument,
                action: data.data.action,
              }).returning();

              console.log(`Petición guardada:`, request[0]);

              // Confirmar al remitente
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: "requestConfirmed",
                  data: request[0]
                }));
              }

              // Broadcast a todos en la sala
              broadcastToRoom(roomId, {
                type: "request",
                data: request[0]
              });
            } catch (error) {
              console.error("Error procesando petición:", error);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: "error",
                  message: "Error procesando la petición"
                }));
              }
            }
          }
        } catch (error) {
          console.error("Error procesando mensaje:", error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: "error",
              message: "Error procesando el mensaje"
            }));
          }
        }
      });

      ws.on("close", () => {
        console.log(`Cliente ${clientId} desconectado de sala ${roomId}`);
        if (ws.pingTimeout) clearTimeout(ws.pingTimeout);
        removeFromRoom(ws);
      });

      ws.on("error", (error) => {
        console.error(`Error de WebSocket para cliente ${clientId}:`, error);
        if (ws.pingTimeout) clearTimeout(ws.pingTimeout);
        removeFromRoom(ws);
      });
    });
  });

  // API Routes
  app.post("/api/rooms", async (req, res) => {
    try {
      const room = await db.insert(rooms).values({
        name: req.body.name || 'Default Room'
      }).returning();
      res.json(room[0]);
    } catch (error) {
      console.error("Error creando sala:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error creando la sala" 
      });
    }
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
      console.error("Error completando petición:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error completando la petición" 
      });
    }
  });

  return httpServer;
}