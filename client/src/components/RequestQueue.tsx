import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { INSTRUMENT_COLORS } from "@/lib/constants";

interface Request {
  id: number;
  musician: string;
  targetInstrument: string;
  action: string;
  completed: boolean;
}

interface Props {
  requests: Request[];
  roomId: string;
}

export default function RequestQueue({ requests, roomId }: Props) {
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const { toast } = useToast();

  const handleComplete = async (requestId: number) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/requests/${requestId}/complete`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Error al completar la petición');
      }

      setCompletedIds(prev => [...prev, requestId]);
      toast({
        title: "Petición completada",
        description: "La petición ha sido marcada como completada"
      });
    } catch (error) {
      console.error('Error completando petición:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la petición",
        variant: "destructive"
      });
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'volume_up': return 'Subir volumen';
      case 'volume_down': return 'Bajar volumen';
      case 'reverb_up': return 'Subir reverb';
      case 'reverb_down': return 'Bajar reverb';
      default: return action;
    }
  };

  console.log('Renderizando RequestQueue con peticiones:', requests);
  const activeRequests = requests.filter(r => !completedIds.includes(r.id) && !r.completed);
  console.log('Peticiones activas:', activeRequests);

  return (
    <div className="space-y-4">
      {activeRequests.length > 0 ? (
        activeRequests.map((request) => (
          <Card 
            key={request.id} 
            className="p-4 hover:shadow-md transition-shadow"
            style={{
              backgroundColor: INSTRUMENT_COLORS[request.musician]?.bg + '40',
              borderColor: INSTRUMENT_COLORS[request.musician]?.bg
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                <p 
                  className="text-2xl font-bold uppercase" 
                  style={{ color: INSTRUMENT_COLORS[request.musician]?.text }}
                >
                  {request.musician}
                </p>
                <p className="text-xl font-semibold uppercase">
                  <span style={{ color: INSTRUMENT_COLORS[request.targetInstrument]?.text }}>
                    {request.targetInstrument}
                  </span>{' '}
                  <span style={{ color: request.action.includes('up') ? '#ff0000' : '#00ff00' }}>
                    {request.action.includes('up') ? '+' : '-'}
                  </span>{' '}
                  <span style={{ 
                    color: request.action.includes('up') ? '#ff0000' : '#00ff00',
                    fontSize: request.action.includes('reverb') ? '0.85em' : '1em'
                  }}>
                    {request.action.includes('reverb') ? 'REVERB' : 'VOLUMEN'}
                  </span>
                </p>
              </div>
              <Button 
                onClick={() => handleComplete(request.id)}
                variant="secondary"
                className="hover:bg-green-100"
              >
                Completado
              </Button>
            </div>
          </Card>
        ))
      ) : (
        <p className="text-center text-gray-500">No hay peticiones pendientes</p>
      )}
    </div>
  );
}