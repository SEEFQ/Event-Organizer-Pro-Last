import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useListSponsors,
  useListSponsorsAnalytics,
  useCreateSponsor,
  useDeleteSponsor,
  useUpdateSponsor,
  getListSponsorsQueryKey,
  getListSponsorsAnalyticsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus, Trash2, Globe, Instagram, Facebook, Eye, Store, Pencil,
  TrendingUp, QrCode, CheckCircle2, ChevronDown, ChevronUp, Download,
  UserCheck, Printer,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const SPONSOR_TYPE_ICONS: Record<string, string> = {
  cafe: "☕", restaurant: "🍽️", camping: "⛺", hotel: "🏨",
  gym: "💪", shop: "🛍️", other: "🏢",
};

function getSponsorCheckinUrl(scanToken: string) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${window.location.origin}${base}/check-in/${encodeURIComponent(scanToken)}`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface CheckinRecord {
  id: number;
  checkedInAt: string;
  participantName: string;
  participantPhone: string | null;
  eventTitle: string | null;
}

function CheckinsDialog({ sponsorId, sponsorName, checkinsCount }: {
  sponsorId: number; sponsorName: string; checkinsCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    fetch(`${base}/api/sponsors/${sponsorId}/checkins`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCheckins(data as CheckinRecord[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, sponsorId]);

  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full transition-colors">
          <UserCheck className="w-3 h-3" /> {checkinsCount} check-in{checkinsCount !== 1 ? "s" : ""}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Venue Check-ins — {sponsorName}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between mb-3 mt-1">
          <span className="text-sm text-muted-foreground">{checkins.length} total visit{checkins.length !== 1 ? "s" : ""}</span>
          <a
            href={`${base}/api/sponsors/${sponsorId}/checkins/export`}
            download
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
        </div>
        <div className="overflow-y-auto flex-1 space-y-1">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : checkins.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No check-ins yet.</div>
          ) : checkins.map((c) => (
            <div key={c.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
              <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{c.participantName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.participantPhone}
                  {c.eventTitle && <span> · {c.eventTitle}</span>}
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {format(new Date(c.checkedInAt), "MMM d, h:mm a")}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function printVenueCard(
  sponsor: { name: string; type: string; description: string | null; discountCode: string | null },
  checkInUrl: string,
) {
  // Generate QR as a base64 PNG using qrcode (bundled via qrcode.react)
  const QRCode = (await import("qrcode")).default;
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, checkInUrl, {
    width: 220,
    margin: 2,
    color: { dark: "#111827", light: "#ffffff" },
  });
  const qrDataUrl = canvas.toDataURL("image/png");

  const w = window.open("", "_blank", "width=480,height=680");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Venue Card — ${escapeHtml(sponsor.name)}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { border: 2px solid #e5e7eb; border-radius: 20px; padding: 36px 32px; text-align: center; max-width: 380px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  .icon { font-size: 48px; margin-bottom: 8px; }
  h1 { margin: 0 0 6px; font-size: 26px; font-weight: 800; }
  p { color: #6b7280; font-size: 14px; margin: 0 0 24px; }
  .qr { margin: 0 auto 20px; }
  .instruction { font-size: 13px; color: #374151; background: #f9fafb; border-radius: 10px; padding: 12px 16px; line-height: 1.7; }
  .discount-badge { display: inline-block; background: #fef3c7; color: #92400e; border-radius: 8px; padding: 4px 12px; font-size: 13px; font-weight: 700; margin-top: 16px; letter-spacing: .08em; }
  @media print { body { min-height: auto; } }
</style>
</head><body>
<div class="card">
  <div class="icon">${escapeHtml(SPONSOR_TYPE_ICONS[sponsor.type] ?? "🏢")}</div>
  <h1>${escapeHtml(sponsor.name)}</h1>
  ${sponsor.description ? `<p>${escapeHtml(sponsor.description)}</p>` : "<p>Our partner location</p>"}
  <div class="qr"><img src="${qrDataUrl}" width="220" height="220" alt="Check-in QR"/></div>
  <div class="instruction">
    📱 Scan this QR with your phone<br>
    Enter your registered number to check in<br>
    ${sponsor.discountCode ? "and unlock your discount code!" : "and record your visit!"}
  </div>
  ${sponsor.discountCode ? `<div class="discount-badge">🎁 Discount unlocked on check-in</div>` : ""}
</div>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 200); };<\/script>
</body></html>`);
  w.document.close();
}

const TYPE_LABELS: Record<string, string> = {
  cafe: "Café", restaurant: "Restaurant", camping: "Camping / Outdoors",
  hotel: "Hotel", gym: "Gym / Sports Club", shop: "Shop", other: "Other",
};
const TYPE_ICONS: Record<string, string> = {
  cafe: "☕", restaurant: "🍽️", camping: "⛺", hotel: "🏨", gym: "💪", shop: "🛍️", other: "🏢",
};

interface SponsorFormData {
  name: string; type: string; website: string; instagram: string;
  facebook: string; description: string; discountCode: string;
}

const empty: SponsorFormData = { name: "", type: "cafe", website: "", instagram: "", facebook: "", description: "", discountCode: "" };

function SponsorForm({ initial, onSubmit, isPending, submitLabel }: {
  initial: SponsorFormData; onSubmit: (data: SponsorFormData) => void;
  isPending: boolean; submitLabel: string;
}) {
  const [form, setForm] = useState<SponsorFormData>(initial);
  const set = (k: keyof SponsorFormData, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <Label>Sponsor / Location name</Label>
        <Input dir="auto" className="mt-1" placeholder="e.g. Summit Café" value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={form.type} onValueChange={(v) => set("type", v)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{TYPE_ICONS[v]} {l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea className="mt-1" placeholder="Short description shown on event pages" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </div>
      <div>
        <Label>Discount Code <span className="text-muted-foreground">(optional)</span></Label>
        <Input className="mt-1 font-mono uppercase tracking-widest" placeholder="e.g. TRAIL20" value={form.discountCode} onChange={(e) => set("discountCode", e.target.value.toUpperCase())} />
        {form.discountCode && (
          <div className="mt-3 flex items-center gap-4 p-3 bg-muted/40 rounded-lg">
            <QRCodeSVG value={form.discountCode} size={72} />
            <div>
              <div className="text-xs text-muted-foreground mb-1">Preview</div>
              <div className="font-mono font-bold text-lg tracking-widest">{form.discountCode}</div>
            </div>
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label>Website</Label>
          <Input className="mt-1" placeholder="https://" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </div>
        <div>
          <Label>Instagram</Label>
          <Input className="mt-1" placeholder="@handle" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} />
        </div>
        <div>
          <Label>Facebook</Label>
          <Input className="mt-1" placeholder="Page name" value={form.facebook} onChange={(e) => set("facebook", e.target.value)} />
        </div>
      </div>
      <Button className="w-full" onClick={() => onSubmit(form)} disabled={isPending || !form.name.trim()}>
        {submitLabel}
      </Button>
    </div>
  );
}

// ─── Analytics card per sponsor ───────────────────────────────────────────────

function SponsorAnalyticsCard({ sponsorId }: { sponsorId: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data: analytics } = useListSponsorsAnalytics();
  const sponsorData = analytics?.find((a) => a.sponsorId === sponsorId);

  if (!sponsorData) return null;

  return (
    <div className="mt-4 pt-4 border-t space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-0.5">
            <Eye className="w-3 h-3" /> Page Views
          </div>
          <div className="font-bold text-xl">{sponsorData.pageViews.toLocaleString()}</div>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-primary mb-0.5">
            <TrendingUp className="w-3 h-3" /> Reg. Views
          </div>
          <div className="font-bold text-xl text-primary">{sponsorData.registrationsFromPage.toLocaleString()}</div>
        </div>
        <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-green-700 mb-0.5">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </div>
          <div className="font-bold text-xl text-green-700">{sponsorData.approvedRegistrations.toLocaleString()}</div>
        </div>
        <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Conversion</div>
          <div className="font-bold text-xl">{sponsorData.conversionRate.toFixed(1)}%</div>
        </div>
      </div>

      {sponsorData.byEvent && sponsorData.byEvent.length > 0 && (
        <div>
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Per-event breakdown ({sponsorData.byEvent.length})
          </button>
          {expanded && (
            <div className="mt-2 border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-3 py-2 font-medium">Event</th>
                    <th className="text-right px-3 py-2 font-medium">Views</th>
                    <th className="text-right px-3 py-2 font-medium">Reg. Views</th>
                    <th className="text-right px-3 py-2 font-medium">Approved</th>
                    <th className="text-right px-3 py-2 font-medium">Conv.</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sponsorData.byEvent.map((e) => (
                    <tr key={e.eventId} className="hover:bg-muted/20">
                      <td className="px-3 py-2 truncate max-w-[160px]">{e.eventTitle ?? `Event #${e.eventId}`}</td>
                      <td className="text-right px-3 py-2">{e.pageViews}</td>
                      <td className="text-right px-3 py-2">{e.registrationsFromPage}</td>
                      <td className="text-right px-3 py-2">{e.approvedRegistrations}</td>
                      <td className="text-right px-3 py-2">{e.conversionRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Sponsors Page ───────────────────────────────────────────────────────

export default function SponsorsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<null | { id: number; form: SponsorFormData }>(null);

  const { data: sponsors, isLoading } = useListSponsors({
    query: { queryKey: getListSponsorsQueryKey(), staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 30000 },
  });
  const { data: analytics } = useListSponsorsAnalytics({
    query: { queryKey: getListSponsorsAnalyticsQueryKey(), staleTime: 0 },
  });

  const createMutation = useCreateSponsor({
    mutation: {
      onSuccess: () => { toast({ title: "Sponsor added" }); setCreateOpen(false); queryClient.invalidateQueries({ queryKey: getListSponsorsQueryKey() }); },
    },
  });
  const updateMutation = useUpdateSponsor({
    mutation: {
      onSuccess: () => { toast({ title: "Sponsor updated" }); setEditingSponsor(null); queryClient.invalidateQueries({ queryKey: getListSponsorsQueryKey() }); },
    },
  });
  const deleteMutation = useDeleteSponsor({
    mutation: {
      onSuccess: () => { toast({ title: "Sponsor removed" }); queryClient.invalidateQueries({ queryKey: getListSponsorsQueryKey() }); },
    },
  });

  const handleCreate = (form: SponsorFormData) => {
    createMutation.mutate({ data: { name: form.name, type: form.type as never, website: form.website || undefined, instagram: form.instagram || undefined, facebook: form.facebook || undefined, description: form.description || undefined, discountCode: form.discountCode || undefined } });
  };
  const handleUpdate = (form: SponsorFormData) => {
    if (!editingSponsor) return;
    updateMutation.mutate({ id: editingSponsor.id, data: { name: form.name, type: form.type as never, website: form.website || undefined, instagram: form.instagram || undefined, facebook: form.facebook || undefined, description: form.description || undefined, discountCode: form.discountCode || undefined } });
  };
  const handleDelete = (id: number, name: string) => {
    if (confirm(`Remove "${name}" from your sponsors?`)) deleteMutation.mutate({ id });
  };

  // Summary totals from analytics
  const totalPageViews = analytics?.reduce((s, a) => s + a.pageViews, 0) ?? 0;
  const totalApproved = analytics?.reduce((s, a) => s + a.approvedRegistrations, 0) ?? 0;

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight">Sponsors</h1>
            <p className="text-muted-foreground mt-1">Manage event supporters and track their registration analytics.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2"><Plus className="w-4 h-4" /> Add Sponsor</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add a sponsor or supporter</DialogTitle></DialogHeader>
                <SponsorForm initial={empty} onSubmit={handleCreate} isPending={createMutation.isPending} submitLabel="Add sponsor" />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {sponsors && sponsors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-10">
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Store className="w-3.5 h-3.5" /> Total Sponsors
              </div>
              <div className="text-3xl font-bold">{sponsors.length}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Eye className="w-3.5 h-3.5" /> Total Page Views
              </div>
              <div className="text-3xl font-bold">{totalPageViews.toLocaleString()}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved Regs.
              </div>
              <div className="text-3xl font-bold text-green-700">{totalApproved.toLocaleString()}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <QrCode className="w-3.5 h-3.5" /> With Discount
              </div>
              <div className="text-3xl font-bold">{sponsors.filter((s) => s.discountCode).length}</div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading…</div>
        ) : sponsors && sponsors.length > 0 ? (
          <div className="space-y-4">
            {sponsors.map((s) => (
              <div key={s.id} className="bg-card border rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-lg">{TYPE_ICONS[s.type] ?? "🏢"}</span>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[s.type] ?? s.type}</Badge>
                      {s.eventsCount > 0 && <Badge variant="secondary" className="text-xs">{s.eventsCount} event{s.eventsCount !== 1 ? "s" : ""}</Badge>}
                      {s.discountCode && <Badge className="text-xs font-mono bg-amber-100 text-amber-800 hover:bg-amber-100">{s.discountCode}</Badge>}
                      {s.scanToken && (
                        <CheckinsDialog
                          sponsorId={s.id}
                          sponsorName={s.name}
                          checkinsCount={s.venueCheckinsCount ?? 0}
                        />
                      )}
                    </div>
                    <h3 className="font-semibold text-xl leading-snug">{s.name}</h3>
                    {s.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-3">
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Globe className="w-3.5 h-3.5" /> Website
                        </a>
                      )}
                      {s.instagram && (
                        <a href={s.instagram.startsWith("http") ? s.instagram : `https://instagram.com/${s.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-pink-500 transition-colors">
                          <Instagram className="w-3.5 h-3.5" /> {s.instagram.startsWith("@") ? s.instagram : `@${s.instagram}`}
                        </a>
                      )}
                      {s.facebook && (
                        <a href={s.facebook.startsWith("http") ? s.facebook : `https://facebook.com/${s.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-500 transition-colors">
                          <Facebook className="w-3.5 h-3.5" /> Facebook
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 shrink-0">
                    {s.scanToken && (
                      <div className="flex flex-col items-center gap-1">
                        {/* Venue check-in QR */}
                        <div className="p-1.5 bg-white border-2 border-indigo-200 rounded-lg shadow-sm" title="Venue Check-in QR — print and place at your partner's location">
                          <QRCodeSVG value={getSponsorCheckinUrl(s.scanToken)} size={64} />
                        </div>
                        <span className="text-[10px] text-indigo-600 font-medium">Check-in QR</span>
                      </div>
                    )}
                    {!s.scanToken && s.discountCode && (
                      <div className="p-1.5 bg-muted rounded-lg"><QRCodeSVG value={s.discountCode} size={64} /></div>
                    )}
                    {s.scanToken && (
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-600 hover:text-indigo-700" title="Print venue card"
                        onClick={() => {
                          printVenueCard(
                            { name: s.name, type: s.type, description: s.description ?? null, discountCode: s.discountCode ?? null },
                            getSponsorCheckinUrl(s.scanToken!),
                          ).catch(console.error);
                        }}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    )}
                    <a href={`/api/admin/sponsors/${s.id}/export`} download title="Export analytics CSV">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Download className="h-4 w-4" /></Button>
                    </a>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit"
                      onClick={() => setEditingSponsor({ id: s.id, form: { name: s.name, type: s.type, website: s.website ?? "", instagram: s.instagram ?? "", facebook: s.facebook ?? "", description: s.description ?? "", discountCode: s.discountCode ?? "" } })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(s.id, s.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <SponsorAnalyticsCard sponsorId={s.id} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border rounded-2xl bg-card">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No sponsors yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Add cafés, restaurants, camping houses, or any supporter.</p>
            <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add your first sponsor</Button>
          </div>
        )}
      </div>

      <Dialog open={!!editingSponsor} onOpenChange={(o) => { if (!o) setEditingSponsor(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit sponsor</DialogTitle></DialogHeader>
          {editingSponsor && <SponsorForm initial={editingSponsor.form} onSubmit={handleUpdate} isPending={updateMutation.isPending} submitLabel="Save changes" />}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
