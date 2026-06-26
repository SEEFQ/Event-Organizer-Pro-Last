import { useState } from "react";
import {
  useListEventTypes,
  useCreateEventType,
  useUpdateEventType,
  useDeleteEventType,
  getListEventTypesQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Archive, Loader2 } from "lucide-react";

interface TypeForm {
  name: string;
  icon: string;
  description: string;
  isArchived: boolean;
}

const emptyForm: TypeForm = { name: "", icon: "", description: "", isArchived: false };

export default function AdminEventTypesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TypeForm>(emptyForm);

  const { data: types, isLoading } = useListEventTypes();

  const createMutation = useCreateEventType({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event type created" });
        setCreateOpen(false);
        setForm(emptyForm);
        queryClient.invalidateQueries({ queryKey: getListEventTypesQueryKey() });
      },
      onError: () => toast({ title: "Failed to create", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateEventType({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event type updated" });
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListEventTypesQueryKey() });
      },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteEventType({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event type deleted" });
        queryClient.invalidateQueries({ queryKey: getListEventTypesQueryKey() });
      },
    },
  });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createMutation.mutate({
      data: {
        name: form.name,
        icon: form.icon || undefined,
        description: form.description || undefined,
        isArchived: form.isArchived,
      },
    });
  };

  const handleUpdate = () => {
    if (!editingId || !form.name.trim()) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        name: form.name,
        icon: form.icon || undefined,
        description: form.description || undefined,
        isArchived: form.isArchived,
      },
    });
  };

  const openEdit = (t: { id: number; name: string; icon?: string | null; description?: string | null; isArchived: boolean }) => {
    setEditingId(t.id);
    setForm({ name: t.name, icon: t.icon ?? "", description: t.description ?? "", isArchived: t.isArchived });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete event type "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const toggleArchive = (t: { id: number; name: string; icon?: string | null; description?: string | null; isArchived: boolean }) => {
    updateMutation.mutate({
      id: t.id,
      data: { name: t.name, icon: t.icon ?? undefined, description: t.description ?? undefined, isArchived: !t.isArchived },
    });
  };

  const FormFields = ({ isPending, onSubmit, submitLabel }: { isPending: boolean; onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4 pt-2">
      <div>
        <Label>Name <span className="text-destructive">*</span></Label>
        <Input className="mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Trail Running" />
      </div>
      <div>
        <Label>Icon <span className="text-muted-foreground">(emoji)</span></Label>
        <Input className="mt-1" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🏃" maxLength={4} />
      </div>
      <div>
        <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
        <Input className="mt-1" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button className="flex-1" onClick={onSubmit} disabled={isPending || !form.name.trim()}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel}
        </Button>
        <Button variant="outline" onClick={() => { setCreateOpen(false); setEditingId(null); setForm(emptyForm); }}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight">Event Types</h1>
            <p className="text-muted-foreground mt-1">Manage the master list of event types used when creating events.</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Type
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : types && types.length > 0 ? (
          <div className="border rounded-2xl overflow-hidden bg-card shadow-sm divide-y">
            {types.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                <span className="text-2xl w-8 text-center">{t.icon ?? "📅"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.name}</span>
                    {t.isArchived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0"
                    title={t.isArchived ? "Unarchive" : "Archive"}
                    onClick={() => toggleArchive(t)}
                    disabled={updateMutation.isPending}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id, t.name)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border rounded-2xl bg-card">
            <p className="text-xl font-bold mb-2">No event types yet</p>
            <p className="text-muted-foreground mb-6">Add categories like Hiking, Cycling, Trail Running…</p>
            <Button onClick={() => { setForm(emptyForm); setCreateOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Add your first type</Button>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Event Type</DialogTitle></DialogHeader>
          <FormFields isPending={createMutation.isPending} onSubmit={handleCreate} submitLabel="Create" />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editingId !== null} onOpenChange={(o) => { if (!o) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Event Type</DialogTitle></DialogHeader>
          <FormFields isPending={updateMutation.isPending} onSubmit={handleUpdate} submitLabel="Save changes" />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
