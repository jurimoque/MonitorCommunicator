import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";
import { setupVite, serveStatic, log } from "./vite";
import { setupWebSocket } from "./websocket";

const app = express();

// Configuración básica de Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    const [room] = await db.insert(rooms)
      .values({ name: req.body.name || 'Sala sin nombre' })
      .returning();
    res.json(room);
  } catch (error) {
    console.error("[API] Error creando sala:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

app.post("/api/rooms/:roomId/requests/:requestId/complete", async (req, res) => {
  try {
    const { roomId, requestId } = req.params;
    await db.update(requests)
      .set({ completed: true })
      .where(eq(requests.id, parseInt(requestId, 10)))
      .returning();
    res.json({ message: "Petición completada" });
  } catch (error) {
    console.error("[API] Error completando petición:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err);
  res.status(500).json({ message: "Error interno del servidor" });
});

// Inicialización del servidor con reintento de puertos
async function startServer(initialPort: number, maxRetries: number = 5) {
  let currentPort = initialPort;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      // Crear servidor HTTP
      const server = createServer(app);

      // Configurar Socket.IO después de crear el servidor HTTP
      const io = new Server(server, {
        path: '/ws',
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling']
      });

      // Setup WebSocket handlers
      setupWebSocket(io);

      // Setup Vite o archivos estáticos
      if (app.get("env") === "development") {
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }

      // Intentar iniciar el servidor
      await new Promise<void>((resolve, reject) => {
        server.once('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            log(`Puerto ${currentPort} en uso, intentando siguiente puerto...`);
            currentPort++;
            reject(err);
          } else {
            console.error(`[Server] Error al iniciar en puerto ${currentPort}:`, err);
            reject(err);
          }
        });

        server.listen(currentPort, "0.0.0.0", () => {
          log(`[Server] Servidor HTTP iniciado en puerto ${currentPort}`);
          log(`[Server] Socket.IO configurado en path: /ws`);
          resolve();
        });
      });

      // Si llegamos aquí, el servidor inició correctamente
      return;
    } catch (error) {
      attempts++;
      if (attempts === maxRetries) {
        console.error("[Server] Error fatal al iniciar después de múltiples intentos:", error);
        process.exit(1);
      }
      // Esperar un momento antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Iniciar el servidor
startServer(5000).catch(error => {
  console.error("[Server] Error fatal:", error);
  process.exit(1);
});