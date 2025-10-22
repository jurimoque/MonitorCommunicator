import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import MusicianPanel from "@/pages/MusicianPanel";
import TechnicianPanel from "@/pages/TechnicianPanel";
import TestConnection from "@/pages/TestConnection";

const App = () => {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/musician/:roomId" component={MusicianPanel} />
      <Route path="/technician/:roomId" component={TechnicianPanel} />
      <Route path="/test" component={TestConnection} />
    </Switch>
  );
};

export default App;
