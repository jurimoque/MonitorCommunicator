import React, { createContext, useContext } from 'react';
import { useWebSocket } from './websocket';
import { useToast } from '@/hooks/use-toast';

const WebSocketContext = createContext<any>(null);

export const useWebSocketContext = () => {
  return useContext(WebSocketContext);
};

interface WebSocketProviderProps {
  roomId: string;
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ roomId, children }) => {
  const { toast } = useToast();
  const webSocketValue = useWebSocket({ roomId, toast });

  return (
    <WebSocketContext.Provider value={webSocketValue}>
      {children}
    </WebSocketContext.Provider>
  );
};
