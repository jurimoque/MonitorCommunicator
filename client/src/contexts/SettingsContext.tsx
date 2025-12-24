
import React, { createContext, useContext, useState, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";

interface Settings {
    visualFlashEnabled: boolean;
}

const SETTINGS_KEY = "monitor-communicator-settings";

const defaultSettings: Settings = {
    visualFlashEnabled: false,
};

interface SettingsContextType extends Settings {
    toggleVisualFlash: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => {
        const saved = localStorage.getItem(SETTINGS_KEY);
        return saved ? JSON.parse(saved) : defaultSettings;
    });

    // Persist settings
    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, [settings]);

    const toggleVisualFlash = () => {
        setSettings((prev) => ({
            ...prev,
            visualFlashEnabled: !prev.visualFlashEnabled,
        }));
    };

    // We can include theme/lang here too if we want central state,
    // but for now visualFlash is the critical missing piece.

    return (
        <SettingsContext.Provider
            value={{
                ...settings,
                toggleVisualFlash
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
