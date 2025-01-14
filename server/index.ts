import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { db } from "@db";
import { rooms, requests } from "@db/schema";
import { eq } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[HTTP] ${req.method} ${req.path} - Iniciando`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// API Routes
app.post("/api/rooms", async (req, res, next) => {
  try {
    console.log("[API] Creando sala:", req.body);

    if (!req.body.name || typeof req.body.name !== 'string') {
      console.log("[API] Error: Nombre de sala inválido");
      return res.status(400).json({ message: "El nombre de la sala es requerido" });
    }

    const [room] = await db.insert(rooms)
      .values({ name: req.body.name })
      .returning();

    console.log("[API] Sala creada:", room);
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
    console.log("Iniciando servidor...");

    // Verificar conexión a la base de datos
    await db.query.rooms.findFirst();
    console.log("Conexión a la base de datos establecida");

    const server = createServer(app);

    // Configuración de Socket.IO
    const io = new Server(server, {
      cors: { origin: "*" },
      path: '/ws'
    });

    // Socket.IO eventos
    io.on("connection", async (socket) => {
      console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

      // Obtener roomId de la query
      const roomId = socket.handshake.query.roomId as string;
      if (!roomId) {
        console.log(`[Socket.IO] Cliente ${socket.id} sin roomId`);
        socket.disconnect();
        return;
      }

      try {
        // Verificar que la sala existe
        const roomIdNum = parseInt(roomId, 10);
        const room = await db.query.rooms.findFirst({
          where: eq(rooms.id, roomIdNum)
        });

        if (!room) {
          console.log(`[Socket.IO] Sala ${roomId} no encontrada`);
          socket.disconnect();
          return;
        }

        // Unir al socket a la sala
        await socket.join(roomId);
        console.log(`[Socket.IO] Cliente ${socket.id} unido a sala ${roomId}`);

        // Obtener y enviar peticiones pendientes
        const pendingRequests = await db.query.requests.findMany({
          where: eq(requests.roomId, roomIdNum)
        });

        const activeRequests = pendingRequests.filter(req => !req.completed);
        console.log(`[Socket.IO] Enviando ${activeRequests.length} peticiones iniciales a ${socket.id}`);

        socket.emit("joined", { roomId, name: room.name });
        socket.emit("initialRequests", activeRequests);

        // Manejar nuevas peticiones
        socket.on("request", async (data: any) => {
          console.log(`[Socket.IO] Nueva petición de ${socket.id}:`, data);

          try {
            const [newRequest] = await db.insert(requests)
              .values({
                roomId: roomIdNum,
                musician: data.musician,
                instrument: data.instrument,
                targetInstrument: data.targetInstrument,
                action: data.action,
              })
              .returning();

            console.log(`[Socket.IO] Petición creada:`, newRequest);
            io.to(roomId).emit("newRequest", newRequest);
          } catch (error) {
            console.error(`[Socket.IO] Error procesando petición:`, error);
            socket.emit("error", { message: "Error al procesar la petición" });
          }
        });

        // Manejar desconexión
        socket.on("disconnect", (reason) => {
          console.log(`[Socket.IO] Cliente ${socket.id} desconectado. Razón: ${reason}`);
        });

      } catch (error) {
        console.error(`[Socket.IO] Error general:`, error);
        socket.disconnect();
      }
    });

    // Configurar Vite o servir archivos estáticos
    if (app.get("env") === "development") {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    } else {
      const { serveStatic } = await import("./vite");
      serveStatic(app);
    }

    // Iniciar servidor
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor iniciado en puerto ${PORT}`);
    });

  } catch (err) {
    console.error('Error fatal al iniciar el servidor:', err);
    process.exit(1);
  }
})();