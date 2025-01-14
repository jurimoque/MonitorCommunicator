import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    console.log('[WebSocket] Iniciando conexión para sala:', roomId);

    // Crear socket con configuración básica
    const socketIo = io({
      path: '/ws',
      query: { roomId }
    });

    // Manejar conexión
    socketIo.on("connect", () => {
      console.log('[WebSocket] Conectado');
      setConnected(true);
    });

    // Manejar desconexión
    socketIo.on("disconnect", () => {
      console.log('[WebSocket] Desconectado');
      setConnected(false);
    });

    // Manejar errores de conexión
    socketIo.on("connect_error", (error) => {
      console.error('[WebSocket] Error de conexión:', error);
      setConnected(false);
    });

    // Manejar unión a sala
    socketIo.on("joined", (data) => {
      console.log('[WebSocket] Unido a sala:', data);
    });

    // Manejar peticiones iniciales
    socketIo.on("initialRequests", (requests) => {
      console.log('[WebSocket] Peticiones iniciales:', requests);
      if (Array.isArray(requests)) {
        setMessages(requests.filter(req => !req.completed));
      }
    });

    // Manejar nuevas peticiones
    socketIo.on("newRequest", (request) => {
      console.log('[WebSocket] Nueva petición:', request);
      setMessages(prev => {
        if (!request || prev.some(msg => msg.id === request.id)) {
          return prev;
        }
        return [...prev, request];
      });
    });

    setSocket(socketIo);

    // Limpiar al desmontar
    return () => {
      console.log('[WebSocket] Limpiando conexión');
      socketIo.disconnect();
    };
  }, [roomId]);

  // Función para enviar mensajes
  const sendMessage = useCallback((message: SocketRequest) => {
    if (!socket?.connected) {
      console.error('[WebSocket] No conectado, no se puede enviar mensaje');
      return false;
    }

    try {
      console.log('[WebSocket] Enviando petición:', message);
      socket.emit("request", message);
      return true;
    } catch (error) {
      console.error('[WebSocket] Error enviando petición:', error);
      return false;
    }
  }, [socket]);

  return { connected, messages, sendMessage };
}