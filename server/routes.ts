import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Store active connections by room
  const roomConnections: Record<string, WebSocket[]> = {};

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    
    if (pathname.startsWith("/ws/")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        const roomId = pathname.split("/")[2];
        
        if (!roomConnections[roomId]) {
          roomConnections[roomId] = [];
        }
        roomConnections[roomId].push(ws);

        ws.on("message", async (message) => {
          const data = JSON.parse(message.toString());
          
          if (data.type === "request") {
            // Store request in database
            const request = await db.insert(requests).values({
              roomId: parseInt(data.data.roomId),
              musician: data.data.musician,
              instrument: data.data.musician,
              targetInstrument: data.data.targetInstrument,
              action: data.data.action,
            }).returning();

            // Broadcast to all clients in the room
            roomConnections[roomId].forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "request",
                  data: request[0]
                }));
              }
            });
          }
        });

        ws.on("close", () => {
          roomConnections[roomId] = roomConnections[roomId].filter(
            (conn) => conn !== ws
          );
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
    res.json({ success: true });
  });

  return httpServer;
}
