import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Props {
  onJoin: (roomId: string) => void;
  role: "musician" | "technician";
}

export default function JoinRoomForm({ onJoin, role }: Props) {
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'join' | 'create' | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleAction = async (actionType: 'join' | 'create') => {
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la sala",
        variant: "destructive",
      });
      return;
    }

    setAction(actionType);
    setLoading(true);
    
    try {
      let response;
      
      if (actionType === 'join') {
        // Intentar unirse a sala existente
        response = await fetch(`/api/rooms/search?name=${encodeURIComponent(roomName)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast({
              title: "Sala no encontrada",
              description: `No existe una sala llamada "${roomName}". ¿Quieres crearla?`,
              variant: "destructive",
            });
            return;
          }
          throw new Error('Error buscando la sala');
        }
      } else {
        // Crear nueva sala o buscar existente
        response = await fetch('/api/rooms/find-or-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: roomName })
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
      }

      const room = await response.json();
      
      // Mostrar mensaje informativo
      if (actionType === 'create' && room.isExisting) {
        toast({
          title: "Te uniste a sala existente",
          description: `Ya existía una sala llamada "${roomName}", te conectamos a ella.`,
          duration: 3000,
        });
      } else if (actionType === 'create' && !room.isExisting) {
        toast({
          title: "Sala creada",
          description: `Nueva sala "${roomName}" creada exitosamente.`,
          duration: 2000,
        });
      } else {
        toast({
          title: "Conectado",
          description: `Te uniste a la sala "${roomName}".`,
          duration: 2000,
        });
      }
      
      setLocation(`/${role}/${room.id}`);
    } catch (error) {
      console.error('Error con la sala:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar la solicitud",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="ej: Ensayos1234, ConciertoXYZ, SalaRock2024"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        disabled={loading}
      />
      
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={() => handleAction('join')}
          disabled={loading || !roomName.trim()}
          className="w-full"
        >
          {loading && action === 'join' ? "Buscando..." : "Unirse a Sala"}
        </Button>
        
        <Button 
          onClick={() => handleAction('create')}
          disabled={loading || !roomName.trim()}
          className="w-full"
        >
          {loading && action === 'create' ? "Creando..." : "Crear Sala"}
        </Button>
      </div>
      
      <p className="text-sm text-gray-500 text-center">
        <strong>Unirse:</strong> Conecta a una sala existente<br />
        <strong>Crear:</strong> Crea nueva o usa existente si ya hay una
      </p>
    </div>
  );
}