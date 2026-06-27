import { useState, useRef, useCallback } from "react";
import {
  useListMediaBanners,
  useCreateMediaBanner,
  useUpdateMediaBanner,
  useDeleteMediaBanner,
  useReorderMediaBanners,
  getListMediaBannersQueryKey,
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
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Loader2, Image, Video, Upload, X } from "lucide-react";

interface BannerForm {
  type: "image" | "video";
  url: string;
  thumbnailUrl: string;
  title: string;
  isActive: boolean;
}

const emptyForm: BannerForm = { type: "image", url: "", thumbnailUrl: "", title: "", isActive: true };

// ─── Banner Form Fields ───────────────────────────────────────────────────────
// NOTE: Defined at module scope (not inside AdminMediaBannersPage) to prevent
// re-mount on every parent render, which causes input focus loss.

interface BannerFormFieldsProps {
  form: BannerForm;
  setForm: React.Dispatch<React.SetStateAction<BannerForm>>;
  isPending: boolean;
  isUploading: boolean;
  onFileUpload: (file: File) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

function BannerFormFields({ form, setForm, isPending, isUploading, onFileUpload, onSubmit, onCancel, submitLabel }: BannerFormFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Type selector */}
      <div>
        <Label>Type</Label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="banner-type"
              checked={form.type === "image"}
              onChange={() => setForm((f) => ({ ...f, type: "image" }))}
              className="accent-primary"
            />
            <span className="text-sm flex items-center gap-1"><Image className="w-3.5 h-3.5" /> Image / GIF</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="banner-type"
              checked={form.type === "video"}
              onChange={() => setForm((f) => ({ ...f, type: "video" }))}
              className="accent-primary"
            />
            <span className="text-sm flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Video</span>
          </label>
        </div>
      </div>

      {/* URL + upload */}
      <div>
        <Label>
          URL <span className="text-destructive">*</span>
          <span className="text-muted-foreground font-normal ml-1 text-xs">or browse from computer</span>
        </Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder={form.type === "video" ? "https://... (mp4)" : "https://... (jpg, png, gif, webp)"}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Browse
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={form.type === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/gif,image/webp"}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {form.type === "image" ? "Supports JPG, PNG, GIF (animated), and WebP." : "Supports MP4, WebM, and MOV."}
        </p>
      </div>

      {form.type === "video" && (
        <div>
          <Label>Thumbnail URL <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            className="mt-1"
            value={form.thumbnailUrl}
            onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
            placeholder="https://... (preview image)"
          />
        </div>
      )}

      <div>
        <Label>Caption <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          className="mt-1"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Text shown at the bottom of the banner"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="accent-primary"
          />
          <span className="text-sm">Set as active banner <span className="text-muted-foreground">(deactivates any currently active banner)</span></span>
        </label>
      </div>

      {/* Preview */}
      {form.url && form.type === "image" && (
        <div>
          <Label>Preview</Label>
          <img
            src={form.url}
            alt="preview"
            className="mt-2 rounded-lg w-full h-32 object-cover border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={isPending || isUploading || !form.url.trim()}
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

export default function AdminMediaBannersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [isUploading, setIsUploading] = useState(false);

  const { data: banners, isLoading } = useListMediaBanners();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListMediaBannersQueryKey() });

  const createMutation = useCreateMediaBanner({
    mutation: {
      onSuccess: () => {
        toast({ title: "Banner added" });
        setCreateOpen(false);
        setForm(emptyForm);
        invalidate();
      },
      onError: () => toast({ title: "Failed to create", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateMediaBanner({
    mutation: {
      onSuccess: () => {
        toast({ title: "Banner updated" });
        setEditingId(null);
        invalidate();
      },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteMediaBanner({
    mutation: {
      onSuccess: () => { toast({ title: "Banner deleted" }); invalidate(); },
    },
  });

  const reorderMutation = useReorderMediaBanners({
    mutation: { onSuccess: () => invalidate() },
  });

  // Upload a file: read as base64, POST to server, update form.url
  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const res = await fetch(`${base}/api/media-banners/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, filename: file.name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Upload failed");
      }
      const { url } = await res.json() as { url: string };
      setForm((f) => ({ ...f, url }));
      toast({ title: "File uploaded", description: "URL filled in automatically." });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const handleCreate = () => {
    if (!form.url.trim()) return;
    createMutation.mutate({
      data: {
        type: form.type,
        url: form.url,
        thumbnailUrl: form.thumbnailUrl || undefined,
        title: form.title || undefined,
        isActive: form.isActive,
        displayOrder: (banners?.length ?? 0) + 1,
      },
    });
  };

  const handleUpdate = () => {
    if (!editingId || !form.url.trim()) return;
    updateMutation.mutate({
      id: editingId,
      data: {
        type: form.type,
        url: form.url,
        thumbnailUrl: form.thumbnailUrl || undefined,
        title: form.title || undefined,
        isActive: form.isActive,
      },
    });
  };

  const toggleActive = (banner: { id: number; type: string; url: string; isActive: boolean; thumbnailUrl?: string | null; title?: string | null }) => {
    updateMutation.mutate({
      id: banner.id,
      data: { type: banner.type as "image" | "video", url: banner.url, isActive: !banner.isActive },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this banner?")) deleteMutation.mutate({ id });
  };

  const moveUp = (idx: number) => {
    if (!banners || idx === 0) return;
    const reordered = [...banners];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    reorderMutation.mutate({ data: reordered.map((b, i) => ({ id: b.id, displayOrder: i + 1 })) });
  };

  const moveDown = (idx: number) => {
    if (!banners || idx === banners.length - 1) return;
    const reordered = [...banners];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    reorderMutation.mutate({ data: reordered.map((b, i) => ({ id: b.id, displayOrder: i + 1 })) });
  };

  const openEdit = (b: { id: number; type: string; url: string; thumbnailUrl?: string | null; title?: string | null; isActive: boolean }) => {
    setEditingId(b.id);
    setForm({ type: b.type as "image" | "video", url: b.url, thumbnailUrl: b.thumbnailUrl ?? "", title: b.title ?? "", isActive: b.isActive });
  };

  const cancelForm = () => {
    setCreateOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight">Media Banners</h1>
            <p className="text-muted-foreground mt-1">
              Manage image, GIF, and video banners shown on registration pages. Only one banner can be active at a time.
            </p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Banner
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : banners && banners.length > 0 ? (
          <div className="space-y-3">
            {banners.map((b, idx) => (
              <div key={b.id} className="border rounded-xl bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {b.type === "video" ? (
                      b.thumbnailUrl ? (
                        <img src={b.thumbnailUrl} alt="thumb" className="w-full h-full object-cover" />
                      ) : (
                        <Video className="w-6 h-6 text-muted-foreground" />
                      )
                    ) : (
                      <img
                        src={b.url}
                        alt={b.title ?? "banner"}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{b.type}</Badge>
                      {b.isActive ? (
                        <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    {b.title && <p className="text-sm font-medium truncate">{b.title}</p>}
                    <p className="text-xs text-muted-foreground truncate">{b.url}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex flex-col">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveUp(idx)} disabled={idx === 0 || reorderMutation.isPending}>
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => moveDown(idx)} disabled={idx === banners.length - 1 || reorderMutation.isPending}>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title={b.isActive ? "Deactivate" : "Set as active"}
                      onClick={() => toggleActive(b)}
                    >
                      {b.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(b)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border rounded-2xl bg-card">
            <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-bold mb-2">No banners yet</p>
            <p className="text-muted-foreground mb-6">
              Add images, GIFs, or video banners to display at the top of registration pages.
            </p>
            <Button onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add your first banner
            </Button>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) cancelForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Media Banner</DialogTitle></DialogHeader>
          <BannerFormFields
            form={form}
            setForm={setForm}
            isPending={createMutation.isPending}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            onSubmit={handleCreate}
            onCancel={cancelForm}
            submitLabel="Add banner"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingId !== null} onOpenChange={(o) => { if (!o) cancelForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Banner</DialogTitle></DialogHeader>
          <BannerFormFields
            form={form}
            setForm={setForm}
            isPending={updateMutation.isPending}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            onSubmit={handleUpdate}
            onCancel={cancelForm}
            submitLabel="Save changes"
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
