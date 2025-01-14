import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { db } from "@db";
import { rooms } from "@db/schema";
import { setupVite, serveStatic, log } from "./vite";
import { setupWebSocket } from "./websocket";

const app = express();
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// API Routes
app.post("/api/rooms", async (req, res) => {
  try {
    console.log("[API] Creando sala:", req.body);
    const [room] = await db.insert(rooms)
      .values({ name: req.body.name || 'Sala sin nombre' })
      .returning();
    console.log("[API] Sala creada:", room);
    res.json(room);
  } catch (error) {
    console.error("[API] Error creando sala:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err);
  res.status(500).json({ message: "Error interno del servidor" });
});

// Create server and Socket.IO instance
const server = createServer(app);
const io = new Server(server, {
  path: '/ws',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Setup WebSocket handlers
setupWebSocket(io);

// Setup Vite or static files
if (app.get("env") === "development") {
  setupVite(app, server).catch(console.error);
} else {
  serveStatic(app);
}

// Start server
const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});