import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import RequestQueue from "@/components/RequestQueue";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";

interface Request {
  id: number;
  musician: string;
  targetInstrument: string;
  action: string;
  completed: boolean;
}

export default function TechnicianPanel() {
  const { roomId } = useParams();
  const { connected, messages } = useWebSocket(roomId!);
  const [requests, setRequests] = useState<Request[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (Array.isArray(messages)) {
      const currentRequests = messages.filter(msg => !msg.completed);
      setRequests(currentRequests);
    }
  }, [messages]);

  const clearAllRequests = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/requests/clear`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Error al limpiar la cola');
      }

      // El WebSocket actualizará el estado automáticamente
      toast({
        title: "Cola limpiada",
        description: "Se han completado todas las peticiones",
        duration: 2000
      });
    } catch (error) {
      console.error('Error al limpiar cola:', error);
      toast({
        title: "Error",
        description: "No se pudieron completar todas las peticiones",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Theme toggle en la esquina superior derecha */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cola de Peticiones</CardTitle>
          <Button 
            variant="outline"
            onClick={clearAllRequests}
          >
            Limpiar Cola
          </Button>
          {!connected && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sin conexión</AlertTitle>
              <AlertDescription>
                No hay conexión con el servidor. Reconectando...
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <RequestQueue requests={requests} roomId={roomId!} />
        </CardContent>
      </Card>
    </div>
  );
}