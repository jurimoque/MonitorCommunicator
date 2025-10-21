import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
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
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleComplete = async (requestId: number) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/requests/${requestId}/complete`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Error al completar la petición');
      }

      toast({
        title: t('requestCompleted'),
        description: t('requestCompletedDesc')
      });
    } catch (error) {
      console.error('Error completando petición:', error);
      toast({
        title: t('error'),
        description: t('errorCompletingRequest'),
        variant: "destructive"
      });
    }
  };

  // Derivar el estado directamente de las props en cada render
  const sortedRequests = [...requests].reverse();

  return (
    <div className="space-y-4">
      {sortedRequests.length > 0 ? (
        sortedRequests.map((request) => (
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
                  {t(request.musician as any) || request.musician}
                </p>
                {request.action === 'thanks' ? (
                  <p className="text-xl font-light" style={{ color: '#22c55e' }}>
                    {t('thanksMessage')}
                  </p>
                ) : request.action === 'assistance' ? (
                  <p className="text-xl font-light" style={{ color: '#ef4444' }}>
                    {t('assistanceMessage')}
                  </p>
                ) : (
                  <p className="text-xl font-semibold uppercase">
                    <span style={{ color: INSTRUMENT_COLORS[request.targetInstrument]?.text }}>
                      {t(request.targetInstrument as any) || request.targetInstrument}
                    </span>{' '}
                    <span style={{ color: request.action.includes('up') ? '#ff0000' : '#00ff00' }}>
                      {request.action.includes('up') ? '+' : '-'}
                    </span>{' '}
                    <span style={{ 
                      color: request.action.includes('up') ? '#ff0000' : '#00ff00'
                    }}>
                      {request.action.includes('reverb') ? 'REVERB' : 'VOLUMEN'}
                    </span>
                  </p>
                )}
              </div>
              <Button 
                onClick={() => handleComplete(request.id)}
                variant="secondary"
                className="hover:bg-green-100"
              >
                {t('completed')}
              </Button>
            </div>
          </Card>
        ))
      ) : (
        <p className="text-center text-gray-500">{t('noPendingRequests')}</p>
      )}
    </div>
  );
}