import { useListEvents, useGetStats, useGetRecentActivity } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Users, Calendar, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export default function Home() {
  const { data: events, isLoading: eventsLoading } = useListEvents({ upcoming: true }, {
    query: { queryKey: ["/api/events", { upcoming: true }] }
  });
  const { data: stats, isLoading: statsLoading } = useGetStats({
    query: { queryKey: ["/api/stats"] }
  });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({
    query: { queryKey: ["/api/activity"] }
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground py-20 lg:py-32">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay" />
        <div className="container relative z-10">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl lg:text-7xl font-bold tracking-tight mb-6">
              Find your next adventure.
            </h1>
            <p className="text-xl text-secondary-foreground/80 mb-10 max-w-2xl leading-relaxed">
              Join our community of outdoor enthusiasts. Discover upcoming cycling, hiking, and walking events, or organize your own.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/events">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-14 px-8 rounded-full font-semibold">
                  Browse Events
                </Button>
              </Link>
              <Link href="/events/new">
                <Button size="lg" variant="outline" className="text-lg h-14 px-8 rounded-full border-secondary-foreground/20 hover:bg-secondary-foreground/10 bg-transparent text-secondary-foreground font-semibold">
                  Organize
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-b bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center text-muted-foreground">
                <Calendar className="w-5 h-5 mr-2" />
                <span className="font-medium text-sm uppercase tracking-wider">Upcoming</span>
              </div>
              <span className="text-4xl font-display font-bold text-foreground">
                {statsLoading ? "-" : stats?.upcomingEvents}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center text-muted-foreground">
                <Users className="w-5 h-5 mr-2" />
                <span className="font-medium text-sm uppercase tracking-wider">Participants</span>
              </div>
              <span className="text-4xl font-display font-bold text-foreground">
                {statsLoading ? "-" : stats?.totalParticipants}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center text-muted-foreground">
                <Activity className="w-5 h-5 mr-2" />
                <span className="font-medium text-sm uppercase tracking-wider">Total Events</span>
              </div>
              <span className="text-4xl font-display font-bold text-foreground">
                {statsLoading ? "-" : stats?.totalEvents}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center text-muted-foreground">
                <MapPin className="w-5 h-5 mr-2" />
                <span className="font-medium text-sm uppercase tracking-wider">Registrations</span>
              </div>
              <span className="text-4xl font-display font-bold text-foreground">
                {statsLoading ? "-" : stats?.totalRegistrations}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-12">
            
            {/* Upcoming Events */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-bold tracking-tight">Upcoming Events</h2>
                <Link href="/events">
                  <Button variant="ghost" className="font-semibold">
                    View all <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {eventsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : events && events.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {events.slice(0, 4).map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
                  <p className="text-muted-foreground">No upcoming events found.</p>
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <div>
              <h2 className="text-3xl font-display font-bold tracking-tight mb-8">Activity Feed</h2>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-6">
                  {activityLoading ? (
                     <div className="flex justify-center py-10">
                       <Loader2 className="w-6 h-6 animate-spin text-primary" />
                     </div>
                  ) : activity && activity.length > 0 ? (
                    <div className="space-y-6">
                      {activity.map(item => (
                        <div key={item.id} className="flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {item.type === "registration" && <Users className="w-5 h-5 text-primary" />}
                            {item.type === "comment" && <Activity className="w-5 h-5 text-accent" />}
                            {item.type === "event_created" && <Calendar className="w-5 h-5 text-secondary" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-snug">
                              {item.description}
                            </p>
                            {item.eventTitle && (
                              <Link href={`/events/${item.eventId}`}>
                                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer mt-1 inline-block">
                                  {item.eventTitle}
                                </span>
                              </Link>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
