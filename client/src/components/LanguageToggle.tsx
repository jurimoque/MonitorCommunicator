import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="font-semibold"
    >
      {language === 'es' ? '🇬🇧 EN' : '🇪🇸 ES'}
    </Button>
  );
}
