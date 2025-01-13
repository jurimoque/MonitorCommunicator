import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { db } from "@db";
import { rooms } from "@db/schema";
import { log } from "./vite";
import { setupVite, serveStatic } from "./vite";
import { setupWebSocket } from "./websocket";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    if (path.startsWith("/api") || path.startsWith("/ws")) {
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
    const [room] = await db.insert(rooms)
      .values({
        name: req.body.name || 'Sala sin nombre'
      })
      .returning();

    res.json(room);
  } catch (error) {
    console.error("[API] Error creando sala:", error);
    res.status(500).json({
      message: "Error al crear la sala"
    });
  }
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

(async () => {
  try {
    // Verificar conexión a la base de datos
    const testQuery = await db.query.rooms.findFirst();
    log("Conexión a la base de datos establecida correctamente");

    // Crear servidor HTTP
    const httpServer = createServer(app);

    // Configurar Socket.IO
    const io = new SocketIOServer(httpServer, {
      path: "/socket.io",
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 30000,
    });

    // Configurar WebSocket
    setupWebSocket(io);

    // Configurar Vite o servir archivos estáticos
    if (app.get("env") === "development") {
      await setupVite(app, httpServer);
    } else {
      serveStatic(app);
    }

    // Iniciar servidor
    const PORT = 5000;
    httpServer.listen(PORT, "0.0.0.0", () => {
      log(`Servidor ejecutándose en http://0.0.0.0:${PORT}`);
      log(`WebSocket disponible en ws://0.0.0.0:${PORT}/socket.io`);
    });

  } catch (err) {
    console.error('Error fatal al iniciar el servidor:', err);
    process.exit(1);
  }
})();