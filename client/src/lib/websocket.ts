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

  const connect = useCallback(() => {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/${roomId}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setConnected(true);
        toast({
          title: "Conectado",
          description: "Conexión establecida con éxito",
        });
      };

      socket.onclose = () => {
        setConnected(false);
        toast({
          title: "Desconectado",
          description: "Intentando reconectar...",
          variant: "destructive",
        });
        // Intentar reconectar después de 3 segundos
        setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Error de conexión",
          description: "No se pudo establecer la conexión",
          variant: "destructive",
        });
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'request') {
            setMessages(prev => [...prev, data.data]);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      setWs(socket);
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo establecer la conexión. Reintentando...",
        variant: "destructive",
      });
      // Intentar reconectar después de 3 segundos
      setTimeout(connect, 3000);
    }
  }, [roomId, toast]);

  useEffect(() => {
    connect();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      toast({
        title: "Error de envío",
        description: "No se pudo enviar el mensaje. Por favor, espera a que se restablezca la conexión.",
        variant: "destructive",
      });
    }
  }, [ws, toast]);

  return { connected, messages, sendMessage };
}
