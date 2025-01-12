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

  const connect = useCallback(() => {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/${roomId}`;
      console.log('Conectando a:', wsUrl);

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket conectado');
        setConnected(true);
        setReconnectAttempt(0);
        toast({
          title: "Conectado",
          description: "Conexión establecida con éxito",
        });
      };

      socket.onclose = () => {
        console.log('WebSocket desconectado');
        setConnected(false);

        // Incrementar contador de intentos
        setReconnectAttempt(prev => prev + 1);

        // Tiempo de espera exponencial para reconexión
        const timeout = Math.min(1000 * Math.pow(2, reconnectAttempt), 10000);
        setTimeout(connect, timeout);
      };

      socket.onerror = (error) => {
        console.error('Error de WebSocket:', error);
      };

      socket.onmessage = (event) => {
        try {
          console.log('Mensaje recibido:', event.data);
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'request':
              setMessages(prev => [...prev, data.data]);
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
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    } catch (error) {
      console.error('Error de conexión:', error);
      const timeout = Math.min(1000 * Math.pow(2, reconnectAttempt), 10000);
      setTimeout(connect, timeout);
    }
  }, [roomId, toast, reconnectAttempt]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws?.readyState === WebSocket.OPEN) {
      console.log('Enviando mensaje:', message);
      ws.send(JSON.stringify(message));
      return true;
    } else {
      console.log('No se puede enviar mensaje - WebSocket no conectado');
      toast({
        title: "Error de envío",
        description: "No se pudo enviar el mensaje. Por favor, espera a que se restablezca la conexión.",
        variant: "destructive",
      });
      return false;
    }
  }, [ws, toast]);

  return { connected, messages, sendMessage };
}