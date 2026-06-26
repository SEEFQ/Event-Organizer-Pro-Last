import { Link, useLocation } from "wouter";
import { Mountain, Plus, Shield, Store, Trophy, Tag, Image, History, ClipboardList, DollarSign } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: Shield },
    { href: "/admin/events/new", label: "Create Event", icon: Plus },
    { href: "/admin/sponsors", label: "Sponsors", icon: Store },
    { href: "/admin/participants", label: "Participants", icon: Trophy },
    { href: "/admin/event-types", label: "Event Types", icon: Tag },
    { href: "/admin/media-banners", label: "Banners", icon: Image },
    { href: "/admin/completed-events", label: "Past Events", icon: History },
    { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardList },
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
            <Link href="/admin" className="flex items-center space-x-2 shrink-0">
              <Mountain className="h-6 w-6 text-primary" />
              <span className="font-display font-bold inline-block text-xl tracking-tight text-foreground">
                OutdoorHub
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
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground leading-loose text-center md:text-left">
            Built for the community. Get outside.
          </p>
        </div>
      </footer>
    </div>
  );
}
