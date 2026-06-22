import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Spinner, Container, Row, Col, Alert, Badge, Form, InputGroup, Tabs, Tab, Table, Modal } from 'react-bootstrap';
import {
  ShieldCheck, Save, ToggleRight, ToggleLeft, Layers3, Eye, EyeOff,
  Search, Filter, RefreshCcw, CheckCircle2, XCircle, ChevronRight,
  LayoutDashboard, Settings, Bell, Zap, Droplets, Activity, Database,
  ShieldAlert, ClipboardList, PenTool, History, Gauge, Lock, Users,
  Building2, UserPlus, Trash2, Edit, ExternalLink, Sliders, Thermometer, Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumLoader from '../../components/PremiumLoader';

const defaultSubmoduleVisibility = {
  showWaterManagement: { Overview: true, 'AG TANK': true, 'UG TANK': true },
  showMotors: { Overview: true, 'Pump Room 1': true, 'Pump Room 2': true, 'VFD / DOL Status': true, 'PDF Report': true },
  showDGSet: { Overview: true, 'DG Set-1': true, 'DG Set-2': true, 'DG Set-3': true },
  showAlarms: { Overview: true, 'Active Alarms': true, 'Inactive Alarms': true, 'ACK (Acknowledge)': true, 'Alarm History': true, 'PDF Report': true },
  showLTPanel: { Overview: true, 'LT Room-1': true, 'LT Room-2': true, 'LT Room-3': true, 'Incoming / Outgoing': true, 'Breaker Status': true, 'PDF Report': true },
  showTransformers: { Overview: true, 'Transformer-1': true, 'Transformer-2': true, 'Load / Temp': true, 'PDF Report': true },
  showFirePumps: { Overview: true, 'Pump Status': true, 'Header Pressure': true, 'Jockey / Main': true, 'PDF Report': true },
  showMaintenance: { Scheduled: true, 'Pending Tasks': true, 'PDF Report': true },
  showServiceHistory: { 'Equipment-wise': true, 'Service Records': true, 'PDF Report': true },
  showDailyDPR: { 'Data Aggregation': true, 'Daily Logs': true, 'PDF Report': true },
  showEnergyMetering: { Overview: true, 'Main Meter': true, 'Sub Meters': true, 'Graphs': true, 'PDF Report': true },
  showHVAC: { 'Chiller': true, 'AHU': true, 'Cooling Tower': true, 'PDF Report': true },
  showAC: { 'Overview': true, 'PDF Report': true }
};

const defaultConfig = {
  showDashboard: true,
  showWaterManagement: true,
  showMotors: true,
  showDGSet: true,
  showSettingTemplates: true,
  showAlarms: true,
  showLTPanel: true,
  showTransformers: true,
  showFirePumps: true,
  showTicketing: true,
  showMaintenance: true,
  showServiceHistory: true,
  showDailyDPR: true,
  showEnergyMetering: true,
  showHVAC: true,
  showAC: true,
  submoduleVisibility: defaultSubmoduleVisibility
};

const moduleDetails = {
  showDashboard: { label: 'Dashboard', icon: <LayoutDashboard size={18} />, subItems: [] },
  showWaterManagement: { label: 'Water Management', icon: <Droplets size={18} />, subItems: ['Overview', 'AG TANK', 'UG TANK'] },
  showMotors: { label: 'Motors', icon: <Activity size={18} />, subItems: ['Overview', 'Pump Room 1', 'Pump Room 2', 'VFD / DOL Status', 'PDF Report'] },
  showDGSet: { label: 'DG Set', icon: <Database size={18} />, subItems: ['Overview', 'DG Set-1', 'DG Set-2', 'DG Set-3'] },
  showSettingTemplates: { label: 'Setting Templates', icon: <Settings size={18} />, subItems: [] },
  showAlarms: { label: 'Alarm System', icon: <Bell size={18} />, subItems: ['Overview', 'Active Alarms', 'Inactive Alarms', 'ACK (Acknowledge)', 'Alarm History', 'PDF Report'] },
  showLTPanel: { label: 'LT Panel', icon: <LayoutDashboard size={18} />, subItems: ['Overview', 'LT Room-1', 'LT Room-2', 'LT Room-3', 'Incoming / Outgoing', 'Breaker Status', 'PDF Report'] },
  showTransformers: { label: 'Transformer', icon: <Zap size={18} />, subItems: ['Overview', 'Transformer-1', 'Transformer-2', 'Load / Temp', 'PDF Report'] },
  showFirePumps: { label: 'Fire', icon: <ShieldAlert size={18} />, subItems: ['Overview', 'Pump Status', 'Header Pressure', 'Jockey / Main', 'PDF Report'] },
  showTicketing: { label: 'Ticketing', icon: <ClipboardList size={18} />, subItems: [] },
  showMaintenance: { label: 'Maintenance', icon: <PenTool size={18} />, subItems: ['Scheduled', 'Pending Tasks', 'PDF Report'] },
  showServiceHistory: { label: 'Service History', icon: <History size={18} />, subItems: ['Equipment-wise', 'Service Records', 'PDF Report'] },
  showDailyDPR: { label: 'Daily DPR', icon: <Gauge size={18} />, subItems: ['Data Aggregation', 'Daily Logs', 'PDF Report'] },
  showEnergyMetering: { label: 'Energy Metering', icon: <Zap size={18} />, subItems: ['Overview', 'Main Meter', 'Sub Meters', 'Graphs', 'PDF Report'] },
  showHVAC: { label: 'HVAC', icon: <Thermometer size={18} />, subItems: ['Chiller', 'AHU', 'Cooling Tower', 'PDF Report'] },
  showAC: { label: 'AC', icon: <Wind size={18} />, subItems: ['Overview', 'PDF Report'] }
};

const mergeConfig = (rawConfig = {}) => ({
  ...defaultConfig,
  ...rawConfig,
  submoduleVisibility: Object.fromEntries(
    Object.entries(defaultSubmoduleVisibility).map(([moduleKey, submodules]) => [
      moduleKey,
      {
        ...submodules,
        ...(rawConfig.submoduleVisibility?.[moduleKey] || {})
      }
    ])
  )
});

const SuperAdminConfig = () => {
  const [activeTab, setActiveTab] = useState('tenants');
  const [tenants, setTenants] = useState([]);
  const [config, setConfig] = useState(defaultConfig);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Tenant Modal
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({
    name: '', description: '', adminName: '', adminEmail: '', adminPassword: ''
  });

  useEffect(() => {
    // Load from cache for instant display
    const cachedTenants = localStorage.getItem('cache_tenants');
    const cachedConfig = localStorage.getItem('cache_global_config');

    if (cachedTenants) setTenants(JSON.parse(cachedTenants));
    if (cachedConfig) setConfig(mergeConfig(JSON.parse(cachedConfig)));

    // Only show loader if no cache exists
    if (!cachedTenants || !cachedConfig) {
      setLoading(true);
    } else {
      setLoading(false);
    }

    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [tenantsData, configData] = await Promise.all([
        fetchTenants(true),
        fetchGlobalConfig(true)
      ]);

      if (tenantsData) {
        setTenants(tenantsData);
        localStorage.setItem('cache_tenants', JSON.stringify(tenantsData));
      }

      if (configData && !configData.error) {
        console.log('Global Config Loaded:', configData);
        const merged = mergeConfig(configData);
        setConfig(merged);
        localStorage.setItem('cache_global_config', JSON.stringify(configData));
      } else {
        console.warn('Using default config due to fetch error:', configData?.error);
        setConfig(mergeConfig({}));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async (returnOnly = false) => {
    try {
      const apiUrl = '/api';
      const response = await fetch(`${apiUrl}/super-admin/tenants`);
      const data = await response.json();
      if (returnOnly) return data;
      setTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      if (returnOnly) return [];
      setTenants([]);
    }
  };

  const fetchGlobalConfig = async (returnOnly = false) => {
    try {
      const apiUrl = '/api';
      const response = await fetch(`${apiUrl}/super-admin/config`);
      const data = await response.json();
      if (returnOnly) return data;
      const merged = mergeConfig(data);
      setConfig(merged);
    } catch (error) {
      console.error('Error fetching global config:', error);
      if (returnOnly) return {};
      setConfig(mergeConfig({}));
    }
  };

  const handleToggle = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmoduleToggle = (moduleKey, subItem) => {
    setConfig(prev => ({
      ...prev,
      submoduleVisibility: {
        ...prev.submoduleVisibility,
        [moduleKey]: {
          ...prev.submoduleVisibility[moduleKey],
          [subItem]: !prev.submoduleVisibility[moduleKey][subItem]
        }
      }
    }));
  };

  const toggleAllSubmodules = (moduleKey, value) => {
    const subItems = moduleDetails[moduleKey].subItems;
    const newSubVisibility = { ...config.submoduleVisibility[moduleKey] };
    subItems.forEach(item => { newSubVisibility[item] = value; });
    setConfig(prev => ({
      ...prev,
      submoduleVisibility: { ...prev.submoduleVisibility, [moduleKey]: newSubVisibility }
    }));
  };

  const handleToggleAllModules = (enabled) => {
    const newConfig = { ...config };
    Object.keys(moduleDetails).forEach(key => {
      newConfig[key] = enabled;
    });
    setConfig(newConfig);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const apiUrl = '/api';
      const endpoint = selectedTenant
        ? `${apiUrl}/super-admin/tenants/${selectedTenant.id}/config`
        : `${apiUrl}/super-admin/config`;

      const body = selectedTenant ? { features: config } : { config };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const updatedConfig = await response.json();
        
        // Synchronize with Sidebar IMMEDIATELY
        if (!selectedTenant) {
          const sidebarModules = {};
          Object.entries(moduleDetails).forEach(([key, mod]) => {
            sidebarModules[mod.label] = updatedConfig[key];
          });
          
          localStorage.setItem('scada_modules_config', JSON.stringify(sidebarModules));
          localStorage.setItem('scada_submodules_config', JSON.stringify(updatedConfig.submoduleVisibility));
          localStorage.setItem('cache_global_config', JSON.stringify(updatedConfig));
          
          // Ensure immediate reload for sidebar components
          window.dispatchEvent(new Event('storage-update'));
          window.dispatchEvent(new Event('storage'));
        }

        setMessage({ 
          type: 'success', 
          text: selectedTenant 
            ? `Successfully updated permissions for ${selectedTenant.name}` 
            : '✨ Global System Visibility Synchronized Successfully!' 
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'danger', text: 'Error saving configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleTenantAction = async (tenant, action) => {
    if (action === 'configure') {
      setSelectedTenant(tenant);
      setConfig(mergeConfig(tenant.config?.features || {}));
      setActiveTab('config');
    } else if (action === 'view') {
      // Impersonate as the Tenant's Admin for verification
      const tenantConfig = tenant.config?.features || defaultConfig;

      if (!localStorage.getItem('impersonator_backup_role')) {
        localStorage.setItem('impersonator_backup_user', localStorage.getItem('userData'));
        localStorage.setItem('impersonator_backup_role', localStorage.getItem('userRole'));
      }

      const mockAdminData = {
        id: tenant.admin?.id || 0,
        name: `Preview: ${tenant.admin?.name || tenant.name}`,
        email: tenant.admin?.email,
        role: 'ADMIN',
        tenantId: tenant.id
      };

      localStorage.setItem('userData', JSON.stringify(mockAdminData));
      localStorage.setItem('userRole', 'ADMIN');

      const sidebarMapping = {
        "Dashboard": tenantConfig.showDashboard,
        "Water Management": tenantConfig.showWaterManagement,
        "Motors": tenantConfig.showMotors,
        "DG Monitoring": tenantConfig.showDGSet,
        "Setting Templates": tenantConfig.showSettingTemplates,
        "Alarm System": tenantConfig.showAlarms,
        "LT Panel": tenantConfig.showLTPanel,
        "Transformer": tenantConfig.showTransformers,
        "Fire": tenantConfig.showFirePumps,
        "Ticketing": tenantConfig.showTicketing,
        "Maintenance": tenantConfig.showMaintenance,
        "Service History": tenantConfig.showServiceHistory,
        "Daily DPR": tenantConfig.showDailyDPR,
        "Energy Metering": tenantConfig.showEnergyMetering,
        "HVAC": tenantConfig.showHVAC,
        "AC": tenantConfig.showAC,
      };

      localStorage.setItem('scada_modules_config', JSON.stringify(sidebarMapping));
      localStorage.setItem('scada_submodules_config', JSON.stringify(tenantConfig.submoduleVisibility));
      window.dispatchEvent(new Event('storage-update'));

      setMessage({ type: 'success', text: `Entering verification mode for ${tenant.name}...` });
      setTimeout(() => {
        window.location.href = '/admin/manage-users';
      }, 1200);
    } else if (action === 'templates') {
      // Impersonate as the Tenant's Admin to set Templates
      const tenantConfig = tenant.config?.features || defaultConfig;

      if (!localStorage.getItem('impersonator_backup_role')) {
        localStorage.setItem('impersonator_backup_user', localStorage.getItem('userData'));
        localStorage.setItem('impersonator_backup_role', localStorage.getItem('userRole'));
      }

      const mockAdminData = {
        id: tenant.admin?.id || 0,
        name: `Preview: ${tenant.admin?.name || tenant.name}`,
        email: tenant.admin?.email,
        role: 'ADMIN',
        tenantId: tenant.id
      };

      localStorage.setItem('userData', JSON.stringify(mockAdminData));
      localStorage.setItem('userRole', 'ADMIN');

      const sidebarMapping = {
        "Dashboard": tenantConfig.showDashboard,
        "Water Management": tenantConfig.showWaterManagement,
        "Motors": tenantConfig.showMotors,
        "DG Monitoring": tenantConfig.showDGSet,
        "Setting Templates": tenantConfig.showSettingTemplates,
        "Alarm System": tenantConfig.showAlarms,
        "LT Panel": tenantConfig.showLTPanel,
        "Transformer": tenantConfig.showTransformers,
        "Fire": tenantConfig.showFirePumps,
        "Ticketing": tenantConfig.showTicketing,
        "Maintenance": tenantConfig.showMaintenance,
        "Service History": tenantConfig.showServiceHistory,
        "Daily DPR": tenantConfig.showDailyDPR,
        "Energy Metering": tenantConfig.showEnergyMetering,
        "HVAC": tenantConfig.showHVAC,
        "AC": tenantConfig.showAC,
      };

      localStorage.setItem('scada_modules_config', JSON.stringify(sidebarMapping));
      localStorage.setItem('scada_submodules_config', JSON.stringify(tenantConfig.submoduleVisibility));
      window.dispatchEvent(new Event('storage-update'));

      setMessage({ type: 'success', text: `Entering templates configuration for ${tenant.name}...` });
      setTimeout(() => {
        window.location.href = '/config/templates';
      }, 1200);
    } else if (action === 'delete') {
      if (window.confirm(`Are you sure you want to delete ${tenant.name}? This will remove all users and settings.`)) {
        try {
          const apiUrl = '/api';
          await fetch(`${apiUrl}/super-admin/tenants/${tenant.id}`, { method: 'DELETE' });
          fetchTenants();
        } catch (error) {
          console.error('Delete error:', error);
        }
      }
    } else if (action === 'edit') {
      setTenantFormData({
        id: tenant.id,
        name: tenant.name,
        description: tenant.description || '',
        adminName: tenant.admin?.name || '',
        adminEmail: tenant.admin?.email || '',
        adminPassword: ''
      });
      setShowTenantModal(true);
    }
  };

  const handleTenantSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = '/api';
      const method = tenantFormData.id ? 'PUT' : 'POST';
      const endpoint = tenantFormData.id
        ? `${apiUrl}/super-admin/tenants/${tenantFormData.id}`
        : `${apiUrl}/super-admin/tenants`;

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantFormData)
      });

      if (response.ok) {
        setShowTenantModal(false);
        fetchTenants();
        setTenantFormData({ name: '', description: '', adminName: '', adminEmail: '', adminPassword: '' });
      }
    } catch (error) {
      console.error('Error saving tenant:', error);
    }
  };

  const filteredModules = useMemo(() => {
    if (!config) return [];
    return Object.entries(moduleDetails).filter(([key, module]) => {
      const matchesSearch = module.label.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'enabled' && config[key]) ||
        (filterStatus === 'disabled' && !config[key]);
      return matchesSearch && matchesStatus;
    });
  }, [config, searchTerm, filterStatus]);

  if (loading) {
    return <PremiumLoader message="Initializing Control Center" />;
  }

  return (
    <Container fluid className="py-4 px-lg-5 super-admin-modern">
      <div className="admin-header-card mb-4">
        <Row className="align-items-center">
          <Col md={8}>
            <div className="d-flex align-items-center gap-3">
              <div className="admin-icon-glow"><ShieldCheck size={32} /></div>
              <div>
                <h2 className="header-title mb-1">Super Admin Console</h2>
                <p className="header-subtitle mb-0">Manage multi-tenant organizations and system permissions.</p>
              </div>
            </div>
          </Col>
          <Col md={4} className="text-md-end mt-3 mt-md-0 d-flex gap-2 justify-content-md-end">
            <Button variant="outline-info" className="rounded-pill px-3" onClick={fetchInitialData}>
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button variant="info" className="rounded-pill px-4" onClick={() => { setTenantFormData({ name: '', description: '', adminName: '', adminEmail: '', adminPassword: '' }); setShowTenantModal(true); }}>
              <Building2 size={18} className="me-2" /> Add New Tenant
            </Button>
          </Col>
        </Row>
      </div>

      {message && <Alert variant={message.type} className="glass-alert mb-4">{message.text}</Alert>}

      <Tabs activeKey={activeTab} onSelect={(k) => { setActiveTab(k); if (k === 'config' && !selectedTenant) fetchGlobalConfig(); }} className="scada-tabs mb-4">
        <Tab eventKey="tenants" title={<><Users size={16} className="me-2" /> Tenants & Admins</>}>
          <Card className="glass-card border-0">
            <Card.Body className="p-0">
              <Table responsive hover className="scada-table mb-0">
                <thead>
                  <tr>
                    <th>ORGANIZATION</th>
                    <th>ADMIN DETAILS</th>
                    <th>USER LOAD</th>
                    <th>LAST UPDATED</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td>
                        <div className="fw-bold text-white">{tenant.name}</div>
                        <small className="text-muted">{tenant.description || 'No description'}</small>
                      </td>
                      <td>
                        <div className="text-info small fw-bold">{tenant.admin?.name || 'N/A'}</div>
                        <div className="text-muted x-small">{tenant.admin?.email}</div>
                      </td>
                      <td>
                        <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-25 px-3">
                          {tenant.userCount} Operating Roles
                        </Badge>
                      </td>
                      <td>{new Date(tenant.updatedAt).toLocaleDateString()}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button variant="outline-info" size="sm" onClick={() => handleTenantAction(tenant, 'configure')} title="Configure Permissions">
                            <Settings size={14} />
                          </Button>
                          <Button variant="outline-primary" size="sm" onClick={() => handleTenantAction(tenant, 'templates')} title="Set Settings Template">
                            <Sliders size={14} />
                          </Button>
                          <Button variant="outline-success" size="sm" onClick={() => handleTenantAction(tenant, 'view')} title="View Tenant Dashboard">
                            <Eye size={14} />
                          </Button>
                          <Button variant="outline-light" size="sm" onClick={() => handleTenantAction(tenant, 'edit')} title="Edit Admin Credentials">
                            <Edit size={14} />
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleTenantAction(tenant, 'delete')} title="Delete Tenant">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="config" title={<><Settings size={16} className="me-2" /> {selectedTenant ? `Permissions: ${selectedTenant.name}` : 'Global Configuration'}</>}>
          <Row className="g-4">
            <Col lg={8}>
              <Card className="glass-card border-0 shadow-lg">
                <Card.Header className="bg-transparent border-bottom border-light border-opacity-10 p-4">
                  {selectedTenant && (
                    <div className="mb-3">
                      <Button variant="outline-secondary" size="sm" onClick={() => setSelectedTenant(null)} className="rounded-pill">
                        ← Back to Global Config
                      </Button>
                    </div>
                  )}
                  <Row className="g-3 align-items-center">
                    <Col md={6}>
                      <InputGroup className="glass-search">
                        <InputGroup.Text className="bg-transparent border-0 text-muted"><Search size={18} /></InputGroup.Text>
                        <Form.Control placeholder="Search modules..." className="bg-transparent border-0 text-white shadow-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      </InputGroup>
                    </Col>
                    <Col md={7} className="d-flex justify-content-md-end gap-2 align-items-center">
                      <div className="d-flex gap-2 me-3 border-end border-light border-opacity-10 pe-3">
                         <Button variant="outline-success" size="sm" className="rounded-pill px-3 fw-bold fs-10" onClick={() => handleToggleAllModules(true)}>
                           ENABLE ALL
                         </Button>
                         <Button variant="outline-danger" size="sm" className="rounded-pill px-3 fw-bold fs-10" onClick={() => handleToggleAllModules(false)}>
                           DISABLE ALL
                         </Button>
                      </div>
                      <Button variant="info" size="sm" className="rounded-pill px-3 fw-bold fs-10 save-btn-premium" onClick={handleSaveConfig} disabled={saving}>
                         {saving ? <Spinner size="sm" /> : <Save size={14} className="me-1" />} SAVE & SYNC
                      </Button>
                      <div className="ms-2 d-flex gap-1">
                        {['all', 'enabled', 'disabled'].map(s => (
                          <Button key={s} variant={filterStatus === s ? 'info' : 'outline-secondary'} size="sm" className="rounded-pill px-2 fs-10" onClick={() => setFilterStatus(s)}>
                            {s.charAt(0).toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </Col>
                  </Row>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="module-list-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {filteredModules.map(([key, module]) => (
                      <div key={key} className={`module-row p-4 ${!config[key] ? 'module-disabled' : ''}`}>
                        <Row className="align-items-center">
                          <Col xs={12} md={5}>
                            <div className="d-flex align-items-center gap-3">
                              <div className={`module-icon-box ${config[key] ? 'active' : ''}`}>{module.icon}</div>
                              <div><h6 className="mb-1 text-white fw-semibold">{module.label}</h6><span className="text-muted small">{module.subItems.length} sub-links</span></div>
                            </div>
                          </Col>
                          <Col xs={12} md={4}>
                            {config[key] && module.subItems.length > 0 && (
                              <div className="d-flex gap-2">
                                <Button variant="link" size="sm" className="text-info p-0 text-decoration-none small" onClick={() => toggleAllSubmodules(key, true)}>Show All</Button>
                                <span className="text-muted">|</span>
                                <Button variant="link" size="sm" className="text-muted p-0 text-decoration-none small" onClick={() => toggleAllSubmodules(key, false)}>Hide All</Button>
                              </div>
                            )}
                          </Col>
                          <Col xs={12} md={3} className="text-md-end">
                            <button className={`modern-toggle ${config[key] ? 'on' : 'off'}`} onClick={() => handleToggle(key)}>
                              <span className="toggle-slider"></span>
                              <span className="toggle-label">{config[key] ? 'VISIBLE' : 'HIDDEN'}</span>
                            </button>
                          </Col>
                        </Row>
                        <AnimatePresence>
                          {config[key] && module.subItems.length > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="submodule-grid mt-3">
                              {module.subItems.map((item) => (
                                <button key={item} onClick={() => handleSubmoduleToggle(key, item)} className={`sub-pill ${config.submoduleVisibility[key]?.[item] ? 'active' : 'inactive'}`}>
                                  {config.submoduleVisibility[key]?.[item] ? <Eye size={14} /> : <EyeOff size={14} />}
                                  <span>{item}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </Card.Body>
                <Card.Footer className="bg-transparent border-top border-light border-opacity-10 p-4 text-end">
                  <Button variant="info" className="save-btn-premium px-5 py-2 rounded-pill fw-bold" onClick={handleSaveConfig} disabled={saving}>
                    {saving ? <Spinner size="sm" className="me-2" /> : <Save size={18} className="me-2" />}
                    {selectedTenant ? `Update ${selectedTenant.name} Permissions` : 'Apply Global Configuration'}
                  </Button>
                </Card.Footer>
              </Card>
            </Col>

            <Col lg={4}>
              <div className="sticky-top" style={{ top: '1rem' }}>
                <Card className="glass-card border-0 shadow-lg preview-card">
                  <Card.Header className="bg-transparent border-bottom border-light border-opacity-10 p-3">
                    <div className="d-flex align-items-center gap-2"><Layers3 size={18} className="text-info" /><span className="fw-bold text-white small text-uppercase">Sidebar Preview</span></div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <div className="mini-sidebar-preview p-4" style={{ background: '#0f172a', minHeight: '300px' }}>
                      {Object.entries(moduleDetails).map(([key, module]) => config?.[key] && (
                        <div key={key} className="preview-item mb-2 p-2 rounded" style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <div className="d-flex align-items-center gap-2 small">
                            <span className="text-info">{module.icon}</span>
                            <span className="text-white-50">{module.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      {/* Tenant Create/Edit Modal */}
      <Modal show={showTenantModal} onHide={() => setShowTenantModal(false)} centered className="scada-modal">
        <Modal.Header closeButton className="border-secondary border-opacity-25"><Modal.Title className="text-white">{tenantFormData.id ? 'Edit Tenant Admin' : 'Initialize New Tenant'}</Modal.Title></Modal.Header>
        <Form onSubmit={handleTenantSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3"><Form.Label>Organization Name</Form.Label><Form.Control type="text" className="scada-input" value={tenantFormData.name} onChange={(e) => setTenantFormData({ ...tenantFormData, name: e.target.value })} required /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control type="text" className="scada-input" value={tenantFormData.description} onChange={(e) => setTenantFormData({ ...tenantFormData, description: e.target.value })} /></Form.Group>
            <hr className="border-secondary opacity-25 my-4" />
            <h6 className="text-info x-small tracking-widest uppercase mb-3">Admin Credentials</h6>
            <Form.Group className="mb-3"><Form.Label>Admin Full Name</Form.Label><Form.Control type="text" className="scada-input" value={tenantFormData.adminName} onChange={(e) => setTenantFormData({ ...tenantFormData, adminName: e.target.value })} required /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Admin Email (Login)</Form.Label><Form.Control type="email" className="scada-input" value={tenantFormData.adminEmail} onChange={(e) => setTenantFormData({ ...tenantFormData, adminEmail: e.target.value })} required /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>{tenantFormData.id ? 'New Password (Optional)' : 'Admin Password'}</Form.Label><Form.Control type="password" className="scada-input" value={tenantFormData.adminPassword} onChange={(e) => setTenantFormData({ ...tenantFormData, adminPassword: e.target.value })} required={!tenantFormData.id} /></Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-secondary border-opacity-25">
            <Button variant="secondary" onClick={() => setShowTenantModal(false)}>Cancel</Button>
            <Button variant="info" type="submit">{tenantFormData.id ? 'Save Changes' : 'Deploy Tenant'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <style dangerouslySetInnerHTML={{
        __html: `
        .super-admin-modern { color: var(--scada-text); font-family: 'Inter', sans-serif; }
        .admin-header-card { background: linear-gradient(135deg, var(--scada-sidebar), var(--scada-bg)); backdrop-filter: blur(12px); border: 1px solid var(--scada-border); border-radius: 24px; padding: 2rem; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); }
        .admin-icon-glow { width: 64px; height: 64px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 18px; display: flex; align-items: center; justify-content: center; color: var(--scada-accent); box-shadow: 0 0 20px rgba(56, 189, 248, 0.15); }
        .header-title { font-weight: 800; letter-spacing: -0.02em; background: linear-gradient(to right, var(--scada-text), var(--scada-text-muted)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .header-subtitle { color: var(--scada-text-muted); }
        .glass-card { background: var(--scada-card) !important; backdrop-filter: blur(16px); border: 1px solid var(--scada-border); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); }
        .scada-table { background: transparent !important; color: var(--scada-text) !important; border-collapse: separate; border-spacing: 0; width: 100%; }
        .scada-table th { background: #1e293b !important; color: var(--scada-text-muted) !important; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1rem; border-bottom: 2px solid var(--scada-border) !important; padding: 1rem !important; }
        .scada-table td { vertical-align: middle; border-color: var(--scada-border) !important; padding: 1.25rem 1rem !important; background: transparent !important; color: var(--scada-text) !important; }
        .scada-tabs .nav-link { color: var(--scada-text-muted); border: 0; padding: 1rem 2rem; font-weight: 600; transition: 0.3s; }
        .scada-tabs .nav-link.active { background: rgba(56, 189, 248, 0.1); color: var(--scada-accent); border-bottom: 2px solid var(--scada-accent); }
        .module-row { border-bottom: 1px solid var(--scada-border); transition: background 0.3s ease; }
        .module-icon-box { width: 42px; height: 42px; border-radius: 12px; background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center; color: var(--scada-text-muted); }
        .module-icon-box.active { background: rgba(56, 189, 248, 0.1); color: var(--scada-accent); border: 1px solid rgba(56, 189, 248, 0.2); }
        .modern-toggle { width: 100px; height: 36px; background: var(--scada-bg); border: 1px solid var(--scada-border); border-radius: 100px; position: relative; cursor: pointer; transition: 0.3s; display: inline-flex; align-items: center; overflow: hidden; }
        .modern-toggle.on { background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.4); }
        .toggle-slider { position: absolute; width: 28px; height: 28px; background: var(--scada-text-muted); border-radius: 50%; left: 4px; transition: 0.3s; z-index: 2; }
        .on .toggle-slider { left: 68px; background: var(--scada-accent); box-shadow: 0 0 10px rgba(56, 189, 248, 0.5); }
        .toggle-label { width: 100%; font-size: 0.65rem; font-weight: 800; text-align: center; padding-left: 28px; color: var(--scada-text-muted); transition: 0.3s; }
        .on .toggle-label { padding-left: 0; padding-right: 28px; color: var(--scada-accent); }
        .submodule-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; background: rgba(0, 0, 0, 0.2); padding: 1rem; border-radius: 16px; }
        .sub-pill { background: rgba(255, 255, 255, 0.03); border: 1px solid var(--scada-border); padding: 0.6rem 1rem; border-radius: 12px; color: var(--scada-text-muted); font-size: 0.8rem; display: flex; align-items: center; gap: 0.6rem; transition: 0.2s; }
        .sub-pill.active { background: rgba(56, 189, 248, 0.08); border-color: rgba(56, 189, 248, 0.2); color: var(--scada-text); }
        .save-btn-premium { background: linear-gradient(45deg, #0ea5e9, #2563eb); border: none; box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2); transition: all 0.3s ease; }
        .scada-modal .modal-content { background: var(--scada-bg); border: 1px solid var(--scada-border); border-radius: 16px; }
        .scada-input { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--scada-border); color: var(--scada-text); }
      `}} />
    </Container>
  );
};

export default SuperAdminConfig;
