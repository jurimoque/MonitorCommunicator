import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface SocketRequest {
  musician: string;
  targetInstrument: string;
  action: string;
  roomId: string;
  instrument: string;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  roomId?: string;
}

interface UseWebSocketOptions {
  roomId: string;
  toast: (options: any) => void;
}

export function useWebSocket({ roomId, toast }: UseWebSocketOptions) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [requests, setRequests] = useState<any[]>([]); // Renamed from 'messages'
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform();
    let wsUrl = '';

    if (isNative) {
      if (import.meta.env.DEV) {
        wsUrl = `ws://10.0.2.2:5000/ws?roomId=${roomId}`;
      } else {
        wsUrl = `wss://monitorcommunicator.onrender.com/ws?roomId=${roomId}`;
      }
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      let host = window.location.host;
      if (import.meta.env.DEV) {
        host = window.location.hostname + ':5000';
      }
      wsUrl = `${protocol}//${host}/ws?roomId=${roomId}`;
    }
    
    console.log('Conectando WebSocket a:', wsUrl);
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log('Conectado al servidor de WebSocket');
      setConnected(true);
    };

    newSocket.onclose = (event) => {
      console.log(`Desconectado del servidor de WebSocket: ${event.code} ${event.reason}`);
      setConnected(false);
    };

    newSocket.onerror = (error) => {
      console.error('Error de WebSocket:', error);
      setConnected(false);
    };

    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        console.log('Mensaje recibido:', message);

        switch (message.type) {
          case 'initialRequests':
            if (Array.isArray(message.data)) {
              setRequests(message.data.filter(req => !req.completed));
            }
            break;
          
          case 'newRequest':
            if (message.data) {
              setRequests(prev => [...prev, message.data]);
            }
            break;
          
          case 'requestCompleted':
            if (message.data && message.data.id) {
              setRequests(prev => prev.filter(req => req.id !== message.data.id));
            }
            break;
          
          case 'allRequestsCompleted':
            setRequests([]);
            break;
          
          case 'newInstrument':
            if (message.data && message.data.name) {
              setCustomInstruments(prev => {
                if (!prev.includes(message.data.name)) {
                  return [...prev, message.data.name];
                }
                return prev;
              });
            }
            break;
          
          default:
            console.log('Mensaje no reconocido:', message);
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error);
      }
    };

    setSocket(newSocket);

    return () => {
      console.log('Limpiando conexión WebSocket');
      newSocket.close(1000, 'Navegación a otra página');
    };
  }, [roomId]);

  const sendMessage = useCallback((message: object) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('No se puede enviar el mensaje: socket no está listo');
      return false;
    }

    try {
      console.log('Enviando mensaje:', message);
      socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return false;
    }
  }, [socket]);

  return { connected, requests, sendMessage, customInstruments, setCustomInstruments };
}