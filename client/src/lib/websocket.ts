import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";

interface SocketRequest {
  musician: string;
  targetInstrument: string;
  action: string;
  roomId: string;
}

export function useWebSocket(roomId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const socketIo = io("/music-room", {
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socketIo.on("connect", () => {
      console.log('[Socket.IO] Conectado');
      setConnected(true);
      socketIo.emit("join", roomId);
    });

    socketIo.on("disconnect", () => {
      console.log('[Socket.IO] Desconectado');
      setConnected(false);
    });

    socketIo.on("joined", (data) => {
      console.log('[Socket.IO] Unido a sala:', data.roomId);
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
      return false;
    }

    try {
      console.log('[Socket.IO] Enviando mensaje:', message);
      socket.emit("request", message);
      return true;
    } catch (error) {
      console.error('[Socket.IO] Error enviando mensaje:', error);
      return false;
    }
  }, [socket]);

  return { connected, messages, sendMessage };
}