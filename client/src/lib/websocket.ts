import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App, PluginListenerHandle } from '@capacitor/app';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket(roomId: string, currentUserInstrument: string) {
  const [connected, setConnected] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [customInstruments, setCustomInstruments] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
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
    
    const newSocket = new WebSocket(wsUrl);
    socketRef.current = newSocket;

    newSocket.onopen = () => {
      if (isMounted.current) setConnected(true);
    };
    newSocket.onclose = () => {
      if (isMounted.current) setConnected(false);
    };
    newSocket.onerror = (error) => console.error('WebSocket Error:', error);

    newSocket.onmessage = (event) => {
      if (!isMounted.current) return;
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
              const instrumentNames = message.data.map(i => i.name);
              setCustomInstruments(prev => [...new Set([...prev, ...instrumentNames])]);
            }
            break;
          case 'newInstrument':
            if (message.data?.name) {
              setCustomInstruments(prev => 
                prev.includes(message.data.name) ? prev : [...new Set([...prev, message.data.name])]
              );
            }
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };
  }, [roomId, currentUserInstrument, toast]);

  useEffect(() => {
    connect();
    let listener: PluginListenerHandle;

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED)) {
        connect();
      }
    }).then(l => listener = l);

    return () => {
      listener?.remove();
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