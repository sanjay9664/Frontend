import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Dashboard from '../pages/Dashboard';
import WaterOverview from '../pages/WaterManagement/Overview';
import DGSetOverview from '../pages/DGSet/Overview';
import AlarmOverview from '../pages/AlarmSystem/Overview';
import ActiveAlarms from '../pages/AlarmSystem/Active';
import AlarmConfig from '../pages/AlarmSystem/AlarmConfig';
import MessageTemplateSetting from '../pages/AlarmSystem/MessageTemplateSetting';
import TransformerOverview from '../pages/Transformer/Overview';
import Settings from '../pages/Settings/Settings';
import AgTank from '../pages/WaterManagement/AgTank';
import UgTank from '../pages/WaterManagement/UgTank';
import MotorsOverview from '../pages/Motors/Overview';
import TicketingSystem from '../pages/Ticketing/Index';
import ConfigTemplates from '../pages/Configuration/Templates';
import SuperAdminConfig from '../pages/SuperAdmin/SuperAdminConfig';
import SiteManagement from '../pages/SuperAdmin/SiteManagement';
import UserManagement from '../pages/Admin/UserManagement';
import DeviceManagement from '../pages/Admin/DeviceManagement';
import AreaManagement from '../pages/Admin/AreaManagement';
import MaintenancePage from '../pages/Maintenance/Index';

// Energy Metering Pages
import EnergyOverview from '../pages/EnergyMetering/Overview';
import EnergyMainMeter from '../pages/EnergyMetering/MainMeter';
import EnergySubMeters from '../pages/EnergyMetering/SubMeters';
import EnergyPDFReport from '../pages/EnergyMetering/PDFReport';
import EnergyGraphs from '../pages/EnergyMetering/EnergyGraphs';

// VRV
import VRVOverview from '../pages/VRV/Overview';
import VRVControlPanel from '../pages/VRV/ControlPanel';
import VRVSchedule from '../pages/VRV/Schedule';
import VRVHumanSensor from '../pages/VRV/HumanSensor';
import VRVTempHumidity from '../pages/VRV/TempHumidity';

// AQI Sensor
import AQIOverview from '../pages/AQISensor/Overview';

// LT Panel
import LTRoom1 from '../pages/LTPanel/LTRoom1';
import LTRoom2 from '../pages/LTPanel/LTRoom2';
import LTRoom3 from '../pages/LTPanel/LTRoom3';
import LTOverview from '../pages/LTPanel/Overview';
import IncomingOutgoing from '../pages/LTPanel/IncomingOutgoing';
import BreakerStatus from '../pages/LTPanel/BreakerStatus';

// HVAC
import Chiller from '../pages/HVAC/Chiller';
import AHU from '../pages/HVAC/AHU';
import CoolingTower from '../pages/HVAC/CoolingTower';

// AC
import ACOverview from '../pages/AC/Overview';
import ACScheduler from '../pages/AC/ACScheduler';

// Fire Pumps
import FireOverview from '../pages/FirePumps/Overview';
import PumpStatus from '../pages/FirePumps/PumpStatus';
import HeaderPressure from '../pages/FirePumps/HeaderPressure';
import JockeyMain from '../pages/FirePumps/JockeyMain';

// Fallback for other routes until customized
const PlaceholderPage = ({ title }) => (
  <div className="fade-in">
    <div className="page-header">
      <div>
        <h2 className="mb-1">{title}</h2>
        <p className="text-muted">Detailed monitoring and controls for {title}</p>
      </div>
      <div className="d-flex gap-2">
        <button className="btn btn-outline-secondary btn-sm">Refresh Data</button>
        <button className="btn btn-info btn-sm">System Check</button>
      </div>
    </div>

    <div className="scada-card p-5 text-center mt-4">
      <div className="text-muted opacity-50 mb-3">
        <div className="display-4 font-monospace">DATA_STREAM_ACTIVE</div>
      </div>
      <h4>{title} Module</h4>
      <p>Continuous monitoring in progress. All sensors reporting normal operation.</p>
      <div className="d-flex justify-content-center gap-4 mt-4">
        <div className="text-center">
          <div className="h3 mb-0 text-success">98%</div>
          <small className="text-muted">Efficiency</small>
        </div>
        <div className="text-center border-start border-end px-4">
          <div className="h3 mb-0 text-info">24.5°C</div>
          <small className="text-muted">Amb. Temp</small>
        </div>
        <div className="text-center">
          <div className="h3 mb-0 text-warning">1.2kW</div>
          <small className="text-muted">Load</small>
        </div>
      </div>
    </div>
  </div>
);

const AppRoutes = () => {
  const userRole = localStorage.getItem('userRole');

  return (
    <Routes>
      <Route path="/" element={<Navigate to={userRole === 'SUPER_ADMIN' ? "/super-admin" : "/dashboard"} replace />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Water Management */}
      <Route path="/water-management/overview" element={<WaterOverview />} />
      <Route path="/water-management/ag-pump" element={<AgTank />} />
      <Route path="/water-management/ug-pump" element={<UgTank />} />
      <Route path="/water-management/domestic" element={<PlaceholderPage title="Domestic / Flushing" />} />
      <Route path="/water-management/level" element={<PlaceholderPage title="OHT / UG Level Monitoring" />} />
      <Route path="/water-management/report" element={<PlaceholderPage title="Water Management PDF Reports" />} />

      {/* Motors */}
      <Route path="/motors/overview" element={<MotorsOverview />} />
      <Route path="/motors/room1" element={<PlaceholderPage title="Pump Room 1" />} />
      <Route path="/motors/room2" element={<PlaceholderPage title="Pump Room 2" />} />
      <Route path="/motors/status" element={<PlaceholderPage title="VFD / DOL Status" />} />
      <Route path="/motors/report" element={<PlaceholderPage title="Motors PDF Reports" />} />

      {/* DG Set */}
      <Route path="/dg-set/overview" element={<DGSetOverview />} />
      <Route path="/dg-set/dg1" element={<DGSetOverview />} />
      <Route path="/dg-set/dg2" element={<DGSetOverview />} />
      <Route path="/dg-set/dg3" element={<DGSetOverview />} />
      <Route path="/dg-set/fuel" element={<PlaceholderPage title="Fuel Level Monitoring" />} />
      <Route path="/dg-set/runtime" element={<PlaceholderPage title="Runtime / Diesel Consumption" />} />
      <Route path="/dg-set/report" element={<PlaceholderPage title="DG Set PDF Reports" />} />

      {/* Configuration Templates */}
      <Route path="/config/templates" element={<ConfigTemplates />} />

      {/* Alarm System */}
      <Route path="/alarm-system/overview" element={<AlarmOverview />} />
      <Route path="/alarm-system/active" element={<ActiveAlarms />} />
      <Route path="/alarm-system/config" element={<AlarmConfig />} />
      <Route path="/alarm-system/message-templates" element={<MessageTemplateSetting />} />
      <Route path="/alarm-system/inactive" element={<PlaceholderPage title="Inactive Alarms" />} />
      <Route path="/alarm-system/ack" element={<PlaceholderPage title="ACK (Acknowledge)" />} />
      <Route path="/alarm-system/history" element={<PlaceholderPage title="Alarm History" />} />
      <Route path="/alarm-system/report" element={<PlaceholderPage title="Alarm PDF Reports" />} />

      {/* LT Panel */}
      <Route path="/lt-panel/overview" element={<LTOverview />} />
      <Route path="/lt-panel/room1" element={<LTRoom1 />} />
      <Route path="/lt-panel/room2" element={<LTRoom2 />} />
      <Route path="/lt-panel/room3" element={<LTRoom3 />} />
      <Route path="/lt-panel/io" element={<IncomingOutgoing />} />
      <Route path="/lt-panel/breaker" element={<BreakerStatus />} />
      <Route path="/lt-panel/report" element={<PlaceholderPage title="LT Panel PDF Reports" />} />

      {/* Transformer */}
      <Route path="/transformer/overview" element={<TransformerOverview />} />
      <Route path="/transformer/t1" element={<PlaceholderPage title="Transformer-1" />} />
      <Route path="/transformer/t2" element={<PlaceholderPage title="Transformer-2" />} />
      <Route path="/transformer/load" element={<PlaceholderPage title="Load / Temperature Monitoring" />} />
      <Route path="/transformer/report" element={<PlaceholderPage title="Transformer PDF Reports" />} />

      {/* Settings */}
      <Route path="/settings" element={<Settings />} />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin"
        element={userRole === 'SUPER_ADMIN' ? <SuperAdminConfig /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/super-admin/sites"
        element={userRole === 'SUPER_ADMIN' ? <SiteManagement /> : <Navigate to="/dashboard" replace />}
      />

      {/* Admin / Super Admin Routes */}
      {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
        <>
          <Route path="/admin/manage-users" element={<UserManagement />} />
          <Route path="/admin/manage-devices" element={<DeviceManagement />} />
          <Route path="/admin/manage-areas" element={<AreaManagement />} />
        </>
      )}

      {/* Maintenance & Service History */}
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/maintenance/scheduled" element={<MaintenancePage />} />
      <Route path="/maintenance/pending" element={<MaintenancePage />} />
      <Route path="/maintenance/report" element={<MaintenancePage />} />
      <Route path="/service" element={<MaintenancePage />} />
      <Route path="/service/equipment" element={<MaintenancePage />} />
      <Route path="/service/records" element={<MaintenancePage />} />
      <Route path="/service/report" element={<MaintenancePage />} />

      {/* Ticketing */}
      <Route path="/ticketing" element={<TicketingSystem />} />

      {/* Energy Metering */}
      <Route path="/energy-metering/overview" element={<EnergyOverview />} />
      <Route path="/energy-metering/main" element={<EnergyMainMeter />} />
      <Route path="/energy-metering/sub" element={<EnergySubMeters />} />
      <Route path="/energy-metering/graphs" element={<EnergyGraphs />} />
      <Route path="/energy-metering/report" element={<EnergyPDFReport />} />

      {/* VRV*/}
      <Route path="/VRV/overview" element={<VRVOverview />} />
      <Route path="/VRV/control" element={<VRVControlPanel />} />
      <Route path="/VRV/schedule" element={<VRVSchedule />} />
      <Route path="/VRV/human-sensor" element={<VRVHumanSensor />} />
      
      {/* AQI Sensor */}
      <Route path="/aqi-sensor/overview" element={<AQIOverview />} />
      <Route path="/aqi-sensor/temp-humidity" element={<VRVTempHumidity />} />

      {/* HVAC */}
      <Route path="/hvac/chiller" element={<Chiller />} />
      <Route path="/hvac/ahu" element={<AHU />} />
      <Route path="/hvac/cooling-tower" element={<CoolingTower />} />
      <Route path="/hvac/report" element={<PlaceholderPage title="HVAC PDF Reports" />} />

      {/* AC */}
      <Route path="/ac/overview" element={<ACOverview />} />
      <Route path="/ac/schedule" element={<ACScheduler />} />
      <Route path="/ac/report" element={<PlaceholderPage title="AC PDF Reports" />} />

      {/* Fire */}
      <Route path="/fire-pumps/overview" element={<FireOverview />} />
      <Route path="/fire-pumps/status" element={<PumpStatus />} />
      <Route path="/fire-pumps/pressure" element={<HeaderPressure />} />
      <Route path="/fire-pumps/jockey" element={<JockeyMain />} />
      <Route path="/fire-pumps/report" element={<PlaceholderPage title="Fire Pumps PDF Reports" />} />

      {/* Catch-all */}
      <Route path="*" element={<PlaceholderPage title="Module Under Calibration" />} />
    </Routes>
  );
};

export default AppRoutes;
