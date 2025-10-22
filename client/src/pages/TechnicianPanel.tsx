import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useWebSocketContext } from "@/lib/WebSocketProvider";

export default function TechnicianPanel() {
  const { roomId } = useParams();
  const { connected, requests, sendMessage } = useWebSocketContext();
  const { toast } = useToast();
  const { t } = useLanguage();

  const clearAllRequests = () => {
    try {
      sendMessage({
        type: 'clearAllRequests',
        data: { roomId } // Add roomId here
      });

      toast({
        title: t('queueCleared'),
        description: t('queueClearedDesc'),
        duration: 2000
      });
    } catch (error) {
      console.error('Error al limpiar cola:', error);
      toast({
        title: t('error'),
        description: t('errorClearingQueue'),
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900">
      {/* Controles en la esquina superior derecha */}
      <div className="fixed top-12 right-4 z-10 flex gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-light">COLA DE PETICIONES</CardTitle>
          <Button 
            variant="outline"
            onClick={clearAllRequests}
          >
            {t('clearQueue')}
          </Button>
          <Button 
            variant="destructive"
            onClick={() => sendMessage({ type: 'clearAllRequests' })}
          >
            DEBUG: CLEAR
          </Button>
          {!connected && (
            <Alert variant="destructive" className="max-w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('noConnection')}</AlertTitle>
              <AlertDescription className="text-sm">
                {t('reconnecting')}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <RequestQueue requests={requests} />
        </CardContent>
      </Card>
    </div>
  );
}