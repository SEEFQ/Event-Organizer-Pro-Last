import { useState } from "react";
import {
  useListEvents,
  useDeleteEvent,
  useUpdateEvent,
  getListEventsQueryKey,
  useGetStats,
  useListEventSponsors,
  useListSponsors,
  useAddEventSponsor,
  useRemoveEventSponsor,
  useListEventRegistrations,
  useUpdateRegistrationStatus,
  EventInputCategory,
  EventInputDifficulty,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Trash2, XCircle, Copy, Check, Link2, ImageIcon, Plus,
  Users, Calendar, BarChart3, Pencil, ChevronDown, ChevronUp, Store, Share2, X,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

const CATEGORY_LABELS: Record<string, string> = {
  cycling: "Cycling",
  hiking: "Hiking",
  "summer-night": "Summer Night",
  walking: "Walking",
};

const SPONSOR_TYPE_ICONS: Record<string, string> = {
  cafe: "☕", restaurant: "🍽️", camping: "⛺", hotel: "🏨", gym: "💪", shop: "🛍️", other: "🏢",
};

function CopyButton({ value, label, size = "default" }: { value: string; label: string; size?: "default" | "sm" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (size === "sm") {
    return (
      <button
        onClick={handleCopy}
        title={`Copy ${label}`}
        className="inline-flex items-center gap-1 text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded transition-colors"
      >
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        {copied ? "Copied!" : "Copy link"}
      </button>
    );
  }
  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

// ─── Edit Event Dialog ────────────────────────────────────────────────────────

interface EditEventDialogProps {
  event: {
    id: number;
    title: string;
    description?: string | null;
    category: string;
    date: string;
    location: string;
    capacity: number;
    status: string;
    difficulty?: string | null;
    distance?: string | null;
    imageUrl?: string | null;
    meetingPoint?: string | null;
    guidelines?: string | null;
    pointsValue: number;
    photoUrl?: string | null;
  };
  open: boolean;
  onClose: () => void;
}

function EditEventDialog({ event, open, onClose }: EditEventDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: event.title,
    description: event.description ?? "",
    category: event.category,
    date: event.date ? format(new Date(event.date), "yyyy-MM-dd'T'HH:mm") : "",
    location: event.location,
    capacity: String(event.capacity),
    status: event.status,
    difficulty: event.difficulty ?? "",
    distance: event.distance ?? "",
    imageUrl: event.imageUrl ?? "",
    meetingPoint: event.meetingPoint ?? "",
    guidelines: event.guidelines ?? "",
    pointsValue: String(event.pointsValue ?? 1),
    photoUrl: event.photoUrl ?? "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const updateMutation = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event updated" });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        onClose();
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: event.id,
      data: {
        title: form.title,
        description: form.description || undefined,
        category: form.category as typeof EventInputCategory[keyof typeof EventInputCategory],
        date: new Date(form.date).toISOString(),
        location: form.location,
        capacity: parseInt(form.capacity),
        status: form.status as "upcoming" | "ongoing" | "completed" | "cancelled",
        difficulty: (form.difficulty as typeof EventInputDifficulty[keyof typeof EventInputDifficulty]) || undefined,
        distance: form.distance || undefined,
        imageUrl: form.imageUrl || undefined,
        meetingPoint: form.meetingPoint || undefined,
        guidelines: form.guidelines || undefined,
        pointsValue: parseInt(form.pointsValue) || 1,
        photoUrl: form.photoUrl || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Title</Label>
              <Input className="mt-1" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cycling">🚴 Cycling</SelectItem>
                  <SelectItem value="hiking">🥾 Hiking</SelectItem>
                  <SelectItem value="summer-night">🌙 Summer Night</SelectItem>
                  <SelectItem value="walking">🚶 Walking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input className="mt-1" type="datetime-local" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input className="mt-1" type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Input className="mt-1" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div>
              <Label>Meeting Point</Label>
              <Input className="mt-1" placeholder="Specific address or landmark" value={form.meetingPoint} onChange={(e) => set("meetingPoint", e.target.value)} />
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty || "__none__"} onValueChange={(v) => set("difficulty", v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Not set —</SelectItem>
                  <SelectItem value="easy">🟢 Easy</SelectItem>
                  <SelectItem value="moderate">🟡 Moderate</SelectItem>
                  <SelectItem value="challenging">🔴 Challenging</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Distance</Label>
              <Input className="mt-1" placeholder="e.g. 5.2 miles" value={form.distance} onChange={(e) => set("distance", e.target.value)} />
            </div>
            <div>
              <Label>Loyalty Points</Label>
              <Input className="mt-1" type="number" min={1} value={form.pointsValue} onChange={(e) => set("pointsValue", e.target.value)} />
            </div>
            <div>
              <Label>Cover Image URL</Label>
              <Input className="mt-1" placeholder="https://..." value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Photo Gallery URL</Label>
              <Input className="mt-1" placeholder="https://your-photo-sharing-link.com/..." value={form.photoUrl} onChange={(e) => set("photoUrl", e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Your external photo gallery link — shown to participants after they register.</p>
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea className="mt-1 min-h-[80px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Tips & Guidelines</Label>
              <Textarea className="mt-1 min-h-[120px] font-mono text-sm" value={form.guidelines} onChange={(e) => set("guidelines", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Sponsors Panel ─────────────────────────────────────────────────────

function EventSponsorsPanel({ eventId }: { eventId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>("");

  const { data: linked, isLoading } = useListEventSponsors(eventId);
  const { data: allSponsors } = useListSponsors();

  const addMutation = useAddEventSponsor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Sponsor added to event" });
        setSelectedSponsorId("");
        queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/sponsors`] });
      },
    },
  });

  const removeMutation = useRemoveEventSponsor({
    mutation: {
      onSuccess: () => {
        toast({ title: "Sponsor removed" });
        queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/sponsors`] });
      },
    },
  });

  const linkedIds = new Set(linked?.map((s) => s.id));
  const available = allSponsors?.filter((s) => !linkedIds.has(s.id)) ?? [];

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : linked && linked.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {linked.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 bg-muted/60 rounded-lg pl-2.5 pr-1.5 py-1 text-sm">
              <span>{SPONSOR_TYPE_ICONS[s.type] ?? "🏢"}</span>
              <span className="font-medium">{s.name}</span>
              <button
                className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => removeMutation.mutate({ id: eventId, sponsorId: s.id })}
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No sponsors linked yet.</p>
      )}

      {available.length > 0 && (
        <div className="flex gap-2 items-center">
          <Select value={selectedSponsorId} onValueChange={setSelectedSponsorId}>
            <SelectTrigger className="h-8 text-xs flex-1 max-w-xs">
              <SelectValue placeholder="Add a sponsor…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {SPONSOR_TYPE_ICONS[s.type] ?? "🏢"} {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!selectedSponsorId || addMutation.isPending}
            onClick={() => addMutation.mutate({ id: eventId, data: { sponsorId: parseInt(selectedSponsorId) } })}
          >
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
      )}

      {allSponsors?.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No sponsors yet.{" "}
          <Link href="/admin/sponsors" className="underline hover:text-primary">Create sponsors first</Link>.
        </p>
      )}
    </div>
  );
}

// ─── Registrations Panel ──────────────────────────────────────────────────────

function RegistrationsPanel({ eventId, registrationToken }: { eventId: number; registrationToken: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: registrations, isLoading } = useListEventRegistrations(eventId);

  const statusMutation = useUpdateRegistrationStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/registrations`] });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      },
      onError: () => toast({ title: "Action failed", variant: "destructive" }),
    },
  });

  const setStatus = (regId: number, status: "confirmed" | "waitlist" | "cancelled" | "pending") =>
    statusMutation.mutate({ id: regId, data: { status } });

  const getReferralLink = (refToken: string | null | undefined) => {
    if (!refToken) return null;
    return `${window.location.origin}${import.meta.env.BASE_URL}r/${registrationToken}?ref=${refToken}`;
  };

  const pending    = registrations?.filter((r) => r.status === "pending")    ?? [];
  const confirmed  = registrations?.filter((r) => r.status === "confirmed")  ?? [];
  const waitlisted = registrations?.filter((r) => r.status === "waitlist")   ?? [];
  const cancelled  = registrations?.filter((r) => r.status === "cancelled")  ?? [];

  if (isLoading) return <div className="text-xs text-muted-foreground">Loading…</div>;
  if (!registrations || registrations.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No registrations yet.</p>;
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">
            Pending approval ({pending.length})
          </div>
          <div className="space-y-1">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                  {r.phone && <div className="text-xs text-muted-foreground truncate">{r.phone}</div>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700"
                    disabled={statusMutation.isPending}
                    onClick={() => setStatus(r.id, "confirmed")}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                    disabled={statusMutation.isPending}
                    onClick={() => setStatus(r.id, "cancelled")}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmed.length > 0 && (
        <div>
          <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
            Confirmed ({confirmed.length})
          </div>
          <div className="space-y-1">
            {confirmed.map((r) => {
              const refLink = getReferralLink(r.referralToken);
              return (
                <div key={r.id} className="flex items-center gap-3 bg-green-50/60 border border-green-100 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                    {r.referralCount > 0 && (
                      <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                        <Share2 className="w-3 h-3" /> {r.referralCount} friend{r.referralCount !== 1 ? "s" : ""} referred
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {refLink && <CopyButton value={refLink} label="referral link" size="sm" />}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                      disabled={statusMutation.isPending}
                      onClick={() => setStatus(r.id, "cancelled")}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {waitlisted.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Waitlist ({waitlisted.length})
          </div>
          <div className="space-y-1">
            {waitlisted.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    disabled={statusMutation.isPending}
                    onClick={() => setStatus(r.id, "confirmed")}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div>
          <div className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
            Cancelled ({cancelled.length})
          </div>
          <div className="space-y-1">
            {cancelled.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-red-50/40 border border-red-100 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 shrink-0"
                  disabled={statusMutation.isPending}
                  onClick={() => setStatus(r.id, "pending")}
                >
                  Reinstate
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editingEvent, setEditingEvent] = useState<null | (typeof events extends (infer T)[] ? T : never)>(null);
  const [expandedSponsors, setExpandedSponsors] = useState<Set<number>>(new Set());
  const [expandedRegistrations, setExpandedRegistrations] = useState<Set<number>>(new Set());

  const { data: events, isLoading } = useListEvents({}, {
    query: { queryKey: getListEventsQueryKey() }
  });

  const { data: stats } = useGetStats();

  const deleteMutation = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event deleted" });
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      }
    }
  });

  const handleDeleteEvent = (id: number) => {
    if (confirm("Permanently delete this event and all its registrations? This cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  };

  const getRegistrationLink = (token: string) => {
    return `${window.location.origin}${import.meta.env.BASE_URL}r/${token}`;
  };

  const toggleSponsors = (id: number) => {
    setExpandedSponsors((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleRegistrations = (id: number) => {
    setExpandedRegistrations((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight" data-testid="text-admin-title">Organizer Dashboard</h1>
            <p className="text-muted-foreground mt-1">Create events and share registration links with your participants.</p>
          </div>
          <Link href="/admin/events/new">
            <Button size="lg" className="gap-2" data-testid="button-create-event">
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          </Link>
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Calendar className="w-3.5 h-3.5" /> Total Events
              </div>
              <div className="text-3xl font-bold" data-testid="text-total-events">{stats.totalEvents}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <BarChart3 className="w-3.5 h-3.5" /> Upcoming
              </div>
              <div className="text-3xl font-bold" data-testid="text-upcoming-events">{stats.upcomingEvents}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Users className="w-3.5 h-3.5" /> Participants
              </div>
              <div className="text-3xl font-bold" data-testid="text-total-participants">{stats.totalParticipants}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Users className="w-3.5 h-3.5" /> Registrations
              </div>
              <div className="text-3xl font-bold" data-testid="text-total-registrations">{stats.totalRegistrations}</div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : events && events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-card border rounded-2xl shadow-sm overflow-hidden"
                data-testid={`card-event-${event.id}`}
              >
                {/* Header */}
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[event.category] ?? event.category}
                        </Badge>
                        <Badge
                          variant={event.status === "cancelled" ? "destructive" : event.status === "completed" ? "secondary" : "default"}
                          className="text-xs capitalize"
                        >
                          {event.status}
                        </Badge>
                        {event.pointsValue > 1 && (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">⭐ {event.pointsValue} pts</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg leading-snug" data-testid={`text-event-title-${event.id}`}>
                        {event.title}
                      </h3>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(event.date), "EEE, MMM d, yyyy 'at' h:mm a")} · {event.location}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {event.registrationCount} / {event.capacity} registered
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditingEvent(event as any)}
                        title="Edit event"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={deleteMutation.isPending}
                        title="Delete event"
                        data-testid={`button-delete-${event.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Share links */}
                  <div className={`mt-4 pt-4 border-t grid gap-3 ${event.photoUrl ? "sm:grid-cols-2" : ""}`}>
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                        <Link2 className="w-3 h-3" />
                        <span className="font-medium uppercase tracking-wide">Registration link</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-foreground truncate flex-1">
                          {getRegistrationLink(event.registrationToken)}
                        </span>
                        <CopyButton value={getRegistrationLink(event.registrationToken)} label="registration link" />
                      </div>
                    </div>
                    {event.photoUrl && (
                      <div className="bg-muted/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                          <ImageIcon className="w-3 h-3" />
                          <span className="font-medium uppercase tracking-wide">Photo gallery</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={event.photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-foreground truncate flex-1 hover:underline hover:text-primary transition-colors"
                          >
                            {event.photoUrl}
                          </a>
                          <CopyButton value={event.photoUrl} label="photo link" />
                        </div>
                      </div>
                    )}
                    {!event.photoUrl && (
                      <p className="text-xs text-muted-foreground italic self-center">
                        No photo gallery URL set — add one via the edit (✏️) button.
                      </p>
                    )}
                  </div>
                </div>

                {/* Expandable: Sponsors */}
                <div className="border-t">
                  <button
                    className="w-full flex items-center gap-2 px-5 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
                    onClick={() => toggleSponsors(event.id)}
                  >
                    <Store className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Sponsors for this event</span>
                    {expandedSponsors.has(event.id)
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
                  </button>
                  {expandedSponsors.has(event.id) && (
                    <div className="px-5 pb-5 bg-muted/10">
                      <p className="text-xs text-muted-foreground mb-3">
                        Sponsors linked here will appear with their discount QR codes on the registration page.
                      </p>
                      <EventSponsorsPanel eventId={event.id} />
                    </div>
                  )}
                </div>

                {/* Expandable: Registrations & Referral Links */}
                <div className="border-t">
                  <button
                    className="w-full flex items-center gap-2 px-5 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
                    onClick={() => toggleRegistrations(event.id)}
                  >
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Registrations & referral links</span>
                    <span className="text-xs text-muted-foreground">({event.registrationCount} confirmed)</span>
                    {expandedRegistrations.has(event.id)
                      ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                      : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
                  </button>
                  {expandedRegistrations.has(event.id) && (
                    <div className="px-5 pb-5 bg-muted/10">
                      <p className="text-xs text-muted-foreground mb-3">
                        Copy each participant's personal referral link to send them via email. When a friend registers through it, both get bonus points.
                      </p>
                      <RegistrationsPanel
                        eventId={event.id}
                        registrationToken={event.registrationToken}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border rounded-2xl bg-card">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No events yet</h3>
            <p className="text-muted-foreground mb-6">Create your first event to get started.</p>
            <Link href="/admin/events/new">
              <Button data-testid="button-create-first-event">Create your first event</Button>
            </Link>
          </div>
        )}
      </div>

      {editingEvent && (
        <EditEventDialog
          event={editingEvent as any}
          open={!!editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </Layout>
  );
}
