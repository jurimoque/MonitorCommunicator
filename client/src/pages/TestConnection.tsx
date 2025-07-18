import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestConnection() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?roomId=1`;
    
    addLog(`Intentando conectar a: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      addLog("Conexión WebSocket establecida");
      setConnected(true);
      setSocket(ws);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addLog(`Mensaje recibido: ${JSON.stringify(data)}`);
      setMessages(prev => [...prev, JSON.stringify(data, null, 2)]);
    };
    
    ws.onclose = (event) => {
      addLog(`Conexión cerrada: ${event.code} - ${event.reason}`);
      setConnected(false);
    };
    
    ws.onerror = (error) => {
      addLog(`Error WebSocket: ${error}`);
      setConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, []);

  const sendTestMessage = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const testMessage = {
        type: 'request',
        data: {
          roomId: '1',
          musician: 'Batería',
          instrument: 'Batería',
          targetInstrument: 'Guitarra',
          action: 'volume_up'
        }
      };
      
      socket.send(JSON.stringify(testMessage));
      addLog(`Enviado: ${JSON.stringify(testMessage)}`);
    } else {
      addLog("Socket no está conectado");
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Test de Conexión WebSocket</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <strong>Estado:</strong> {connected ? "Conectado" : "Desconectado"}
            </div>
            
            <Button 
              onClick={sendTestMessage} 
              disabled={!connected}
              className="w-full"
            >
              Enviar Mensaje de Prueba
            </Button>
            
            <div>
              <h3 className="font-semibold mb-2">Logs de Conexión:</h3>
              <div className="bg-gray-100 p-3 rounded max-h-40 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">{log}</div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Mensajes Recibidos:</h3>
              <div className="bg-gray-100 p-3 rounded max-h-40 overflow-y-auto">
                {messages.map((msg, index) => (
                  <pre key={index} className="text-sm">{msg}</pre>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}