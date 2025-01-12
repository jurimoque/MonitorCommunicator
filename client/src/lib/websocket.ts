import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";

interface WebSocketMessage {
  type: string;
  data: any;
}

interface PendingRequest {
  message: WebSocketMessage;
  timestamp: number;
}

export function useWebSocket(roomId: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const { toast } = useToast();
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const pendingRequests = useRef<PendingRequest[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const MAX_RECONNECT_DELAY = 10000; // 10 segundos máximo entre intentos
  const MAX_RECONNECT_ATTEMPTS = 10;  // Aumentado a 10 intentos
  const PENDING_REQUEST_TIMEOUT = 60000; // 1 minuto para peticiones pendientes

  const processPendingRequests = useCallback(() => {
    if (!connected) return;

    const now = Date.now();
    const validRequests = pendingRequests.current.filter(
      req => now - req.timestamp < PENDING_REQUEST_TIMEOUT
    );

    validRequests.forEach(request => {
      if (ws?.readyState === WebSocket.OPEN) {
        console.log('[WS] Reintentando envío de mensaje pendiente:', request.message);
        ws.send(JSON.stringify(request.message));
      }
    });

    pendingRequests.current = validRequests;
  }, [ws, connected]);

  const connect = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) return;

    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[WS] Máximo número de intentos alcanzado');
      // Solo mostrar un toast cada 30 segundos
      toast({
        title: "Problemas de conexión",
        description: "Intentando restablecer la conexión...",
        variant: "default", // Cambiado de "destructive" a "default"
      });
      setReconnectAttempt(0); // Reiniciar contador para permitir nuevos intentos
      return;
    }

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/${roomId}`;
      console.log(`[WS] Conectando a ${wsUrl}`);

      const socket = new WebSocket(wsUrl);
      let heartbeatInterval: NodeJS.Timeout;
      let pendingCheckInterval: NodeJS.Timeout;

      socket.onopen = () => {
        console.log('[WS] Conexión establecida');
        setConnected(true);
        setReconnectAttempt(0);
        processPendingRequests();

        // Heartbeat cada 45 segundos
        heartbeatInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 45000);

        // Revisar mensajes pendientes cada 10 segundos
        pendingCheckInterval = setInterval(processPendingRequests, 10000);
      };

      socket.onclose = (event) => {
        console.log('[WS] Conexión cerrada:', event.code, event.reason);
        setConnected(false);
        setWs(null);
        clearInterval(heartbeatInterval);
        clearInterval(pendingCheckInterval);

        // No mostrar mensaje si es un cierre normal
        if (event.code !== 1000) {
          const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttempt), MAX_RECONNECT_DELAY);
          console.log(`[WS] Reconectando en ${timeout}ms`);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connect();
          }, timeout);
        }
      };

      socket.onerror = (error) => {
        console.error('[WS] Error:', error);
        // No mostrar toast en errores para evitar spam
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Mensaje recibido:', data);

          if (data.type === 'pong') {
            return;
          }

          switch (data.type) {
            case 'request':
              setMessages(prev => {
                const exists = prev.some(msg => msg.id === data.data.id);
                if (!exists) {
                  return [...prev, data.data];
                }
                return prev;
              });
              break;
            case 'requestCompleted':
              setMessages(prev => 
                prev.filter(msg => msg.id !== data.data.requestId)
              );
              break;
            case 'requestConfirmed':
              pendingRequests.current = pendingRequests.current.filter(
                req => req.message.data?.id !== data.data.id
              );
              toast({
                title: "Petición enviada",
                description: "Tu petición ha sido recibida correctamente",
                variant: "default"
              });
              break;
            case 'error':
              console.error('[WS] Error recibido:', data.message);
              toast({
                title: "Error",
                description: data.message,
                variant: "destructive"
              });
              break;
          }
        } catch (error) {
          console.error('[WS] Error procesando mensaje:', error);
        }
      };

      setWs(socket);

      return () => {
        console.log('[WS] Limpiando conexión');
        clearInterval(heartbeatInterval);
        clearInterval(pendingCheckInterval);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, "Cierre normal");
        }
      };
    } catch (error) {
      console.error('[WS] Error de conexión:', error);
      const timeout = Math.min(1000 * Math.pow(1.5, reconnectAttempt), MAX_RECONNECT_DELAY);
      if (reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
        reconnectTimeoutRef.current = setTimeout(connect, timeout);
      }
    }
  }, [roomId, toast, reconnectAttempt, processPendingRequests]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (cleanup) cleanup();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('[WS] Guardando mensaje para reintento:', message);
      pendingRequests.current.push({
        message,
        timestamp: Date.now()
      });
      return false;
    }

    try {
      console.log('[WS] Enviando mensaje:', message);
      ws.send(JSON.stringify(message));
      if (message.type === 'request') {
        pendingRequests.current.push({
          message,
          timestamp: Date.now()
        });
      }
      return true;
    } catch (error) {
      console.error('[WS] Error enviando mensaje:', error);
      pendingRequests.current.push({
        message,
        timestamp: Date.now()
      });
      return false;
    }
  }, [ws]);

  return { connected, messages, sendMessage };
}