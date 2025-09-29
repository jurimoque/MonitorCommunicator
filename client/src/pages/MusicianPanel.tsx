import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RequestForm from "@/components/RequestForm";
import { useWebSocket } from "@/lib/websocket";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function MusicianPanel() {
  const { roomId } = useParams();
  const { connected, sendMessage } = useWebSocket(roomId!);
  const [instrument, setInstrument] = useState("");

  const handleRequest = (request: {
    targetInstrument: string;
    action: string;
  }) => {
    if (!connected || !roomId) return false;

    sendMessage({
      roomId,
      musician: instrument,
      instrument: instrument,
      targetInstrument: request.targetInstrument,
      action: request.action,
    });

    return true;
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Theme toggle en la esquina superior derecha */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <Card>
        {!connected && (
          <CardHeader className="pb-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Sin conexión</AlertTitle>
              <AlertDescription>
                No hay conexión con el servidor. Reconectando...
              </AlertDescription>
            </Alert>
          </CardHeader>
        )}
        <CardContent className="p-6">
          <RequestForm
            currentInstrument={instrument}
            onInstrumentSelect={setInstrument}
            onRequest={handleRequest}
          />
        </CardContent>
      </Card>
    </div>
  );
}