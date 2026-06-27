import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, MapPin, QrCode } from "lucide-react";

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
  /** True when a discount code exists — actual code is only returned after successful check-in */
  hasDiscount: boolean;
  website: string | null;
}

interface CheckinResult {
  participantName: string;
  discountCode: string | null;
  alreadyCheckedIn: boolean;
  checkedInAt?: string;
}

export default function SponsorCheckinPage() {
  const { scanToken } = useParams<{ scanToken: string }>();
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
      .catch((e: unknown) => setLoadError(typeof e === "string" ? e : "Invalid check-in link"))
      .finally(() => setLoading(false));
  }, [scanToken, base]);

  const checkInUrl = `${window.location.origin}${base}/check-in/${encodeURIComponent(scanToken ?? "")}`;

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
        setSubmitError(data.error ?? "Check-in failed. Please try again.");
        return;
      }
      setResult(data);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !sponsor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">{loadError ?? "This check-in link is not valid."}</p>
        </div>
      </div>
    );
  }

  const icon = SPONSOR_TYPE_ICONS[sponsor.type] ?? "🏢";

  // ── Success state ────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>

          {result.alreadyCheckedIn ? (
            <>
              <h1 className="text-2xl font-bold mb-2">Already checked in today!</h1>
              <p className="text-muted-foreground mb-6">
                Hey <strong>{result.participantName}</strong>, you already checked in here today. Come back tomorrow for another check-in!
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">Check-in confirmed! 🎉</h1>
              <p className="text-muted-foreground mb-6">
                Welcome, <strong>{result.participantName}</strong>! Your visit to <strong>{sponsor.name}</strong> has been recorded.
              </p>
            </>
          )}

          <div className="bg-muted/40 rounded-2xl p-5 mb-4 text-left space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="font-semibold">{sponsor.name}</div>
                {sponsor.website && (
                  <a href={sponsor.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Visit website
                  </a>
                )}
              </div>
            </div>
          </div>

          {result.discountCode && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
              <div className="text-xs text-amber-700 uppercase tracking-wide font-semibold mb-1">🎁 Your Discount Code</div>
              <div className="font-mono text-2xl font-bold tracking-widest text-amber-900">{result.discountCode}</div>
              <div className="text-xs text-amber-700 mt-1">Show this to the staff to claim your discount</div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">Thank you for visiting our partner!</p>
        </div>
      </div>
    );
  }

  // ── Check-in form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        {/* Sponsor header */}
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
            <QrCode className="w-3.5 h-3.5" /> Partner Check-in
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-lg mb-1">Check in here</h2>
          <p className="text-muted-foreground text-sm mb-5">
            Enter the phone number you registered with to record your visit
            {sponsor.hasDiscount ? " and unlock your discount code" : ""}.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="phone">Your registered phone number</Label>
              <Input
                id="phone"
                type="tel"
                className="mt-1 text-lg tracking-wide"
                placeholder="+962 7x xxx xxxx"
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking in…</>
              ) : (
                "Check In →"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by Outdoor Event Hub
        </p>
      </div>
    </div>
  );
}
