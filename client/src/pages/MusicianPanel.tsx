import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import RequestForm from "@/components/RequestForm";
import { useWebSocket } from "@/lib/websocket";

export default function MusicianPanel() {
  const { roomId } = useParams();
  const { connected, sendMessage } = useWebSocket(roomId!);
  const [instrument, setInstrument] = useState("");

  const handleRequest = (request: {
    targetInstrument: string;
    action: string;
  }) => {
    if (!connected) return;
    
    sendMessage({
      type: "request",
      data: {
        musician: instrument,
        ...request,
        roomId
      }
    });
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100">
      <Card>
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
