import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { INSTRUMENTS, getInstrumentColor } from "@/lib/constants";
import { Capacitor } from '@capacitor/core';

const getBaseUrl = () => {
  if (Capacitor.isNativePlatform()) {
    if (import.meta.env.DEV) { return 'http://10.0.2.2:5000'; }
    return 'https://monitorcommunicator.onrender.com';
  }
  return '';
};

interface Props {
  currentInstrument: string;
  onInstrumentSelect: (instrument: string) => void;
  onRequest: (request: { targetInstrument: string; action: string }) => void;
  roomId: string;
  customInstruments: string[];
}

export default function RequestForm({ currentInstrument, onInstrumentSelect, onRequest, roomId, customInstruments }: Props) {
  const [targetInstrument, setTargetInstrument] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInstrument, setCustomInstrument] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleRequest = (action: string) => {
    if (!targetInstrument) return;
    setLoading(true);
    onRequest({ targetInstrument, action });
    setLoading(false);
  };

  const handleCustomInstrumentSubmit = async () => {
    const instrumentName = customInstrument.trim();
    if (!instrumentName) return;

    try {
      const response = await fetch(`${getBaseUrl()}/api/rooms/${roomId}/instruments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: instrumentName })
      });

      if (!response.ok) throw new Error('Failed to create instrument');
      
      onInstrumentSelect(instrumentName);
      setCustomInstrument("");
      setShowCustomInput(false);
    } catch (error) {
      console.error('Error saving instrument:', error);
      toast({ title: t('error'), description: t('errorSavingInstrument'), variant: "destructive" });
    }
  };

  if (!currentInstrument) {
    const allAvailableInstruments = [...new Set([...INSTRUMENTS, ...customInstruments])];
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-light">{t('selectInstrument')}</h2>
        {!showCustomInput ? (
          <>
            <Select onValueChange={onInstrumentSelect}>
              <SelectTrigger><SelectValue placeholder={t('selectInstrument')} /></SelectTrigger>
              <SelectContent>
                {allAvailableInstruments.map((inst) => (
                  <SelectItem key={inst} value={inst}>{t(inst as any) || inst}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowCustomInput(true)} className="w-full">{t('createCustomInstrument')}</Button>
          </>
        ) : (
          <div className="space-y-3">
            <Input
              value={customInstrument}
              onChange={(e) => setCustomInstrument(e.target.value)}
              placeholder={t('instrumentPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomInstrumentSubmit()}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleCustomInstrumentSubmit} disabled={!customInstrument.trim()} className="flex-1">{t('confirm')}</Button>
              <Button variant="outline" onClick={() => setShowCustomInput(false)} className="flex-1">{t('cancel')}</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const allInstruments = [...new Set([...INSTRUMENTS, ...customInstruments])];
  const otherInstruments = allInstruments.filter(inst => inst !== currentInstrument);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-light mb-2">{t('yourInstrument')}: {t(currentInstrument as any) || currentInstrument}</h2>
        <Button variant="outline" onClick={() => onInstrumentSelect("")}>{t('change')}</Button>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button onClick={() => setTargetInstrument(currentInstrument)} style={{ backgroundColor: getInstrumentColor(currentInstrument).bg, color: getInstrumentColor(currentInstrument).text }} className={`p-3 rounded-lg h-16 flex items-center justify-center text-center text-sm font-semibold ${targetInstrument === currentInstrument && 'ring-2 ring-offset-2 ring-black dark:ring-white'}`}>
            <span className="truncate px-1">{t('me')} ({t(currentInstrument as any) || currentInstrument})</span>
          </button>
          {otherInstruments.map((inst) => (
            <button key={inst} onClick={() => setTargetInstrument(inst)} style={{ backgroundColor: getInstrumentColor(inst).bg, color: getInstrumentColor(inst).text }} className={`p-3 rounded-lg h-16 flex items-center justify-center text-center text-sm font-semibold ${targetInstrument === inst && 'ring-2 ring-offset-2 ring-black dark:ring-white'}`}>
              <span className="truncate px-1">{t(inst as any) || inst}</span>
            </button>
          ))}
        </div>
        {targetInstrument && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button className="h-16 text-xl font-light" onClick={() => handleRequest("volume_down")} disabled={loading} variant="secondary">{loading ? t('sending') : t('volumeDown')}</Button>
              <Button className="h-16 text-xl font-light" onClick={() => handleRequest("volume_up")} disabled={loading}>{loading ? t('sending') : t('volumeUp')}</Button>
              <Button className="h-16 text-xl font-light" onClick={() => handleRequest("reverb_down")} disabled={loading} variant="secondary">{loading ? t('sending') : t('reverbDown')}</Button>
              <Button className="h-16 text-xl font-light" onClick={() => handleRequest("reverb_up")} disabled={loading}>{loading ? t('sending') : t('reverbUp')}</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Button className="h-12 text-sm font-light bg-green-500 hover:bg-green-600 text-white" onClick={() => handleRequest("thanks")} disabled={loading}>{loading ? t('sending') : t('thanks')}</Button>
              <Button className="h-12 text-sm font-light bg-red-500 hover:bg-red-600 text-white" onClick={() => handleRequest("assistance")} disabled={loading}>{loading ? t('sending') : t('assistance')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
