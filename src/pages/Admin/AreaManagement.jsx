import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Row, Col, Card, Modal, Form } from 'react-bootstrap';
import {
  Plus, Trash2, Save, Search, Settings, X, CheckCircle,
  ShieldAlert, Sliders, MapPin, Building2, HelpCircle, ChevronDown
} from 'lucide-react';


/* ─────────────────────── functional system map / details ─────────────────────── */
const systemDetails = {
  GENERIC: { label: 'Generic System', color: '#94a3b8' },
  WATER_SUPPLY: { label: 'Water Supply', color: '#38bdf8' },
  SEWAGE: { label: 'Sewage', color: '#fb923c' },
  WATER_TREATMENT: { label: 'Water Treatment', color: '#0ea5e9' },
  DG_POWER: { label: 'DG Power', color: '#facc15' },
  ELECTRICAL: { label: 'Electrical', color: '#fb7185' },
  FIRE_SAFETY: { label: 'Fire Safety', color: '#f87171' },
  HVAC: { label: 'HVAC', color: '#2dd4bf' },
  LIGHTING_CONTROL: { label: 'Lighting Control', color: '#eab308' },
  LIFT_ELEVATOR: { label: 'Lift / Elevator', color: '#64748b' },
  AIR_QUALITY: { label: 'Air Quality', color: '#34d399' }
};

const getSystemBadge = (sys = 'GENERIC') => {
  return systemDetails[sys] || systemDetails.GENERIC;
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

const AreaManagement = () => {
  /* ── tab state ── */
  const [activeTab, setActiveTab] = useState('areas'); // 'areas' or 'buildings'

  /* ── list state ── */
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterScope, setFilterScope] = useState('');
  const [filterSystem, setFilterSystem] = useState('');
  const [saveMsg, setSaveMsg] = useState(null);

  /* ── modal / form state ── */
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    scope: 'BUILDING',
    buildingId: '',
    functionalSystem: 'GENERIC',
    floorNumber: '',
    displayOrder: 0,
    description: '',
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  /* ── building form/modal state ── */
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [buildingFormData, setBuildingFormData] = useState({
    id: '',
    name: '',
    code: '',
    totalFloors: '',
    displayOrder: 0,
    description: '',
    isActive: true
  });
  const [savingBuilding, setSavingBuilding] = useState(false);
  const [saveBuildingError, setSaveBuildingError] = useState(null);

  /* ── relations state ── */
  const [buildings, setBuildings] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');

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
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/areas`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setAreas(json.data || []);
      } else {
        setAreas(Array.isArray(json.data) ? json.data : []);
      }
    } catch (e) {
      console.error(e);
      setApiError('Could not load functional areas. Make sure the backend is running.');
      setAreas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      fetchBuildings(selectedSiteId);
      fetchAreas(selectedSiteId);
    }
  }, [selectedSiteId]);

  /* ── open modals ── */
  const openCreateModal = () => {
    const defaultBuildingId = buildings.length > 0 ? String(buildings[0].id) : '';
    setFormData({
      id: '',
      name: '',
      scope: 'BUILDING',
      buildingId: defaultBuildingId,
      functionalSystem: 'GENERIC',
      floorNumber: '',
      displayOrder: 0,
      description: '',
      isActive: true
    });
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (area) => {
    setFormData({
      id: area.id,
      name: area.name || '',
      scope: area.scope || 'BUILDING',
      buildingId: area.buildingId ? String(area.buildingId) : '',
      functionalSystem: area.functionalSystem || 'GENERIC',
      floorNumber: area.floorNumber !== null ? String(area.floorNumber) : '',
      displayOrder: area.displayOrder || 0,
      description: area.description || '',
      isActive: area.isActive !== false
    });
    setSaveError(null);
    setShowModal(true);
  };

  /* ── submit area ── */
  const handleSubmitArea = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    const isEdit = !!formData.id;

    // Build payload matching Area DTO refinements
    const payload = {
      name: formData.name.trim(),
      scope: formData.scope,
      functionalSystem: formData.functionalSystem,
      floorNumber: formData.floorNumber !== '' ? parseInt(formData.floorNumber, 10) : null,
      buildingId: formData.scope === 'BUILDING' && formData.buildingId ? parseInt(formData.buildingId, 10) : null,
      displayOrder: formData.displayOrder ? parseInt(formData.displayOrder, 10) : 0,
      description: formData.description ? formData.description.trim() : null,
      isActive: formData.isActive
    };

    // Client-side validations to match refine logic in createAreaSchema
    if (payload.scope === 'BUILDING' && !payload.buildingId) {
      setSaveError('Building Selection is required for BUILDING scope.');
      setSaving(false);
      return;
    }

    try {
      const url = isEdit
        ? `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/areas/${formData.id}`
        : `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/areas`;

      const res = await fetchWithAuth(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setShowModal(false);
        setSaveMsg(isEdit ? `✓ "${formData.name}" updated!` : `✓ "${formData.name}" added!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchAreas(siteId);
      } else {
        setSaveError(json.message || json.error || `Error ${res.status}`);
      }
    } catch (e) {
      console.error(e);
      setSaveError('Network error. Failed to save functional area.');
    } finally {
      setSaving(false);
    }
  };

  /* ── delete area ── */
  const handleDeleteArea = async (areaId, name) => {
    if (!window.confirm(`Are you sure you want to delete area "${name}"?`)) return;
    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/areas/${areaId}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ Area "${name}" deleted successfully!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchAreas(siteId);
      } else {
        alert(`Failed to delete area: ${json.message || json.error || `Error ${res.status}`}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to delete area.');
    }
  };

  /* ── toggle active status ── */
  const handleToggleStatus = async (areaId, name, currentStatus) => {
    const newStatus = !currentStatus;
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, isActive: newStatus } : a));
    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/areas/${areaId}`, {
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
        setAreas(prev => prev.map(a => a.id === areaId ? { ...a, isActive: currentStatus } : a));
      }
    } catch (e) {
      console.error(e);
      setAreas(prev => prev.map(a => a.id === areaId ? { ...a, isActive: currentStatus } : a));
    }
  };

  /* ── open building modals ── */
  const openCreateBuildingModal = () => {
    setBuildingFormData({
      id: '',
      name: '',
      code: '',
      totalFloors: '',
      displayOrder: 0,
      description: '',
      isActive: true
    });
    setSaveBuildingError(null);
    setShowBuildingModal(true);
  };

  const openEditBuildingModal = (b) => {
    setBuildingFormData({
      id: b.id,
      name: b.name || '',
      code: b.code || '',
      totalFloors: b.totalFloors !== null ? String(b.totalFloors) : '',
      displayOrder: b.displayOrder || 0,
      description: b.description || '',
      isActive: b.isActive !== false
    });
    setSaveBuildingError(null);
    setShowBuildingModal(true);
  };

  /* ── submit building ── */
  const handleSubmitBuilding = async (e) => {
    e.preventDefault();
    setSavingBuilding(true);
    setSaveBuildingError(null);

    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    const isEdit = !!buildingFormData.id;

    const payload = {
      name: buildingFormData.name.trim(),
      code: buildingFormData.code.trim() || null,
      totalFloors: buildingFormData.totalFloors !== '' ? parseInt(buildingFormData.totalFloors, 10) : null,
      displayOrder: buildingFormData.displayOrder ? parseInt(buildingFormData.displayOrder, 10) : 0,
      description: buildingFormData.description ? buildingFormData.description.trim() : null,
      isActive: buildingFormData.isActive
    };

    try {
      const url = isEdit
        ? `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/buildings/${buildingFormData.id}`
        : `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/buildings`;

      const res = await fetchWithAuth(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setShowBuildingModal(false);
        setSaveMsg(isEdit ? `✓ "${buildingFormData.name}" updated!` : `✓ "${buildingFormData.name}" added!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchBuildings(siteId);
      } else {
        setSaveBuildingError(json.message || json.error || `Error ${res.status}`);
      }
    } catch (e) {
      console.error(e);
      setSaveBuildingError('Network error. Failed to save building.');
    } finally {
      setSavingBuilding(false);
    }
  };

  /* ── delete building ── */
  const handleDeleteBuilding = async (buildingId, name) => {
    if (!window.confirm(`Are you sure you want to delete building "${name}"? This will affect all associated areas and devices.`)) return;
    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/buildings/${buildingId}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ Building "${name}" deleted successfully!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchBuildings(siteId);
      } else {
        alert(`Failed to delete building: ${json.message || json.error || `Error ${res.status}`}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to delete building.');
    }
  };

  /* ── toggle active status for building ── */
  const handleToggleBuildingStatus = async (buildingId, name, currentStatus) => {
    const newStatus = !currentStatus;
    setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, isActive: newStatus } : b));
    const siteId = selectedSiteId || (sites.length > 0 ? String(sites[0].id) : '1');
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/buildings/${buildingId}`, {
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
        setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, isActive: currentStatus } : b));
      }
    } catch (e) {
      console.error(e);
      setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, isActive: currentStatus } : b));
    }
  };

  /* ── filtered buildings list ── */
  const filteredBuildings = useMemo(() => {
    return buildings.filter(b => {
      const matchesSearch = b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            b.code?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [buildings, searchTerm]);

  /* ── filtered areas list ── */
  const filteredAreas = useMemo(() => {
    return areas.filter(a => {
      const matchesSearch = a.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBuilding = filterBuilding ? String(a.buildingId) === filterBuilding : true;
      const matchesScope = filterScope ? a.scope === filterScope : true;
      const matchesSystem = filterSystem ? a.functionalSystem === filterSystem : true;

      return matchesSearch && matchesBuilding && matchesScope && matchesSystem;
    });
  }, [areas, searchTerm, filterBuilding, filterScope, filterSystem]);

  return (
    <div className="um-wrap">
      {/* ── Page Header ── */}
      <div className="um-page-header mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="um-tab-toggle-group">
          <button
            type="button"
            className={`um-tab-toggle-btn ${activeTab === 'areas' ? 'active' : ''}`}
            onClick={() => setActiveTab('areas')}
          >
            Areas
          </button>
          <button
            type="button"
            className={`um-tab-toggle-btn ${activeTab === 'buildings' ? 'active' : ''}`}
            onClick={() => setActiveTab('buildings')}
          >
            Buildings
          </button>
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
                placeholder={activeTab === 'areas' ? "Search area name..." : "Search building name or code..."}
                className="um-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {activeTab === 'areas' && (
              <>
                {/* Scope filter */}
                <select
                  className="um-filter-select"
                  value={filterScope}
                  onChange={(e) => setFilterScope(e.target.value)}
                >
                  <option value="">All Scopes</option>
                  <option value="SITE">Site Level</option>
                  <option value="BUILDING">Building Level</option>
                </select>

                {/* Building filter */}
                <select
                  className="um-filter-select"
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                >
                  <option value="">All Buildings</option>
                  {buildings.map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>

                {/* System filter */}
                <select
                  className="um-filter-select"
                  value={filterSystem}
                  onChange={(e) => setFilterSystem(e.target.value)}
                >
                  <option value="">All Systems</option>
                  {Object.keys(systemDetails).map(sys => (
                    <option key={sys} value={sys}>
                      {systemDetails[sys].label}
                    </option>
                  ))}
                </select>
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
              {activeTab === 'areas' ? `${filteredAreas.length} Areas` : `${filteredBuildings.length} Buildings`}
            </span>
            <button className="um-btn-primary" onClick={activeTab === 'areas' ? openCreateModal : openCreateBuildingModal}>
              <Plus size={15} className="me-2" />
              {activeTab === 'areas' ? 'Add Area' : 'Add Building'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Table Container ── */}
      <Card className="um-card">
        {loading ? (
          <div className="um-empty-state">
            <div className="um-spinner mb-3" />
            <span className="text-secondary">{activeTab === 'areas' ? 'Loading areas data...' : 'Loading buildings data...'}</span>
          </div>
        ) : apiError ? (
          <div className="um-empty-state">
            <div className="um-empty-icon mb-3" style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
              <ShieldAlert size={24} />
            </div>
            <h5 className="text-danger fw-bold mb-2">Connection Error</h5>
            <p className="text-secondary max-w-md">{apiError}</p>
          </div>
        ) : activeTab === 'areas' ? (
          filteredAreas.length === 0 ? (
            <div className="um-empty-state">
              <div className="um-empty-icon mb-3">
                <MapPin size={24} />
              </div>
              <h5 className="text-light fw-bold mb-1">No Areas Defined</h5>
              <p className="text-secondary max-w-sm">No functional areas have been added yet or fit filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="um-table w-100">
                <thead>
                  <tr>
                    <th>Area Name</th>
                    <th>Scope</th>
                    <th>Building</th>
                    <th>System Category</th>
                    <th>Floor</th>
                    <th>Display Order</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAreas.map((a) => {
                    const isSite = a.scope === 'SITE';
                    const sysBadge = getSystemBadge(a.functionalSystem);
                    const areaBuilding = buildings.find(b => b.id === a.buildingId);

                    return (
                      <tr key={a.id} className="um-tr">
                        {/* Name */}
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="um-avatar"
                              style={{
                                background: isSite ? 'rgba(56,189,248,0.1)' : 'rgba(167,139,250,0.1)',
                                color: isSite ? '#38bdf8' : '#a78bfa',
                                border: `1.5px solid ${isSite ? '#38bdf8' : '#a78bfa'}25`
                              }}
                            >
                              {isSite ? <MapPin size={16} /> : <Building2 size={16} />}
                            </div>
                            <div>
                              <div className="um-user-name">{a.name}</div>
                              {a.description && <div className="um-email">{a.description}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Scope */}
                        <td>
                          <span
                            className="um-role-badge"
                            style={{
                              background: isSite ? 'rgba(56,189,248,0.06)' : 'rgba(167,139,250,0.06)',
                              color: isSite ? '#38bdf8' : '#a78bfa',
                              border: `1px solid ${isSite ? '#38bdf8' : '#a78bfa'}25`
                            }}
                          >
                            {a.scope}
                          </span>
                        </td>

                        {/* Building */}
                        <td className="text-light-50 fw-semibold" style={{ fontSize: '0.82rem' }}>
                          {areaBuilding?.name || <span className="text-secondary font-monospace">GLOBAL SITE</span>}
                        </td>

                        {/* Functional System */}
                        <td>
                          <span
                            className="um-role-badge"
                            style={{
                              background: `${sysBadge.color}15`,
                              color: sysBadge.color,
                              border: `1px solid ${sysBadge.color}35`
                            }}
                          >
                            {sysBadge.label}
                          </span>
                        </td>

                        {/* Floor */}
                        <td className="text-light" style={{ fontSize: '0.82rem' }}>
                          {a.floorNumber !== null ? `Floor ${a.floorNumber}` : '—'}
                        </td>

                        {/* Display Order */}
                        <td className="text-light font-monospace" style={{ fontSize: '0.82rem' }}>
                          {a.displayOrder}
                        </td>

                        {/* Status */}
                        <td>
                          <div
                            className="d-flex align-items-center gap-2"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleToggleStatus(a.id, a.name, a.isActive)}
                          >
                            <div style={{
                              width: '38px', height: '20px', borderRadius: '10px',
                              background: a.isActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                              border: `1.5px solid ${a.isActive ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)'}`,
                              position: 'relative', transition: 'all 0.2s',
                            }}>
                              <div style={{
                                width: '14px', height: '14px', borderRadius: '50%',
                                background: a.isActive ? '#38bdf8' : '#475569',
                                position: 'absolute', top: '1.5px',
                                left: a.isActive ? '20px' : '2px',
                                transition: 'all 0.2s',
                                boxShadow: a.isActive ? '0 0 6px rgba(56,189,248,0.7)' : 'none',
                              }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: a.isActive ? '#38bdf8' : '#64748b' }}>
                              {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <button
                              type="button"
                              className="um-action-btn settings"
                              title="Edit Area Details"
                              onClick={() => openEditModal(a)}
                            >
                              <Sliders size={14} />
                            </button>
                            <button
                              type="button"
                              className="um-action-btn delete"
                              title="Delete Area"
                              onClick={() => handleDeleteArea(a.id, a.name)}
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
          )
        ) : (
          filteredBuildings.length === 0 ? (
            <div className="um-empty-state">
              <div className="um-empty-icon mb-3">
                <Building2 size={24} />
              </div>
              <h5 className="text-light fw-bold mb-1">No Buildings Defined</h5>
              <p className="text-secondary max-w-sm">No buildings have been registered yet or fit filters.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="um-table w-100">
                <thead>
                  <tr>
                    <th>Building Name</th>
                    <th>Code</th>
                    <th>Total Floors</th>
                    <th>Display Order</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuildings.map((b) => {
                    return (
                      <tr key={b.id} className="um-tr">
                        {/* Name */}
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="um-avatar"
                              style={{
                                background: 'rgba(167,139,250,0.1)',
                                color: '#a78bfa',
                                border: '1.5px solid rgba(167,139,250,0.25)'
                              }}
                            >
                              <Building2 size={16} />
                            </div>
                            <div>
                              <div className="um-user-name">{b.name}</div>
                              {b.description && <div className="um-email">{b.description}</div>}
                            </div>
                          </div>
                        </td>

                        {/* Code */}
                        <td>
                          <span
                            className="um-role-badge"
                            style={{
                              background: 'rgba(56,189,248,0.06)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56,189,248,0.25)'
                            }}
                          >
                            {b.code || '—'}
                          </span>
                        </td>

                        {/* Total Floors */}
                        <td className="text-light" style={{ fontSize: '0.82rem' }}>
                          {b.totalFloors !== null ? `${b.totalFloors} Floors` : '—'}
                        </td>

                        {/* Display Order */}
                        <td className="text-light font-monospace" style={{ fontSize: '0.82rem' }}>
                          {b.displayOrder}
                        </td>

                        {/* Status */}
                        <td>
                          <div
                            className="d-flex align-items-center gap-2"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleToggleBuildingStatus(b.id, b.name, b.isActive)}
                          >
                            <div style={{
                              width: '38px', height: '20px', borderRadius: '10px',
                              background: b.isActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                              border: `1.5px solid ${b.isActive ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)'}`,
                              position: 'relative', transition: 'all 0.2s',
                            }}>
                              <div style={{
                                width: '14px', height: '14px', borderRadius: '50%',
                                background: b.isActive ? '#38bdf8' : '#475569',
                                position: 'absolute', top: '1.5px',
                                left: b.isActive ? '20px' : '2px',
                                transition: 'all 0.2s',
                                boxShadow: b.isActive ? '0 0 6px rgba(56,189,248,0.7)' : 'none',
                              }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: b.isActive ? '#38bdf8' : '#64748b' }}>
                              {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <button
                              type="button"
                              className="um-action-btn settings"
                              title="Edit Building Details"
                              onClick={() => openEditBuildingModal(b)}
                            >
                              <Sliders size={14} />
                            </button>
                            <button
                              type="button"
                              className="um-action-btn delete"
                              title="Delete Building"
                              onClick={() => handleDeleteBuilding(b.id, b.name)}
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
          )
        )}
      </Card>

      {/* ── Add / Edit Area Modal ── */}
      <Modal show={showModal} onHide={() => setShowModal(false)} className="um-modal" size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.01em' }}>
            {formData.id ? 'Area Configuration Details' : 'Register New Functional Area'}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmitArea}>
          <Modal.Body style={{ padding: '1.5rem 1.5rem 1rem' }}>
            <Row className="g-3">
              {/* Scope Selection */}
              <Col md={6}>
                <Form.Label className="um-form-label">Area Scope</Form.Label>
                <select
                  className="um-form-input select"
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value, buildingId: '' })}
                >
                  <option value="BUILDING">BUILDING (Belongs to specific building)</option>
                  <option value="SITE">SITE (Global site level)</option>
                </select>
              </Col>

              {/* Building Select */}
              <Col md={6}>
                <Form.Label className="um-form-label">
                  Building / Block {formData.scope === 'BUILDING' ? <span className="text-danger">*</span> : '(Disabled)'}
                </Form.Label>
                <select
                  required={formData.scope === 'BUILDING'}
                  disabled={formData.scope === 'SITE'}
                  className="um-form-input select"
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                >
                  <option value="">Select Building...</option>
                  {buildings.map(b => (
                    <option key={b.id} value={String(b.id)}>{b.name}</option>
                  ))}
                </select>
              </Col>

              {/* Area Name */}
              <Col md={6}>
                <Form.Label className="um-form-label">Area Name</Form.Label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ground Floor HVAC Plant"
                  className="um-form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Col>

              {/* Functional System Category */}
              <Col md={6}>
                <Form.Label className="um-form-label">Functional System</Form.Label>
                <select
                  className="um-form-input select"
                  value={formData.functionalSystem}
                  onChange={(e) => setFormData({ ...formData, functionalSystem: e.target.value })}
                >
                  {Object.keys(systemDetails).map(sys => (
                    <option key={sys} value={sys}>
                      {systemDetails[sys].label}
                    </option>
                  ))}
                </select>
              </Col>

              {/* Floor Number */}
              <Col md={4}>
                <Form.Label className="um-form-label">Floor Number (Optional)</Form.Label>
                <input
                  type="number"
                  placeholder="e.g. 0 for ground, -1 for basement"
                  className="um-form-input"
                  value={formData.floorNumber}
                  onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })}
                />
              </Col>

              {/* Display Order */}
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

              {/* Active Toggle */}
              <Col md={4} className="d-flex align-items-end" style={{ paddingBottom: '0.62rem' }}>
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
                    STATUS: {formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </Col>

              {/* Description */}
              <Col md={12}>
                <Form.Label className="um-form-label">Description / Notes</Form.Label>
                <textarea
                  rows={2}
                  placeholder="e.g. Serves chiller unit motors and ventilation..."
                  className="um-form-input"
                  style={{ resize: 'none' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Col>
            </Row>
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
                    {formData.id ? 'Save Changes' : 'Register Area'}
                  </>
                )}
              </button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ── Add / Edit Building Modal ── */}
      <Modal show={showBuildingModal} onHide={() => setShowBuildingModal(false)} className="um-modal" size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.01em' }}>
            {buildingFormData.id ? 'Building Configuration Details' : 'Register New Building'}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmitBuilding}>
          <Modal.Body style={{ padding: '1.5rem 1.5rem 1rem' }}>
            <Row className="g-3">
              {/* Building Name */}
              <Col md={6}>
                <Form.Label className="um-form-label">Building Name <span className="text-danger">*</span></Form.Label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Block A, Lot-2 Building"
                  className="um-form-input"
                  value={buildingFormData.name}
                  onChange={(e) => setBuildingFormData({ ...buildingFormData, name: e.target.value })}
                />
              </Col>

              {/* Building Code */}
              <Col md={6}>
                <Form.Label className="um-form-label">Building Code (Optional)</Form.Label>
                <input
                  type="text"
                  placeholder="e.g. BLK-A"
                  className="um-form-input"
                  value={buildingFormData.code}
                  onChange={(e) => setBuildingFormData({ ...buildingFormData, code: e.target.value })}
                />
              </Col>

              {/* Total Floors */}
              <Col md={4}>
                <Form.Label className="um-form-label">Total Floors (Optional)</Form.Label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  className="um-form-input"
                  min="1"
                  value={buildingFormData.totalFloors}
                  onChange={(e) => setBuildingFormData({ ...buildingFormData, totalFloors: e.target.value })}
                />
              </Col>

              {/* Display Order */}
              <Col md={4}>
                <Form.Label className="um-form-label">Display Order</Form.Label>
                <input
                  type="number"
                  placeholder="e.g. 0"
                  className="um-form-input"
                  min="0"
                  value={buildingFormData.displayOrder}
                  onChange={(e) => setBuildingFormData({ ...buildingFormData, displayOrder: e.target.value })}
                />
              </Col>

              {/* Active Toggle */}
              <Col md={4} className="d-flex align-items-end" style={{ paddingBottom: '0.62rem' }}>
                <div
                  className="d-flex align-items-center gap-3"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setBuildingFormData({ ...buildingFormData, isActive: !buildingFormData.isActive })}
                >
                  <div style={{
                    width: '38px', height: '20px', borderRadius: '10px',
                    background: buildingFormData.isActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1.5px solid ${buildingFormData.isActive ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    position: 'relative', transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: buildingFormData.isActive ? '#38bdf8' : '#475569',
                      position: 'absolute', top: '1.5px',
                      left: buildingFormData.isActive ? '20px' : '2px',
                      transition: 'all 0.2s',
                      boxShadow: buildingFormData.isActive ? '0 0 6px rgba(56,189,248,0.7)' : 'none',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: buildingFormData.isActive ? '#38bdf8' : '#64748b' }}>
                    STATUS: {buildingFormData.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </Col>

              {/* Description */}
              <Col md={12}>
                <Form.Label className="um-form-label">Description / Notes</Form.Label>
                <textarea
                  rows={2}
                  placeholder="e.g. Primary office building..."
                  className="um-form-input"
                  style={{ resize: 'none' }}
                  value={buildingFormData.description}
                  onChange={(e) => setBuildingFormData({ ...buildingFormData, description: e.target.value })}
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer className="border-0 pt-0" style={{ padding: '0.75rem 1.5rem 1.25rem', flexDirection: 'column', alignItems: 'stretch', gap: '0.65rem' }}>
            {saveBuildingError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px', color: '#f87171', fontSize: '0.82rem', fontWeight: 600
              }}>
                <X size={15} style={{ flexShrink: 0 }} /> {saveBuildingError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="um-btn-secondary" onClick={() => { setShowBuildingModal(false); setSaveBuildingError(null); }}>
                Cancel
              </button>
              <button type="submit" className="um-btn-primary" disabled={savingBuilding} style={{ minWidth: '160px', justifyContent: 'center' }}>
                {savingBuilding ? (
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
                    {buildingFormData.id ? 'Save Changes' : 'Register Building'}
                  </>
                )}
              </button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ── styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes umSpin { to { transform: rotate(360deg); } }

        /* ── tab toggle switcher ── */
        .um-tab-toggle-group {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          padding: 4px;
        }
        .um-tab-toggle-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 1.05rem;
          font-weight: 700;
          padding: 0.55rem 1.4rem;
          border-radius: 24px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .um-tab-toggle-btn:hover {
          color: #e2e8f0;
        }
        .um-tab-toggle-btn.active {
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
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

        /* ── user management matching classes overrides/fallbacks ── */
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

export default AreaManagement;
