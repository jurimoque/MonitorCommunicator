import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const INSTRUMENTS = [
  "Batería", "Bajo", "Guitarra", "Teclados",
  "Voz Principal", "Coros", "Percusión"
];

interface Props {
  currentInstrument: string;
  onInstrumentSelect: (instrument: string) => void;
  onRequest: (request: { targetInstrument: string, action: string }) => void;
}

export default function RequestForm({ currentInstrument, onInstrumentSelect, onRequest }: Props) {
  const [targetInstrument, setTargetInstrument] = useState("");

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
        <Select onValueChange={setTargetInstrument}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona instrumento a ajustar" />
          </SelectTrigger>
          <SelectContent>
            {INSTRUMENTS.map((inst) => (
              <SelectItem key={inst} value={inst}>
                {inst}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {targetInstrument && (
          <div className="grid grid-cols-2 gap-4">
            <Button 
              className="h-16"
              onClick={() => onRequest({ targetInstrument, action: "volume_up" })}
            >
              Subir Volumen
            </Button>
            <Button
              className="h-16"
              onClick={() => onRequest({ targetInstrument, action: "volume_down" })}
            >
              Bajar Volumen
            </Button>
            <Button
              className="h-16"
              onClick={() => onRequest({ targetInstrument, action: "reverb_up" })}
            >
              Más Reverb
            </Button>
            <Button
              className="h-16"
              onClick={() => onRequest({ targetInstrument, action: "reverb_down" })}
            >
              Menos Reverb
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
