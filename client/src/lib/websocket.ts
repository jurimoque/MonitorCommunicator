import { useState, useEffect, useCallback } from 'react';

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

export function useWebSocket(roomId: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // Crear una nueva instancia de WebSocket nativo
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    
    // En desarrollo, usar el puerto correcto del servidor
    let host = window.location.host;
    if (import.meta.env.DEV) {
      // En desarrollo, forzar el puerto 5000 donde está el servidor
      host = window.location.hostname + ':5000';
    }
    
    const wsUrl = `${protocol}//${host}/ws?roomId=${roomId}`;
    console.log('Conectando WebSocket a:', wsUrl);
    const newSocket = new WebSocket(wsUrl);

    // Manejadores de eventos
    newSocket.onopen = () => {
      console.log('Conectado al servidor de WebSocket');
      setConnected(true);
    };

    newSocket.onclose = (event) => {
      console.log(`Desconectado del servidor de WebSocket: ${event.code} ${event.reason}`);
      setConnected(false);
      
      // Reconexión automática después de 3 segundos si no fue un cierre normal o por ir a otra página
      if (event.code !== 1000 && event.code !== 1001) {
        setTimeout(() => {
          console.log('Intentando reconectar...');
          // La reconexión se hará al montar de nuevo el componente
        }, 3000);
      }
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
              setMessages(message.data.filter(req => !req.completed));
            }
            break;
          
          case 'newRequest':
            if (message.data) {
              setMessages(prev => [...prev, message.data]);
            }
            break;
          
          case 'requestCompleted':
            if (message.data) {
              setMessages(prev => prev.filter(req => req.id !== message.data.id));
            }
            break;
          
          case 'allRequestsCompleted':
            setMessages([]);
            break;
          
          default:
            console.log('Mensaje no reconocido:', message);
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error);
      }
    };

    setSocket(newSocket);

    // Cleanup al desmontar
    return () => {
      console.log('Limpiando conexión WebSocket');
      // Cerramos normalmente, código 1000
      newSocket.close(1000, 'Navegación a otra página');
    };
  }, [roomId]);

  const sendMessage = useCallback((message: SocketRequest) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('No se puede enviar el mensaje: socket no está listo');
      return false;
    }

    try {
      console.log('Enviando petición:', message);
      socket.send(JSON.stringify({
        type: 'request',
        data: message
      }));
      return true;
    } catch (error) {
      console.error('Error enviando petición:', error);
      return false;
    }
  }, [socket]);

  return { connected, messages, sendMessage };
}