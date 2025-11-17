import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket(roomId: string | undefined, currentUserInstrument: string) {
  const [connected, setConnected] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const currentUserInstrumentRef = useRef(currentUserInstrument);

  // Keep ref updated
  useEffect(() => {
    currentUserInstrumentRef.current = currentUserInstrument;
  }, [currentUserInstrument]);

  const connect = useCallback(() => {
    if (!roomId) {
      console.log('[WS Client] ❌ No roomId, no se puede conectar');
      return;
    }
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      console.log('[WS Client] ⚠️  Cerrando conexión existente antes de reconectar');
      socketRef.current.close();
    }

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

    console.log(`[WS Client] 🔌 Conectando a: ${wsUrl}`);
    console.log(`[WS Client] RoomId: ${roomId}`);
    console.log(`[WS Client] Es nativo: ${isNative}`);

    const newSocket = new WebSocket(wsUrl);
    socketRef.current = newSocket;

    newSocket.onopen = () => {
      console.log('[WS Client] ✅ Conexión abierta exitosamente');
      setConnected(true);
    };

    newSocket.onclose = (event) => {
      console.log('[WS Client] ❌ Conexión cerrada');
      console.log(`[WS Client] Código de cierre: ${event.code}`);
      console.log(`[WS Client] Razón: ${event.reason || 'Sin razón especificada'}`);
      console.log(`[WS Client] ¿Limpio?: ${event.wasClean}`);
      setConnected(false);
    };

    newSocket.onerror = (error) => {
      console.error('[WS Client] ❌ Error de WebSocket:', error);
      console.error('[WS Client] Error tipo:', error.type);
      console.error('[WS Client] Error target readyState:', (error.target as WebSocket)?.readyState);
    };

    // Register message handler IMMEDIATELY
    newSocket.onmessage = (event) => {
      console.log('[WS Client] 📨 Mensaje recibido del servidor');
      try {
        const message = JSON.parse(event.data);
        console.log('[WS Client] Tipo de mensaje:', message.type);
        console.log('[WS Client] Datos del mensaje:', message.data);

        switch (message.type) {
          case 'initialRequests':
            console.log(`[WS Client] ✅ Recibidas ${message.data?.length || 0} peticiones iniciales`);
            setRequests(message.data || []);
            break;
          case 'newRequest':
            console.log('[WS Client] ✅ Nueva petición recibida:', message.data);
            setRequests(prev => [...prev, message.data]);
            break;
          case 'requestCompleted':
            console.log('[WS Client] ✅ Petición completada:', message.data);
            if (message.data?.musician === currentUserInstrumentRef.current) {
              toast({ title: "Petición completada", description: "El técnico ha completado tu petición." });
            }
            setRequests(prev => prev.filter(req => req.id !== message.data.id));
            break;
          case 'allRequestsCompleted':
            console.log('[WS Client] ✅ Todas las peticiones completadas');
            setRequests([]);
            break;
          case 'initialInstruments':
            console.log(`[WS Client] ✅ Recibidos ${message.data?.length || 0} instrumentos iniciales`);
            if (Array.isArray(message.data)) {
              setCustomInstruments(message.data.map(i => i.name));
            }
            break;
          case 'newInstrument':
            console.log('[WS Client] ✅ Nuevo instrumento recibido:', message.data);
            setCustomInstruments(prev => {
              if (message.data?.name && !prev.includes(message.data.name)) {
                return [...prev, message.data.name];
              }
              return prev;
            });
            break;
          default:
            console.log('[WS Client] ⚠️  Tipo de mensaje desconocido:', message.type);
        }
      } catch (error) {
        console.error('[WS Client] ❌ Error procesando mensaje:', error);
      }
    };

  }, [roomId, toast]);

  useEffect(() => {
    if (!roomId) return;
    connect();

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const setupListener = async () => {
      listenerHandle = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          if ((!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) && roomId) {
            connect();
          }
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
      socketRef.current?.close();
    };
  }, [connect, roomId]);

  const sendMessage = useCallback((message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { connected, requests, customInstruments, sendMessage, setCustomInstruments, connect };
}
