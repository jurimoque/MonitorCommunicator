
import { useState, useEffect } from "react";

const SETTINGS_KEY = "monitor-communicator-settings";

interface Settings {
  visualFlashEnabled: boolean;
}

const defaultSettings: Settings = {
  visualFlashEnabled: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggleVisualFlash = () => {
    setSettings((prev) => ({
      ...prev,
      visualFlashEnabled: !prev.visualFlashEnabled,
    }));
  };

  return {
    ...settings,
    toggleVisualFlash,
  };
}
