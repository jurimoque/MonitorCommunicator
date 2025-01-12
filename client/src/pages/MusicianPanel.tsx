import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RequestForm from "@/components/RequestForm";
import { useWebSocket } from "@/lib/websocket";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function MusicianPanel() {
  const { roomId } = useParams();
  const { connected, sendMessage } = useWebSocket(roomId!);
  const [instrument, setInstrument] = useState("");

  const handleRequest = (request: {
    targetInstrument: string;
    action: string;
  }) => {
    if (!connected) return false;

    const success = sendMessage({
      type: "request",
      data: {
        musician: instrument,
        ...request,
        roomId
      }
    });

    return success;
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100">
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