import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Admin from "@/pages/admin";
import CreateEvent from "@/pages/create-event";
import RegisterPage from "@/pages/register";
import SponsorsPage from "@/pages/sponsors";
import ParticipantsPage from "@/pages/participants";
import AdminEventTypesPage from "@/pages/admin-event-types";
import AdminMediaBannersPage from "@/pages/admin-media-banners";
import AdminCompletedEventsPage from "@/pages/admin-completed-events";
import AdminAuditLogPage from "@/pages/admin-audit-log";
import SponsorCheckinPage from "@/pages/sponsor-checkin";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/admin" />} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/events/new" component={CreateEvent} />
      <Route path="/admin/sponsors" component={SponsorsPage} />
      <Route path="/admin/participants" component={ParticipantsPage} />
      <Route path="/admin/event-types" component={AdminEventTypesPage} />
      <Route path="/admin/media-banners" component={AdminMediaBannersPage} />
      <Route path="/admin/completed-events" component={AdminCompletedEventsPage} />
      <Route path="/admin/audit-log" component={AdminAuditLogPage} />
      <Route path="/r/:token" component={RegisterPage} />
      <Route path="/check-in/:scanToken" component={SponsorCheckinPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
