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
import SystemUsers from '../pages/Settings/SystemUsers';
import AgTank from '../pages/WaterManagement/AgTank';
import UgTank from '../pages/WaterManagement/UgTank';
import MotorsOverview from '../pages/Motors/Overview';
import TicketingSystem from '../pages/Ticketing/Index';
import ConfigTemplates from '../pages/Configuration/Templates';
import SuperAdminConfig from '../pages/SuperAdmin/SuperAdminConfig';
import SiteManagement from '../pages/SuperAdmin/SiteManagement';
import UserManagement from '../pages/Admin/UserManagement';
import DeviceManagement from '../pages/Admin/DeviceManagement';
import DeviceRegistration from '../pages/Admin/DeviceRegistration';
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

const OperatorRoute = ({ children, moduleKey }) => {
  const userRole = localStorage.getItem('userRole') || 'USER';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const roleName = (userData.roleName || userRole || '').toLowerCase();
  
  const isRestricted = roleName.includes('zone') || roleName.includes('area') || roleName.includes('location') || roleName.includes('unit') || roleName.includes('operator');
  if (isRestricted) {
    const localFp = JSON.parse(localStorage.getItem('scada_feature_permissions') || '{}');
    const hasPerm = localFp[`${moduleKey}_read`] ?? localFp[moduleKey] ?? false;
    if (!hasPerm) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
};

const AppRoutes = () => {
  const userRole = localStorage.getItem('userRole') || 'USER';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const roleName = (userData.roleName || userRole || '').toLowerCase();

  const isSuper = userRole === 'SUPER_ADMIN' || roleName.includes('super');
  const isAdmin = userRole === 'ADMIN' || roleName.includes('admin');
  const isOrgAdmin = roleName.includes('org') || roleName.includes('organisation') || roleName.includes('organization');
  const isZone = roleName.includes('zone');
  const isArea = roleName.includes('area');
  const isLoc = roleName.includes('location');
  const isUnit = roleName.includes('unit');

  const showAdvancedSettings = isSuper || isAdmin || isOrgAdmin || isZone || isArea || isLoc || isUnit;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={userRole === 'SUPER_ADMIN' ? "/super-admin" : "/dashboard"} replace />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Water Management */}
      <Route path="/water-management/overview" element={<OperatorRoute moduleKey="showWaterManagement"><WaterOverview /></OperatorRoute>} />
      <Route path="/water-management/ag-pump" element={<OperatorRoute moduleKey="showWaterManagement"><AgTank /></OperatorRoute>} />
      <Route path="/water-management/ug-pump" element={<OperatorRoute moduleKey="showWaterManagement"><UgTank /></OperatorRoute>} />
      <Route path="/water-management/domestic" element={<OperatorRoute moduleKey="showWaterManagement"><PlaceholderPage title="Domestic / Flushing" /></OperatorRoute>} />
      <Route path="/water-management/level" element={<OperatorRoute moduleKey="showWaterManagement"><PlaceholderPage title="OHT / UG Level Monitoring" /></OperatorRoute>} />
      <Route path="/water-management/report" element={<OperatorRoute moduleKey="showWaterManagement"><PlaceholderPage title="Water Management PDF Reports" /></OperatorRoute>} />

      {/* Motors */}
      <Route path="/motors/overview" element={<OperatorRoute moduleKey="showMotors"><MotorsOverview /></OperatorRoute>} />
      <Route path="/motors/room1" element={<OperatorRoute moduleKey="showMotors"><PlaceholderPage title="Pump Room 1" /></OperatorRoute>} />
      <Route path="/motors/room2" element={<OperatorRoute moduleKey="showMotors"><PlaceholderPage title="Pump Room 2" /></OperatorRoute>} />
      <Route path="/motors/status" element={<OperatorRoute moduleKey="showMotors"><PlaceholderPage title="VFD / DOL Status" /></OperatorRoute>} />
      <Route path="/motors/report" element={<OperatorRoute moduleKey="showMotors"><PlaceholderPage title="Motors PDF Reports" /></OperatorRoute>} />

      {/* DG Set */}
      <Route path="/dg-set/overview" element={<OperatorRoute moduleKey="showDGSet"><DGSetOverview /></OperatorRoute>} />
      <Route path="/dg-set/dg1" element={<OperatorRoute moduleKey="showDGSet"><DGSetOverview /></OperatorRoute>} />
      <Route path="/dg-set/dg2" element={<OperatorRoute moduleKey="showDGSet"><DGSetOverview /></OperatorRoute>} />
      <Route path="/dg-set/dg3" element={<OperatorRoute moduleKey="showDGSet"><DGSetOverview /></OperatorRoute>} />
      <Route path="/dg-set/fuel" element={<OperatorRoute moduleKey="showDGSet"><PlaceholderPage title="Fuel Level Monitoring" /></OperatorRoute>} />
      <Route path="/dg-set/runtime" element={<OperatorRoute moduleKey="showDGSet"><PlaceholderPage title="Runtime / Diesel Consumption" /></OperatorRoute>} />
      <Route path="/dg-set/report" element={<OperatorRoute moduleKey="showDGSet"><PlaceholderPage title="DG Set PDF Reports" /></OperatorRoute>} />

      {/* Alarm System */}
      <Route path="/alarm-system/overview" element={<OperatorRoute moduleKey="showAlarms"><AlarmOverview /></OperatorRoute>} />
      <Route path="/alarm-system/active" element={<OperatorRoute moduleKey="showAlarms"><ActiveAlarms /></OperatorRoute>} />
      <Route path="/alarm-system/config" element={<OperatorRoute moduleKey="showAlarms"><AlarmConfig /></OperatorRoute>} />
      <Route path="/alarm-system/message-templates" element={<OperatorRoute moduleKey="showAlarms"><MessageTemplateSetting /></OperatorRoute>} />
      <Route path="/alarm-system/inactive" element={<OperatorRoute moduleKey="showAlarms"><PlaceholderPage title="Inactive Alarms" /></OperatorRoute>} />
      <Route path="/alarm-system/ack" element={<OperatorRoute moduleKey="showAlarms"><PlaceholderPage title="ACK (Acknowledge)" /></OperatorRoute>} />
      <Route path="/alarm-system/history" element={<OperatorRoute moduleKey="showAlarms"><PlaceholderPage title="Alarm History" /></OperatorRoute>} />
      <Route path="/alarm-system/report" element={<OperatorRoute moduleKey="showAlarms"><PlaceholderPage title="Alarm PDF Reports" /></OperatorRoute>} />

      {/* LT Panel */}
      <Route path="/lt-panel/overview" element={<OperatorRoute moduleKey="showLTPanel"><LTOverview /></OperatorRoute>} />
      <Route path="/lt-panel/room1" element={<OperatorRoute moduleKey="showLTPanel"><LTRoom1 /></OperatorRoute>} />
      <Route path="/lt-panel/room2" element={<OperatorRoute moduleKey="showLTPanel"><LTRoom2 /></OperatorRoute>} />
      <Route path="/lt-panel/room3" element={<OperatorRoute moduleKey="showLTPanel"><LTRoom3 /></OperatorRoute>} />
      <Route path="/lt-panel/io" element={<OperatorRoute moduleKey="showLTPanel"><IncomingOutgoing /></OperatorRoute>} />
      <Route path="/lt-panel/breaker" element={<OperatorRoute moduleKey="showLTPanel"><BreakerStatus /></OperatorRoute>} />
      <Route path="/lt-panel/report" element={<OperatorRoute moduleKey="showLTPanel"><PlaceholderPage title="LT Panel PDF Reports" /></OperatorRoute>} />

      {/* Transformer */}
      <Route path="/transformer/overview" element={<OperatorRoute moduleKey="showTransformers"><TransformerOverview /></OperatorRoute>} />
      <Route path="/transformer/t1" element={<OperatorRoute moduleKey="showTransformers"><PlaceholderPage title="Transformer-1" /></OperatorRoute>} />
      <Route path="/transformer/t2" element={<OperatorRoute moduleKey="showTransformers"><PlaceholderPage title="Transformer-2" /></OperatorRoute>} />
      <Route path="/transformer/load" element={<OperatorRoute moduleKey="showTransformers"><PlaceholderPage title="Load / Temperature Monitoring" /></OperatorRoute>} />
      <Route path="/transformer/report" element={<OperatorRoute moduleKey="showTransformers"><PlaceholderPage title="Transformer PDF Reports" /></OperatorRoute>} />

      {/* Super Admin Routes */}
      <Route
        path="/super-admin"
        element={userRole === 'SUPER_ADMIN' ? <SuperAdminConfig /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/super-admin/sites"
        element={userRole === 'SUPER_ADMIN' ? <SiteManagement /> : <Navigate to="/dashboard" replace />}
      />

      {/* Advanced / Admin Settings Routes */}
      {showAdvancedSettings && (
        <>
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/system-users" element={<SystemUsers />} />
          <Route path="/config/templates" element={<ConfigTemplates />} />
          <Route path="/admin/manage-users" element={<UserManagement />} />
          <Route path="/admin/manage-devices" element={<DeviceManagement />} />
          <Route path="/admin/register-device" element={<DeviceRegistration />} />
          <Route path="/admin/manage-areas" element={<AreaManagement />} />
        </>
      )}

      {/* Maintenance & Service History */}
      <Route path="/maintenance" element={<OperatorRoute moduleKey="showMaintenance"><MaintenancePage /></OperatorRoute>} />
      <Route path="/maintenance/scheduled" element={<OperatorRoute moduleKey="showMaintenance"><MaintenancePage /></OperatorRoute>} />
      <Route path="/maintenance/pending" element={<OperatorRoute moduleKey="showMaintenance"><MaintenancePage /></OperatorRoute>} />
      <Route path="/maintenance/report" element={<OperatorRoute moduleKey="showMaintenance"><MaintenancePage /></OperatorRoute>} />
      <Route path="/service" element={<OperatorRoute moduleKey="showServiceHistory"><MaintenancePage /></OperatorRoute>} />
      <Route path="/service/equipment" element={<OperatorRoute moduleKey="showServiceHistory"><MaintenancePage /></OperatorRoute>} />
      <Route path="/service/records" element={<OperatorRoute moduleKey="showServiceHistory"><MaintenancePage /></OperatorRoute>} />
      <Route path="/service/report" element={<OperatorRoute moduleKey="showServiceHistory"><MaintenancePage /></OperatorRoute>} />

      {/* Ticketing */}
      <Route path="/ticketing" element={<OperatorRoute moduleKey="showTicketing"><TicketingSystem /></OperatorRoute>} />

      {/* Energy Metering */}
      <Route path="/energy-metering/overview" element={<OperatorRoute moduleKey="showEnergyMetering"><EnergyOverview /></OperatorRoute>} />
      <Route path="/energy-metering/main" element={<OperatorRoute moduleKey="showEnergyMetering"><EnergyMainMeter /></OperatorRoute>} />
      <Route path="/energy-metering/sub" element={<OperatorRoute moduleKey="showEnergyMetering"><EnergySubMeters /></OperatorRoute>} />
      <Route path="/energy-metering/graphs" element={<OperatorRoute moduleKey="showEnergyMetering"><EnergyGraphs /></OperatorRoute>} />
      <Route path="/energy-metering/report" element={<OperatorRoute moduleKey="showEnergyMetering"><EnergyPDFReport /></OperatorRoute>} />

      {/* VRV*/}
      <Route path="/VRV/overview" element={<OperatorRoute moduleKey="showVRV"><VRVOverview /></OperatorRoute>} />
      <Route path="/VRV/control" element={<OperatorRoute moduleKey="showVRV"><VRVControlPanel /></OperatorRoute>} />
      <Route path="/VRV/schedule" element={<OperatorRoute moduleKey="showVRV"><VRVSchedule /></OperatorRoute>} />
      <Route path="/VRV/human-sensor" element={<OperatorRoute moduleKey="showVRV"><VRVHumanSensor /></OperatorRoute>} />
      
      {/* AQI Sensor */}
      <Route path="/aqi-sensor/overview" element={<OperatorRoute moduleKey="showAQISensor"><AQIOverview /></OperatorRoute>} />
      <Route path="/aqi-sensor/temp-humidity" element={<OperatorRoute moduleKey="showAQISensor"><VRVTempHumidity /></OperatorRoute>} />

      {/* HVAC */}
      <Route path="/hvac/chiller" element={<OperatorRoute moduleKey="showHVAC"><Chiller /></OperatorRoute>} />
      <Route path="/hvac/ahu" element={<OperatorRoute moduleKey="showHVAC"><AHU /></OperatorRoute>} />
      <Route path="/hvac/cooling-tower" element={<OperatorRoute moduleKey="showHVAC"><CoolingTower /></OperatorRoute>} />
      <Route path="/hvac/report" element={<OperatorRoute moduleKey="showHVAC"><PlaceholderPage title="HVAC PDF Reports" /></OperatorRoute>} />

      {/* AC */}
      <Route path="/ac/overview" element={<OperatorRoute moduleKey="showAC"><ACOverview /></OperatorRoute>} />
      <Route path="/ac/schedule" element={<OperatorRoute moduleKey="showAC"><ACScheduler /></OperatorRoute>} />
      <Route path="/ac/report" element={<OperatorRoute moduleKey="showAC"><PlaceholderPage title="AC PDF Reports" /></OperatorRoute>} />

      {/* Fire */}
      <Route path="/fire-pumps/overview" element={<OperatorRoute moduleKey="showFirePumps"><FireOverview /></OperatorRoute>} />
      <Route path="/fire-pumps/status" element={<OperatorRoute moduleKey="showFirePumps"><PumpStatus /></OperatorRoute>} />
      <Route path="/fire-pumps/pressure" element={<OperatorRoute moduleKey="showFirePumps"><HeaderPressure /></OperatorRoute>} />
      <Route path="/fire-pumps/jockey" element={<OperatorRoute moduleKey="showFirePumps"><JockeyMain /></OperatorRoute>} />
      <Route path="/fire-pumps/report" element={<OperatorRoute moduleKey="showFirePumps"><PlaceholderPage title="Fire Pumps PDF Reports" /></OperatorRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<PlaceholderPage title="Module Under Calibration" />} />
    </Routes>
  );
};

export default AppRoutes;
