import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";

interface WebSocketConnection extends WebSocket {
  roomId?: string;
  isAlive?: boolean;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    noServer: true,
    clientTracking: true
  });

  // Store active connections by room
  const roomConnections = new Map<string, Set<WebSocketConnection>>();

  // Ping interval to keep connections alive
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocketConnection) => {
      if (ws.isAlive === false) {
        console.log(`Client disconnected from room ${ws.roomId}`);
        removeFromRoom(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 15000);

  wss.on("close", () => {
    clearInterval(pingInterval);
  });

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

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    
    if (pathname.startsWith("/ws/")) {
      wss.handleUpgrade(request, socket, head, (ws: WebSocketConnection) => {
        const roomId = pathname.split("/")[2];
        ws.roomId = roomId;
        ws.isAlive = true;

        // Add to room connections
        if (!roomConnections.has(roomId)) {
          roomConnections.set(roomId, new Set());
        }
        roomConnections.get(roomId)!.add(ws);

        // Setup WebSocket event handlers
        ws.on("pong", () => {
          ws.isAlive = true;
        });

        ws.on("message", async (message) => {
          try {
            const data = JSON.parse(message.toString());
            
            if (data.type === "ping") {
              ws.isAlive = true;
              return;
            }
            
            if (data.type === "request") {
              console.log(`New request received in room ${roomId}:`, data.data);
              // Store request in database
              const request = await db.insert(requests).values({
                roomId: parseInt(data.data.roomId),
                musician: data.data.musician,
                instrument: data.data.musician,
                targetInstrument: data.data.targetInstrument,
                action: data.data.action,
              }).returning();

              // Broadcast to all clients in the room
              broadcastToRoom(roomId, {
                type: "request",
                data: request[0]
              });
            }
          } catch (error) {
            console.error("Error processing message:", error);
            ws.send(JSON.stringify({
              type: "error",
              message: "Error procesando el mensaje"
            }));
          }
        });

        ws.on("close", () => {
          removeFromRoom(ws);
        });

        ws.on("error", (error) => {
          console.error("WebSocket error:", error);
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
    await db.update(requests)
      .set({ completed: true })
      .where(eq(requests.id, parseInt(requestId)))
      .returning();
    
    // Notify all clients in the room that the request was completed
    broadcastToRoom(roomId, {
      type: "requestCompleted",
      data: { requestId }
    });
    
    res.json({ success: true });
  });

  return httpServer;
}
