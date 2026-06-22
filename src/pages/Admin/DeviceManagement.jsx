import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Row, Col, Card, Modal, Form } from 'react-bootstrap';
import {
  Plus, Trash2, Save, Search, Settings, RefreshCw, X, CheckCircle,
  Activity, Zap, Database, Droplets, Flame, Sliders, ShieldAlert, ChevronDown
} from 'lucide-react';


/* ─────────────────────── category map / details ─────────────────────── */
const categoryDetails = {
  ENERGY_METER: { label: 'Energy Meter', icon: <Zap size={16} />, color: '#fb923c' },
  UG_TANK: { label: 'UG Tank', icon: <Droplets size={16} />, color: '#38bdf8' },
  AG_TANK: { label: 'AG Tank', icon: <Droplets size={16} />, color: '#0ea5e9' },
  PUMP: { label: 'Pump', icon: <Activity size={16} />, color: '#34d399' },
  VALVE: { label: 'Valve', icon: <Activity size={16} />, color: '#a78bfa' },
  GENERATOR: { label: 'DG Generator', icon: <Database size={16} />, color: '#facc15' },
  LT_PANEL: { label: 'LT Panel', icon: <Sliders size={16} />, color: '#f472b6' },
  FIRE_PUMP: { label: 'Fire Pump', icon: <Flame size={16} />, color: '#f87171' },
  HVAC_CHILLER: { label: 'HVAC Chiller', icon: <Activity size={16} />, color: '#2dd4bf' },
  HVAC_AHU: { label: 'HVAC AHU', icon: <Sliders size={16} />, color: '#fb7185' },
  HVAC_COOLING_TOWER: { label: 'Cooling Tower', icon: <Droplets size={16} />, color: '#60a5fa' },
  VRV: { label: 'VRV', icon: <Sliders size={16} />, color: '#c084fc' },
  AQI_SENSOR: { label: 'AQI Sensor', icon: <Activity size={16} />, color: '#34d399' },
  BREAKER: { label: 'Breaker', icon: <Zap size={16} />, color: '#fb923c' },
  STP: { label: 'STP', icon: <Droplets size={16} />, color: '#059669' },
  WTP: { label: 'WTP', icon: <Droplets size={16} />, color: '#2563eb' },
  LIFT: { label: 'Lift/Elevator', icon: <Sliders size={16} />, color: '#64748b' },
  LIGHTING: { label: 'Lighting', icon: <Zap size={16} />, color: '#eab308' },
  FIRE_PANEL: { label: 'Fire Panel', icon: <Flame size={16} />, color: '#dc2626' },
  CONTROLLER: { label: 'Controller', icon: <Settings size={16} />, color: '#4f46e5' },
  SENSOR: { label: 'Sensor', icon: <Activity size={16} />, color: '#06b6d4' },
  OTHER: { label: 'Other Device', icon: <Settings size={16} />, color: '#94a3b8' }
};

const getCategoryBadge = (cat = 'OTHER') => {
  return categoryDetails[cat] || categoryDetails.OTHER;
};

/* ─────────────────────── Custom FilterSelect ─────────────────────── */
const FilterSelect = ({ value, onChange, disabled, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const options = React.Children.toArray(children)
    .flatMap(child => Array.isArray(child) ? child : [child])
    .filter(Boolean)
    .map(child => ({ value: child.props?.value ?? '', label: child.props?.children ?? '' }));

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || options[0]?.label || 'Select...';

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="um-fsel-wrap">
      <button
        type="button"
        className={`um-fsel-btn${disabled ? ' disabled' : ''}${open ? ' active' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span className="um-fsel-label">{selectedLabel}</span>
        <ChevronDown size={12} className={`um-fsel-arrow${open ? ' open' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="um-fsel-dropdown">
          {options.map((opt, i) => (
            <div
              key={i}
              className={`um-fsel-option${String(opt.value) === String(value) ? ' selected' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange({ target: { value: opt.value } }); setOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DeviceManagement = () => {
  /* ── tab state ── */
  const [activeTab, setActiveTab] = useState('devices'); // 'devices', 'profiles', 'energyGroups', 'templates'
  const [modalTab, setModalTab] = useState('info'); // 'info', 'settings'

  /* ── list state ── */
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [saveMsg, setSaveMsg] = useState(null);

  /* ── modal / form state ── */
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    sochiotDeviceId: '',
    serialNumber: '',
    category: 'OTHER',
    profileId: '',
    buildingId: '',
    areaId: '',
    energyGroupId: '',
    sochiotTemplateId: '',
    templateName: '',
    displayOrder: 0,
    installedAt: '',
    description: '',
    isActive: true,
    deviceId: '',
    template_settings: '[]',
    default_values: '{}'
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);


  /* ── Energy Group state ── */
  const [energyGroupModal, setEnergyGroupModal] = useState(false);
  const [energyGroupFormData, setEnergyGroupFormData] = useState({
    id: '',
    name: '',
    description: '',
    displayOrder: 0
  });
  const [energyGroupSaving, setEnergyGroupSaving] = useState(false);
  const [energyGroupSaveError, setEnergyGroupSaveError] = useState(null);

  /* ── Device Profile state ── */
  const [profileModal, setProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    id: '',
    name: '',
    category: 'OTHER',
    functionalSystem: 'GENERIC',
    description: '',
    fieldMappings: '',
    defaultThresholds: '',
    dashboardConfig: '',
    isActive: true
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState(null);

  /* ── Setting Templates state ── */
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(null);

  /* ── relations state ── */
  const [buildings, setBuildings] = useState([]);
  const [areas, setAreas] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [energyGroups, setEnergyGroups] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [syncingStates, setSyncingStates] = useState({});

  /* ── auth fetch helper ── */
  const fetchWithAuth = async (url, options = {}) => {
    let token = localStorage.getItem('sochiot_token');
    if (!token) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let r = await fetch(url, { ...options, headers });
    if (r.status === 401) {
      localStorage.removeItem('sochiot_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return r;
  };

  /* ── data fetchers ── */
  const fetchSites = async () => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/`);
      if (res.ok) {
        const j = await res.json();
        const siteList = j.data || [];
        setSites(siteList);
        if (siteList.length > 0) {
          setSelectedSiteId(String(siteList[0].id));
        }
      }
    } catch (e) {
      console.error('Sites fetch failed:', e);
    }
  };

  const fetchBuildings = async (siteId) => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/buildings`);
      if (res.ok) {
        const j = await res.json();
        setBuildings(j.data || []);
      }
    } catch (e) {
      console.error('Buildings fetch failed:', e);
    }
  };

  const fetchAreas = async (siteId) => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/areas`);
      if (res.ok) {
        const j = await res.json();
        setAreas(j.data || []);
      }
    } catch (e) {
      console.error('Areas fetch failed:', e);
    }
  };

  const fetchEnergyGroups = async (siteId) => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/energy-groups`);
      if (res.ok) {
        const j = await res.json();
        setEnergyGroups(j.data || []);
      }
    } catch (e) {
      console.error('Energy groups fetch failed:', e);
    }
  };

  const fetchProfiles = async () => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/profiles`);
      if (res.ok) {
        const j = await res.json();
        setProfiles(j.data || []);
      }
    } catch (e) {
      console.error('Profiles fetch failed:', e);
    }
  };

  const fetchDevices = async (siteId, page = 1) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/devices?page=${page}&pageSize=${pagination.pageSize}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDevices(json.data || []);
        if (json.meta) {
          setPagination({
            page: json.meta.page || 1,
            pageSize: json.meta.pageSize || 50,
            total: json.meta.total || json.data.length,
            totalPages: json.meta.totalPages || 1
          });
        }
      } else {
        setDevices(Array.isArray(json.data) ? json.data : []);
      }
    } catch (e) {
      console.error(e);
      setApiError('Could not load devices. Make sure the backend is running.');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesList = async (siteId) => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/devices/templates`);
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.data || []);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error(e);
      setTemplatesError('Could not load device templates.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      fetchBuildings(selectedSiteId);
      fetchAreas(selectedSiteId);
      fetchEnergyGroups(selectedSiteId);
      fetchDevices(selectedSiteId, 1);
      if (activeTab === 'templates') {
        fetchTemplatesList(selectedSiteId);
      }
    }
  }, [selectedSiteId]);

  useEffect(() => {
    if (selectedSiteId && activeTab === 'templates') {
      fetchTemplatesList(selectedSiteId);
    }
  }, [activeTab]);

  /* ── open modals ── */
  const openCreateModal = () => {
    const defaultProfileId = profiles.length > 0 ? profiles[0].id : '';
    setFormData({
      id: '',
      name: '',
      sochiotDeviceId: '',
      serialNumber: '',
      category: 'OTHER',
      profileId: defaultProfileId,
      buildingId: '',
      areaId: '',
      energyGroupId: '',
      sochiotTemplateId: '',
      templateName: '',
      displayOrder: 0,
      installedAt: '',
      description: '',
      isActive: true,
      deviceId: '',
      template_settings: JSON.stringify([
        {
          "moduleId": 1,
          "sochiotFieldName": "voltage_status",
          "displayName": "Voltage Status",
          "dataType": "BOOLEAN",
          "isCommand": false,
          "graphable": true,
          "displayOrder": 1
        }
      ], null, 2),
      default_values: JSON.stringify({
        "plannedDownTime": 0,
        "plannedProduction": 1000,
        "cycleTime": 25,
        "machiningCycle": 1,
        "wagesPerHour": 500
      }, null, 2)
    });
    setModalTab('info');
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (device) => {
    setFormData({
      id: device.id,
      name: device.name || '',
      sochiotDeviceId: String(device.sochiotDeviceId || ''),
      serialNumber: device.serialNumber || '',
      category: device.category || 'OTHER',
      profileId: device.profileId || '',
      buildingId: device.buildingId ? String(device.buildingId) : '',
      areaId: device.areaId ? String(device.areaId) : '',
      energyGroupId: device.energyGroupId ? String(device.energyGroupId) : '',
      sochiotTemplateId: device.sochiotTemplateId ? String(device.sochiotTemplateId) : '',
      templateName: device.templateName || '',
      displayOrder: device.displayOrder || 0,
      installedAt: device.installedAt ? new Date(device.installedAt).toISOString().slice(0, 16) : '',
      description: device.description || '',
      isActive: device.isActive !== false,
      deviceId: device.deviceId ? String(device.deviceId) : '',
      template_settings: '[]',
      default_values: '{}'
    });
    setModalTab('info');
    setSaveError(null);
    setShowModal(true);
  };

  /* ── submit device ── */
  const handleSubmitDevice = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    const isEdit = !!formData.id;

    let templateSettingsParsed = [];
    let defaultValuesParsed = {};

    if (!isEdit) {
      try {
        templateSettingsParsed = JSON.parse(formData.template_settings || '[]');
      } catch (err) {
        setSaveError('Template Settings is not valid JSON.');
        setSaving(false);
        return;
      }
      try {
        defaultValuesParsed = formData.default_values ? JSON.parse(formData.default_values) : {};
      } catch (err) {
        setSaveError('Default Values is not valid JSON.');
        setSaving(false);
        return;
      }
    }

    // Build payload matching either edit or register (from-template) schemas
    const payload = isEdit ? {
      name: formData.name.trim(),
      sochiotDeviceId: parseInt(formData.sochiotDeviceId, 10),
      serialNumber: formData.serialNumber ? formData.serialNumber.trim() : null,
      category: formData.category,
      profileId: formData.profileId,
      buildingId: formData.buildingId ? parseInt(formData.buildingId, 10) : null,
      areaId: formData.areaId ? parseInt(formData.areaId, 10) : null,
      energyGroupId: formData.energyGroupId ? parseInt(formData.energyGroupId, 10) : null,
      sochiotTemplateId: formData.sochiotTemplateId ? parseInt(formData.sochiotTemplateId, 10) : null,
      templateName: formData.templateName ? formData.templateName.trim() : null,
      displayOrder: formData.displayOrder ? parseInt(formData.displayOrder, 10) : 0,
      installedAt: formData.installedAt ? new Date(formData.installedAt).toISOString() : null,
      description: formData.description ? formData.description.trim() : null,
      isActive: formData.isActive
    } : {
      siteId: parseInt(siteId, 10),
      sochiotDeviceId: parseInt(formData.sochiotDeviceId, 10),
      name: formData.name.trim(),
      deviceId: formData.deviceId ? parseInt(formData.deviceId, 10) : null,
      description: formData.description ? formData.description.trim() : null,
      serialNumber: formData.serialNumber ? formData.serialNumber.trim() : null,
      category: formData.category,
      areaId: formData.areaId ? parseInt(formData.areaId, 10) : null,
      buildingId: formData.buildingId ? parseInt(formData.buildingId, 10) : null,
      energyGroupId: formData.energyGroupId ? parseInt(formData.energyGroupId, 10) : null,
      sochiotTemplateId: formData.sochiotTemplateId ? parseInt(formData.sochiotTemplateId, 10) : null,
      templateName: formData.templateName ? formData.templateName.trim() : null,
      displayOrder: formData.displayOrder ? parseInt(formData.displayOrder, 10) : 0,
      isActive: formData.isActive,
      installedAt: formData.installedAt ? new Date(formData.installedAt).toISOString() : null,
      template_settings: templateSettingsParsed,
      default_values: defaultValuesParsed
    };

    if (isNaN(payload.sochiotDeviceId)) {
      setSaveError('Sochiot Device ID must be a valid number.');
      setSaving(false);
      return;
    }
    if (isEdit && !payload.profileId) {
      setSaveError('Device Profile is required.');
      setSaving(false);
      return;
    }

    try {
      const url = isEdit
        ? `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/devices/${formData.id}`
        : `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/devices/from-template`;

      const res = await fetchWithAuth(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setShowModal(false);
        setSaveMsg(isEdit ? `✓ "${formData.name}" updated!` : `✓ "${formData.name}" registered!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchDevices(siteId, pagination.page);
      } else {
        setSaveError(json.message || json.error || `Error ${res.status}`);
      }
    } catch (e) {
      console.error(e);
      setSaveError('Network error. Failed to save device.');
    } finally {
      setSaving(false);
    }
  };

  /* ── delete device ── */
  const handleDeleteDevice = async (deviceId, name) => {
    if (!window.confirm(`Are you sure you want to delete device "${name}"?`)) return;
    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/devices/${deviceId}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ Device "${name}" deleted successfully!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchDevices(siteId, pagination.page);
      } else {
        alert(`Failed to delete device: ${json.message || json.error || `Error ${res.status}`}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to delete device.');
    }
  };

  /* ── toggle active status ── */
  const handleToggleStatus = async (deviceId, name, currentStatus) => {
    const newStatus = !currentStatus;
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isActive: newStatus } : d));
    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/devices/${deviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus })
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ "${name}" status updated to ${newStatus ? 'Active' : 'Inactive'}!`);
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        alert(`Failed to update status: ${json.message || `Error ${res.status}`}`);
        setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isActive: currentStatus } : d));
      }
    } catch (e) {
      console.error(e);
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, isActive: currentStatus } : d));
    }
  };

  /* ── sync device ── */
  const handleSyncDevice = async (deviceId, name) => {
    setSyncingStates(p => ({ ...p, [deviceId]: true }));
    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/devices/${deviceId}/sync`, {
        method: 'POST'
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ "${name}" synced with Sochiot config!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchDevices(siteId, pagination.page);
      } else {
        alert(`Failed to sync: ${json.message || `Error ${res.status}`}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error during sync.');
    } finally {
      setSyncingStates(p => ({ ...p, [deviceId]: false }));
    }
  };

  /* ── CRUD Energy Group ── */
  const openCreateEnergyGroup = () => {
    setEnergyGroupFormData({ id: '', name: '', description: '', displayOrder: 0 });
    setEnergyGroupSaveError(null);
    setEnergyGroupModal(true);
  };

  const openEditEnergyGroup = (g) => {
    setEnergyGroupFormData({
      id: g.id,
      name: g.name || '',
      description: g.description || '',
      displayOrder: g.displayOrder || 0
    });
    setEnergyGroupSaveError(null);
    setEnergyGroupModal(true);
  };

  const handleSubmitEnergyGroup = async (e) => {
    e.preventDefault();
    setEnergyGroupSaving(true);
    setEnergyGroupSaveError(null);
    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    const isEdit = !!energyGroupFormData.id;
    const payload = {
      name: energyGroupFormData.name.trim(),
      description: energyGroupFormData.description ? energyGroupFormData.description.trim() : null,
      displayOrder: parseInt(energyGroupFormData.displayOrder, 10) || 0
    };
    try {
      const url = isEdit
        ? `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/energy-groups/${energyGroupFormData.id}`
        : `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/energy-groups`;
      const res = await fetchWithAuth(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setEnergyGroupModal(false);
        setSaveMsg(isEdit ? `✓ Energy Group "${energyGroupFormData.name}" updated!` : `✓ Energy Group "${energyGroupFormData.name}" created!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchEnergyGroups(siteId);
      } else {
        setEnergyGroupSaveError(json.message || json.error || `Error ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      setEnergyGroupSaveError('Network error. Failed to save energy group.');
    } finally {
      setEnergyGroupSaving(false);
    }
  };

  const handleDeleteEnergyGroup = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete Energy Group "${name}"?`)) return;
    const siteId = selectedSiteId || '1';
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/energy-groups/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ Energy Group "${name}" deleted!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchEnergyGroups(siteId);
      } else {
        alert(`Failed to delete energy group: ${json.message || json.error || `Error ${res.status}`}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to delete energy group.');
    }
  };

  /* ── CRUD Profile ── */
  const openCreateProfile = () => {
    setProfileFormData({
      id: '',
      name: '',
      category: 'OTHER',
      functionalSystem: 'GENERIC',
      description: '',
      fieldMappings: JSON.stringify({
        "voltage": { "displayName": "Voltage", "unit": "V", "dataType": "FLOAT", "isCommand": false, "graphable": true, "displayOrder": 1 }
      }, null, 2),
      defaultThresholds: JSON.stringify({
        "voltage": { "warningHigh": 245, "criticalHigh": 250, "warningLow": 210, "criticalLow": 200 }
      }, null, 2),
      dashboardConfig: JSON.stringify({
        "primaryField": "voltage",
        "chartFields": ["voltage"]
      }, null, 2),
      isActive: true
    });
    setProfileSaveError(null);
    setProfileModal(true);
  };

  const openEditProfile = (p) => {
    setProfileFormData({
      id: p.id,
      name: p.name || '',
      category: p.category || 'OTHER',
      functionalSystem: p.functionalSystem || 'GENERIC',
      description: p.description || '',
      fieldMappings: JSON.stringify(p.fieldMappings || {}, null, 2),
      defaultThresholds: JSON.stringify(p.defaultThresholds || {}, null, 2),
      dashboardConfig: JSON.stringify(p.dashboardConfig || {}, null, 2),
      isActive: p.isActive !== false
    });
    setProfileSaveError(null);
    setProfileModal(true);
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaveError(null);

    let fmParsed, dtParsed, dcParsed;
    try {
      fmParsed = JSON.parse(profileFormData.fieldMappings);
    } catch (err) {
      setProfileSaveError('Field Mappings is not valid JSON.');
      setProfileSaving(false);
      return;
    }
    try {
      dtParsed = JSON.parse(profileFormData.defaultThresholds);
    } catch (err) {
      setProfileSaveError('Default Thresholds is not valid JSON.');
      setProfileSaving(false);
      return;
    }
    try {
      dcParsed = profileFormData.dashboardConfig ? JSON.parse(profileFormData.dashboardConfig) : null;
    } catch (err) {
      setProfileSaveError('Dashboard Config is not valid JSON.');
      setProfileSaving(false);
      return;
    }

    const isEdit = !!profileFormData.id;
    const payload = {
      name: profileFormData.name.trim(),
      category: profileFormData.category,
      functionalSystem: profileFormData.functionalSystem,
      description: profileFormData.description ? profileFormData.description.trim() : null,
      fieldMappings: fmParsed,
      defaultThresholds: dtParsed,
      dashboardConfig: dcParsed,
      isActive: profileFormData.isActive
    };

    try {
      const url = isEdit
        ? `${import.meta.env.VITE_BACKEND_BMS_URL}/profiles/${profileFormData.id}`
        : `${import.meta.env.VITE_BACKEND_BMS_URL}/profiles`;
      const res = await fetchWithAuth(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setProfileModal(false);
        setSaveMsg(isEdit ? `✓ Profile "${profileFormData.name}" updated!` : `✓ Profile "${profileFormData.name}" created!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchProfiles();
      } else {
        setProfileSaveError(json.message || json.error || `Error ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      setProfileSaveError('Network error. Failed to save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteProfile = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete Device Profile "${name}"?`)) return;
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/profiles/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ Profile "${name}" deleted!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchProfiles();
      } else {
        alert(`Failed to delete profile: ${json.message || json.error || `Error ${res.status}`}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to delete profile.');
    }
  };

  /* ── filtered devices list ── */
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch =
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(d.sochiotDeviceId).includes(searchTerm);

      const matchesBuilding = filterBuilding ? String(d.buildingId) === filterBuilding : true;
      const matchesArea = filterArea ? String(d.areaId) === filterArea : true;
      const matchesCategory = filterCategory ? d.category === filterCategory : true;

      return matchesSearch && matchesBuilding && matchesArea && matchesCategory;
    });
  }, [devices, searchTerm, filterBuilding, filterArea, filterCategory]);

  /* ── filtered profiles list ── */
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      return p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             p.category?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [profiles, searchTerm]);

  /* ── filtered energy groups list ── */
  const filteredEnergyGroups = useMemo(() => {
    return energyGroups.filter(eg => {
      return eg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             eg.description?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [energyGroups, searchTerm]);

  /* ── dynamic sub-areas for modal ── */
  const filteredAreasForModal = useMemo(() => {
    if (!formData.buildingId) return areas;
    return areas.filter(a => String(a.buildingId) === formData.buildingId);
  }, [areas, formData.buildingId]);

  return (
    <div className="um-wrap">
      {/* ── Page Header ── */}
      <div className="um-page-header mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <h2 className="um-page-title mb-0">Device Configuration</h2>
          <div className="um-tab-toggle-group">
            <button
              type="button"
              className={`um-tab-toggle-btn ${activeTab === 'devices' ? 'active' : ''}`}
              onClick={() => { setActiveTab('devices'); setSearchTerm(''); }}
            >
              Device Registration
            </button>
            <button
              type="button"
              className={`um-tab-toggle-btn ${activeTab === 'profiles' ? 'active' : ''}`}
              onClick={() => { setActiveTab('profiles'); setSearchTerm(''); }}
            >
              Device Profile Management
            </button>
            <button
              type="button"
              className={`um-tab-toggle-btn ${activeTab === 'energyGroups' ? 'active' : ''}`}
              onClick={() => { setActiveTab('energyGroups'); setSearchTerm(''); }}
            >
              Energy Group Management
            </button>
            <button
              type="button"
              className={`um-tab-toggle-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => { setActiveTab('templates'); setSearchTerm(''); }}
            >
              Setting Templates
            </button>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="text-secondary font-monospace" style={{ fontSize: '0.78rem', fontWeight: 800 }}>ACTIVE SITE:</span>
          <select
            className="um-filter-select font-semibold"
            style={{ minWidth: '220px', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
          >
            {sites.map(s => (
              <option key={s.id} value={String(s.id)}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="um-toolbar mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap justify-content-between">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="um-search-box">
              <Search size={15} className="um-search-icon" />
              <input
                type="text"
                placeholder={
                  activeTab === 'devices' ? "Search device, SN, Sochiot ID..." :
                  activeTab === 'profiles' ? "Search profile name or category..." :
                  activeTab === 'energyGroups' ? "Search energy group name..." :
                  "Search templates..."
                }
                className="um-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {activeTab === 'devices' && (
              <>
                {/* Building filter */}
                <FilterSelect
                  value={filterBuilding}
                  onChange={(e) => {
                    setFilterBuilding(e.target.value);
                    setFilterArea(''); // Reset area filter
                  }}
                >
                  <option value="">All Buildings</option>
                  {buildings.map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </FilterSelect>

                {/* Area filter */}
                <FilterSelect
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  disabled={!filterBuilding}
                >
                  <option value="">All Areas</option>
                  {areas
                    .filter(a => !filterBuilding || String(a.buildingId) === filterBuilding)
                    .map(a => (
                      <option key={a.id} value={String(a.id)}>{a.name}</option>
                    ))}
                </FilterSelect>

                {/* Category filter */}
                <FilterSelect
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {Object.keys(categoryDetails).map(cat => (
                    <option key={cat} value={cat}>
                      {categoryDetails[cat].label}
                    </option>
                  ))}
                </FilterSelect>
              </>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            {saveMsg && (
              <span className="um-save-badge">
                <CheckCircle size={12} className="me-1" />
                {saveMsg}
              </span>
            )}
            <span className="um-count-badge">
              {activeTab === 'devices' ? `${filteredDevices.length} Devices` :
               activeTab === 'profiles' ? `${filteredProfiles.length} Profiles` :
               activeTab === 'energyGroups' ? `${filteredEnergyGroups.length} Groups` :
               `${templates.length} Templates`}
            </span>
            {activeTab === 'devices' && (
              <button className="um-btn-primary" onClick={openCreateModal}>
                <Plus size={15} className="me-2" />
                Register Device
              </button>
            )}
            {activeTab === 'profiles' && (
              <button className="um-btn-primary" onClick={openCreateProfile}>
                <Plus size={15} className="me-2" />
                Add Profile
              </button>
            )}
            {activeTab === 'energyGroups' && (
              <button className="um-btn-primary" onClick={openCreateEnergyGroup}>
                <Plus size={15} className="me-2" />
                Add Energy Group
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab View Renderers ── */}

      {/* 1. Device Registration View */}
      {activeTab === 'devices' && (
        <Card className="um-card">
          {loading ? (
            <div className="um-empty-state">
              <div className="um-spinner mb-3" />
              <span className="text-secondary">Loading device database...</span>
            </div>
          ) : apiError ? (
            <div className="um-empty-state">
              <div className="um-empty-icon mb-3" style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
                <ShieldAlert size={24} />
              </div>
              <h5 className="text-danger fw-bold mb-2">Error Connecting</h5>
              <p className="text-secondary max-w-md">{apiError}</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="um-empty-state">
              <div className="um-empty-icon mb-3">
                <Settings size={24} />
              </div>
              <h5 className="text-light fw-bold mb-1">No Devices Found</h5>
              <p className="text-secondary max-w-sm">No devices matched the search criteria or filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="um-table w-100">
                <thead>
                  <tr>
                    <th>Device / Serial No.</th>
                    <th>Category</th>
                    <th>Profile</th>
                    <th>Building & Area</th>
                    <th>Sochiot ID</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((d) => {
                    const bBadge = getCategoryBadge(d.category);
                    const deviceBuilding = buildings.find(b => b.id === d.buildingId);
                    const deviceArea = areas.find(a => a.id === d.areaId);

                    return (
                      <tr key={d.id} className="um-tr">
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="um-avatar"
                              style={{
                                background: `rgba(${parseInt(bBadge.color.slice(1, 3), 16)}, ${parseInt(bBadge.color.slice(3, 5), 16)}, ${parseInt(bBadge.color.slice(5, 7), 16)}, 0.1)`,
                                color: bBadge.color,
                                border: `1.5px solid ${bBadge.color}25`
                              }}
                            >
                              {bBadge.icon}
                            </div>
                            <div>
                              <div className="um-user-name">{d.name}</div>
                              {d.serialNumber && <div className="um-email">{d.serialNumber}</div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="um-role-badge"
                            style={{
                              background: `${bBadge.color}15`,
                              color: bBadge.color,
                              border: `1px solid ${bBadge.color}35`
                            }}
                          >
                            {bBadge.label}
                          </span>
                        </td>
                        <td className="text-light-50" style={{ fontSize: '0.8rem' }}>
                          {d.profile?.name || 'GENERIC'}
                        </td>
                        <td>
                          <div className="text-light-50" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {deviceBuilding?.name || '—'}
                          </div>
                          <div className="um-email">
                            {deviceArea?.name || 'No Specific Area'}
                          </div>
                        </td>
                        <td className="text-light fw-bold" style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                          {d.sochiotDeviceId}
                        </td>
                        <td>
                          <div
                            className="d-flex align-items-center gap-2"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleToggleStatus(d.id, d.name, d.isActive)}
                          >
                            <div style={{
                              width: '38px', height: '20px', borderRadius: '10px',
                              background: d.isActive ? 'rgba(224,94,0,0.2)' : 'rgba(255,255,255,0.06)',
                              border: `1.5px solid ${d.isActive ? 'rgba(224,94,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                              position: 'relative', transition: 'all 0.2s',
                            }}>
                              <div style={{
                                width: '14px', height: '14px', borderRadius: '50%',
                                background: d.isActive ? '#e05e00' : '#475569',
                                position: 'absolute', top: '1.5px',
                                left: d.isActive ? '20px' : '2px',
                                transition: 'all 0.2s',
                                boxShadow: d.isActive ? '0 0 6px rgba(224,94,0,0.7)' : 'none',
                              }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: d.isActive ? '#e05e00' : '#64748b' }}>
                              {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <button
                              type="button"
                              className="um-action-btn settings text-info"
                              title="Sync settings and fields"
                              disabled={syncingStates[d.id]}
                              onClick={() => handleSyncDevice(d.id, d.name)}
                            >
                              <RefreshCw size={14} className={syncingStates[d.id] ? 'spin-animation' : ''} />
                            </button>
                            <button
                              type="button"
                              className="um-action-btn settings"
                              title="Edit Device Details"
                              onClick={() => openEditModal(d)}
                            >
                              <Sliders size={14} />
                            </button>
                            <button
                              type="button"
                              className="um-action-btn delete"
                              title="Delete Device"
                              onClick={() => handleDeleteDevice(d.id, d.name)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 2. Device Profile Management View */}
      {activeTab === 'profiles' && (
        <Card className="um-card">
          {loading ? (
            <div className="um-empty-state">
              <div className="um-spinner mb-3" />
              <span className="text-secondary">Loading device profiles...</span>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="um-empty-state">
              <div className="um-empty-icon mb-3">
                <Sliders size={24} />
              </div>
              <h5 className="text-light fw-bold mb-1">No Profiles Found</h5>
              <p className="text-secondary max-w-sm">No device profiles are available. Create one to begin.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="um-table w-100">
                <thead>
                  <tr>
                    <th>Profile Name</th>
                    <th>Category</th>
                    <th>Functional System</th>
                    <th>Description</th>
                    <th>Mapped Fields</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((p) => {
                    const mappedCount = p.fieldMappings ? Object.keys(p.fieldMappings).length : 0;
                    return (
                      <tr key={p.id} className="um-tr">
                        <td className="text-light fw-bold">{p.name}</td>
                        <td>
                          <span className="um-role-badge" style={{ background: 'rgba(224,94,0,0.15)', color: '#e05e00', border: '1px solid rgba(224,94,0,0.35)' }}>
                            {p.category}
                          </span>
                        </td>
                        <td>
                          <span className="um-role-badge" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)' }}>
                            {p.functionalSystem}
                          </span>
                        </td>
                        <td className="text-secondary" style={{ maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {p.description || '—'}
                        </td>
                        <td className="text-light-50 font-monospace" style={{ fontSize: '0.8rem' }}>
                          {mappedCount} fields
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: p.isActive ? '#10b981' : '#64748b' }}>
                            {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <button
                              type="button"
                              className="um-action-btn settings"
                              title="Edit Profile"
                              onClick={() => openEditProfile(p)}
                            >
                              <Sliders size={14} />
                            </button>
                            <button
                              type="button"
                              className="um-action-btn delete"
                              title="Delete Profile"
                              onClick={() => handleDeleteProfile(p.id, p.name)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 3. Energy Group Management View */}
      {activeTab === 'energyGroups' && (
        <Card className="um-card">
          {loading ? (
            <div className="um-empty-state">
              <div className="um-spinner mb-3" />
              <span className="text-secondary">Loading energy groups...</span>
            </div>
          ) : filteredEnergyGroups.length === 0 ? (
            <div className="um-empty-state">
              <div className="um-empty-icon mb-3">
                <Zap size={24} />
              </div>
              <h5 className="text-light fw-bold mb-1">No Energy Groups Found</h5>
              <p className="text-secondary max-w-sm">No energy groups are defined for this site.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="um-table w-100">
                <thead>
                  <tr>
                    <th>Group Name</th>
                    <th>Description</th>
                    <th>Display Order</th>
                    <th>Created At</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnergyGroups.map((eg) => (
                    <tr key={eg.id} className="um-tr">
                      <td className="text-light fw-bold">{eg.name}</td>
                      <td className="text-secondary" style={{ maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {eg.description || '—'}
                      </td>
                      <td className="text-light font-monospace">{eg.displayOrder}</td>
                      <td className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        {new Date(eg.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <button
                            type="button"
                            className="um-action-btn settings"
                            title="Edit Energy Group"
                            onClick={() => openEditEnergyGroup(eg)}
                          >
                            <Sliders size={14} />
                          </button>
                          <button
                            type="button"
                            className="um-action-btn delete"
                            title="Delete Energy Group"
                            onClick={() => handleDeleteEnergyGroup(eg.id, eg.name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 4. Setting Templates View */}
      {activeTab === 'templates' && (
        <Card className="um-card">
          {templatesLoading ? (
            <div className="um-empty-state">
              <div className="um-spinner mb-3" />
              <span className="text-secondary">Loading setting templates list...</span>
            </div>
          ) : templatesError ? (
            <div className="um-empty-state">
              <h5 className="text-danger fw-bold mb-2">Error</h5>
              <p className="text-secondary">{templatesError}</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="um-empty-state">
              <div className="um-empty-icon mb-3">
                <Database size={24} />
              </div>
              <h5 className="text-light fw-bold mb-1">No Templates Found</h5>
              <p className="text-secondary max-w-sm">No configuration templates found in the active site.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="um-table w-100">
                <thead>
                  <tr>
                    <th>Template Name</th>
                    <th>Description / Details</th>
                    <th>Linked Devices</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((t, idx) => (
                    <tr key={idx} className="um-tr">
                      <td className="text-light fw-bold">{t.name || 'Template Name'}</td>
                      <td className="text-secondary">{t.description || 'Config template description'}</td>
                      <td className="text-light font-monospace">{t.deviceCount || 0} Devices</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Modals ── */}

      {/* Device Modal (Existing) */}
      <Modal show={showModal} onHide={() => setShowModal(false)} className="um-modal" size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.01em' }}>
            {formData.id ? 'Device Configuration Details' : 'Register New Device'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitDevice}>
          <Modal.Body style={{ padding: '1.5rem 1.5rem 1rem' }}>
            {/* Modal Inner Tabs (only for new registration) */}
            {!formData.id && (
              <div className="um-tab-toggle-group mb-4 d-flex justify-content-center" style={{ margin: '0 auto 1.5rem', maxWidth: '360px' }}>
                <button
                  type="button"
                  className={`um-tab-toggle-btn ${modalTab === 'info' ? 'active' : ''}`}
                  onClick={() => setModalTab('info')}
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Device Info
                </button>
                <button
                  type="button"
                  className={`um-tab-toggle-btn ${modalTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setModalTab('settings')}
                  style={{ flex: 1, textAlign: 'center' }}
                >
                  Settings (Template)
                </button>
              </div>
            )}

            {(formData.id || modalTab === 'info') ? (
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="um-form-label">Building / Block (Optional)</Form.Label>
                  <select
                    className="um-form-input select"
                    value={formData.buildingId}
                    onChange={(e) => setFormData({ ...formData, buildingId: e.target.value, areaId: '' })}
                  >
                    <option value="">No Building Selected</option>
                    {buildings.map(b => (
                      <option key={b.id} value={String(b.id)}>{b.name}</option>
                    ))}
                  </select>
                </Col>
                <Col md={6}>
                  <Form.Label className="um-form-label">Functional Area (Optional)</Form.Label>
                  <select
                    className="um-form-input select"
                    value={formData.areaId}
                    onChange={(e) => setFormData({ ...formData, areaId: e.target.value })}
                  >
                    <option value="">No Area Selected</option>
                    {filteredAreasForModal.map(a => (
                      <option key={a.id} value={String(a.id)}>{a.name}</option>
                    ))}
                  </select>
                </Col>
                <Col md={6}>
                  <Form.Label className="um-form-label">Device Name</Form.Label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Incomer-1 LT Panel"
                    className="um-form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="um-form-label">Device Category</Form.Label>
                  <select
                    className="um-form-input select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {Object.keys(categoryDetails).map(cat => (
                      <option key={cat} value={cat}>
                        {categoryDetails[cat].label}
                      </option>
                    ))}
                  </select>
                </Col>
                <Col md={6}>
                  <Form.Label className="um-form-label">Sochiot Device ID</Form.Label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 101"
                    className="um-form-input"
                    value={formData.sochiotDeviceId}
                    onChange={(e) => setFormData({ ...formData, sochiotDeviceId: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="um-form-label">Device ID (Optional)</Form.Label>
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    className="um-form-input"
                    value={formData.deviceId}
                    onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="um-form-label">Serial Number (Optional)</Form.Label>
                  <input
                    type="text"
                    placeholder="e.g. SN-98319AB-2"
                    className="um-form-input"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  />
                </Col>
                {formData.id && (
                  <Col md={6}>
                    <Form.Label className="um-form-label">Device Profile</Form.Label>
                    <select
                      required={!!formData.id}
                      className="um-form-input select"
                      value={formData.profileId}
                      onChange={(e) => setFormData({ ...formData, profileId: e.target.value })}
                    >
                      <option value="">Select Profile</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                    </select>
                  </Col>
                )}
                <Col md={formData.id ? 6 : 12}>
                  <Form.Label className="um-form-label">Energy Group (Optional)</Form.Label>
                  <select
                    className="um-form-input select"
                    value={formData.energyGroupId}
                    onChange={(e) => setFormData({ ...formData, energyGroupId: e.target.value })}
                  >
                    <option value="">No Energy Group Selected</option>
                    {energyGroups.map(eg => (
                      <option key={eg.id} value={String(eg.id)}>{eg.name}</option>
                    ))}
                  </select>
                </Col>
                <Col md={4}>
                  <Form.Label className="um-form-label">Sochiot Template ID (Optional)</Form.Label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    className="um-form-input"
                    value={formData.sochiotTemplateId}
                    onChange={(e) => setFormData({ ...formData, sochiotTemplateId: e.target.value })}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="um-form-label">Template Name (Optional)</Form.Label>
                  <input
                    type="text"
                    placeholder="e.g. Main Incomer Template"
                    className="um-form-input"
                    value={formData.templateName}
                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="um-form-label">Display Order</Form.Label>
                  <input
                    type="number"
                    placeholder="e.g. 0"
                    className="um-form-input"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="um-form-label">Installation Time</Form.Label>
                  <input
                    type="datetime-local"
                    className="um-form-input"
                    value={formData.installedAt}
                    onChange={(e) => setFormData({ ...formData, installedAt: e.target.value })}
                  />
                </Col>
                <Col md={6} className="d-flex align-items-end" style={{ paddingBottom: '0.62rem' }}>
                  <div
                    className="d-flex align-items-center gap-3"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  >
                    <div style={{
                      width: '38px', height: '20px', borderRadius: '10px',
                      background: formData.isActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `1.5px solid ${formData.isActive ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      position: 'relative', transition: 'all 0.2s',
                    }}>
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%',
                        background: formData.isActive ? '#38bdf8' : '#475569',
                        position: 'absolute', top: '1.5px',
                        left: formData.isActive ? '20px' : '2px',
                        transition: 'all 0.2s',
                        boxShadow: formData.isActive ? '0 0 6px rgba(56,189,248,0.7)' : 'none',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: formData.isActive ? '#38bdf8' : '#64748b' }}>
                      DEVICE STATUS: {formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </Col>
                <Col md={12}>
                  <Form.Label className="um-form-label">Description / Location Notes</Form.Label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Ground floor plant room, serves block A and B..."
                    className="um-form-input"
                    style={{ resize: 'none' }}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Col>
              </Row>
            ) : (
              <Row className="g-3">
                <Col md={12}>
                  <Form.Label className="um-form-label">Template Settings (JSON Array)</Form.Label>
                  <textarea
                    rows={7}
                    required
                    placeholder="[ { ...setting1 }, { ...setting2 } ]"
                    className="um-form-input font-monospace"
                    style={{ fontSize: '0.78rem', resize: 'vertical' }}
                    value={formData.template_settings}
                    onChange={(e) => setFormData({ ...formData, template_settings: e.target.value })}
                  />
                </Col>
                <Col md={12}>
                  <Form.Label className="um-form-label">Default Values (JSON Object)</Form.Label>
                  <textarea
                    rows={6}
                    required
                    placeholder="{ plannedDownTime: 0, ... }"
                    className="um-form-input font-monospace"
                    style={{ fontSize: '0.78rem', resize: 'vertical' }}
                    value={formData.default_values}
                    onChange={(e) => setFormData({ ...formData, default_values: e.target.value })}
                  />
                </Col>
              </Row>
            )}
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0" style={{ padding: '0.75rem 1.5rem 1.25rem', flexDirection: 'column', alignItems: 'stretch', gap: '0.65rem' }}>
            {saveError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px', color: '#f87171', fontSize: '0.82rem', fontWeight: 600
              }}>
                <X size={15} style={{ flexShrink: 0 }} /> {saveError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="um-btn-secondary" onClick={() => { setShowModal(false); setSaveError(null); }}>
                Cancel
              </button>
              <button type="submit" className="um-btn-primary" disabled={saving} style={{ minWidth: '160px', justifyContent: 'center' }}>
                {saving ? (
                  <>
                    <span style={{
                      display: 'inline-block', width: '14px', height: '14px',
                      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                      borderRadius: '50%', animation: 'umSpin 0.7s linear infinite', marginRight: '8px'
                    }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={15} className="me-2" />
                    {formData.id ? 'Save Changes' : 'Register Device'}
                  </>
                )}
              </button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Energy Group Modal */}
      <Modal show={energyGroupModal} onHide={() => setEnergyGroupModal(false)} className="um-modal" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.01em' }}>
            {energyGroupFormData.id ? 'Edit Energy Group' : 'Add Energy Group'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitEnergyGroup}>
          <Modal.Body style={{ padding: '1.5rem' }}>
            <div className="d-flex flex-column gap-3">
              <div>
                <Form.Label className="um-form-label">Group Name</Form.Label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HVAC Core Load"
                  className="um-form-input"
                  value={energyGroupFormData.name}
                  onChange={(e) => setEnergyGroupFormData({ ...energyGroupFormData, name: e.target.value })}
                />
              </div>
              <div>
                <Form.Label className="um-form-label">Display Order</Form.Label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  className="um-form-input"
                  value={energyGroupFormData.displayOrder}
                  onChange={(e) => setEnergyGroupFormData({ ...energyGroupFormData, displayOrder: e.target.value })}
                />
              </div>
              <div>
                <Form.Label className="um-form-label">Description</Form.Label>
                <textarea
                  rows={3}
                  placeholder="Energy metering sub group description..."
                  className="um-form-input"
                  style={{ resize: 'none' }}
                  value={energyGroupFormData.description}
                  onChange={(e) => setEnergyGroupFormData({ ...energyGroupFormData, description: e.target.value })}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0" style={{ padding: '0.75rem 1.5rem 1.25rem', flexDirection: 'column', alignItems: 'stretch', gap: '0.65rem' }}>
            {energyGroupSaveError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px', color: '#f87171', fontSize: '0.82rem', fontWeight: 600
              }}>
                <X size={15} style={{ flexShrink: 0 }} /> {energyGroupSaveError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="um-btn-secondary" onClick={() => setEnergyGroupModal(false)}>
                Cancel
              </button>
              <button type="submit" className="um-btn-primary" disabled={energyGroupSaving} style={{ minWidth: '120px', justifyContent: 'center' }}>
                {energyGroupSaving ? 'Saving...' : 'Save Group'}
              </button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Device Profile Modal */}
      <Modal show={profileModal} onHide={() => setProfileModal(false)} className="um-modal" size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.01em' }}>
            {profileFormData.id ? 'Edit Device Profile' : 'Add Device Profile'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitProfile}>
          <Modal.Body style={{ padding: '1.5rem' }}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="um-form-label">Profile Name</Form.Label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Smart Meter"
                  className="um-form-input"
                  value={profileFormData.name}
                  onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                />
              </Col>
              <Col md={3}>
                <Form.Label className="um-form-label">Category</Form.Label>
                <select
                  className="um-form-input select"
                  value={profileFormData.category}
                  onChange={(e) => setProfileFormData({ ...profileFormData, category: e.target.value })}
                >
                  {Object.keys(categoryDetails).map(cat => (
                    <option key={cat} value={cat}>
                      {categoryDetails[cat].label}
                    </option>
                  ))}
                </select>
              </Col>
              <Col md={3}>
                <Form.Label className="um-form-label">Functional System</Form.Label>
                <select
                  className="um-form-input select"
                  value={profileFormData.functionalSystem}
                  onChange={(e) => setProfileFormData({ ...profileFormData, functionalSystem: e.target.value })}
                >
                  <option value="GENERIC">Generic</option>
                  <option value="WATER_SUPPLY">Water Supply</option>
                  <option value="SEWAGE">Sewage</option>
                  <option value="WATER_TREATMENT">Water Treatment</option>
                  <option value="DG_POWER">DG Power</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="FIRE_SAFETY">Fire Safety</option>
                  <option value="HVAC">HVAC</option>
                  <option value="LIGHTING_CONTROL">Lighting Control</option>
                  <option value="LIFT_ELEVATOR">Lift / Elevator</option>
                  <option value="AIR_QUALITY">Air Quality</option>
                </select>
              </Col>
              <Col md={12}>
                <Form.Label className="um-form-label">Description</Form.Label>
                <input
                  type="text"
                  placeholder="E.g. Profile mapping for energy monitoring controllers"
                  className="um-form-input"
                  value={profileFormData.description}
                  onChange={(e) => setProfileFormData({ ...profileFormData, description: e.target.value })}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="um-form-label">Field Mappings (JSON)</Form.Label>
                <textarea
                  rows={8}
                  className="um-form-input font-monospace"
                  style={{ fontSize: '0.78rem', resize: 'vertical' }}
                  value={profileFormData.fieldMappings}
                  onChange={(e) => setProfileFormData({ ...profileFormData, fieldMappings: e.target.value })}
                />
              </Col>
              <Col md={6}>
                <Form.Label className="um-form-label">Default Thresholds (JSON)</Form.Label>
                <textarea
                  rows={8}
                  className="um-form-input font-monospace"
                  style={{ fontSize: '0.78rem', resize: 'vertical' }}
                  value={profileFormData.defaultThresholds}
                  onChange={(e) => setProfileFormData({ ...profileFormData, defaultThresholds: e.target.value })}
                />
              </Col>
              <Col md={12}>
                <Form.Label className="um-form-label">Dashboard Configuration (JSON)</Form.Label>
                <textarea
                  rows={4}
                  className="um-form-input font-monospace"
                  style={{ fontSize: '0.78rem', resize: 'vertical' }}
                  value={profileFormData.dashboardConfig}
                  onChange={(e) => setProfileFormData({ ...profileFormData, dashboardConfig: e.target.value })}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0 pt-0" style={{ padding: '0.75rem 1.5rem 1.25rem', flexDirection: 'column', alignItems: 'stretch', gap: '0.65rem' }}>
            {profileSaveError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px', color: '#f87171', fontSize: '0.82rem', fontWeight: 600
              }}>
                <X size={15} style={{ flexShrink: 0 }} /> {profileSaveError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="um-btn-secondary" onClick={() => setProfileModal(false)}>
                Cancel
              </button>
              <button type="submit" className="um-btn-primary" disabled={profileSaving} style={{ minWidth: '120px', justifyContent: 'center' }}>
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ── styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes umSpin { to { transform: rotate(360deg); } }
        .spin-animation { animation: umSpin 1.2s linear infinite; }

        /* ── Tab Switcher ── */
        .um-tab-toggle-group {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 28px;
          padding: 4px;
          margin-left: 1rem;
        }
        .um-tab-toggle-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.45rem 1.1rem;
          border-radius: 24px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .um-tab-toggle-btn:hover {
          color: #e2e8f0;
        }
        .um-tab-toggle-btn.active {
          background: linear-gradient(135deg, #e05e00, #8C3B06);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(224, 94, 0, 0.25);
        }

        /* ── toolbar filters ── */
        .um-filter-select {
          background: rgba(20, 8, 0, 0.95);
          border: 1px solid rgba(224, 94, 0, 0.22);
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 0.85rem;
          padding: 0.5rem 2.2rem 0.5rem 1rem;
          outline: none;
          transition: all 0.25s;
          font-family: inherit;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23e05e00' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.7rem center;
          background-size: 10px 10px;
        }
        .um-filter-select:focus {
          border-color: #e05e00;
          box-shadow: 0 0 0 2px rgba(224, 94, 0, 0.2);
        }
        .um-filter-select option {
          background: #1a0800;
          color: #e2e8f0;
        }
        .um-filter-select:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ── Custom FilterSelect dropdown ── */
        .um-fsel-wrap { position: relative; display: inline-block; }
        .um-fsel-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(20, 8, 0, 0.95);
          border: 1px solid rgba(224, 94, 0, 0.25);
          border-radius: 10px; color: #e2e8f0;
          font-size: 0.85rem; font-family: inherit;
          padding: 0.5rem 0.85rem; cursor: pointer;
          transition: all 0.2s; white-space: nowrap; min-width: 120px;
        }
        .um-fsel-btn:hover, .um-fsel-btn.active {
          border-color: #e05e00;
          background: rgba(30, 10, 0, 0.98);
        }
        .um-fsel-btn.disabled { opacity: 0.4; cursor: not-allowed; }
        .um-fsel-label { flex: 1; text-align: left; }
        .um-fsel-arrow { color: #e05e00; transition: transform 0.2s; flex-shrink: 0; }
        .um-fsel-arrow.open { transform: rotate(180deg); }
        .um-fsel-dropdown {
          position: absolute; top: calc(100% + 6px); left: 0;
          background: rgba(18, 6, 0, 0.98);
          border: 1px solid rgba(224, 94, 0, 0.3);
          border-radius: 10px; min-width: 100%;
          box-shadow: 0 8px 30px rgba(0,0,0,0.7), 0 0 20px rgba(224,94,0,0.1);
          z-index: 9999; overflow: hidden;
          animation: umDropFadeIn 0.15s ease;
          max-height: 280px; overflow-y: auto;
        }
        .um-fsel-dropdown::-webkit-scrollbar { width: 4px; }
        .um-fsel-dropdown::-webkit-scrollbar-thumb { background: rgba(224,94,0,0.3); border-radius: 4px; }
        .um-fsel-option {
          padding: 0.55rem 1rem; font-size: 0.83rem;
          color: #c8c8c8; cursor: pointer; transition: all 0.15s;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .um-fsel-option:last-child { border-bottom: none; }
        .um-fsel-option:hover { background: rgba(224,94,0,0.15); color: #fff; padding-left: 1.3rem; }
        .um-fsel-option.selected { background: rgba(224,94,0,0.2); color: #e05e00; font-weight: 700; }
        @keyframes umDropFadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

        .um-page-title  { font-size: 1.6rem; font-weight: 800; color: #f1f5f9; margin-bottom: 0.25rem; }
        .um-page-sub    { font-size: 0.82rem; color: #64748b; margin-bottom: 0; }
        
        .um-toolbar {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 0.9rem 1.2rem;
        }
        .um-search-box   { position:relative; display:flex; align-items:center; min-width:240px; }
        .um-search-icon  { position:absolute; left:12px; color:#475569; pointer-events:none; }
        .um-search-input {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; color: #e2e8f0; font-size: 0.85rem;
          padding: 0.5rem 1rem 0.5rem 2.2rem; outline: none; transition: all 0.25s; width: 100%; font-family:inherit;
        }
        .um-search-input:focus  { border-color: #e05e00; box-shadow: 0 0 10px rgba(224,94,0,0.12); }
        .um-search-input::placeholder { color: #475569; }

        .um-count-badge {
          display:inline-flex; align-items:center; font-size:0.72rem; font-weight:700; color:#94a3b8;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
          border-radius:20px; padding:0.32rem 0.8rem;
        }
        .um-save-badge {
          display:inline-flex; align-items:center; font-size:0.72rem; font-weight:700;
          color:#e05e00; background:rgba(224,94,0,0.08); border:1px solid rgba(224,94,0,0.2);
          border-radius:20px; padding:0.32rem 0.8rem;
        }

        .um-btn-primary {
          display:inline-flex; align-items:center;
          background: linear-gradient(135deg, #e05e00, #8C3B06);
          border:none; border-radius:25px; color:#fff; font-size:0.8rem; font-weight:800;
          padding:0.58rem 1.3rem; cursor:pointer; transition:all 0.25s; letter-spacing:0.01em;
        }
        .um-btn-primary:hover { filter:brightness(1.12); transform:translateY(-1px); box-shadow:0 6px 20px rgba(224,94,0,0.35); }
        .um-btn-primary:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .um-btn-secondary {
          display:inline-flex; align-items:center;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
          border-radius:25px; color:#94a3b8; font-size:0.8rem; font-weight:700;
          padding:0.58rem 1.3rem; cursor:pointer; transition:all 0.25s;
        }
        .um-btn-secondary:hover { background:rgba(255,255,255,0.08); color:#e2e8f0; }

        .um-card {
          background: rgba(15,23,42,0.6) !important;
          border: 1px solid rgba(255,255,255,0.07) !important;
          border-radius: 16px !important; overflow:hidden;
          backdrop-filter: blur(12px);
        }
        .um-table { border-collapse:collapse; }
        .um-table th {
          padding:0.85rem 1.2rem; font-size:0.65rem; font-weight:800; letter-spacing:0.09em;
          text-transform:uppercase; color:#475569;
          background:rgba(255,255,255,0.015);
          border-bottom:1px solid rgba(255,255,255,0.06); white-space:nowrap;
        }
        .um-tr { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.2s; }
        .um-tr:last-child { border-bottom:none; }
        .um-tr:hover { background:rgba(224,94,0,0.04); }
        .um-table td { padding:0.85rem 1.2rem; vertical-align:middle; }

        .um-avatar {
          width:36px; height:36px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:0.8rem; font-weight:800; flex-shrink:0;
        }
        .um-user-name { font-size:0.87rem; font-weight:700; color:#e2e8f0; }
        .um-email     { font-size:0.8rem;  color:#64748b; }
        .um-role-badge {
          display:inline-block; font-size:0.66rem; font-weight:800;
          letter-spacing:0.07em; text-transform:uppercase;
          padding:0.22rem 0.7rem; border-radius:20px;
        }

        .um-action-btn {
          background:transparent; border:1px solid rgba(255,255,255,0.07); border-radius:8px;
          padding:0.38rem 0.48rem; cursor:pointer; display:inline-flex; align-items:center; transition:all 0.2s;
        }
        .um-action-btn.settings { color:#e05e00; }
        .um-action-btn.settings:hover { background:rgba(224,94,0,0.12); border-color:rgba(224,94,0,0.3); transform:translateY(-1px); }
        .um-action-btn.delete   { color:#f87171; }
        .um-action-btn.delete:hover   { background:rgba(248,113,113,0.12); border-color:rgba(248,113,113,0.3); transform:translateY(-1px); }

        .um-empty-state {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:4rem 2rem; text-align:center;
        }
        .um-empty-icon {
          width:56px; height:56px; border-radius:14px;
          background:rgba(224,94,0,0.08); border:1px solid rgba(224,94,0,0.15);
          display:flex; align-items:center; justify-content:center; color:#e05e00;
        }
        .um-spinner {
          width:32px; height:32px; border:3px solid rgba(255,255,255,0.06);
          border-top-color:#e05e00; border-radius:50%; animation:umSpin 0.7s linear infinite;
        }

        .um-modal .modal-content {
          background: #120600;
          border: 1px solid rgba(224,94,0,0.12);
          border-radius: 18px; color: #e2e8f0;
        }
        .um-modal .modal-header { padding: 1.25rem 1.5rem 0.75rem; }
        .um-modal .btn-close    { filter: invert(1) opacity(0.45); }

        .um-form-label {
          display:block; font-size:0.72rem; font-weight:700; color:#64748b;
          margin-bottom:0.4rem; letter-spacing:0.03em; text-transform:uppercase;
        }
        .um-form-input {
          width:100%; background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.1); border-radius:10px;
          color:#e2e8f0; font-size:0.88rem; padding:0.62rem 1rem;
          outline:none; transition:all 0.25s; font-family:inherit;
        }
        .um-form-input:focus     { border-color:#e05e00; box-shadow:0 0 0 3px rgba(224,94,0,0.12); }
        .um-form-input::placeholder { color:#475569; }
        .um-form-input option    { background:#0f172a; color:#e2e8f0; }
        .um-form-input.select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23475569' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 10px 10px;
          padding-right: 2.2rem;
        }
      `}} />
    </div>
  );
};

export default DeviceManagement;
