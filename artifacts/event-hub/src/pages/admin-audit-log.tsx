import { useState } from "react";
import { useListActivity } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Loader2, ClipboardList, Search } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  registration: "bg-blue-100 text-blue-800",
  comment: "bg-purple-100 text-purple-800",
  event_created: "bg-green-100 text-green-800",
};

const TYPE_LABELS: Record<string, string> = {
  registration: "Registration",
  comment: "Comment",
  event_created: "Event Created",
};

export default function AdminAuditLogPage() {
  const { data: activity, isLoading } = useListActivity();
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = (activity ?? []).filter((a) => {
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    const q = filter.toLowerCase();
    const matchesSearch = !q || a.description.toLowerCase().includes(q) || (a.eventTitle ?? "").toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <Layout>
      <div className="container py-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Chronological record of all activity in your system.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by description or event…"
              className="pl-9"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="registration">Registrations</option>
            <option value="comment">Comments</option>
            <option value="event_created">Events created</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filtered.length > 0 ? (
          <div className="border rounded-2xl overflow-hidden bg-card shadow-sm divide-y">
            {filtered.map((item) => (
              <div key={item.id} className="flex items-start gap-4 px-5 py-4">
                <div className="shrink-0 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.type] ?? "bg-muted text-muted-foreground"}`}>
                    {TYPE_LABELS[item.type] ?? item.type}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.description}</p>
                  {item.eventTitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">Event: {item.eventTitle}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-muted-foreground">{format(new Date(item.createdAt), "MMM d, yyyy")}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(item.createdAt), "h:mm a")}</div>
                  {item.actorType && item.actorType !== "system" && (
                    <Badge variant="outline" className="text-xs mt-1 capitalize">{item.actorType}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border rounded-2xl bg-card">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">{filter || typeFilter !== "all" ? "No matching entries" : "No activity yet"}</h3>
            <p className="text-muted-foreground">Activity will appear here as events are created and participants register.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">{filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</p>
        )}
      </div>
    </Layout>
  );
}
