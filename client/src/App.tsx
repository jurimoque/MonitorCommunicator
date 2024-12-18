import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Home from "./pages/Home";
import MusicianPanel from "./pages/MusicianPanel";
import TechnicianPanel from "./pages/TechnicianPanel";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/musician/:roomId" component={MusicianPanel} />
        <Route path="/technician/:roomId" component={TechnicianPanel} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
