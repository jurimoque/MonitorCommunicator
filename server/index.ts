import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupVite, serveStatic, log } from "./vite";
import { registerRoutes } from "./routes";

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

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Error]", err);
  const errorMessage = app.get("env") === "development" ? err.message : "Error interno del servidor";
  res.status(err.status || 500).json({ message: errorMessage });
});

// Función para limpiar recursos del servidor
async function cleanupServer(server: Server) {
  return new Promise<void>((resolve) => {
    server.close(() => {
      log("[Server] Servidor HTTP cerrado");
      resolve();
    });
  });
}

// Función para crear y configurar el servidor
async function createAndConfigureServer() {
  try {
    // Crear servidor HTTP y registrar rutas (WebSocket ya está configurado dentro de registerRoutes)
    const server = registerRoutes(app);
    log("[Server] Servidor HTTP y WebSocket creados");

    // Setup Vite o archivos estáticos
    if (app.get("env") === "development") {
      await setupVite(app, server);
      log("[Server] Vite configurado en modo desarrollo");
    } else {
      serveStatic(app);
      log("[Server] Archivos estáticos configurados");
    }

    return server;
  } catch (error) {
    log("[Server] Error en la configuración del servidor");
    throw error;
  }
}

// Inicialización del servidor con reintento de puertos
async function startServer(initialPort: number, maxRetries: number = 5) {
  let currentPort = initialPort;
  let attempts = 0;
  let server: Server | null = null;

  while (attempts < maxRetries) {
    try {
      log(`[Server] Intento ${attempts + 1} de ${maxRetries} en puerto ${currentPort}`);

      // Limpiar servidor anterior si existe
      if (server) {
        await cleanupServer(server);
        server = null;
      }

      // Crear y configurar nuevo servidor
      server = await createAndConfigureServer();

      // Intentar iniciar el servidor
      await new Promise<void>((resolve, reject) => {
        if (!server) {
          reject(new Error("No se pudo crear el servidor"));
          return;
        }
        
        const errorHandler = (error: Error) => {
          server?.removeListener('error', errorHandler);
          reject(error);
        };

        server.once('error', errorHandler);

        server.listen(currentPort, "0.0.0.0", () => {
          server?.removeListener('error', errorHandler);
          log(`[Server] Servidor iniciado exitosamente en puerto ${currentPort}`);
          resolve();
        });
      });

      return; // Servidor iniciado correctamente
    } catch (error: any) {
      attempts++;

      if (error.code === 'EADDRINUSE') {
        log(`[Server] Puerto ${currentPort} en uso, intentando puerto ${currentPort + 1}...`);
        currentPort++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.error(`[Server] Error inesperado:`, error);
        if (attempts === maxRetries) {
          if (server) {
            await cleanupServer(server);
          }
          throw new Error(`No se pudo iniciar el servidor después de ${maxRetries} intentos: ${error.message}`);
        }
      }
    }
  }
}

// Iniciar el servidor
startServer(5000).catch(error => {
  console.error("[Server] Error fatal:", error);
  process.exit(1);
});