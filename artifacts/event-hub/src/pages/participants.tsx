import { useState, useRef } from "react";
import {
  useAdminListParticipants,
  useAdminSearchParticipants,
  useAdminGetParticipant,
  useAdminCreateParticipant,
  useAdminChangeParticipantPhone,
  useAdminAddParticipantToEvent,
  useListEvents,
  getAdminListParticipantsQueryKey,
  getAdminGetParticipantQueryKey,
  getAdminSearchParticipantsQueryKey,
  type Participant,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Trophy, Star, Users, Share2, Loader2, Search, Plus,
  Phone, Mail, Calendar, ChevronDown, ChevronUp, UserCircle, Download, FileUp, Printer,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  waitlist: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

// ─── Participant Profile Panel ────────────────────────────────────────────────

function ParticipantProfile({ participant: baseParticipant, onClose }: { participant: Participant; onClose: () => void }) {
  const phone = baseParticipant.phone ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addToEventOpen, setAddToEventOpen] = useState(false);
  const [changePhoneOpen, setChangePhoneOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [addStatus, setAddStatus] = useState("confirmed");

  const { data, isLoading } = useAdminGetParticipant(encodeURIComponent(phone ?? ""), {
    query: { enabled: !!phone },
  });
  const { data: events } = useListEvents();

  const changePhoneMutation = useAdminChangeParticipantPhone({
    mutation: {
      onSuccess: () => {
        toast({ title: "Phone updated" });
        setChangePhoneOpen(false);
        setNewPhone("");
        queryClient.invalidateQueries({ queryKey: getAdminListParticipantsQueryKey() });
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const addToEventMutation = useAdminAddParticipantToEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Participant added to event" });
        setAddToEventOpen(false);
        setSelectedEventId("");
        queryClient.invalidateQueries({ queryKey: getAdminGetParticipantQueryKey(encodeURIComponent(phone)) });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  // Use detailed data if available, fall back to base participant for phoneless records
  const participant = data?.participant ?? baseParticipant;
  const registrations = data?.registrations ?? [];

  if (!phone && !data) {
    // Show basic info + set phone form for phoneless participants
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          ⚠️ This participant has no phone number. Set one below to unlock full profile features.
        </div>
        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{participant.name}</span></div>
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{participant.email}</span></div>
        </div>
        <div>
          <Label>Assign Phone Number</Label>
          <Input className="mt-1" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+962 7X XXX XXXX" />
        </div>
        <Button
          disabled={!newPhone.trim() || changePhoneMutation.isPending}
          onClick={() => {
            // Use the participant's email as a stand-in; API needs phone but let the admin know
            toast({ title: "Cannot set phone without existing phone", description: "Contact the API admin to set an initial phone for phoneless participants.", variant: "destructive" });
          }}
        >
          Save Phone
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/40 rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Points</div>
          <div className="text-xl font-bold text-amber-600">{participant.totalPoints}</div>
        </div>
        <div className="bg-muted/40 rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Events</div>
          <div className="text-xl font-bold">{participant.totalEvents}</div>
        </div>
        <div className="bg-muted/40 rounded-xl p-3 text-center">
          <div className="text-xs text-muted-foreground mb-0.5">Referrals</div>
          <div className="text-xl font-bold text-blue-600">{participant.referralCount}</div>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>{participant.phone ?? "No phone"}</span>
          <Button
            variant="ghost" size="sm"
            className="h-6 px-2 text-xs ml-auto"
            onClick={() => setChangePhoneOpen(true)}
          >
            Change
          </Button>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span>{participant.email}</span>
        </div>
        {participant.emergencyContactName && (
          <div className="text-xs text-muted-foreground">
            Emergency: {participant.emergencyContactName}
            {participant.emergencyContactPhone && ` · ${participant.emergencyContactPhone}`}
          </div>
        )}
        {participant.waiverAcceptedAt && (
          <div className="text-xs text-green-700">
            ✓ Waiver accepted {format(new Date(participant.waiverAcceptedAt), "MMM d, yyyy")}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => setAddToEventOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add to Event
        </Button>
      </div>

      {/* Registration history */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Event History</div>
        {registrations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No registrations yet.</p>
        ) : (
          <div className="space-y-2">
            {registrations.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.eventTitle}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(r.eventDate), "MMM d, yyyy")} · reg {format(new Date(r.registeredAt), "MMM d")}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? "bg-muted text-muted-foreground"}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add to event dialog */}
      <Dialog open={addToEventOpen} onOpenChange={setAddToEventOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add to Event</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Event</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select an event" /></SelectTrigger>
                <SelectContent>
                  {events?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.title} — {format(new Date(e.date), "MMM d")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={addStatus} onValueChange={setAddStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="waitlist">Waitlist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!selectedEventId || addToEventMutation.isPending}
                onClick={() => {
                  if (!participant.phone) {
                    toast({ title: "Participant has no phone number", variant: "destructive" });
                    return;
                  }
                  addToEventMutation.mutate({
                    phone: encodeURIComponent(participant.phone),
                    data: { eventId: parseInt(selectedEventId), status: addStatus as "confirmed" | "pending" | "waitlist" | "cancelled" },
                  });
                }}
              >
                {addToEventMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add
              </Button>
              <Button variant="outline" onClick={() => setAddToEventOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change phone dialog */}
      <Dialog open={changePhoneOpen} onOpenChange={setChangePhoneOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change Phone Number</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">Current: <span className="font-medium text-foreground">{participant.phone ?? "none"}</span></p>
            <div>
              <Label>New Phone Number</Label>
              <Input className="mt-1" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+962 7X XXX XXXX" />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!newPhone.trim() || changePhoneMutation.isPending}
                onClick={() => {
                  if (!participant.phone) return;
                  changePhoneMutation.mutate({
                    phone: encodeURIComponent(participant.phone),
                    data: { newPhone },
                  });
                }}
              >
                {changePhoneMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Phone
              </Button>
              <Button variant="outline" onClick={() => setChangePhoneOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Admin Participants Page ─────────────────────────────────────────────

// ─── Badge Printing ───────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function printBadges(participants: Participant[]) {
  const rows = participants.map((p) => `
    <div class="badge">
      <div class="name">${escapeHtml(p.name)}</div>
      ${p.phone ? `<div class="detail">📞 ${escapeHtml(p.phone)}</div>` : ""}
      ${p.email ? `<div class="detail">✉ ${escapeHtml(p.email)}</div>` : ""}
      <div class="detail">Events: ${p.totalEvents} · Points: ${p.totalPoints}</div>
    </div>`).join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Participant Badges</title>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 16px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .badge { border: 2px solid #333; border-radius: 8px; padding: 12px 16px; page-break-inside: avoid; }
    .name { font-size: 18px; font-weight: bold; margin-bottom: 6px; }
    .detail { font-size: 12px; color: #555; margin-top: 3px; }
    @media print { body { padding: 0; } }
  </style></head><body>
  <div class="grid">${rows}</div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  win.document.close();
}

// ─── CSV Import ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Array<{ name?: string; email?: string; phone?: string }> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return { name: row["name"] || row["fullname"] || row["participantname"], email: row["email"] || row["emailaddress"], phone: row["phone"] || row["phonenumber"] || row["mobile"] };
  }).filter((r) => r.name || r.email);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParticipantsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", emergencyContactName: "", emergencyContactPhone: "" });
  const [page, setPage] = useState(1);

  // CSV import state
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Array<{ name?: string; email?: string; phone?: string }>>([]);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSearching = searchQuery.trim().length > 0;

  const { data: listData, isLoading: listLoading } = useAdminListParticipants(
    { page, limit: 50 },
    { query: { enabled: !isSearching, queryKey: getAdminListParticipantsQueryKey({ page, limit: 50 }) } }
  );

  const { data: searchResults, isLoading: searchLoading } = useAdminSearchParticipants(
    { q: searchQuery },
    { query: { enabled: isSearching, queryKey: getAdminSearchParticipantsQueryKey({ q: searchQuery }) } }
  );

  const createMutation = useAdminCreateParticipant({
    mutation: {
      onSuccess: () => {
        toast({ title: "Participant created" });
        setCreateOpen(false);
        setCreateForm({ name: "", email: "", phone: "", emergencyContactName: "", emergencyContactPhone: "" });
        queryClient.invalidateQueries({ queryKey: getAdminListParticipantsQueryKey() });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const participants = isSearching ? (searchResults ?? []) : (listData?.participants ?? []);
  const total = listData?.total ?? 0;
  const isLoading = isSearching ? searchLoading : listLoading;

  const exportUrl = `/api/admin/participants/export`;

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight">Participants</h1>
            <p className="text-muted-foreground mt-1">Search and manage all participants. Click a row to view their profile.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href={exportUrl} download>
              <Button variant="outline" size="lg" className="gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            </a>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => { setImportRows([]); setImportResult(null); setImportOpen(true); }}
            >
              <FileUp className="w-4 h-4" /> Import CSV
            </Button>
            {participants.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => printBadges(participants)}
              >
                <Printer className="w-4 h-4" /> Print Badges
              </Button>
            )}
            <Button size="lg" className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" /> Create Participant
            </Button>
          </div>
        </div>

        {/* Stats */}
        {!isSearching && listData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Users className="w-3.5 h-3.5" /> Total
              </div>
              <div className="text-3xl font-bold">{total}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Star className="w-3.5 h-3.5" /> This Page
              </div>
              <div className="text-3xl font-bold">{participants.length}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Trophy className="w-3.5 h-3.5" /> Top Points
              </div>
              <div className="text-3xl font-bold">
                {participants.reduce((m, p) => Math.max(m, p.totalPoints), 0)}
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or phone…"
            className="pl-9"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : participants.length > 0 ? (
          <>
            <div className="border rounded-2xl overflow-hidden bg-card shadow-sm divide-y">
              {participants.map((p) => (
                <button
                  key={p.id}
                  className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
                  onClick={() => setSelectedParticipant(p)}
                >
                  <UserCircle className="w-8 h-8 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {p.email}</span>
                      {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-muted-foreground">Events</div>
                      <div className="font-semibold">{p.totalEvents}</div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-muted-foreground">Referrals</div>
                      <div className="font-semibold text-blue-600">{p.referralCount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Points</div>
                      <div className="font-bold text-amber-600">{p.totalPoints}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {!isSearching && total > 50 && (
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page * 50 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24 border rounded-2xl bg-card">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">{isSearching ? "No results found" : "No participants yet"}</h3>
            <p className="text-muted-foreground">
              {isSearching ? "Try a different name, email, or phone number." : "Participants appear here as people register for events."}
            </p>
          </div>
        )}
      </div>

      {/* Profile dialog */}
      <Dialog open={!!selectedParticipant} onOpenChange={(o) => { if (!o) setSelectedParticipant(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              {selectedParticipant?.name ?? "Participant Profile"}
            </DialogTitle>
          </DialogHeader>
          {selectedParticipant && (
            <ParticipantProfile
              participant={selectedParticipant}
              onClose={() => setSelectedParticipant(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* CSV Import dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) { setImportOpen(false); setImportRows([]); setImportResult(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import Participants from CSV</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {!importResult ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with columns: <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">email</code>, <code className="bg-muted px-1 rounded">phone</code>. Existing participants will be updated (phone-first, then email).
                </p>
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">Click to choose a CSV file</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV or Excel-exported CSV (.csv)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      setImportRows(parseCSV(text));
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
                {importRows.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">{importRows.length} rows detected — preview:</p>
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto text-xs">
                      {importRows.slice(0, 8).map((r, i) => (
                        <div key={i} className="flex gap-3 px-3 py-1.5">
                          <span className="font-medium truncate flex-1">{r.name ?? "—"}</span>
                          <span className="text-muted-foreground truncate">{r.email ?? "—"}</span>
                          <span className="text-muted-foreground shrink-0">{r.phone ?? "—"}</span>
                        </div>
                      ))}
                      {importRows.length > 8 && (
                        <div className="px-3 py-1.5 text-muted-foreground italic">…and {importRows.length - 8} more</div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={importRows.length === 0 || isImporting}
                    onClick={async () => {
                      setIsImporting(true);
                      try {
                        const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
                        const res = await fetch(`${base}/api/admin/participants/import`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(importRows),
                        });
                        const json = await res.json() as { created?: number; updated?: number; failed?: number; errors?: string[]; error?: string };
                        if (!res.ok) {
                          toast({ title: "Import failed", description: json.error ?? "Server error", variant: "destructive" });
                          return;
                        }
                        const result = { created: json.created ?? 0, updated: json.updated ?? 0, failed: json.failed ?? 0, errors: json.errors ?? [] };
                        setImportResult(result);
                        queryClient.invalidateQueries({ queryKey: getAdminListParticipantsQueryKey() });
                      } catch {
                        toast({ title: "Import failed", variant: "destructive" });
                      } finally {
                        setIsImporting(false);
                      }
                    }}
                  >
                    {isImporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</> : `Import ${importRows.length} participants`}
                  </Button>
                  <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-700">{importResult.created}</div>
                    <div className="text-xs text-green-600">Created</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-700">{importResult.updated}</div>
                    <div className="text-xs text-blue-600">Updated</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-2xl font-bold text-red-700">{importResult.failed}</div>
                    <div className="text-xs text-red-600">Failed</div>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
                    {importResult.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                  </div>
                )}
                <Button className="w-full" onClick={() => { setImportOpen(false); setImportRows([]); setImportResult(null); }}>
                  Done
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create participant dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Participant</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input className="mt-1" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input className="mt-1" type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <Label>Phone <span className="text-muted-foreground">(optional)</span></Label>
              <Input className="mt-1" type="tel" value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+962 7X XXX XXXX" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Emergency Contact</Label>
                <Input className="mt-1" value={createForm.emergencyContactName} onChange={(e) => setCreateForm((f) => ({ ...f, emergencyContactName: e.target.value }))} placeholder="Name" />
              </div>
              <div>
                <Label>Emergency Phone</Label>
                <Input className="mt-1" value={createForm.emergencyContactPhone} onChange={(e) => setCreateForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))} placeholder="+962..." />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                disabled={!createForm.name.trim() || !createForm.email.trim() || createMutation.isPending}
                onClick={() => {
                  createMutation.mutate({
                    data: {
                      name: createForm.name,
                      email: createForm.email,
                      phone: createForm.phone || undefined,
                      emergencyContactName: createForm.emergencyContactName || undefined,
                      emergencyContactPhone: createForm.emergencyContactPhone || undefined,
                    },
                  });
                }}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Participant
              </Button>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
