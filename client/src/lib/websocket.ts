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
    const socket = io("/music-room", {
      path: '/ws',
      query: { roomId },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log('Conectado al servidor');
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log('Desconectado del servidor');
      setConnected(false);
    });

    socket.on("joined", (data) => {
      console.log('Unido a sala:', data);
    });

    socket.on("initialRequests", (requests) => {
      console.log('Peticiones iniciales:', requests);
      if (Array.isArray(requests)) {
        setMessages(requests.filter(req => !req.completed));
      }
    });

    socket.on("newRequest", (request) => {
      console.log('Nueva petición:', request);
      setMessages(prev => {
        if (!request) return prev;
        return [...prev, request];
      });
    });

    socket.on("error", (error) => {
      console.error('Error:', error);
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
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