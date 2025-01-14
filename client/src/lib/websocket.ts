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
    // Crear una nueva instancia de Socket.IO
    const newSocket = io("/music-room", {
      path: '/ws',
      query: { roomId },
      transports: ['websocket', 'polling'], // Añadimos polling como fallback
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true // Aseguramos que intente conectar automáticamente
    });

    // Manejadores de eventos
    newSocket.on("connect", () => {
      console.log('Conectado al servidor de WebSocket');
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log('Desconectado del servidor de WebSocket');
      setConnected(false);
    });

    newSocket.on("connect_error", (error: Error) => {
      console.error('Error de conexión WebSocket:', error);
      setConnected(false);
    });

    newSocket.on("joined", (data: any) => {
      console.log('Unido a sala:', data);
    });

    newSocket.on("initialRequests", (requests: any[]) => {
      console.log('Peticiones iniciales:', requests);
      if (Array.isArray(requests)) {
        setMessages(requests.filter(req => !req.completed));
      }
    });

    newSocket.on("newRequest", (request: any) => {
      console.log('Nueva petición:', request);
      setMessages(prev => {
        if (!request) return prev;
        return [...prev, request];
      });
    });

    newSocket.on("error", (error: any) => {
      console.error('Error de WebSocket:', error);
    });

    setSocket(newSocket);

    // Cleanup al desmontar
    return () => {
      console.log('Limpiando conexión WebSocket');
      newSocket.disconnect();
    };
  }, [roomId]);

  const sendMessage = useCallback((message: SocketRequest) => {
    if (!socket?.connected) {
      console.error('No se puede enviar el mensaje: socket desconectado');
      return false;
    }

    try {
      console.log('Enviando petición:', message);
      socket.emit("request", message);
      return true;
    } catch (error) {
      console.error('Error enviando petición:', error);
      return false;
    }
  }, [socket]);

  return { connected, messages, sendMessage };
}