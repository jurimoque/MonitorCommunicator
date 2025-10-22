import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RequestForm from "@/components/RequestForm";
import { useWebSocket } from "@/lib/websocket";
import { useLanguage } from "@/hooks/use-language";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";

export default function MusicianPanel() {
  const { roomId } = useParams();
  const { connected, sendMessage, customInstruments, setCustomInstruments } = useWebSocket(roomId!);
  const [instrument, setInstrument] = useState("");
  const { t } = useLanguage();

  // Cargar instrumentos personalizados al montar
  useEffect(() => {
    if (!roomId) return;
    
    fetch(`/api/rooms/${roomId}/instruments`)
      .then(res => res.json())
      .then(instruments => {
        const names = instruments.map((i: any) => i.name);
        setCustomInstruments(names);
      })
      .catch(err => console.error('Error cargando instrumentos:', err));
  }, [roomId, setCustomInstruments]);

  const handleRequest = (request: {
    targetInstrument: string;
    action: string;
  }) => {
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
    <div className="min-h-screen p-4 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900">
      {/* Controles en la esquina superior derecha */}
      <div className="fixed top-12 right-4 z-10 flex gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <Card>
        {!connected && (
          <CardHeader className="pb-0">
            <Alert variant="destructive" className="max-w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('noConnection')}</AlertTitle>
              <AlertDescription className="text-sm">
                {t('reconnecting')}
              </AlertDescription>
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