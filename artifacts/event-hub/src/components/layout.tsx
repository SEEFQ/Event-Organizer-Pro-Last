import { Link, useLocation } from "wouter";
import { Mountain, Plus, Shield, Store, Trophy, Tag, Image, History, ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { lang, toggleLanguage } = useLanguage();

  const navItems = [
    { href: "/admin", label: t("nav.dashboard"), icon: Shield },
    { href: "/admin/events/new", label: t("nav.createEvent"), icon: Plus },
    { href: "/admin/sponsors", label: t("nav.sponsors"), icon: Store },
    { href: "/admin/participants", label: t("nav.participants"), icon: Trophy },
    { href: "/admin/event-types", label: t("nav.eventTypes"), icon: Tag },
    { href: "/admin/media-banners", label: t("nav.banners"), icon: Image },
    { href: "/admin/completed-events", label: t("nav.pastEvents"), icon: History },
    { href: "/admin/audit-log", label: t("nav.auditLog"), icon: ClipboardList },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return location === "/admin";
    return location.startsWith(href);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex gap-6 md:gap-8 min-w-0">
            <Link href="/admin" className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
              <Mountain className="h-6 w-6 text-primary" />
              <span className="font-display font-bold inline-block text-xl tracking-tight text-foreground">
                {t("nav.brand")}
              </span>
            </Link>
            <nav className="hidden lg:flex gap-5 overflow-x-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${
                    isActive(item.href) ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-0.5 text-xs font-semibold rounded-full border px-2.5 py-1 bg-muted/50 hover:bg-muted transition-colors select-none"
              title="Switch language / تغيير اللغة"
            >
              <span className={lang === "en" ? "text-foreground" : "text-muted-foreground"}>{t("common.en")}</span>
              <span className="text-muted-foreground mx-0.5">/</span>
              <span className={lang === "ar" ? "text-foreground" : "text-muted-foreground"}>{t("common.ar")}</span>
            </button>
            {/* Mobile nav */}
            <nav className="flex lg:hidden gap-3 overflow-x-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${
                    isActive(item.href) ? "text-primary" : "text-muted-foreground"
                  }`}
                  title={item.label}
                >
                  <item.icon className="w-4 h-4" />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground leading-loose text-center md:text-start">
            {t("footer.tagline")}
          </p>
        </div>
      </footer>
    </div>
  );
}
