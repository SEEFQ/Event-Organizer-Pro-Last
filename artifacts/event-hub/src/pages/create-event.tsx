import { useLocation } from "wouter";
import { useCreateEvent, useListEventTypes, EventInputDifficulty } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowLeft, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  eventTypeId: z.coerce.number().optional(),
  date: z.string().min(1, "Date is required"),
  location: z.string().min(3, "Location is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  difficulty: z.nativeEnum(EventInputDifficulty).optional(),
  distance: z.string().optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  meetingPoint: z.string().optional(),
  guidelines: z.string().optional(),
  pointsValue: z.coerce.number().min(1, "Must award at least 1 point").default(1),
  photoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: eventTypes } = useListEventTypes();

  const createMutation = useCreateEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Event created! Shareable links are now in the dashboard." });
        setLocation("/admin");
      },
      onError: (err: any) => {
        toast({ title: "Failed to create event", description: err?.message, variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      eventTypeId: undefined,
      date: "",
      location: "",
      capacity: 10,
      distance: "",
      imageUrl: "",
      meetingPoint: "",
      guidelines: "",
      pointsValue: 1,
      photoUrl: "",
    },
  });

  return (
    <Layout>
      <div className="container max-w-3xl py-12">
        <Link href="/admin" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold tracking-tight mb-2">Organize an Event</h1>
          <p className="text-muted-foreground text-lg">Bring the community together for a new adventure.</p>
        </div>

        <div className="bg-card border border-border shadow-sm rounded-xl p-6 sm:p-8">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                createMutation.mutate({
                  data: {
                    ...data,
                    guidelines: data.guidelines || undefined,
                    distance: data.distance || undefined,
                    imageUrl: data.imageUrl || undefined,
                    meetingPoint: data.meetingPoint || undefined,
                    photoUrl: data.photoUrl || undefined,
                  },
                })
              )}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sunrise Peak Hike" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="eventTypeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type *</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v === "__none__" ? undefined : parseInt(v))}
                          value={field.value ? String(field.value) : "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">— Select type —</SelectItem>
                            {(eventTypes ?? []).map((et) => (
                              <SelectItem key={et.id} value={String(et.id)}>{et.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time *</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What should participants expect?" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Logistics</h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>General Location *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Mount Tamalpais, CA" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Used to generate a Google Maps link for participants.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meetingPoint"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific Meeting Point</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Main Trailhead Parking Lot" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participant Capacity *</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pointsValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          Loyalty Points Awarded
                        </FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={50} {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Points participants earn for joining this event.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={EventInputDifficulty.easy}>🟢 Easy</SelectItem>
                            <SelectItem value={EventInputDifficulty.moderate}>🟡 Moderate</SelectItem>
                            <SelectItem value={EventInputDifficulty.challenging}>🔴 Challenging</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="distance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Distance (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 5.2 miles" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Cover Image URL (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="photoUrl"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Photo Gallery URL (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://your-photo-sharing-link.com/..." {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Your external photo gallery link — shown to participants after they register.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Tips & Guidelines</h3>

                <FormField
                  control={form.control}
                  name="guidelines"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Guidelines</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`What to bring:\n• Water and snacks\n• Sturdy shoes\n\nWhat to wear:\n• Layers for weather changes\n\nGood to know:\n• Suitable for all fitness levels`}
                          className="min-h-[160px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Shown to participants on the registration page. Use bullet points (•) or plain paragraphs.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" size="lg" className="w-full text-lg font-semibold h-14" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Create Event
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
}
