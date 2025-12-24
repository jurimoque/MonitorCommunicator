
import { Settings, Moon, Sun, Monitor, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { useSettings } from "@/hooks/use-settings";

export default function SettingsDialog() {
    const { language, toggleLanguage, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const { visualFlashEnabled, toggleVisualFlash, soundEnabled, toggleSound } = useSettings();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Settings className="h-5 w-5" />
                    <span className="sr-only">{t("settings")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("settings")}</DialogTitle>
                    <DialogDescription>
                        {t("appearance")} & {t("visualFlash")}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">

                    {/* Visual Flash Setting */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="visual-flash" className="font-medium">
                                {t("visualFlash")}
                            </Label>
                            <span className="text-xs text-muted-foreground">
                                {t("visualFlashDesc")}
                            </span>
                        </div>
                        <Switch
                            id="visual-flash"
                            checked={visualFlashEnabled}
                            onCheckedChange={toggleVisualFlash}
                        />
                    </div>

                    <div className="h-[1px] bg-border my-2" />

                    {/* Sound Setting */}
                    <div className="flex items-center justify-between space-x-2">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="sound" className="font-medium">
                                {t("sound")}
                            </Label>
                            <span className="text-xs text-muted-foreground">
                                {t("soundDesc")}
                            </span>
                        </div>
                        <Switch
                            id="sound"
                            checked={soundEnabled}
                            onCheckedChange={toggleSound}
                        />
                    </div>

                    <div className="h-[1px] bg-border my-2" />

                    {/* Theme Setting */}
                    <div className="flex items-center justify-between">
                        <Label className="font-medium">{t("theme")}</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleTheme}
                            className="w-[140px] justify-start"
                        >
                            {theme === "light" ? (
                                <>
                                    <Sun className="mr-2 h-4 w-4" />
                                    {t("light")}
                                </>
                            ) : (
                                <>
                                    <Moon className="mr-2 h-4 w-4" />
                                    {t("dark")}
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Language Setting */}
                    <div className="flex items-center justify-between">
                        <Label className="font-medium">{t("language")}</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleLanguage}
                            className="w-[140px] justify-start"
                        >
                            <Globe className="mr-2 h-4 w-4" />
                            {language === 'es' ? 'Español' : 'English'}
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
