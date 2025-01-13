import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
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
app.post("/api/rooms", async (req, res, next) => {
  try {
    if (!req.body.name || typeof req.body.name !== 'string') {
      return res.status(400).json({ message: "El nombre de la sala es requerido" });
    }

    const [room] = await db.insert(rooms)
      .values({
        name: req.body.name
      })
      .returning();

    log(`[API] Sala creada: ${JSON.stringify(room)}`);
    res.json(room);
  } catch (error) {
    console.error("[API] Error creando sala:", error);
    next(error);
  }
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Error interno del servidor";
  res.status(status).json({ message });
});

(async () => {
  try {
    // Verificar conexión a la base de datos
    await db.query.rooms.findFirst();
    log("Conexión a la base de datos establecida");

    // Crear servidor HTTP
    const server = createServer(app);

    // Configurar Socket.IO con opciones optimizadas
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      maxHttpBufferSize: 1e8,
      allowEIO3: true,
      path: '/ws'
    });

    // Manejar errores de Socket.IO a nivel global
    io.engine.on("connection_error", (err) => {
      console.error("[Socket.IO] Error de conexión:", err);
    });

    // Configurar WebSocket
    setupWebSocket(io);

    // Configurar Vite o servir archivos estáticos
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Iniciar servidor
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Servidor iniciado en puerto ${PORT}`);
      log("WebSocket habilitado en /ws");
    });

  } catch (err) {
    console.error('Error fatal al iniciar el servidor:', err);
    process.exit(1);
  }
})();