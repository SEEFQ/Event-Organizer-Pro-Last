import { useState } from "react";
import { useParams } from "wouter";
import {
  useGetEventByPhotoToken,
  useUploadPhotoByToken,
  getGetEventByPhotoTokenQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Calendar, MapPin, ImagePlus, Loader2, AlertCircle, CheckCircle2, X, Globe, Instagram, Facebook } from "lucide-react";
import { ObjectUploader } from "@workspace/object-storage-web";
import { QRCodeSVG } from "qrcode.react";

const CATEGORY_LABELS: Record<string, string> = {
  cycling: "Cycling",
  hiking: "Hiking",
  "summer-night": "Summer Night",
  walking: "Walking",
};

const SPONSOR_TYPE_ICONS: Record<string, string> = {
  cafe: "☕", restaurant: "🍽️", camping: "⛺", hotel: "🏨", gym: "💪", shop: "🛍️", other: "🏢",
};

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

export default function PhotosPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");
  const [pendingObjectPath, setPendingObjectPath] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);

  const { data, isLoading, error } = useGetEventByPhotoToken(token!, {
    query: { enabled: !!token, queryKey: getGetEventByPhotoTokenQueryKey(token!) },
  });

  const uploadMutation = useUploadPhotoByToken({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEventByPhotoTokenQueryKey(token!) });
        setUploaderName("");
        setCaption("");
        setPendingObjectPath(null);
        setShowUploader(false);
        setJustUploaded(true);
        setTimeout(() => setJustUploaded(false), 4000);
        toast({ title: "Photo shared!", description: "Your photo has been added to the gallery." });
      },
      onError: () => {
        toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
      },
    },
  });

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
          <h1 className="text-2xl font-bold mb-2">Gallery not found</h1>
          <p className="text-muted-foreground">This photo link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const { event, photos, sponsors } = data;

  const handleSubmitPhoto = () => {
    if (!uploaderName.trim() || !pendingObjectPath) return;
    uploadMutation.mutate({
      token: token!,
      data: { uploaderName, caption: caption || undefined, objectPath: pendingObjectPath },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
            {CATEGORY_LABELS[event.category] ?? event.category}
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{event.title} — Photos</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(event.date), "EEE, MMM d, yyyy")}
            </span>
            <a
              href={mapsUrl(event.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors underline underline-offset-2 decoration-dotted"
            >
              <MapPin className="w-3.5 h-3.5" />
              {event.location} ↗
            </a>
          </div>
        </div>

        {justUploaded && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <span className="text-sm font-medium">Your photo has been added to the gallery!</span>
          </div>
        )}

        <div className="border rounded-2xl p-5 bg-card shadow-sm mb-8">
          {!showUploader ? (
            <button
              onClick={() => setShowUploader(true)}
              className="w-full flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-muted rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <ImagePlus className="w-8 h-8 text-muted-foreground" />
              <span className="font-medium text-muted-foreground">Share your photos from this event</span>
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Share a photo</h2>
                <button onClick={() => setShowUploader(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="uploaderName">Your name</Label>
                  <Input
                    id="uploaderName"
                    className="mt-1"
                    placeholder="Your name"
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="caption">Caption <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="caption"
                    className="mt-1"
                    placeholder="Describe the moment…"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Photo</Label>
                  <div className="mt-1">
                    <ObjectUploader
                      onUploadComplete={(objectPath) => setPendingObjectPath(objectPath)}
                      onUploadError={(err) => toast({ title: "Upload error", description: String(err), variant: "destructive" })}
                      accept="image/*"
                      maxSizeMB={20}
                    />
                  </div>
                </div>
                {pendingObjectPath && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Photo uploaded — click Save to add it to the gallery
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={handleSubmitPhoto}
                  disabled={!uploaderName.trim() || !pendingObjectPath || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                  ) : "Save to gallery"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {photos.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold mb-4">{photos.length} photo{photos.length !== 1 ? "s" : ""}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="rounded-xl overflow-hidden bg-muted aspect-square relative group">
                  <img
                    src={`/api/storage/objects/${photo.objectPath}`}
                    alt={photo.caption ?? photo.uploaderName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <div className="text-white text-xs font-medium">{photo.uploaderName}</div>
                    {photo.caption && <div className="text-white/80 text-xs">{photo.caption}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <ImagePlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No photos yet</p>
            <p className="text-sm">Be the first to share a photo from this event!</p>
          </div>
        )}

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
