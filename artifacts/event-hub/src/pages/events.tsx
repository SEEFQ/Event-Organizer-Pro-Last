import { useState } from "react";
import { useListEvents, EventCategory } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";

export default function Events() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const queryParams = category === "all" ? {} : { category };
  
  const { data: events, isLoading } = useListEvents(queryParams, {
    query: { queryKey: ["/api/events", queryParams] }
  });

  const filteredEvents = events?.filter(event => 
    event.title.toLowerCase().includes(search.toLowerCase()) || 
    event.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="container py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight">Explore Events</h1>
            <p className="text-muted-foreground mt-2 text-lg">Find your next outdoor adventure.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by title or location..." 
                className="pl-9 h-11 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[180px] h-11">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value={EventCategory.cycling}>Cycling</SelectItem>
                <SelectItem value={EventCategory.hiking}>Hiking</SelectItem>
                <SelectItem value={EventCategory['summer-night']}>Summer Night</SelectItem>
                <SelectItem value={EventCategory.walking}>Walking</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredEvents && filteredEvents.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-muted/30 rounded-2xl border border-dashed">
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
