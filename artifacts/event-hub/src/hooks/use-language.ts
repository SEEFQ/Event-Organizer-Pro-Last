import { useTranslation } from "react-i18next";
import { applyDir } from "@/i18n";

export function useLanguage() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(next);
    localStorage.setItem("lang", next);
    applyDir(next);
  };

  return {
    lang: i18n.language,
    isArabic: i18n.language === "ar",
    toggleLanguage,
  };
}
