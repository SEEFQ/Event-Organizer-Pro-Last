import { useState } from "react";
import { useParams, useSearch } from "wouter";
import {
  useGetEventByToken,
  useRegisterForEvent,
  getGetEventByTokenQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Calendar, MapPin, Users, Clock, Mountain, Ruler,
  CheckCircle2, Loader2, AlertCircle, Globe, Instagram, Facebook, Star, Share2, ImageIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const CATEGORY_LABELS: Record<string, string> = {
  cycling: "Cycling",
  hiking: "Hiking",
  "summer-night": "Summer Night",
  walking: "Walking",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-800",
  moderate: "bg-amber-100 text-amber-800",
  challenging: "bg-red-100 text-red-800",
};

const SPONSOR_TYPE_ICONS: Record<string, string> = {
  cafe: "☕", restaurant: "🍽️", camping: "⛺", hotel: "🏨", gym: "💪", shop: "🛍️", other: "🏢",
};

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function GuidelinesSection({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*");
        const isHeading = trimmed.endsWith(":") && !isBullet && trimmed.length < 60;
        if (isHeading) {
          return (
            <div key={i} className={`${i > 0 ? "mt-3" : ""} text-xs font-semibold uppercase tracking-wide text-muted-foreground`}>
              {trimmed.replace(/:$/, "")}
            </div>
          );
        }
        if (isBullet) {
          return (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-primary mt-0.5 shrink-0">•</span>
              <span>{trimmed.replace(/^[•\-*]\s*/, "")}</span>
            </div>
          );
        }
        return <p key={i} className="text-sm text-muted-foreground">{trimmed}</p>;
      })}
    </div>
  );
}

export default function RegisterPage() {
  const { token } = useParams<{ token: string }>();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refToken = new URLSearchParams(search).get("ref") ?? undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<"pending" | "confirmed" | "waitlist" | null>(null);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const { data, isLoading, error } = useGetEventByToken(token!, {
    query: { enabled: !!token, queryKey: getGetEventByTokenQueryKey(token!) },
  });

  const registerMutation = useRegisterForEvent({
    mutation: {
      onSuccess: (registration) => {
        const pts = data?.event?.pointsValue ?? 1;
        setSubmitted(true);
        setRegistrationStatus(registration.status as "pending" | "confirmed" | "waitlist");
        setEarnedPoints(registration.status === "confirmed" ? pts + (refToken ? 1 : 0) : 0);
        queryClient.invalidateQueries({ queryKey: getGetEventByTokenQueryKey(token!) });
      },
      onError: (err: unknown) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Registration failed. Please try again.";
        toast({ title: "Registration failed", description: message, variant: "destructive" });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    registerMutation.mutate({
      token: token!,
      data: { name, email, phone: phone || undefined, refToken },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <p className="text-muted-foreground">This registration link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const { event, sponsors } = data;
  const spotsLeft = event.capacity - event.registrationCount;
  const isFull = spotsLeft <= 0;
  const isClosed = event.status === "cancelled" || event.status === "completed";
  const pts = event.pointsValue ?? 1;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3">
            {registrationStatus === "pending"
              ? "Registration received!"
              : registrationStatus === "waitlist"
              ? "You're on the waitlist!"
              : "You're registered!"}
          </h1>
          <p className="text-muted-foreground mb-4">
            {registrationStatus === "pending"
              ? "Your registration is pending organizer approval. You'll hear back once it's confirmed."
              : registrationStatus === "waitlist"
              ? "The event is currently full, but you've been added to the waitlist. We'll contact you if a spot opens up."
              : `Your spot is confirmed for ${event.title}. See you there!`}
          </p>

          {registrationStatus === "confirmed" && earnedPoints > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-center gap-2 text-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>
                You earned{" "}
                <span className="font-bold text-amber-700">{earnedPoints} loyalty point{earnedPoints !== 1 ? "s" : ""}</span>
                {refToken && <span className="text-amber-600"> (includes +1 referral bonus!)</span>}
              </span>
            </div>
          )}

          {registrationStatus === "confirmed" && event.photoUrl && (
            <a
              href={event.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-blue-50 border border-blue-200 hover:border-blue-400 rounded-xl p-4 mb-2 text-sm text-left transition-colors group"
            >
              <div className="flex items-center gap-2 font-semibold mb-1 text-blue-800">
                <ImageIcon className="w-4 h-4" />
                Event Photo Gallery
              </div>
              <p className="text-blue-600 text-xs group-hover:underline truncate">{event.photoUrl}</p>
            </a>
          )}

          {registrationStatus === "confirmed" && (
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-2 text-sm text-left">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <Share2 className="w-4 h-4 text-primary" />
                Want to invite friends?
              </div>
              <p className="text-muted-foreground text-xs">
                Ask the organizer for your personal referral link. When friends register through it, you both earn bonus points!
              </p>
            </div>
          )}

          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex gap-2 items-center text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              {format(new Date(event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </div>
            <div className="flex gap-2 items-start text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <a
                href={mapsUrl(event.meetingPoint ?? event.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary underline underline-offset-2"
              >
                {event.meetingPoint ?? event.location}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {refToken && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-3 mb-6 text-sm">
            <Share2 className="w-4 h-4 text-primary shrink-0" />
            <span>You were invited by a friend! Register to earn <strong>+1 bonus loyalty point</strong> on top of the event points.</span>
          </div>
        )}

        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary">{CATEGORY_LABELS[event.category] ?? event.category}</Badge>
            {event.difficulty && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${DIFFICULTY_COLORS[event.difficulty] ?? ""}`}>
                {event.difficulty}
              </span>
            )}
            {isClosed && <Badge variant="destructive">Closed</Badge>}
            {!isClosed && isFull && <Badge variant="outline">Waitlist available</Badge>}
            {pts > 1 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {pts} pts
              </span>
            )}
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-3" data-testid="text-event-title">
            {event.title}
          </h1>

          {event.description && (
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">{event.description}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 bg-muted/40 rounded-lg p-3">
              <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Date & Time</div>
                <div className="text-sm font-medium">{format(new Date(event.date), "EEE, MMM d 'at' h:mm a")}</div>
              </div>
            </div>
            <a
              href={mapsUrl(event.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 bg-muted/40 rounded-lg p-3 hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-colors group"
            >
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Location</div>
                <div className="text-sm font-medium group-hover:text-primary transition-colors underline underline-offset-2 decoration-dotted">
                  {event.location}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Open in Google Maps ↗</div>
              </div>
            </a>
            {event.meetingPoint && (
              <a
                href={mapsUrl(event.meetingPoint)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 bg-muted/40 rounded-lg p-3 hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-colors group"
              >
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Meeting Point</div>
                  <div className="text-sm font-medium group-hover:text-primary transition-colors underline underline-offset-2 decoration-dotted">
                    {event.meetingPoint}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Open in Google Maps ↗</div>
                </div>
              </a>
            )}
            <div className="flex items-start gap-3 bg-muted/40 rounded-lg p-3">
              <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Spots</div>
                <div className="text-sm font-medium">
                  {isFull ? "Full — waitlist open" : `${spotsLeft} of ${event.capacity} remaining`}
                </div>
              </div>
            </div>
            {event.distance && (
              <div className="flex items-start gap-3 bg-muted/40 rounded-lg p-3">
                <Ruler className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Distance</div>
                  <div className="text-sm font-medium">{event.distance}</div>
                </div>
              </div>
            )}
            {event.difficulty && (
              <div className="flex items-start gap-3 bg-muted/40 rounded-lg p-3">
                <Mountain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Difficulty</div>
                  <div className="text-sm font-medium capitalize">{event.difficulty}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {event.guidelines && event.guidelines.trim() && (
          <div className="border rounded-2xl p-5 bg-card shadow-sm mb-6">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <span className="text-lg">📋</span> Tips & Guidelines
            </h2>
            <GuidelinesSection text={event.guidelines} />
          </div>
        )}

        <div className="border rounded-2xl p-6 bg-card shadow-sm">
          {isClosed ? (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Registrations are closed</p>
              <p className="text-muted-foreground text-sm mt-1">This event is no longer accepting sign-ups.</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1">
                {isFull ? "Join the waitlist" : "Register for this event"}
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                {isFull
                  ? "The event is full, but leave your details and we'll contact you if a spot opens up."
                  : `Secure your spot and earn ${pts}${refToken ? "+1 bonus" : ""} loyalty point${pts !== 1 || refToken ? "s" : ""} 🎉`}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    data-testid="input-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="input-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">
                    Phone number <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    data-testid="input-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  data-testid="button-register"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...</>
                  ) : isFull ? "Join waitlist" : "Register now"}
                </Button>
              </form>
            </>
          )}
        </div>

        {sponsors && sponsors.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Supported by</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {sponsors.map((s) => (
                <div key={s.id} className="border rounded-xl p-4 bg-card">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{SPONSOR_TYPE_ICONS[s.type] ?? "🏢"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm">{s.name}</div>
                      {s.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2">
                        {s.website && (
                          <a href={s.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <Globe className="w-3 h-3" /> Website
                          </a>
                        )}
                        {s.instagram && (
                          <a href={s.instagram.startsWith("http") ? s.instagram : `https://instagram.com/${s.instagram.replace("@", "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-pink-500 transition-colors">
                            <Instagram className="w-3 h-3" /> {s.instagram.startsWith("@") ? s.instagram : `@${s.instagram}`}
                          </a>
                        )}
                        {s.facebook && (
                          <a href={s.facebook.startsWith("http") ? s.facebook : `https://facebook.com/${s.facebook}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-500 transition-colors">
                            <Facebook className="w-3 h-3" /> Facebook
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {s.discountCode && (
                    <div className="mt-4 pt-3 border-t flex items-center gap-4">
                      <div className="bg-white p-2 rounded-lg border shadow-sm">
                        <QRCodeSVG value={s.discountCode} size={80} />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Discount code</div>
                        <div className="font-mono font-bold text-lg tracking-widest">{s.discountCode}</div>
                        <div className="text-xs text-muted-foreground mt-1">Scan or show at {s.name}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
