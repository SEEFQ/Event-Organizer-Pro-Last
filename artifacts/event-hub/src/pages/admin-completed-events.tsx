import { useState } from "react";
import {
  useListCompletedEvents,
  useCreateCompletedEvent,
  useUpdateCompletedEvent,
  useDeleteCompletedEvent,
  useListEvents,
  getListCompletedEventsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, EyeOff, ImageIcon, Loader2, Import } from "lucide-react";
import { format } from "date-fns";

interface EventForm {
  title: string;
  eventType: string;
  shortDescription: string;
  coverImageUrl: string;
  eventDate: string;
  displayOrder: string;
  isVisible: boolean;
}

const emptyForm: EventForm = {
  title: "", eventType: "", shortDescription: "",
  coverImageUrl: "", eventDate: "", displayOrder: "", isVisible: true,
};

// ─── Form Fields Component ────────────────────────────────────────────────────
// Defined at module scope (NOT inside the parent component) to avoid remounting
// on every parent render, which causes input focus loss.

interface CompletedEventFormFieldsProps {
  form: EventForm;
  setForm: React.Dispatch<React.SetStateAction<EventForm>>;
  sourceEvents?: Array<{ id: number; title: string; date: string; category: string }> | null;
  isPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

function CompletedEventFormFields({
  form, setForm, sourceEvents, isPending, onSubmit, onCancel, submitLabel,
}: CompletedEventFormFieldsProps) {
  const set = (k: keyof EventForm, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleImportEvent = (id: string) => {
    const ev = sourceEvents?.find((e) => String(e.id) === id);
    if (!ev) return;
    setForm((f) => ({
      ...f,
      title: ev.title,
      eventType: ev.category,
      eventDate: ev.date ? format(new Date(ev.date), "yyyy-MM-dd") : "",
    }));
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Import from existing event */}
      {sourceEvents && sourceEvents.length > 0 && (
        <div className="bg-muted/40 rounded-lg p-3 space-y-2 border">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Import className="w-3.5 h-3.5" /> Pre-fill from an existing event
          </Label>
          <Select onValueChange={handleImportEvent}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select an event to import its details…" />
            </SelectTrigger>
            <SelectContent>
              {sourceEvents.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.title}
                  {e.date ? ` — ${format(new Date(e.date), "MMM d, yyyy")}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Fills in title, type, and date. You can still edit all fields below.</p>
        </div>
      )}

      <div>
        <Label>Title <span className="text-destructive">*</span></Label>
        <Input
          className="mt-1"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Valley Ridge Hike — Summer 2024"
        />
      </div>
      <div>
        <Label>Event Type <span className="text-destructive">*</span></Label>
        <Input
          className="mt-1"
          value={form.eventType}
          onChange={(e) => set("eventType", e.target.value)}
          placeholder="e.g. Hiking, Cycling, Night Walk"
        />
      </div>
      <div>
        <Label>Short Description <span className="text-destructive">*</span></Label>
        <Textarea
          className="mt-1 min-h-[80px]"
          value={form.shortDescription}
          onChange={(e) => set("shortDescription", e.target.value)}
          placeholder="A brief summary shown on the public page"
        />
      </div>
      <div>
        <Label>Cover Image URL <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          className="mt-1"
          value={form.coverImageUrl}
          onChange={(e) => set("coverImageUrl", e.target.value)}
          placeholder="https://..."
        />
        {form.coverImageUrl && (
          <img
            src={form.coverImageUrl}
            alt="preview"
            className="mt-2 rounded-lg w-full h-28 object-cover border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Event Date <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            className="mt-1"
            type="date"
            value={form.eventDate}
            onChange={(e) => set("eventDate", e.target.value)}
          />
        </div>
        <div>
          <Label>Display Order</Label>
          <Input
            className="mt-1"
            type="number"
            min={0}
            value={form.displayOrder}
            onChange={(e) => set("displayOrder", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => set("isVisible", e.target.checked)}
            className="accent-primary"
          />
          <span className="text-sm">Visible on registration pages</span>
        </label>
      </div>
      <div className="flex gap-3 pt-2">
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={isPending || !form.title.trim() || !form.eventType.trim() || !form.shortDescription.trim()}
        >
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCompletedEventsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const { data: events, isLoading } = useListCompletedEvents();
  const { data: sourceEvents } = useListEvents();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCompletedEventsQueryKey() });

  const createMutation = useCreateCompletedEvent({
    mutation: {
      onSuccess: () => { toast({ title: "Past event added" }); setCreateOpen(false); setForm(emptyForm); invalidate(); },
      onError: () => toast({ title: "Failed to create", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateCompletedEvent({
    mutation: {
      onSuccess: () => { toast({ title: "Past event updated" }); setEditingId(null); invalidate(); },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteCompletedEvent({
    mutation: {
      onSuccess: () => { toast({ title: "Past event deleted" }); invalidate(); },
    },
  });

  const toData = (f: EventForm) => ({
    title: f.title,
    eventType: f.eventType,
    shortDescription: f.shortDescription,
    coverImageUrl: f.coverImageUrl || undefined,
    eventDate: f.eventDate || undefined,
    displayOrder: f.displayOrder ? parseInt(f.displayOrder) : undefined,
    isVisible: f.isVisible,
  });

  const handleCreate = () => {
    if (!form.title.trim() || !form.eventType.trim() || !form.shortDescription.trim()) return;
    createMutation.mutate({ data: toData(form) });
  };

  const handleUpdate = () => {
    if (!editingId || !form.title.trim()) return;
    updateMutation.mutate({ id: editingId, data: toData(form) });
  };

  const toggleVisible = (e: { id: number; title: string; eventType: string; shortDescription: string; isVisible: boolean }) => {
    updateMutation.mutate({
      id: e.id,
      data: { title: e.title, eventType: e.eventType, shortDescription: e.shortDescription, isVisible: !e.isVisible },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this past event card?")) deleteMutation.mutate({ id });
  };

  const openEdit = (e: typeof events extends (infer T)[] | undefined ? T : never) => {
    setEditingId(e!.id);
    setForm({
      title: e!.title,
      eventType: e!.eventType,
      shortDescription: e!.shortDescription,
      coverImageUrl: e!.coverImageUrl ?? "",
      eventDate: e!.eventDate ?? "",
      displayOrder: String(e!.displayOrder),
      isVisible: e!.isVisible,
    });
  };

  const cancelForm = () => { setCreateOpen(false); setEditingId(null); setForm(emptyForm); };

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight">Past Events</h1>
            <p className="text-muted-foreground mt-1">Showcase completed events on public registration pages.</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Past Event
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : events && events.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e) => (
              <div key={e.id} className="border rounded-xl overflow-hidden bg-card shadow-sm">
                {e.coverImageUrl ? (
                  <img src={e.coverImageUrl} alt={e.title} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-muted flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">{e.eventType}</Badge>
                    {!e.isVisible && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                    {e.eventDate && <span className="text-xs text-muted-foreground">{e.eventDate}</span>}
                  </div>
                  <h3 className="font-semibold text-sm leading-snug mb-1">{e.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{e.shortDescription}</p>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-1" onClick={() => toggleVisible(e)}>
                      {e.isVisible ? <><EyeOff className="w-3 h-3 mr-1" /> Hide</> : <><Eye className="w-3 h-3 mr-1" /> Show</>}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border rounded-2xl bg-card">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-bold mb-2">No past events yet</p>
            <p className="text-muted-foreground mb-6">Add completed event cards to showcase on registration pages.</p>
            <Button onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add your first past event
            </Button>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) cancelForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Past Event</DialogTitle></DialogHeader>
          <CompletedEventFormFields
            form={form}
            setForm={setForm}
            sourceEvents={sourceEvents ?? null}
            isPending={createMutation.isPending}
            onSubmit={handleCreate}
            onCancel={cancelForm}
            submitLabel="Add event"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingId !== null} onOpenChange={(o) => { if (!o) cancelForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Past Event</DialogTitle></DialogHeader>
          <CompletedEventFormFields
            form={form}
            setForm={setForm}
            sourceEvents={sourceEvents ?? null}
            isPending={updateMutation.isPending}
            onSubmit={handleUpdate}
            onCancel={cancelForm}
            submitLabel="Save changes"
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
