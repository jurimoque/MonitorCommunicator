import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

interface Props {
  onJoin: (roomId: string) => void;
}

export default function JoinRoomForm({ onJoin }: Props) {
  const [roomName, setRoomName] = useState("");
  const { toast } = useToast();

  const createRoomMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre de sala",
        variant: "destructive",
      });
      return;
    }

    try {
      const room = await createRoomMutation.mutateAsync(roomName);
      onJoin(room.id.toString());
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la sala",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Nombre de la Sala"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={createRoomMutation.isPending}>
        {createRoomMutation.isPending ? "Creando sala..." : "Crear y Unirse a la Sala"}
      </Button>
    </form>
  );
}