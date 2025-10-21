import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import RequestQueue from "@/components/RequestQueue";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";

interface Request {
  id: number;
  musician: string;
  targetInstrument: string;
  action: string;
  completed: boolean;
}

export default function TechnicianPanel() {
  const { roomId } = useParams();
  const { connected, requests } = useWebSocket(roomId!);
  const { toast } = useToast();
  const { t } = useLanguage();

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
          <CardTitle className="font-light">{t('requestQueue')}</CardTitle>
          <Button 
            variant="outline"
            onClick={clearAllRequests}
          >
            {t('clearQueue')}
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
          <RequestQueue requests={requests} roomId={roomId!} />
        </CardContent>
      </Card>
    </div>
  );
}