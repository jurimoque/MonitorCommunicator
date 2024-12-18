import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onJoin: (roomId: string) => void;
}

export default function JoinRoomForm({ onJoin }: Props) {
  const [roomId, setRoomId] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un ID de sala",
        variant: "destructive",
      });
      return;
    }
    onJoin(roomId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="ID de la Sala"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <Button type="submit" className="w-full">
        Unirse a la Sala
      </Button>
    </form>
  );
}
