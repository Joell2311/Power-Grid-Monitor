import "./styles/App.css";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import DashboardCards from "./components/DashboardCards";
import AlarmBar from "./components/AlarmBar";
import MapView from "./components/MapView";
import OccurrencePanel from "./components/OccurrencePanel";

import "./styles/AlarmBar.css";
import "./styles/OccurrencePanel.css";

function App() {
  return (
    <div className="app">

      <Header />

      <div className="main">

        <Sidebar />

        <div className="content">

          <DashboardCards />

          <AlarmBar />

          <div className="operation-area">

            <div className="map-area">
              <MapView />
            </div>

            <OccurrencePanel />

          </div>

        </div>

      </div>

    </div>
  );
}

export default App;