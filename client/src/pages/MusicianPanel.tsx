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
import { API_BASE_URL } from "@/lib/config";

export default function MusicianPanel() {
  const { roomId: roomCode } = useParams();
  const [instrument, setInstrument] = useState("");
  const [room, setRoom] = useState<{ id: number; name: string } | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const { connected, sendMessage, customInstruments, connect } = useWebSocket(
    room ? room.id.toString() : undefined,
    instrument
  );
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

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

  const handleRequest = async (request: { targetInstrument: string; action: string }) => {
    if (!room || !instrument) {
      console.error('[Musician] ❌ No se puede enviar petición: room o instrument faltante', { room, instrument });
      return false;
    }

    const requestData = {
      musician: instrument,
      instrument,
      targetInstrument: request.targetInstrument,
      action: request.action,
    };

    console.log('[Musician] 📤 Enviando petición:', requestData);
    console.log('[Musician] URL:', `${API_BASE_URL}/api/rooms/${room.id}/requests`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/rooms/${room.id}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      console.log('[Musician] Respuesta status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Musician] ❌ Error en respuesta del servidor:", errorText);
        return false;
      }

      const responseData = await response.json();
      console.log('[Musician] ✅ Petición enviada exitosamente:', responseData);
      return true;
    } catch (error) {
      console.error("[Musician] ❌ Error enviando petición:", error);
      return false;
    }
  };

  const showContent = room && !loadingRoom && !roomError;

  return (
    <div className="min-h-screen p-4 pt-24 bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-900 dark:via-pink-900">
      <div className="fixed top-4 left-4 z-10 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={connect} disabled={!room}>
          RECONECTAR AHORA
        </Button>
      </div>
      <div className="fixed top-4 right-4 z-10 flex gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-light text-center">
            {t("room")}: {room?.name || roomCode}
          </CardTitle>
        </CardHeader>
        {roomError && (
          <CardHeader className="pt-0 pb-0">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{roomError}</AlertTitle>
              <AlertDescription className="text-sm">
                {t("enterRoomName")}
              </AlertDescription>
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
        <CardContent className="p-6">
          {showContent && (
            <RequestForm
              currentInstrument={instrument}
              onInstrumentSelect={setInstrument}
              onRequest={handleRequest}
              roomId={room.id.toString()}
              customInstruments={customInstruments}
            />
          )}
          {!showContent && (
            <p className="text-center text-sm text-muted-foreground">
              {loadingRoom ? "Cargando sala..." : roomError || "Sala no encontrada"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
