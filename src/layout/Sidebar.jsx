import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Droplets, Activity, Zap, Bell, Battery, ShieldAlert,
  Settings, ClipboardList, PenTool, History, LayoutDashboard,
  ChevronRight, Gauge, Database, Lock, User, Wind, Leaf, Thermometer,
  Building2
} from 'lucide-react';
import { Accordion } from 'react-bootstrap';
import logo from "../assets/logo.png";

const Sidebar = ({ collapsed }) => {
  const [modulesConfig, setModulesConfig] = useState(() => {
    const saved = localStorage.getItem('scada_modules_config');
    return saved ? JSON.parse(saved) : null;
  });
  const [submodulesConfig, setSubmodulesConfig] = useState(() => {
    const saved = localStorage.getItem('scada_submodules_config');
    return saved ? JSON.parse(saved) : {};
  });

  const userRole = localStorage.getItem('userRole') || 'USER';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN';
  const isImpersonating = !!localStorage.getItem('impersonator_backup_role');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configEndpoint = isSuperAdmin ? '/api/super-admin/config' : '/api/super-admin/admin-config';
        const response = await fetch(configEndpoint);
        if (response.ok) {
          const config = await response.json();

          // Map backend keys to sidebar labels
          const moduleMap = {
            showDashboard: 'Dashboard',
            showWaterManagement: 'Water Management',
            showMotors: 'Motors',
            showDGSet: 'DG Set',
            showSettingTemplates: 'Setting Templates',
            showAlarms: 'Alarm System',
            showLTPanel: 'LT Panel',
            showTransformers: 'Transformer',
            showFirePumps: 'Fire',
            showTicketing: 'Ticketing',
            showMaintenance: 'Maintenance',
            showServiceHistory: 'Service History',
            showDailyDPR: 'Daily DPR',
            showEnergyMetering: 'Energy Metering',
            showVRV: 'VRV',
            showAQISensor: 'AQI Sensor',
            showHVAC: 'HVAC',
            showAC: 'AC'
          };

          const sidebarModules = {};
          Object.entries(moduleMap).forEach(([key, label]) => {
            sidebarModules[label] = config[key];
          });

          setModulesConfig(sidebarModules);
          setSubmodulesConfig(config.submoduleVisibility || {});

          // Also update localStorage so it's ready for next reload
          localStorage.setItem('scada_modules_config', JSON.stringify(sidebarModules));
          localStorage.setItem('scada_submodules_config', JSON.stringify(config.submoduleVisibility || {}));
        }
      } catch (error) {
        console.error('Failed to fetch sidebar config:', error);
      }
    };

    fetchConfig();

    const updateConfig = () => {
      const savedModules = localStorage.getItem('scada_modules_config');
      const savedSubmodules = localStorage.getItem('scada_submodules_config');
      if (savedModules) setModulesConfig(JSON.parse(savedModules));
      if (savedSubmodules) setSubmodulesConfig(JSON.parse(savedSubmodules));
    };

    window.addEventListener('storage-update', updateConfig);
    return () => window.removeEventListener('storage-update', updateConfig);
  }, []);

  const handleExitImpersonation = () => {
    const originalUser = localStorage.getItem('impersonator_backup_user');
    const originalRole = localStorage.getItem('impersonator_backup_role');

    if (originalUser && originalRole) {
      localStorage.setItem('userData', originalUser);
      localStorage.setItem('userRole', originalRole);

      // Cleanup backups
      localStorage.removeItem('impersonator_backup_user');
      localStorage.removeItem('impersonator_backup_role');

      // Clear simulation configs
      localStorage.removeItem('scada_modules_config');
      localStorage.removeItem('scada_submodules_config');

      // Navigate back to the appropriate management page
      if (originalRole === 'SUPER_ADMIN') {
        window.location.href = '/super-admin';
      } else if (originalRole === 'ADMIN') {
        window.location.href = '/admin/manage-users';
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/dashboard",
      disabled: modulesConfig ? !modulesConfig["Dashboard"] : false
    },
    {
      title: "Water Management",
      icon: <Droplets size={20} />,
      disabled: modulesConfig ? !modulesConfig["Water Management"] : false,
      subItems: [
        { title: "Overview", path: "/water-management/overview" },
        { title: "AG TANK", path: "/water-management/ag-pump" },
        { title: "UG TANK", path: "/water-management/ug-pump" }
      ].filter((subItem) => submodulesConfig.showWaterManagement?.[subItem.title] ?? true)
    },
    {
      title: "Motors",
      icon: <Activity size={20} />,
      disabled: modulesConfig ? !modulesConfig["Motors"] : false,
      subItems: [
        { title: "Overview", path: "/motors/overview" },
        { title: "Pump Room 1", path: "/motors/room1" },
        { title: "Pump Room 2", path: "/motors/room2" },
        { title: "VFD / DOL Status", path: "/motors/status" },
        { title: "PDF Report", path: "/motors/report" }
      ].filter((subItem) => submodulesConfig.showMotors?.[subItem.title] ?? true)
    },
    {
      title: "DG Set",
      icon: <Database size={20} />,
      disabled: modulesConfig ? !modulesConfig["DG Set"] : false,
      subItems: [
        { title: "Overview", path: "/dg-set/overview" },
        { title: "DG Set-1", path: "/dg-set/dg1" },
        { title: "DG Set-2", path: "/dg-set/dg2" },
        { title: "DG Set-3", path: "/dg-set/dg3" }
      ].filter((subItem) => submodulesConfig.showDGSet?.[subItem.title] ?? true)
    },
    {
      title: "Alarm System",
      icon: <Bell size={20} />,
      disabled: modulesConfig ? !modulesConfig["Alarm System"] : false,
      subItems: [
        { title: "Overview", path: "/alarm-system/overview" },
        { title: "Alarm Config", path: "/alarm-system/config" },
        { title: "Message Template Setting", path: "/alarm-system/message-templates" },
        { title: "Active Alarms", path: "/alarm-system/active" },
        { title: "Inactive Alarms", path: "/alarm-system/inactive" },
        { title: "ACK (Acknowledge)", path: "/alarm-system/ack" },
        { title: "Alarm History", path: "/alarm-system/history" },
        { title: "PDF Report", path: "/alarm-system/report" }
      ].filter((subItem) => (submodulesConfig.showAlarms?.[subItem.title] ?? true) && !subItem.hidden)
    },
    {
      title: "LT Panel",
      icon: <LayoutDashboard size={20} />,
      disabled: modulesConfig ? !modulesConfig["LT Panel"] : false,
      subItems: [
        { title: "Overview", path: "/lt-panel/overview" },
        { title: "LT Room-1", path: "/lt-panel/room1" },
        { title: "LT Room-2", path: "/lt-panel/room2" },
        { title: "LT Room-3", path: "/lt-panel/room3" },
        { title: "Incoming / Outgoing", path: "/lt-panel/io" },
        { title: "Breaker Status", path: "/lt-panel/breaker" },
        { title: "PDF Report", path: "/lt-panel/report" }
      ].filter((subItem) => submodulesConfig.showLTPanel?.[subItem.title] ?? true)
    },
    {
      title: "Transformer",
      icon: <Zap size={20} />,
      disabled: modulesConfig ? !modulesConfig["Transformer"] : false,
      subItems: [
        { title: "Overview", path: "/transformer/overview" },
        { title: "Transformer-1", path: "/transformer/t1" },
        { title: "Transformer-2", path: "/transformer/t2" },
        { title: "Load / Temp", path: "/transformer/load" },
        { title: "PDF Report", path: "/transformer/report" }
      ].filter((subItem) => submodulesConfig.showTransformers?.[subItem.title] ?? true)
    },
    {
      title: "Fire",
      icon: <ShieldAlert size={20} />,
      disabled: modulesConfig ? !modulesConfig["Fire"] : false,
      subItems: [
        { title: "Overview", path: "/fire-pumps/overview" },
        { title: "Pump Status", path: "/fire-pumps/status" },
        { title: "Header Pressure", path: "/fire-pumps/pressure" },
        { title: "Jockey / Main", path: "/fire-pumps/jockey" },
        { title: "PDF Report", path: "/fire-pumps/report" }
      ].filter((subItem) => submodulesConfig.showFirePumps?.[subItem.title] ?? true)
    },
    {
      title: "Ticketing",
      icon: <ClipboardList size={20} />,
      path: "/ticketing",
      disabled: modulesConfig ? !modulesConfig["Ticketing"] : false
    },
    {
      title: "Maintenance",
      icon: <PenTool size={20} />,
      disabled: modulesConfig ? !modulesConfig["Maintenance"] : false,
      subItems: [
        { title: "Scheduled", path: "/maintenance/scheduled" },
        { title: "Pending Tasks", path: "/maintenance/pending" },
        { title: "PDF Report", path: "/maintenance/report" }
      ].filter((subItem) => submodulesConfig.showMaintenance?.[subItem.title] ?? true)
    },
    {
      title: "Service History",
      icon: <History size={20} />,
      disabled: modulesConfig ? !modulesConfig["Service History"] : false,
      subItems: [
        { title: "Equipment-wise", path: "/service/equipment" },
        { title: "Service Records", path: "/service/records" },
        { title: "PDF Report", path: "/service/report" }
      ].filter((subItem) => submodulesConfig.showServiceHistory?.[subItem.title] ?? true)
    },
    {
      title: "Daily DPR",
      icon: <Gauge size={20} />,
      disabled: modulesConfig ? !modulesConfig["Daily DPR"] : false,
      subItems: [
        { title: "Data Aggregation", path: "/dpr/aggregation" },
        { title: "Daily Logs", path: "/dpr/logs" },
        { title: "PDF Report", path: "/dpr/report" }
      ].filter((subItem) => submodulesConfig.showDailyDPR?.[subItem.title] ?? true)
    },
    {
      title: "Energy Metering",
      icon: <Zap size={20} />,
      disabled: modulesConfig ? !modulesConfig["Energy Metering"] : false,
      subItems: [
        { title: "Overview", path: "/energy-metering/overview" },
        { title: "Main Meter", path: "/energy-metering/main" },
        { title: "Sub Meters", path: "/energy-metering/sub" },
        { title: "Graphs", path: "/energy-metering/graphs" },
        { title: "PDF Report", path: "/energy-metering/report" }
      ].filter((subItem) => submodulesConfig.showEnergyMetering?.[subItem.title] ?? true)
    },
    {
      title: "VRV",
      icon: <Wind size={20} />,
      disabled: modulesConfig ? !modulesConfig["VRV"] : false,
      subItems: [
        { title: "Overview", path: "/VRV/overview" },
        { title: "Control Panel", path: "/VRV/control" },
        { title: "Schedule", path: "/VRV/schedule" },
        { title: "Human Sensor", path: "/VRV/human-sensor" }
      ].filter((subItem) => submodulesConfig.showVRV?.[subItem.title] ?? true)
    },
    {
      title: "AQI Sensor",
      icon: <Leaf size={20} />,
      disabled: modulesConfig ? !modulesConfig["AQI Sensor"] : false,
      subItems: [
        { title: "Overview", path: "/aqi-sensor/overview" },
        { title: "Temp & Humidity", path: "/aqi-sensor/temp-humidity" }
      ].filter((subItem) => submodulesConfig.showAQISensor?.[subItem.title] ?? true)
    },
    {
      title: "HVAC",
      icon: <Thermometer size={20} />,
      disabled: modulesConfig ? !modulesConfig["HVAC"] : false,
      subItems: [
        { title: "Chiller", path: "/hvac/chiller" },
        { title: "AHU", path: "/hvac/ahu" },
        { title: "Cooling Tower", path: "/hvac/cooling-tower" },
        { title: "PDF Report", path: "/hvac/report" }
      ].filter((subItem) => submodulesConfig.showHVAC?.[subItem.title] ?? true)
    },
    {
      title: "AC",
      icon: <Wind size={20} />,
      disabled: modulesConfig ? !modulesConfig["AC"] : false,
      subItems: [
        { title: "Overview", path: "/ac/overview" },
        { title: "PDF Report", path: "/ac/report" }
      ].filter((subItem) => submodulesConfig.showAC?.[subItem.title] ?? true)
    }
  ];

  return (
    <div className={`scada-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand d-flex align-items-center justify-content-center py-4 border-bottom border-secondary border-opacity-25">
        <img
          src={logo}
          alt="Company Logo"
          style={{ width: 165, height: 55, objectFit: "contain" }}
          className="me-2"
        />
      </div>

      <div className="sidebar-nav py-3" style={{ height: 'calc(100vh - 100px)', overflowY: 'auto' }}>

        {/* Verification Mode Banner */}
        {isImpersonating && (
          <div
            onClick={handleExitImpersonation}
            className="sidebar-link text-warning fw-bold border-warning mb-2"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', cursor: 'pointer', borderLeft: '3px solid #f59e0b' }}
          >
            <ShieldAlert size={20} />
            {!collapsed && <span className="ms-3">Exit Verification</span>}
          </div>
        )}

        {/* Management & Admin Links */}
        <div className="mb-2">
          {isSuperAdmin && !isImpersonating && (
            <NavLink to="/super-admin" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <ShieldAlert size={20} className="text-accent" />
              {!collapsed && <span className="ms-3 text-accent">Super Admin Console</span>}
            </NavLink>
          )}

          {(isAdmin || isSuperAdmin) && (
            <Accordion className="sidebar-accordion">
              <Accordion.Item eventKey="admin-config" className="bg-transparent border-0">
                <Accordion.Header className={`sidebar-link ${collapsed ? 'collapsed-header' : ''}`}>
                  <div className="d-flex align-items-center w-100 position-relative">
                    <span className="sidebar-icon"><Settings size={20} /></span>
                    {!collapsed && <span className="sidebar-text ms-3 flex-grow-1">Advanced Settings</span>}
                  </div>
                </Accordion.Header>
                {!collapsed && (
                  <Accordion.Body className="p-0 ps-4">
                    {isSuperAdmin && (
                      <NavLink to="/super-admin/sites" className={({ isActive }) => `sidebar-sub-link ${isActive ? 'active' : ''}`}>
                        Site Management
                      </NavLink>
                    )}
                    <NavLink to="/admin/manage-users" className={({ isActive }) => `sidebar-sub-link ${isActive ? 'active' : ''}`}>
                      User Management
                    </NavLink>
                    <NavLink to="/admin/manage-devices" className={({ isActive }) => `sidebar-sub-link ${isActive ? 'active' : ''}`}>
                      Device Management
                    </NavLink>
                    <NavLink to="/admin/manage-areas" className={({ isActive }) => `sidebar-sub-link ${isActive ? 'active' : ''}`}>
                      Area Management
                    </NavLink>
                    {(!modulesConfig || modulesConfig["Setting Templates"] !== false) && (
                      <NavLink to="/config/templates" className={({ isActive }) => `sidebar-sub-link ${isActive ? 'active' : ''}`}>
                        Setting Templates
                      </NavLink>
                    )}
                    <NavLink to="/settings" className={({ isActive }) => `sidebar-sub-link ${isActive ? 'active' : ''}`}>
                      Global Settings
                    </NavLink>
                  </Accordion.Body>
                )}
              </Accordion.Item>
            </Accordion>
          )}
        </div>

        {/* Operational Modules */}
        {menuItems.filter(item => {
          const isAllowedByRole = !item.adminOnly || isAdmin || isSuperAdmin;
          const isEnabledByConfig = !modulesConfig || modulesConfig[item.title] === true;

          return isAllowedByRole && isEnabledByConfig;
        }).map((item, index) => {
          const effectiveDisabled = item.disabled;
          return item.subItems ? (
            <Accordion key={index} className="sidebar-accordion">
              <Accordion.Item eventKey={index.toString()} className={`bg-transparent border-0 ${effectiveDisabled ? 'sidebar-disabled-item' : ''}`}>
                <Accordion.Header className={`sidebar-link ${collapsed ? 'collapsed-header' : ''} ${effectiveDisabled ? 'pe-none' : ''}`}>
                  <div className="d-flex align-items-center w-100 position-relative">
                    <span className="sidebar-icon">{item.icon}</span>
                    {!collapsed && <span className="sidebar-text ms-3 flex-grow-1">{item.title}</span>}
                    {effectiveDisabled && !collapsed && <Lock size={12} className="text-secondary opacity-50 ms-2" />}
                  </div>
                </Accordion.Header>
                {!collapsed && !effectiveDisabled && (
                  <Accordion.Body className="p-0 ps-4">
                    {item.subItems.map((sub, subIdx) => {
                      if (sub.disabled) {
                        return (
                          <span
                            key={subIdx}
                            className="sidebar-sub-link sidebar-disabled-item pe-none d-flex align-items-center justify-content-between"
                            style={{ opacity: 0.5, cursor: 'not-allowed', paddingRight: '24px' }}
                          >
                            {sub.title}
                            {!collapsed && <Lock size={10} className="text-secondary opacity-50" />}
                          </span>
                        );
                      }
                      return (
                        <NavLink
                          key={subIdx}
                          to={sub.path}
                          className={({ isActive }) => `sidebar-sub-link ${isActive ? 'active' : ''}`}
                        >
                          {sub.title}
                        </NavLink>
                      );
                    })}
                  </Accordion.Body>
                )}
              </Accordion.Item>
            </Accordion>
          ) : (
            <div key={index} className={effectiveDisabled ? 'sidebar-disabled-item' : ''}>
              {effectiveDisabled ? (
                <div className="sidebar-link pe-none opacity-50 d-flex align-items-center">
                  <span className="sidebar-icon">{item.icon}</span>
                  {!collapsed && <span className="sidebar-text ms-3 flex-grow-1">{item.title}</span>}
                  {!collapsed && <Lock size={12} className="text-secondary opacity-50" />}
                </div>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  {!collapsed && <span className="sidebar-text ms-3">{item.title}</span>}
                </NavLink>
              )}
            </div>
          );
        })}

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .sidebar-link {
          display: flex;
          align-items: center;
          padding: 12px 24px;
          color: var(--scada-text-muted);
          text-decoration: none;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
          cursor: pointer;
        }
        .sidebar-link:hover, .sidebar-link.active {
          color: var(--scada-text);
          background-color: rgba(224, 94, 0, 0.15);
          border-left-color: var(--scada-accent);
        }
        .sidebar-disabled-item {
          opacity: 0.35;
          filter: grayscale(1);
          cursor: not-allowed !important;
        }
        .pe-none {
          pointer-events: none !important;
        }
        .sidebar-sub-link {
          display: block;
          padding: 8px 16px;
          color: var(--scada-text-muted);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s ease;
        }
        .sidebar-sub-link:hover, .sidebar-sub-link.active {
          color: var(--scada-accent);
        }
        .sidebar-accordion .accordion-button {
          background-color: transparent !important;
          color: var(--scada-text-muted) !important;
          box-shadow: none !important;
          padding: 0;
        }
        .sidebar-accordion .accordion-button::after {
          filter: invert(1);
          transform: scale(0.7);
        }
        .sidebar-disabled-item .accordion-button::after {
          display: none !important;
        }
        .sidebar-accordion .accordion-body {
          background-color: transparent;
        }
        .collapsed-header .accordion-button::after {
          display: none;
        }
      `}} />
    </div>
  );
};

export default Sidebar;
