import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket(roomId: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const { toast } = useToast();
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const MAX_RECONNECT_DELAY = 5000;
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) return;
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      toast({
        title: "Error de conexión",
        description: "No se pudo establecer la conexión después de varios intentos",
        variant: "destructive",
      });
      return;
    }

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/${roomId}`;
      console.log('Conectando a:', wsUrl);

      const socket = new WebSocket(wsUrl);
      let heartbeatInterval: NodeJS.Timeout;

      socket.onopen = () => {
        console.log('WebSocket conectado');
        setConnected(true);
        setReconnectAttempt(0);
        // Iniciar heartbeat
        heartbeatInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      socket.onclose = (event) => {
        console.log('WebSocket desconectado:', event.code, event.reason);
        setConnected(false);
        setWs(null);
        clearInterval(heartbeatInterval);

        if (event.code !== 1000 && reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
          const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttempt), MAX_RECONNECT_DELAY);
          console.log(`Intentando reconexión en ${timeout}ms... (intento ${reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connect();
          }, timeout);
        }
      };

      socket.onerror = (error) => {
        console.error('Error de WebSocket:', error);
      };

      socket.onmessage = (event) => {
        try {
          console.log('Mensaje recibido:', event.data);
          const data = JSON.parse(event.data);

          if (data.type === 'pong') return;

          switch (data.type) {
            case 'request':
              setMessages(prev => {
                const exists = prev.some(msg => msg.id === data.data.id);
                return exists ? prev : [...prev, data.data];
              });
              break;
            case 'requestCompleted':
              setMessages(prev => prev.filter(msg => msg.id !== data.data.requestId));
              break;
            case 'requestConfirmed':
              toast({
                title: "Petición enviada",
                description: "Tu petición ha sido recibida correctamente",
              });
              break;
            case 'error':
              toast({
                title: "Error",
                description: data.message,
                variant: "destructive",
              });
              break;
          }
        } catch (error) {
          console.error('Error procesando mensaje:', error);
        }
      };

      setWs(socket);

      return () => {
        clearInterval(heartbeatInterval);
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, "Cierre normal");
        }
      };
    } catch (error) {
      console.error('Error de conexión:', error);
      const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttempt), MAX_RECONNECT_DELAY);
      if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(connect, timeout);
      }
    }
  }, [roomId, toast, reconnectAttempt]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast({
        title: "Sin conexión",
        description: "Esperando conexión para enviar el mensaje...",
        variant: "destructive",
      });
      return false;
    }

    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      toast({
        title: "Error de envío",
        description: "No se pudo enviar el mensaje. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
      return false;
    }
  }, [ws, toast]);

  return { connected, messages, sendMessage };
}