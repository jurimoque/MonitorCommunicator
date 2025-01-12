import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const INSTRUMENTS = [
  "Batería", "Bajo", "Guitarra", "Teclados",
  "Voz Principal", "Coros", "Percusión"
];

interface Props {
  currentInstrument: string;
  onInstrumentSelect: (instrument: string) => void;
  onRequest: (request: { targetInstrument: string; action: string }) => void;
}

export default function RequestForm({ currentInstrument, onInstrumentSelect, onRequest }: Props) {
  const [targetInstrument, setTargetInstrument] = useState("");
  const [loading, setLoading] = useState(false);
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

  if (!currentInstrument) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Selecciona tu instrumento</h2>
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
        <Select value={targetInstrument} onValueChange={setTargetInstrument}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona instrumento a ajustar" />
          </SelectTrigger>
          <SelectContent>
            {INSTRUMENTS.filter(inst => inst !== currentInstrument).map((inst) => (
              <SelectItem key={inst} value={inst}>
                {inst}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {targetInstrument && (
          <div className="grid grid-cols-2 gap-4">
            {/* Controles de Volumen - Bajar a la izquierda, Subir a la derecha */}
            <Button
              className="h-16"
              onClick={() => handleRequest({ targetInstrument, action: "volume_down" })}
              disabled={loading}
              variant="secondary"
            >
              {loading ? "Enviando..." : "- Volumen"}
            </Button>
            <Button
              className="h-16"
              onClick={() => handleRequest({ targetInstrument, action: "volume_up" })}
              disabled={loading}
            >
              {loading ? "Enviando..." : "+ Volumen"}
            </Button>

            {/* Controles de Reverb */}
            <Button
              className="h-16"
              onClick={() => handleRequest({ targetInstrument, action: "reverb_down" })}
              disabled={loading}
              variant="secondary"
            >
              {loading ? "Enviando..." : "- Reverb"}
            </Button>
            <Button
              className="h-16"
              onClick={() => handleRequest({ targetInstrument, action: "reverb_up" })}
              disabled={loading}
            >
              {loading ? "Enviando..." : "+ Reverb"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}