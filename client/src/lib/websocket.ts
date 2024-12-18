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
      setTimeout(connect, 3000);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'request') {
        setMessages(prev => [...prev, data.data]);
      }
    };

    setWs(socket);
  }, [roomId, toast]);

  useEffect(() => {
    connect();
    return () => ws?.close();
  }, [connect, ws]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, [ws]);

  return { connected, messages, sendMessage };
}
