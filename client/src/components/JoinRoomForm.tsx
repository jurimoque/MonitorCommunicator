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
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para la sala",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/rooms', {
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

      const room = await response.json();
      setLocation(`/${role}/${room.id}`);
    } catch (error) {
      console.error('Error creando sala:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la sala",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        placeholder="Nombre de la Sala"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        disabled={loading}
      />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creando sala..." : "Crear y unirse a la Sala"}
      </Button>
    </form>
  );
}