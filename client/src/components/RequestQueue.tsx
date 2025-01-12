import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const handleComplete = async (requestId: number) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/requests/${requestId}/complete`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Error al completar la petición');
      }

      setCompletedIds(prev => [...prev, requestId]);
    } catch (error) {
      console.error('Error completando petición:', error);
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'volume_up': return 'Subir volumen';
      case 'volume_down': return 'Bajar volumen';
      case 'reverb_up': return 'Más reverb';
      case 'reverb_down': return 'Menos reverb';
      default: return action;
    }
  };

  // Filtrar las peticiones completadas
  const activeRequests = requests.filter(r => !completedIds.includes(r.id) && !r.completed);

  return (
    <div className="space-y-4">
      {activeRequests.length > 0 ? (
        activeRequests.map((request) => (
          <Card key={request.id} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{request.musician}</p>
                <p className="text-sm text-gray-600">
                  {getActionText(request.action)} - {request.targetInstrument}
                </p>
              </div>
              <Button 
                onClick={() => handleComplete(request.id)}
                variant="secondary"
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