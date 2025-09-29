import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INSTRUMENTS, getInstrumentColor } from "@/lib/constants";

interface Props {
  currentInstrument: string;
  onInstrumentSelect: (instrument: string) => void;
  onRequest: (request: { targetInstrument: string; action: string }) => void;
}

export default function RequestForm({ currentInstrument, onInstrumentSelect, onRequest }: Props) {
  const [targetInstrument, setTargetInstrument] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInstrument, setCustomInstrument] = useState("");
  const { toast } = useToast();

  const getActionText = (action: string): string => {
    switch (action) {
      case "volume_up":
        return "subir el volumen";
      case "volume_down":
        return "bajar el volumen";
      case "reverb_up":
        return "aumentar el reverb";
      case "reverb_down":
        return "disminuir el reverb";
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
        title: "Petición enviada",
        description: `Se ha enviado tu petición para ${getActionText(request.action)} de ${request.targetInstrument}`,
        duration: 2000,
        className: "w-auto"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la petición. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomInstrumentSubmit = () => {
    if (customInstrument.trim()) {
      onInstrumentSelect(customInstrument.trim());
      setCustomInstrument("");
      setShowCustomInput(false);
    }
  };

  if (!currentInstrument) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Selecciona tu instrumento</h2>
        
        {!showCustomInput ? (
          <>
            <Select onValueChange={onInstrumentSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tu instrumento" />
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENTS.map((inst) => (
                  <SelectItem key={inst} value={inst}>
                    {inst}
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
                + Crear instrumento personalizado
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <Input
              value={customInstrument}
              onChange={(e) => setCustomInstrument(e.target.value)}
              placeholder="Nombre del instrumento (ej: Saxofón, Violín, etc.)"
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
                Confirmar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomInstrument("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Tu instrumento: {currentInstrument}</h2>
        <Button variant="outline" onClick={() => onInstrumentSelect("")}>
          Cambiar
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Mostrar primero el instrumento actual */}
          <button
            onClick={() => setTargetInstrument(currentInstrument)}
            className={`p-3 rounded-lg transition-all ${
              targetInstrument === currentInstrument 
                ? 'ring-2 ring-offset-2 ring-black scale-105' 
                : 'hover:scale-105'
            }`}
            style={{
              backgroundColor: getInstrumentColor(currentInstrument).bg,
              color: getInstrumentColor(currentInstrument).text
            }}
          >
            YO ({currentInstrument})
          </button>
          {/* Luego mostrar el resto de instrumentos */}
          {INSTRUMENTS.filter(inst => inst !== currentInstrument).map((inst) => (
            <button
              key={inst}
              onClick={() => setTargetInstrument(inst)}
              className={`p-3 rounded-lg transition-all ${
                targetInstrument === inst 
                  ? 'ring-2 ring-offset-2 ring-black scale-105' 
                  : 'hover:scale-105'
              }`}
              style={{
                backgroundColor: getInstrumentColor(inst).bg,
                color: getInstrumentColor(inst).text
              }}
            >
              {inst}
            </button>
          ))}
        </div>

        {targetInstrument && (
          <div className="grid grid-cols-2 gap-4">
            {/* Controles de Volumen - Bajar a la izquierda, Subir a la derecha */}
            <Button
              className="h-16 text-xl font-bold"
              onClick={() => handleRequest({ targetInstrument, action: "volume_down" })}
              disabled={loading}
              variant="secondary"
            >
              {loading ? "ENVIANDO..." : "- VOLUMEN"}
            </Button>
            <Button
              className="h-16 text-xl font-bold"
              onClick={() => handleRequest({ targetInstrument, action: "volume_up" })}
              disabled={loading}
            >
              {loading ? "ENVIANDO..." : "+ VOLUMEN"}
            </Button>

            {/* Controles de Reverb */}
            <Button
              className="h-16 text-3xl font-bold"
              onClick={() => handleRequest({ targetInstrument, action: "reverb_down" })}
              disabled={loading}
              variant="secondary"
            >
              {loading ? "ENVIANDO..." : "REVERB -"}
            </Button>
            <Button
              className="h-16 text-3xl font-bold"
              onClick={() => handleRequest({ targetInstrument, action: "reverb_up" })}
              disabled={loading}
            >
              {loading ? "ENVIANDO..." : "REVERB +"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}