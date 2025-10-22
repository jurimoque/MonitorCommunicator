import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import MusicianPanel from "@/pages/MusicianPanel";
import TechnicianPanel from "@/pages/TechnicianPanel";
import TestConnection from "@/pages/TestConnection";
import { WebSocketProvider } from "@/lib/WebSocketProvider";

const App = () => {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/musician/:roomId">
        {(params) => (
          <WebSocketProvider roomId={params.roomId}>
            <MusicianPanel />
          </WebSocketProvider>
        )}
      </Route>
      <Route path="/technician/:roomId">
        {(params) => (
          <WebSocketProvider roomId={params.roomId}>
            <TechnicianPanel />
          </WebSocketProvider>
        )}
      </Route>
      <Route path="/test" component={TestConnection} />
    </Switch>
  );
};

export default App;