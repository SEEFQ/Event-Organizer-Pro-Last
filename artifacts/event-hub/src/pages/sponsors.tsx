import { useState } from "react";
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
import {
  Plus, Trash2, Globe, Instagram, Facebook, Eye, Store, Pencil,
  TrendingUp, QrCode, CheckCircle2, ChevronDown, ChevronUp, Download, Scan,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

function getSponsorScanUrl(scanToken: string) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${window.location.origin}${base}/api/public/sponsor-scan/${encodeURIComponent(scanToken)}`;
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
        <Input className="mt-1" placeholder="e.g. Summit Café" value={form.name} onChange={(e) => set("name", e.target.value)} required />
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
                    {/* Tracked scan QR (scanToken) takes priority; fallback to discount code QR */}
                    {s.scanToken ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="p-1.5 bg-white border rounded-lg shadow-sm">
                          <QRCodeSVG value={getSponsorScanUrl(s.scanToken)} size={56} />
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Scan className="w-2.5 h-2.5" />{s.qrScanCount ?? 0} scans
                        </span>
                      </div>
                    ) : s.discountCode ? (
                      <div className="p-1.5 bg-muted rounded-lg"><QRCodeSVG value={s.discountCode} size={56} /></div>
                    ) : null}
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
