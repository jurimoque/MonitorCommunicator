import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import SettingsDialog from "@/components/SettingsDialog";
import { useSettings } from "@/hooks/use-settings";
import RequestQueue from "@/components/RequestQueue";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE_URL } from "@/lib/config";

export default function TechnicianPanel() {
  const { roomId: roomCode } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { visualFlashEnabled, soundEnabled } = useSettings();
  const [room, setRoom] = useState<{ id: number; name: string } | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [flashActive, setFlashActive] = useState(false);
  const prevRequestCount = useRef(0);

  const { connected, requests, sendMessage, connect } = useWebSocket(
    room ? room.id.toString() : undefined,
    ""
  );

  const playSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 (high pitch)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Drop to A4

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error("Error playing sound", e);
    }
  };

  useEffect(() => {
    if (requests.length > prevRequestCount.current) {
      // Trigger effects on new requests

      if (soundEnabled) {
        playSound();
      }

      if (visualFlashEnabled) {
        // Strobe effect: Flash 3 times quickly
        let flashes = 0;
        const interval = setInterval(() => {
          setFlashActive(prev => !prev);
          flashes++;
          if (flashes >= 6) { // 3 on, 3 off
            clearInterval(interval);
            setFlashActive(false);
          }
        }, 100);
      }
    }
    prevRequestCount.current = requests.length;
  }, [requests.length, visualFlashEnabled, soundEnabled]);

  useEffect(() => {
    if (!roomCode) return;
    setLoadingRoom(true);
    fetch(`${API_BASE_URL}/api/rooms/search?name=${encodeURIComponent(roomCode)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Sala no encontrada");
        }
        return res.json();
      })
      .then((data) => {
        setRoom(data);
        setRoomError(null);
      })
      .catch((err) => {
        console.error("Error fetching room:", err);
        setRoom(null);
        setRoomError("Sala no encontrada");
      })
      .finally(() => setLoadingRoom(false));
  }, [roomCode]);

  const clearAllRequests = () => {
    if (!room) return;
    sendMessage({ type: "clearAllRequests", data: { roomId: room.id.toString() } });
    toast({ title: t("queueCleared"), duration: 2000 });
  };

  const showContent = room && !loadingRoom && !roomError;

  return (
    <div className="min-h-screen p-4 pt-24 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 relative">
      {/* Visual Flash Overlay */}
      <div
        className={`fixed inset-0 bg-white z-[100] pointer-events-none transition-opacity duration-300 ${flashActive ? 'opacity-100' : 'opacity-0'
          }`}
      />

      <div className="fixed top-16 left-4 z-10 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={connect} disabled={!room}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="fixed top-16 right-4 z-10 flex gap-2">
        <SettingsDialog />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-light">{t("requestQueue")}</CardTitle>
            <p className="text-sm text-gray-500">
              {t("room")}: {room?.name || roomCode}
            </p>
          </div>
          <Button variant="outline" onClick={clearAllRequests} disabled={!room}>
            {t("clearQueue")}
          </Button>
        </CardHeader>
        {roomError && (
          <CardHeader className="pt-0 pb-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{roomError}</AlertTitle>
              <AlertDescription className="text-sm">{t("enterRoomName")}</AlertDescription>
            </Alert>
          </CardHeader>
        )}
        {!roomError && !connected && showContent && (
          <CardHeader className="pt-0 pb-0">
            <Alert variant="destructive" className="max-w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("noConnection")}</AlertTitle>
              <AlertDescription className="text-sm">{t("reconnecting")}</AlertDescription>
            </Alert>
          </CardHeader>
        )}
        <CardContent>
          {showContent ? (
            <RequestQueue requests={requests} sendMessage={sendMessage} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {loadingRoom ? "Cargando sala..." : roomError || "Sala no encontrada"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
