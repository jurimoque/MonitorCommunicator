import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket(roomId: string, currentUserInstrument: string) {
  const [connected, setConnected] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      socketRef.current.close(); // Close existing connection before creating a new one
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
    
    const newSocket = new WebSocket(wsUrl);
    socketRef.current = newSocket;

    newSocket.onopen = () => setConnected(true);
    newSocket.onclose = () => setConnected(false);
    newSocket.onerror = (error) => console.error('Error de WebSocket:', error);

    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'initialRequests':
            setRequests(message.data || []);
            break;
          case 'newRequest':
            setRequests(prev => [...prev, message.data]);
            break;
          case 'requestCompleted':
            if (message.data?.musician === currentUserInstrument) {
              toast({ title: "Petición completada", description: "El técnico ha completado tu petición." });
            }
            setRequests(prev => prev.filter(req => req.id !== message.data.id));
            break;
          case 'allRequestsCompleted':
            setRequests([]);
            break;
          case 'initialInstruments':
            if (Array.isArray(message.data)) {
              setCustomInstruments(message.data.map(i => i.name));
            }
            break;
          case 'newInstrument':
            if (message.data?.name && !customInstruments.includes(message.data.name)) {
              setCustomInstruments(prev => [...prev, message.data.name]);
            }
            break;
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error);
      }
    };
  }, [roomId, currentUserInstrument, toast, customInstruments]);

  useEffect(() => {
    connect();

    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
          connect();
        }
      }
    });

    return () => {
      listener.remove();
      socketRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { connected, requests, customInstruments, sendMessage, setCustomInstruments, connect };
}
