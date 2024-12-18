import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RequestQueue from "@/components/RequestQueue";
import { useWebSocket } from "@/lib/websocket";

export default function TechnicianPanel() {
  const { roomId } = useParams();
  const { connected, messages } = useWebSocket(roomId!);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card>
        <CardHeader>
          <CardTitle>Cola de Peticiones</CardTitle>
          {!connected && (
            <div className="text-red-500">Desconectado - Reconectando...</div>
          )}
        </CardHeader>
        <CardContent>
          <RequestQueue requests={messages} roomId={roomId!} />
        </CardContent>
      </Card>
    </div>
  );
}
