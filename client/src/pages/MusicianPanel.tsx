import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RequestForm from "@/components/RequestForm";
import { useWebSocket } from "@/lib/websocket";
import { useLanguage } from "@/hooks/use-language";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";

export default function MusicianPanel() {
  const { roomId } = useParams();
  const [instrument, setInstrument] = useState("");
  const { connected, sendMessage, customInstruments, connect } = useWebSocket(roomId!, instrument);
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [roomName, setRoomName] = useState("");

  useEffect(() => {
    if (!roomId) return;
    // Fetch room name on mount
    fetch(`/api/rooms/${roomId}`)
      .then(res => res.json())
      .then(data => {
        if (data.name) setRoomName(data.name);
      })
      .catch(err => console.error('Error fetching room name:', err));
  }, [roomId]);

  const handleRequest = (request: { targetInstrument: string; action: string; }) => {
    if (!connected || !roomId) return false;
    sendMessage({
      type: 'request',
      data: {
        roomId,
        musician: instrument,
        instrument: instrument,
        targetInstrument: request.targetInstrument,
        action: request.action,
      }
    });
    return true;
  };

  return (
    <div className="min-h-screen p-4 pt-24 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900">
      <div className="fixed top-4 left-4 z-10 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => setLocation('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={connect}>
          RECONECTAR AHORA
        </Button>
      </div>
      <div className="fixed top-4 right-4 z-10 flex gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-light text-center">{t('room')}: {roomName}</CardTitle>
        </CardHeader>
        {!connected && (
          <CardHeader className="pt-0 pb-0">
            <Alert variant="destructive" className="max-w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('noConnection')}</AlertTitle>
              <AlertDescription className="text-sm">{t('reconnecting')}</AlertDescription>
            </Alert>
          </CardHeader>
        )}
        <CardContent className="p-6">
          <RequestForm
            currentInstrument={instrument}
            onInstrumentSelect={setInstrument}
            onRequest={handleRequest}
            roomId={roomId!}
            customInstruments={customInstruments}
          />
        </CardContent>
      </Card>
    </div>
  );
}
