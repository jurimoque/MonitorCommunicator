import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JoinRoomForm from "@/components/JoinRoomForm";
import { useLanguage } from "@/hooks/use-language";
import SettingsDialog from "@/components/SettingsDialog";

export default function Home() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<"musician" | "technician">("musician");
  const { t } = useLanguage();

  const handleJoinRoom = (roomId: string) => {
    setLocation(`/${role}/${roomId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 dark:from-purple-900 dark:via-pink-900 dark:to-blue-900 p-4">
      {/* Controles en la esquina superior derecha */}
      <div className="fixed top-4 right-4 z-10 flex gap-2">
        <SettingsDialog />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center font-light">Stage Monitor Control</CardTitle>
        </CardHeader>
        <CardContent>
          <h3 className="text-sm font-light text-center mb-3">{t('selectRole')}</h3>
          <Tabs value={role} onValueChange={(v) => setRole(v as "musician" | "technician")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="musician">{t('musician')}</TabsTrigger>
              <TabsTrigger value="technician">{t('technician')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-6">
            <JoinRoomForm onJoin={handleJoinRoom} role={role} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
