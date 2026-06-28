import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, MapPin, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";

const SPONSOR_TYPE_ICONS: Record<string, string> = {
  cafe: "☕", restaurant: "🍽️", camping: "⛺", hotel: "🏨",
  gym: "💪", shop: "🛍️", other: "🏢",
};

interface SponsorInfo {
  id: number;
  name: string;
  type: string;
  logoUrl: string | null;
  description: string | null;
  hasDiscount: boolean;
  website: string | null;
}

interface CheckinResult {
  participantName: string;
  discountCode: string | null;
  alreadyCheckedIn: boolean;
  checkedInAt?: string;
}

function LanguageToggle() {
  const { t } = useTranslation();
  const { lang, toggleLanguage } = useLanguage();
  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-4 end-4 z-50 flex items-center gap-0.5 text-xs font-semibold rounded-full border px-2.5 py-1 bg-background/80 backdrop-blur hover:bg-muted transition-colors select-none shadow-sm"
    >
      <span className={lang === "en" ? "text-foreground" : "text-muted-foreground"}>{t("common.en")}</span>
      <span className="text-muted-foreground mx-0.5">/</span>
      <span className={lang === "ar" ? "text-foreground" : "text-muted-foreground"}>{t("common.ar")}</span>
    </button>
  );
}

export default function SponsorCheckinPage() {
  const { scanToken } = useParams<{ scanToken: string }>();
  const { t } = useTranslation();
  const [sponsor, setSponsor] = useState<SponsorInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  useEffect(() => {
    if (!scanToken) return;
    fetch(`${base}/api/public/check-in/${encodeURIComponent(scanToken)}`)
      .then((r) => r.ok ? r.json() : r.json().then((j: { error?: string }) => Promise.reject(j.error ?? "Not found")))
      .then((data: SponsorInfo) => setSponsor(data))
      .catch((e: unknown) => setLoadError(typeof e === "string" ? e : t("checkin.invalidLinkDesc")))
      .finally(() => setLoading(false));
  }, [scanToken, base]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !scanToken) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${base}/api/public/check-in/${encodeURIComponent(scanToken)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json() as CheckinResult & { error?: string };
      if (!res.ok) {
        setSubmitError(data.error ?? t("checkin.networkError"));
        return;
      }
      setResult(data);
    } catch {
      setSubmitError(t("checkin.networkError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LanguageToggle />
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !sponsor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <LanguageToggle />
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t("checkin.invalidLink")}</h1>
          <p className="text-muted-foreground">{loadError ?? t("checkin.invalidLinkDesc")}</p>
        </div>
      </div>
    );
  }

  const icon = SPONSOR_TYPE_ICONS[sponsor.type] ?? "🏢";

  if (result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <LanguageToggle />
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>

          {result.alreadyCheckedIn ? (
            <>
              <h1 className="text-2xl font-bold mb-2">{t("checkin.alreadyCheckedIn")}</h1>
              <p className="text-muted-foreground mb-6">
                {t("checkin.alreadyCheckedInDesc", { name: result.participantName })}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">{t("checkin.checkinConfirmed")}</h1>
              <p className="text-muted-foreground mb-6">
                {t("checkin.welcomeMessage", { name: result.participantName, sponsor: sponsor.name })}
              </p>
            </>
          )}

          <div className="bg-muted/40 rounded-2xl p-5 mb-4 text-start space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="font-semibold">{sponsor.name}</div>
                {sponsor.website && (
                  <a href={sponsor.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {t("checkin.visitWebsite")}
                  </a>
                )}
              </div>
            </div>
          </div>

          {result.discountCode && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
              <div className="text-xs text-amber-700 uppercase tracking-wide font-semibold mb-1">{t("checkin.yourDiscount")}</div>
              <div className="font-mono text-2xl font-bold tracking-widest text-amber-900">{result.discountCode}</div>
              <div className="text-xs text-amber-700 mt-1">{t("checkin.showToStaff")}</div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t("checkin.thankYou")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <LanguageToggle />
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          {sponsor.logoUrl ? (
            <img src={sponsor.logoUrl} alt={sponsor.name} className="w-20 h-20 object-cover rounded-2xl mx-auto mb-4 shadow-sm" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">{icon}</span>
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight mb-1">{sponsor.name}</h1>
          {sponsor.description && (
            <p className="text-muted-foreground text-sm">{sponsor.description}</p>
          )}
          <div className="mt-3 inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full">
            <QrCode className="w-3.5 h-3.5" /> {t("checkin.partnerCheckin")}
          </div>
        </div>

        <div className="bg-card border rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-lg mb-1">{t("checkin.checkInHere")}</h2>
          <p className="text-muted-foreground text-sm mb-5">
            {t("checkin.checkInDesc")}
            {sponsor.hasDiscount ? t("checkin.checkInDescDiscount") : ""}.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phone">{t("checkin.registeredPhone")}</Label>
              <Input
                id="phone"
                type="tel"
                dir="auto"
                className="mt-1 text-lg tracking-wide"
                placeholder={t("checkin.phonePlaceholder")}
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setSubmitError(null); }}
                autoFocus
                required
              />
            </div>

            {submitError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={submitting || !phone.trim()}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 me-2 animate-spin" /> {t("checkin.checkingIn")}</>
              ) : (
                t("checkin.checkIn")
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {t("checkin.poweredBy")}
        </p>
      </div>
    </div>
  );
}
