import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { Capacitor } from '@capacitor/core';

// Helper to determine the base URL
const getBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    // If in native development, point to the host machine via the emulator's special IP
    if (import.meta.env.DEV) {
      return 'http://10.0.2.2:5000';
    }
    // For native production builds, point to the live server
    return 'https://monitorcommunicator.onrender.com';
  }
  // For web, use relative paths
  return '';
};

const API_BASE_URL = getBaseUrl();

interface Props {
  onJoin: (roomId: string) => void;
  role: "musician" | "technician";
}

export default function JoinRoomForm({ onJoin, role }: Props) {
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'join' | 'create' | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const handleAction = async (actionType: 'join' | 'create') => {
    if (!roomName.trim()) {
      toast({
        title: t('error'),
        description: t('enterRoomName'),
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
        response = await fetch(`${API_BASE_URL}/api/rooms/search?name=${encodeURIComponent(roomName)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast({
              title: t('roomNotFound'),
              description: t('roomNotFoundDesc').replace('{name}', roomName),
              variant: "destructive",
            });
            return;
          }
          throw new Error('Error buscando la sala');
        }
      } else {
        // Crear nueva sala o buscar existente
        response = await fetch(`${API_BASE_URL}/api/rooms/find-or-create`, {
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
          title: t('joinedExistingRoom'),
          description: t('joinedExistingRoomDesc').replace('{name}', roomName),
          duration: 3000,
        });
      } else if (actionType === 'create' && !room.isExisting) {
        toast({
          title: t('roomCreated'),
          description: t('roomCreatedDesc').replace('{name}', roomName),
          duration: 2000,
        });
      } else {
        toast({
          title: t('connected'),
          description: t('connectedDesc').replace('{name}', roomName),
          duration: 2000,
        });
      }
      
      setLocation(`/${role}/${room.id}`);
    } catch (error) {
      console.error('Error con la sala:', error);
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('errorProcessingRequest'),
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
        placeholder={t('roomNamePlaceholder')}
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
          {loading && action === 'join' ? t('searching') : t('joinRoom')}
        </Button>
        
        <Button 
          onClick={() => handleAction('create')}
          disabled={loading || !roomName.trim()}
          className="w-full"
        >
          {loading && action === 'create' ? t('creating') : t('createRoom')}
        </Button>
      </div>
      
      <p className="text-sm text-gray-500 text-center font-light">
        <strong>{t('joinRoom')}:</strong> {t('joinInfo')}<br />
        <strong>{t('createRoom')}:</strong> {t('createInfo')}
      </p>
    </div>
  );
}