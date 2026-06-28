import { useState } from "react";
import { useTranslation } from "react-i18next";
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

// ─── Form Fields (module-scope to prevent focus-loss on re-render) ─────────────

interface EventTypeFormFieldsProps {
  form: TypeForm;
  setForm: React.Dispatch<React.SetStateAction<TypeForm>>;
  isPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

function EventTypeFormFields({ form, setForm, isPending, onSubmit, onCancel, submitLabel }: EventTypeFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 pt-2">
      <div>
        <Label>{t("eventTypes.name")} <span className="text-destructive">*</span></Label>
        <Input
          dir="auto"
          className="mt-1"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={t("eventTypes.namePlaceholder")}
        />
      </div>
      <div>
        <Label>{t("eventTypes.icon")}</Label>
        <Input
          className="mt-1"
          value={form.icon}
          onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          placeholder={t("eventTypes.iconPlaceholder")}
          maxLength={4}
        />
      </div>
      <div>
        <Label>{t("eventTypes.descriptionLabel")}</Label>
        <Input
          dir="auto"
          className="mt-1"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder={t("eventTypes.descriptionPlaceholder")}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button className="flex-1" onClick={onSubmit} disabled={isPending || !form.name.trim()}>
          {isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
          {submitLabel}
        </Button>
        <Button variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminEventTypesPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TypeForm>(emptyForm);

  const { data: types, isLoading } = useListEventTypes();

  const createMutation = useCreateEventType({
    mutation: {
      onSuccess: () => {
        toast({ title: t("eventTypes.created") });
        setCreateOpen(false);
        setForm(emptyForm);
        queryClient.invalidateQueries({ queryKey: getListEventTypesQueryKey() });
      },
      onError: () => toast({ title: t("eventTypes.failedCreate"), variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateEventType({
    mutation: {
      onSuccess: () => {
        toast({ title: t("eventTypes.updated") });
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListEventTypesQueryKey() });
      },
      onError: () => toast({ title: t("eventTypes.failedUpdate"), variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteEventType({
    mutation: {
      onSuccess: () => {
        toast({ title: t("eventTypes.deleted") });
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

  const openEdit = (type: { id: number; name: string; icon?: string | null; description?: string | null; isArchived: boolean }) => {
    setEditingId(type.id);
    setForm({ name: type.name, icon: type.icon ?? "", description: type.description ?? "", isArchived: type.isArchived });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(t("eventTypes.confirmDelete", { name }))) {
      deleteMutation.mutate({ id });
    }
  };

  const toggleArchive = (type: { id: number; name: string; icon?: string | null; description?: string | null; isArchived: boolean }) => {
    updateMutation.mutate({
      id: type.id,
      data: { name: type.name, icon: type.icon ?? undefined, description: type.description ?? undefined, isArchived: !type.isArchived },
    });
  };

  const cancelForm = () => { setCreateOpen(false); setEditingId(null); setForm(emptyForm); };

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight">{t("eventTypes.pageTitle")}</h1>
            <p className="text-muted-foreground mt-1">{t("eventTypes.pageDesc")}</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
            <Plus className="w-4 h-4" /> {t("eventTypes.addType")}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : types && types.length > 0 ? (
          <div className="border rounded-2xl overflow-hidden bg-card shadow-sm divide-y">
            {types.map((type) => (
              <div key={type.id} className="flex items-center gap-4 px-5 py-4">
                <span className="text-2xl w-8 text-center">{type.icon ?? "📅"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{type.name}</span>
                    {type.isArchived && <Badge variant="secondary" className="text-xs">{t("eventTypes.archived")}</Badge>}
                  </div>
                  {type.description && <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0"
                    title={type.isArchived ? "Unarchive" : "Archive"}
                    onClick={() => toggleArchive(type)}
                    disabled={updateMutation.isPending}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(type)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(type.id, type.name)}
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
            <p className="text-xl font-bold mb-2">{t("eventTypes.noTypes")}</p>
            <Button onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 me-2" /> {t("eventTypes.addType")}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) cancelForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("eventTypes.createTitle")}</DialogTitle></DialogHeader>
          <EventTypeFormFields
            form={form}
            setForm={setForm}
            isPending={createMutation.isPending}
            onSubmit={handleCreate}
            onCancel={cancelForm}
            submitLabel={t("eventTypes.createBtn")}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingId !== null} onOpenChange={(o) => { if (!o) cancelForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("eventTypes.editTitle")}</DialogTitle></DialogHeader>
          <EventTypeFormFields
            form={form}
            setForm={setForm}
            isPending={updateMutation.isPending}
            onSubmit={handleUpdate}
            onCancel={cancelForm}
            submitLabel={t("eventTypes.saveBtn")}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
