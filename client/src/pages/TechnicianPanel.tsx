import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import RequestQueue from "@/components/RequestQueue";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { useToast } from "@/hooks/use-toast";

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
      console.log('Mensajes actualizados en TechnicianPanel:', messages);
      setRequests(messages.filter(msg => !msg.completed));
    }
  }, [messages]);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cola de Peticiones</CardTitle>
          <Button 
            variant="outline"
            onClick={() => {
              setRequests([]);
              toast({
                title: "Cola limpiada",
                description: "Se han eliminado todas las peticiones",
                duration: 2000
              });
            }}
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