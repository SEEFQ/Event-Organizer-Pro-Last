import { useParams } from "wouter";
import { 
  useGetEvent, 
  useListEventRegistrations, 
  useRegisterForEvent, 
  useListEventComments, 
  useCreateComment,
  useCancelRegistration,
  getGetEventQueryKey,
  getListEventRegistrationsQueryKey,
  getListEventCommentsQueryKey
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calendar, MapPin, Users, Activity, Mountain, MessageSquare, Loader2, ArrowLeft } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const registrationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
});

const commentSchema = z.object({
  authorName: z.string().min(2, "Name is required"),
  content: z.string().min(5, "Comment is too short"),
});

export default function EventDetail() {
  const params = useParams();
  const eventId = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading: eventLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId, queryKey: getGetEventQueryKey(eventId) }
  });

  const { data: registrations } = useListEventRegistrations(eventId, {
    query: { enabled: !!eventId, queryKey: getListEventRegistrationsQueryKey(eventId) }
  });

  const { data: comments } = useListEventComments(eventId, {
    query: { enabled: !!eventId, queryKey: getListEventCommentsQueryKey(eventId) }
  });

  const registerMutation = useRegisterForEvent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Successfully registered!" });
        queryClient.invalidateQueries({ queryKey: getGetEventQueryKey(eventId) });
        queryClient.invalidateQueries({ queryKey: getListEventRegistrationsQueryKey(eventId) });
        regForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "Registration failed", description: err?.message || "Please try again", variant: "destructive" });
      }
    }
  });

  const commentMutation = useCreateComment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Comment added" });
        queryClient.invalidateQueries({ queryKey: getListEventCommentsQueryKey(eventId) });
        commentForm.reset();
      }
    }
  });

  const regForm = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const commentForm = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { authorName: "", content: "" },
  });

  if (eventLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Event not found</h1>
          <Link href="/events">
            <Button><ArrowLeft className="mr-2 h-4 w-4" /> Back to Events</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isFull = event.registrationCount >= event.capacity;

  return (
    <Layout>
      {/* Hero Header */}
      <div className="w-full bg-secondary text-secondary-foreground relative">
        <div className="absolute inset-0 opacity-20">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt="" className="w-full h-full object-cover mix-blend-overlay" />
          ) : (
            <div className="w-full h-full bg-primary/20 mix-blend-overlay" />
          )}
        </div>
        <div className="container relative z-10 py-16 lg:py-24">
          <Link href="/events" className="inline-flex items-center text-secondary-foreground/70 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
          </Link>
          <div className="flex flex-wrap gap-3 mb-6">
            <Badge variant="secondary" className="capitalize text-sm px-3 py-1 font-semibold">
              {event.category.replace("-", " ")}
            </Badge>
            <Badge variant="outline" className="border-secondary-foreground/30 text-secondary-foreground text-sm px-3 py-1 font-semibold capitalize">
              {event.status}
            </Badge>
            {event.difficulty && (
              <Badge variant="outline" className="border-secondary-foreground/30 text-secondary-foreground text-sm px-3 py-1 font-semibold capitalize">
                {event.difficulty}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-tight mb-4">
            {event.title}
          </h1>
          <div className="flex flex-wrap gap-x-8 gap-y-4 text-secondary-foreground/80 mt-8">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 mr-3 text-primary" />
              <span className="text-lg">{format(new Date(event.date), "EEEE, MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-3 text-primary" />
              <span className="text-lg">{event.location}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid lg:grid-cols-3 gap-10">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-2xl font-display font-bold mb-4">About this event</h2>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {event.description || "No description provided."}
              </div>
            </section>

            <section className="bg-muted/30 rounded-2xl p-6 border">
              <h3 className="font-semibold text-lg mb-4 flex items-center">
                <Mountain className="w-5 h-5 mr-2 text-primary" /> Event Details
              </h3>
              <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Meeting Point</p>
                  <p className="font-medium">{event.meetingPoint || "TBD"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Distance</p>
                  <p className="font-medium">{event.distance || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Capacity</p>
                  <p className="font-medium">{event.registrationCount} / {event.capacity} registered</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Created</p>
                  <p className="font-medium">{format(new Date(event.createdAt), "MMM d, yyyy")}</p>
                </div>
              </div>
            </section>

            {/* Comments Section */}
            <section className="pt-8 border-t">
              <h2 className="text-2xl font-display font-bold mb-6 flex items-center">
                <MessageSquare className="w-6 h-6 mr-3 text-primary" /> Discussion
              </h2>
              
              <Card className="mb-8 border-border/50">
                <CardContent className="p-6">
                  <Form {...commentForm}>
                    <form onSubmit={commentForm.handleSubmit((data) => commentMutation.mutate({ id: eventId, data }))} className="space-y-4">
                      <FormField
                        control={commentForm.control}
                        name="authorName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={commentForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comment</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Ask a question or leave a comment..." className="min-h-[100px]" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={commentMutation.isPending}>
                        {commentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post Comment
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {comments?.length === 0 ? (
                  <p className="text-muted-foreground italic">No comments yet. Be the first to ask a question!</p>
                ) : (
                  comments?.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <span className="font-bold text-accent">{comment.authorName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="bg-muted/30 rounded-2xl rounded-tl-none p-4 flex-1 border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{comment.authorName}</span>
                          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar / Registration */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card className="border-primary/20 shadow-lg shadow-primary/5">
                <CardHeader className="bg-muted/30 border-b border-border/50">
                  <CardTitle className="font-display text-2xl">Registration</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-muted-foreground">Spots remaining</span>
                    <span className="font-bold text-xl">{Math.max(0, event.capacity - event.registrationCount)}</span>
                  </div>
                  
                  {isFull && (
                    <div className="mb-6 p-3 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 rounded-lg text-sm">
                      This event is currently full. Registering will add you to the waitlist.
                    </div>
                  )}

                  <Form {...regForm}>
                    <form onSubmit={regForm.handleSubmit((data) => registerMutation.mutate({ id: eventId, data }))} className="space-y-4">
                      <FormField
                        control={regForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={regForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="jane@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={regForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+1 (555) 000-0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-lg font-semibold mt-2" 
                        variant={isFull ? "secondary" : "default"}
                        disabled={registerMutation.isPending || event.status === 'completed' || event.status === 'cancelled'}
                      >
                        {registerMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        {event.status === 'completed' ? 'Event Ended' : 
                         event.status === 'cancelled' ? 'Event Cancelled' :
                         isFull ? 'Join Waitlist' : 'Register Now'}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {registrations && registrations.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold mb-4 flex items-center text-muted-foreground">
                    <Users className="w-4 h-4 mr-2" /> Recent Registrations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {registrations.slice(0, 8).map(reg => (
                      <div key={reg.id} className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-semibold text-sm shadow-sm" title={reg.name}>
                        {reg.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {registrations.length > 8 && (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-xs text-muted-foreground shadow-sm">
                        +{registrations.length - 8}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
