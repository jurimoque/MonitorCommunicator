import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import RequestForm from "@/components/RequestForm";
import { useLanguage } from "@/hooks/use-language";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useWebSocketContext } from "@/lib/WebSocketProvider";

export default function MusicianPanel() {
  const { connected, sendMessage, customInstruments } = useWebSocketContext();
  const [instrument, setInstrument] = useState("");
  const { t } = useLanguage();

  const handleRequest = (request: {
    targetInstrument: string;
    action: string;
  }) => {
    if (!connected) return false;

    sendMessage({
      type: 'request',
      data: {
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
            customInstruments={customInstruments}
          />
        </CardContent>
      </Card>
    </div>
  );
}