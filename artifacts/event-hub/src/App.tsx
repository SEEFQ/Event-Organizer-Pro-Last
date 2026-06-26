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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/admin" />} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/events/new" component={CreateEvent} />
      <Route path="/admin/sponsors" component={SponsorsPage} />
      <Route path="/admin/participants" component={ParticipantsPage} />
      <Route path="/r/:token" component={RegisterPage} />
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
