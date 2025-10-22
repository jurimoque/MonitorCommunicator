import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INSTRUMENTS, getInstrumentColor } from "@/lib/constants";
import { Capacitor } from '@capacitor/core';

// Helper to determine the base URL
const getBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    if (import.meta.env.DEV) {
      return 'http://10.0.2.2:5000';
    }
    return 'https://monitorcommunicator.onrender.com';
  }
  return ''; // Use relative paths for web
};

const API_BASE_URL = getBaseUrl();

interface Props {
  currentInstrument: string;
  onInstrumentSelect: (instrument: string) => void;
  onRequest: (request: { targetInstrument: string; action: string }) => void;
  roomId: string;
  customInstruments: string[];
}

export default function RequestForm({ currentInstrument, onInstrumentSelect, onRequest, roomId, customInstruments }: Props) {
  const [targetInstrument, setTargetInstrument] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInstrument, setCustomInstrument] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const getActionText = (action: string): string => {
    switch (action) {
      case "volume_up":
        return t('volumeUpAction');
      case "volume_down":
        return t('volumeDownAction');
      case "reverb_up":
        return t('reverbUpAction');
      case "reverb_down":
        return t('reverbDownAction');
      case "thanks":
        return t('thanksAction');
      case "assistance":
        return t('assistanceAction');
      default:
        return action;
    }
  };

  const handleRequest = async (request: {
    targetInstrument: string;
    action: string;
  }) => {
    setLoading(true);
    try {
      onRequest(request);
      toast({
        title: t('requestSent'),
        description: `${t('requestSentDesc')} ${getActionText(request.action)} de ${request.targetInstrument}`,
        duration: 2000,
        className: "w-auto"
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('errorSendingRequest'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomInstrumentSubmit = async () => {
    const instrumentName = customInstrument.trim();
    if (!instrumentName) return;

    try {
      // Guardar en la base de datos para compartir con todos los usuarios
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/instruments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: instrumentName })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      // Solo actualizar si el guardado fue exitoso
      onInstrumentSelect(instrumentName);
      setCustomInstrument("");
      setShowCustomInput(false);
      
      toast({
        title: t('instrumentCreated'),
        description: `${instrumentName} ${t('instrumentAvailable')}`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error guardando instrumento:', error);
      toast({
        title: t('error'),
        description: t('errorSavingInstrument'),
        variant: "destructive",
      });
    }
  };

  if (!currentInstrument) {
    // Combinar instrumentos predefinidos y personalizados para el select inicial
    const allAvailableInstruments = [...INSTRUMENTS, ...customInstruments.filter(ci => !INSTRUMENTS.includes(ci as any))];
    
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-light">{t('selectInstrument')}</h2>
        
        {!showCustomInput ? (
          <>
            <Select onValueChange={onInstrumentSelect}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectInstrument')} />
              </SelectTrigger>
              <SelectContent>
                {allAvailableInstruments.map((inst) => (
                  <SelectItem key={inst} value={inst}>
                    {t(inst as any) || inst}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => setShowCustomInput(true)}
                className="w-full"
              >
                {t('createCustomInstrument')}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <Input
              value={customInstrument}
              onChange={(e) => setCustomInstrument(e.target.value)}
              placeholder={t('instrumentPlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomInstrumentSubmit();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleCustomInstrumentSubmit}
                disabled={!customInstrument.trim()}
                className="flex-1"
              >
                {t('confirm')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomInstrument("");
                }}
                className="flex-1"
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Combinar todos los instrumentos (predefinidos + personalizados)
  const allInstruments = [...INSTRUMENTS, ...customInstruments.filter(ci => !INSTRUMENTS.includes(ci as any))];
  const otherInstruments = allInstruments.filter(inst => inst !== currentInstrument);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-light mb-2">{t('yourInstrument')}: {t(currentInstrument as any) || currentInstrument}</h2>
        <Button variant="outline" onClick={() => onInstrumentSelect("")}>
          {t('change')}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Mostrar primero el instrumento actual */}
          <button
            onClick={() => setTargetInstrument(currentInstrument)}
            className={`p-3 rounded-lg transition-all h-16 flex items-center justify-center text-center text-sm font-semibold ${
              targetInstrument === currentInstrument 
                ? 'ring-2 ring-offset-2 ring-black dark:ring-white scale-105' 
                : 'hover:scale-105'
            }`}
            style={{
              backgroundColor: getInstrumentColor(currentInstrument).bg,
              color: getInstrumentColor(currentInstrument).text
            }}
          >
            <span className="truncate px-1">{t('me')} ({t(currentInstrument as any) || currentInstrument})</span>
          </button>
          {/* Luego mostrar el resto de instrumentos */}
          {otherInstruments.map((inst) => (
            <button
              key={inst}
              onClick={() => setTargetInstrument(inst)}
              className={`p-3 rounded-lg transition-all h-16 flex items-center justify-center text-center text-sm font-semibold ${
                targetInstrument === inst 
                  ? 'ring-2 ring-offset-2 ring-black dark:ring-white scale-105' 
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: getInstrumentColor(inst).bg,
                color: getInstrumentColor(inst).text
              }}
            >
              <span className="truncate px-1">{t(inst as any) || inst}</span>
            </button>
          ))}
        </div>

        {targetInstrument && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Controles de Volumen - Bajar a la izquierda, Subir a la derecha */}
              <Button
                className="h-16 text-xl font-light"
                onClick={() => handleRequest({ targetInstrument, action: "volume_down" })}
                disabled={loading}
                variant="secondary"
              >
                {loading ? t('sending') : t('volumeDown')}
              </Button>
              <Button
                className="h-16 text-xl font-light"
                onClick={() => handleRequest({ targetInstrument, action: "volume_up" })}
                disabled={loading}
              >
                {loading ? t('sending') : t('volumeUp')}
              </Button>

              {/* Controles de Reverb */}
              <Button
                className="h-16 text-xl font-light"
                onClick={() => handleRequest({ targetInstrument, action: "reverb_down" })}
                disabled={loading}
                variant="secondary"
              >
                {loading ? t('sending') : t('reverbDown')}
              </Button>
              <Button
                className="h-16 text-xl font-light"
                onClick={() => handleRequest({ targetInstrument, action: "reverb_up" })}
                disabled={loading}
              >
                {loading ? t('sending') : t('reverbUp')}
              </Button>
            </div>

            {/* Botones especiales */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Button
                className="h-12 text-sm font-light bg-green-500 hover:bg-green-600 text-white"
                onClick={() => handleRequest({ targetInstrument: currentInstrument, action: "thanks" })}
                disabled={loading}
              >
                {loading ? t('sending') : t('thanks')}
              </Button>
              <Button
                className="h-12 text-sm font-light bg-red-500 hover:bg-red-600 text-white"
                onClick={() => handleRequest({ targetInstrument: currentInstrument, action: "assistance" })}
                disabled={loading}
              >
                {loading ? t('sending') : t('assistance')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}