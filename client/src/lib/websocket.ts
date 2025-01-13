import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

interface SocketRequest {
  musician: string;
  targetInstrument: string;
  action: string;
  roomId: string;
  instrument: string;
}

export function useWebSocket(roomId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Configuración del socket con opciones mejoradas de reconexión
    const socketIo = io("/music-room", {
      path: "/socket.io",
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      auth: {
        roomId
      }
    });

    // Manejadores de eventos de conexión
    socketIo.on("connect", () => {
      console.log('[Socket.IO] Conectado al servidor');
      setConnected(true);
      socketIo.emit("join", roomId);
    });

    socketIo.on("connect_error", (error) => {
      console.error('[Socket.IO] Error de conexión:', error);
      setConnected(false);
      toast({
        title: "Error de conexión",
        description: "Intentando reconectar al servidor...",
        variant: "destructive",
        duration: 3000,
      });
    });

    socketIo.on("disconnect", (reason) => {
      console.log('[Socket.IO] Desconectado:', reason);
      setConnected(false);
      if (reason === "io server disconnect") {
        socketIo.connect();
      }
    });

    socketIo.on("reconnect", (attemptNumber) => {
      console.log('[Socket.IO] Reconectado después de', attemptNumber, 'intentos');
      socketIo.emit("join", roomId);
    });

    // Manejadores de eventos específicos de la aplicación
    socketIo.on("joined", (data) => {
      console.log('[Socket.IO] Unido a sala:', data);
      toast({
        title: "Conectado",
        description: `Te has unido a la sala: ${data.name}`,
        duration: 3000,
      });
    });

    socketIo.on("error", (error) => {
      console.error('[Socket.IO] Error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    });

    socketIo.on("initialRequests", (requests) => {
      console.log('[Socket.IO] Peticiones iniciales recibidas:', requests);
      if (Array.isArray(requests)) {
        setMessages(requests.filter(req => !req.completed));
      }
    });

    socketIo.on("requestConfirmed", (request) => {
      console.log('[Socket.IO] Petición confirmada:', request);
      toast({
        title: "Petición enviada",
        description: "Tu petición ha sido recibida correctamente",
        duration: 3000,
      });
    });

    socketIo.on("newRequest", (request) => {
      console.log('[Socket.IO] Nueva petición recibida:', request);
      setMessages(prev => {
        // Evitar duplicados
        const exists = prev.some(msg => msg.id === request.id);
        if (!exists) {
          return [...prev, request];
        }
        return prev;
      });
    });

    socketIo.on("requestCompleted", ({ requestId }) => {
      console.log('[Socket.IO] Petición completada:', requestId);
      setMessages(prev => prev.filter(msg => msg.id !== requestId));
    });

    setSocket(socketIo);

    return () => {
      console.log('[Socket.IO] Limpiando conexión');
      socketIo.disconnect();
    };
  }, [roomId, toast]);

  const sendMessage = useCallback((message: SocketRequest) => {
    if (!socket?.connected) {
      console.log('[Socket.IO] No conectado, no se puede enviar mensaje');
      toast({
        title: "Error",
        description: "No hay conexión con el servidor",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    try {
      console.log('[Socket.IO] Enviando mensaje:', message);
      socket.emit("request", message);
      return true;
    } catch (error) {
      console.error('[Socket.IO] Error enviando mensaje:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la petición",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }
  }, [socket, toast]);

  return { connected, messages, sendMessage };
}