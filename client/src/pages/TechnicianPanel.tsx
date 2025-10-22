import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import RequestQueue from "@/components/RequestQueue";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";

export default function TechnicianPanel() {
  const { roomId } = useParams();
  const { connected, requests, sendMessage, connect } = useWebSocket(roomId!, ""); // Technician has no instrument
  const { toast } = useToast();
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

  const clearAllRequests = () => {
    sendMessage({ type: 'clearAllRequests', data: { roomId } });
    toast({ title: t('queueCleared'), duration: 2000 });
  };

  return (
    <div className="min-h-screen p-4 pt-24 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900">
      <div className="fixed top-4 left-4 z-10 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => setLocation('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={connect}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="fixed top-4 right-4 z-10 flex gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-light">{t('requestQueue')}</CardTitle>
            <p className="text-sm text-gray-500">{t('room')}: {roomName}</p>
          </div>
          <Button variant="outline" onClick={clearAllRequests}>
            {t('clearQueue')}
          </Button>
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
        <CardContent>
          <RequestQueue requests={requests} sendMessage={sendMessage} />
        </CardContent>
      </Card>
    </div>
  );
}
