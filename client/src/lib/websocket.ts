import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { io } from "socket.io-client";

interface SocketRequest {
  musician: string;
  targetInstrument: string;
  action: string;
  roomId: string;
  instrument: string;
}

export function useWebSocket(roomId: string) {
  const [socket, setSocket] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const { toast } = useToast();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log('[Socket.IO] Iniciando conexión para sala:', roomId);

    const socketIo = io("/music-room", {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnectionDelay: Math.min(1000 * Math.pow(2, retryCount), 10000), // Exponential backoff
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true,
      query: { roomId }
    });

    // Event handlers
    socketIo.on("connect", () => {
      console.log('[Socket.IO] Conectado al servidor');
      setConnected(true);
      setRetryCount(0);
      socketIo.emit("join", roomId);
    });

    socketIo.on("disconnect", (reason) => {
      console.log('[Socket.IO] Desconectado:', reason);
      setConnected(false);

      if (retryCount < 5) {
        setRetryCount(prev => prev + 1);
        toast({
          title: "Desconectado",
          description: "Se perdió la conexión. Reconectando...",
          variant: "destructive",
          duration: 3000,
        });
      } else {
        toast({
          title: "Error de conexión",
          description: "No se pudo reconectar al servidor. Por favor, recarga la página.",
          variant: "destructive",
          duration: 5000,
        });
      }
    });

    socketIo.on("connect_error", (error) => {
      console.error('[Socket.IO] Error de conexión:', error);
      setConnected(false);
    });

    socketIo.on("error", (error: any) => {
      console.error('[Socket.IO] Error:', error);
      toast({
        title: "Error",
        description: error.message || "Error de conexión",
        variant: "destructive",
        duration: 3000,
      });
    });

    // Room event handlers
    socketIo.on("joined", (data) => {
      console.log('[Socket.IO] Unido a sala:', data);
      toast({
        title: "Conectado",
        description: `Te has unido a la sala: ${data.name}`,
        duration: 3000,
      });
    });

    socketIo.on("initialRequests", (requests) => {
      console.log('[Socket.IO] Peticiones iniciales:', requests);
      if (Array.isArray(requests)) {
        setMessages(requests.filter(req => !req.completed));
      }
    });

    socketIo.on("requestConfirmed", (request) => {
      console.log('[Socket.IO] Petición confirmada:', request);
      toast({
        title: "Petición enviada",
        description: "Tu petición ha sido recibida",
        duration: 3000,
      });
    });

    socketIo.on("newRequest", (request) => {
      console.log('[Socket.IO] Nueva petición:', request);
      setMessages(prev => {
        if (!request || prev.some(msg => msg.id === request.id) || request.completed) {
          return prev;
        }
        return [...prev, request];
      });
    });

    socketIo.on("requestCompleted", ({ requestId }) => {
      console.log('[Socket.IO] Petición completada:', requestId);
      setMessages(prev => prev.filter(msg => msg.id !== requestId));
      toast({
        title: "Petición completada",
        description: "La petición ha sido completada",
        duration: 3000,
      });
    });

    setSocket(socketIo);

    return () => {
      console.log('[Socket.IO] Limpiando conexión');
      socketIo.removeAllListeners();
      socketIo.disconnect();
    };
  }, [roomId, toast, retryCount]);

  const sendMessage = useCallback((message: SocketRequest) => {
    if (!socket?.connected) {
      console.error('[Socket.IO] No conectado, no se puede enviar mensaje');
      toast({
        title: "Error",
        description: "No hay conexión con el servidor",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }

    try {
      console.log('[Socket.IO] Enviando petición:', message);
      socket.emit("request", message);
      return true;
    } catch (error) {
      console.error('[Socket.IO] Error enviando petición:', error);
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