import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import MedicalSpinnerDemo from "@/pages/medical-spinner-demo";
import About from "@/pages/about";
import Tutorial from "@/pages/tutorial";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/spinner-demo" component={MedicalSpinnerDemo} />
      <Route path="/about" component={About} />
      <Route path="/tutorial" component={Tutorial} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
