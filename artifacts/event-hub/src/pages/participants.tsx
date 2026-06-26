import { useState } from "react";
import { useListParticipants, useGetParticipantEvents } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Users, Medal, Share2, ChevronDown, ChevronUp, Calendar, MapPin, Loader2, Copy, Check } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  cycling: "🚴 Cycling",
  hiking: "🥾 Hiking",
  "summer-night": "🌙 Summer Night",
  walking: "🚶 Walking",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700",
  ongoing: "bg-green-50 text-green-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-50 text-red-600",
};

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
  return (
    <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

function pointsToTier(points: number): { label: string; color: string } {
  if (points >= 10) return { label: "Elite", color: "bg-purple-100 text-purple-800" };
  if (points >= 5) return { label: "Gold", color: "bg-amber-100 text-amber-800" };
  if (points >= 3) return { label: "Silver", color: "bg-slate-100 text-slate-700" };
  return { label: "Bronze", color: "bg-orange-100 text-orange-800" };
}

function CopyInviteButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy invite link"
      className="inline-flex items-center gap-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors shrink-0"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Invite link"}
    </button>
  );
}

function EventHistoryRow({ email }: { email: string }) {
  const { data: events, isLoading } = useGetParticipantEvents(encodeURIComponent(email));

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 px-5 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading event history…
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="py-4 px-5 text-sm text-muted-foreground italic">No event history found.</div>
    );
  }

  return (
    <div className="px-5 pb-4 grid sm:grid-cols-2 gap-2">
      {events.map((e) => {
        const inviteLink = e.referralToken && e.registrationToken
          ? `${window.location.origin}${import.meta.env.BASE_URL}r/${e.registrationToken}?ref=${e.referralToken}`
          : null;

        return (
          <div
            key={`${e.id}-${e.registeredAt}`}
            className="flex items-start gap-3 bg-muted/30 rounded-xl p-3 border border-border/50"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[e.category] ?? e.category}</span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[e.status] ?? "bg-muted text-muted-foreground"}`}
                >
                  {e.status}
                </span>
                {e.registrationStatus === "pending" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                    pending
                  </span>
                )}
                {e.registrationStatus === "waitlist" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                    waitlist
                  </span>
                )}
                {e.registrationStatus === "cancelled" && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                    cancelled
                  </span>
                )}
              </div>
              <div className="font-medium text-sm truncate">{e.title}</div>
              <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(e.date), "MMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {e.location}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold text-amber-700">+{e.pointsValue} pts</span>
                {inviteLink && <CopyInviteButton link={inviteLink} />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ParticipantsPage() {
  const { data: participants, isLoading } = useListParticipants();
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"points" | "referrers">("points");

  const totalPoints = participants?.reduce((s, p) => s + p.totalPoints, 0) ?? 0;
  const totalReferrals = participants?.reduce((s, p) => s + (p.referralCount ?? 0), 0) ?? 0;
  const topParticipant = participants?.[0];
  const topReferrer = [...(participants ?? [])].sort((a, b) => (b.referralCount ?? 0) - (a.referralCount ?? 0))[0];

  const toggleExpand = (email: string) => {
    setExpandedEmail((prev) => (prev === email ? null : email));
  };

  const sortedByReferrals = [...(participants ?? [])].sort((a, b) => (b.referralCount ?? 0) - (a.referralCount ?? 0));
  const referrers = sortedByReferrals.filter((p) => (p.referralCount ?? 0) > 0);

  return (
    <Layout>
      <div className="container py-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold tracking-tight">Participants</h1>
          <p className="text-muted-foreground mt-1">
            Loyalty leaderboard — registrations earn points, and so does inviting friends. Click a row to see event history and copy invite links.
          </p>
        </div>

        {participants && participants.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Users className="w-3.5 h-3.5" /> Members
              </div>
              <div className="text-3xl font-bold">{participants.length}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Star className="w-3.5 h-3.5" /> Points Earned
              </div>
              <div className="text-3xl font-bold">{totalPoints.toLocaleString()}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Share2 className="w-3.5 h-3.5" /> Total Referrals
              </div>
              <div className="text-3xl font-bold">{totalReferrals.toLocaleString()}</div>
            </div>
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
                <Trophy className="w-3.5 h-3.5" /> Top Member
              </div>
              <div className="text-xl font-bold truncate">{topParticipant?.name ?? "—"}</div>
              {topParticipant && (
                <div className="text-sm text-muted-foreground">{topParticipant.totalPoints} pts</div>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading…</div>
        ) : participants && participants.length > 0 ? (
          <>
            {/* Tab switcher */}
            <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 w-fit">
              <button
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "points" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab("points")}
              >
                🏅 Points Leaderboard
              </button>
              <button
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === "referrers" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab("referrers")}
              >
                <Share2 className="w-3.5 h-3.5" /> Top Referrers
                {totalReferrals > 0 && (
                  <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full font-semibold">
                    {totalReferrals}
                  </span>
                )}
              </button>
            </div>

            {activeTab === "points" && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-200 inline-block" /> Elite 10+ pts</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-200 inline-block" /> Gold 5+ pts</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block" /> Silver 3+ pts</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-200 inline-block" /> Bronze 1+ pts</span>
                  <span className="inline-flex items-center gap-1 ml-auto"><Share2 className="w-3 h-3" /> = friends referred</span>
                </div>
                <div className="border rounded-2xl overflow-hidden bg-card shadow-sm divide-y">
                  {participants.map((p, i) => {
                    const tier = pointsToTier(p.totalPoints);
                    const referrals = p.referralCount ?? 0;
                    const isExpanded = expandedEmail === p.email;
                    return (
                      <div key={p.id}>
                        <button
                          className={`w-full text-left grid grid-cols-[40px_1fr_auto_auto_auto_auto_auto] gap-x-4 px-5 py-3.5 items-center transition-colors hover:bg-muted/40 ${i < 3 ? "bg-primary/[0.02]" : ""}`}
                          onClick={() => toggleExpand(p.email)}
                        >
                          <div className="flex items-center justify-center">{rankIcon(i + 1)}</div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                            <div className="text-xs text-muted-foreground">
                              Member since {format(new Date(p.joinedAt), "MMM yyyy")}
                            </div>
                          </div>
                          <div className="text-right font-medium text-sm">{p.totalEvents}</div>
                          <div className="text-right hidden sm:block">
                            {referrals > 0 ? (
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                <Share2 className="w-3 h-3" /> {referrals}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tier.color}`}>
                              {tier.label}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-lg">{p.totalPoints}</span>
                            <span className="text-xs text-muted-foreground ml-1">pts</span>
                          </div>
                          <div className="text-muted-foreground">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t bg-muted/20">
                            <div className="px-5 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Event History & Invite Links
                            </div>
                            <EventHistoryRow email={p.email} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === "referrers" && (
              <>
                {referrers.length === 0 ? (
                  <div className="text-center py-16 border rounded-2xl bg-card">
                    <Share2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-bold mb-1">No referrals yet</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                      Send participants their personal invite links from the dashboard. When a friend registers through it, both earn bonus points.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Participants who have brought friends to your events. Expand a row to copy their invite links per event.
                    </p>

                    {/* Podium for top 3 */}
                    {referrers.length >= 2 && (
                      <div className="flex items-end justify-center gap-4 mb-8">
                        {[referrers[1], referrers[0], referrers[2]].filter(Boolean).map((p, idx) => {
                          const podiumRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                          const heights = { 1: "h-28", 2: "h-20", 3: "h-16" };
                          const colors = {
                            1: "bg-amber-100 border-amber-300",
                            2: "bg-slate-100 border-slate-300",
                            3: "bg-orange-50 border-orange-200",
                          };
                          return (
                            <div key={p.id} className="flex flex-col items-center gap-2 flex-1 max-w-[180px]">
                              <div className="text-center">
                                <div className="font-semibold text-sm truncate">{p.name}</div>
                                <div className="text-xs text-blue-600 font-bold flex items-center justify-center gap-1">
                                  <Share2 className="w-3 h-3" /> {p.referralCount} referred
                                </div>
                              </div>
                              <div className={`w-full rounded-t-xl border-2 ${colors[podiumRank as keyof typeof colors]} ${heights[podiumRank as keyof typeof heights]} flex items-center justify-center`}>
                                <span className="text-2xl">{podiumRank === 1 ? "🥇" : podiumRank === 2 ? "🥈" : "🥉"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="border rounded-2xl overflow-hidden bg-card shadow-sm divide-y">
                      {referrers.map((p, i) => {
                        const isExpanded = expandedEmail === p.email;
                        return (
                          <div key={p.id}>
                            <button
                              className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
                              onClick={() => toggleExpand(p.email)}
                            >
                              <div className="flex items-center justify-center w-8 shrink-0">
                                {rankIcon(i + 1)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{p.name}</div>
                                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-700">{p.referralCount}</div>
                                  <div className="text-xs text-muted-foreground">friends</div>
                                </div>
                                <div className="text-center hidden sm:block">
                                  <div className="text-lg font-bold">{p.totalPoints}</div>
                                  <div className="text-xs text-muted-foreground">pts</div>
                                </div>
                                <div className="text-muted-foreground">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t bg-muted/20">
                                <div className="px-5 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Event History & Invite Links
                                </div>
                                <EventHistoryRow email={p.email} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <div className="text-center py-24 border rounded-2xl bg-card">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No participants yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              As people register for your events, they'll appear here with their earned points and referral count.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
