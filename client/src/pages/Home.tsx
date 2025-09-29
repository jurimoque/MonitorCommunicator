import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JoinRoomForm from "@/components/JoinRoomForm";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<"musician" | "technician">("musician");

  const handleJoinRoom = (roomId: string) => {
    setLocation(`/${role}/${roomId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Theme toggle en la esquina superior derecha */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Stage Monitor Control</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={role} onValueChange={(v) => setRole(v as "musician" | "technician")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="musician">Músico</TabsTrigger>
              <TabsTrigger value="technician">Técnico</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-6">
            <JoinRoomForm onJoin={handleJoinRoom} role={role} />
          </div>
          
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/test")}
              className="text-sm"
            >
              Test WebSocket Connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
