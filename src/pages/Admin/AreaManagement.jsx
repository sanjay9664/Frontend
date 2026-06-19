import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Modal, Form } from 'react-bootstrap';
import {
  Plus, Trash2, Save, Search, Settings, X, CheckCircle,
  ShieldAlert, Sliders, MapPin, Building2, HelpCircle
} from 'lucide-react';
import { loginToSochiot } from '../../services/authService';

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

const AreaManagement = () => {
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

  /* ── relations state ── */
  const [buildings, setBuildings] = useState([]);
  const [sites, setSites] = useState([]);

  /* ── auth fetch helper ── */
  const fetchWithAuth = async (url, options = {}) => {
    let token = localStorage.getItem('sochiot_token');
    if (!token) {
      try {
        await loginToSochiot('sa@ismartaccess.com', 'I0t3ch');
        token = localStorage.getItem('sochiot_token');
      } catch (e) {
        console.error('Login failed:', e);
      }
    }
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let r = await fetch(url, { ...options, headers });
    if (r.status === 401) {
      try {
        await loginToSochiot('sa@ismartaccess.com', 'I0t3ch');
        token = localStorage.getItem('sochiot_token');
      } catch (e) {
        console.error('Refresh failed:', e);
      }
      r = await fetch(url, { ...options, headers: { ...headers, Authorization: `Bearer ${token}` } });
    }
    return r;
  };

  /* ── data fetchers ── */
  const fetchSites = async () => {
    try {
      const res = await fetchWithAuth('http://localhost:3001/api/v1/sites/');
      if (res.ok) {
        const j = await res.json();
        const siteList = j.data || [];
        setSites(siteList);
        if (siteList.length > 0) {
          const siteId = siteList[0].id;
          fetchBuildings(siteId);
          fetchAreas(siteId);
        }
      }
    } catch (e) {
      console.error('Sites fetch failed:', e);
    }
  };

  const fetchBuildings = async (siteId) => {
    try {
      const res = await fetchWithAuth(`http://localhost:3001/api/v1/sites/${siteId}/buildings`);
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
      const res = await fetchWithAuth(`http://localhost:3001/api/v1/sites/${siteId}/areas`);
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

    const siteId = sites.length > 0 ? sites[0].id : 1;
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
        ? `http://localhost:3001/api/v1/sites/${siteId}/areas/${formData.id}`
        : `http://localhost:3001/api/v1/sites/${siteId}/areas`;

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
    const siteId = sites.length > 0 ? sites[0].id : 1;
    try {
      const res = await fetchWithAuth(`http://localhost:3001/api/v1/sites/${siteId}/areas/${areaId}`, {
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
    const siteId = sites.length > 0 ? sites[0].id : 1;
    try {
      const res = await fetchWithAuth(`http://localhost:3001/api/v1/sites/${siteId}/areas/${areaId}`, {
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
      <div className="um-page-header mb-4">
        <h2 className="um-page-title">Area Management</h2>
        <p className="um-page-sub">Configure buildings scopes, floors, functional modules, and areas partition.</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="um-toolbar mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap justify-content-between">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="um-search-box">
              <Search size={15} className="um-search-icon" />
              <input
                type="text"
                placeholder="Search area name..."
                className="um-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

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
          </div>

          <div className="d-flex align-items-center gap-2">
            {saveMsg && (
              <span className="um-save-badge">
                <CheckCircle size={12} className="me-1" />
                {saveMsg}
              </span>
            )}
            <span className="um-count-badge">
              {filteredAreas.length} Areas
            </span>
            <button className="um-btn-primary" onClick={openCreateModal}>
              <Plus size={15} className="me-2" />
              Add Area
            </button>
          </div>
        </div>
      </div>

      {/* ── Areas Table ── */}
      <Card className="um-card">
        {loading ? (
          <div className="um-empty-state">
            <div className="um-spinner mb-3" />
            <span className="text-secondary">Loading areas data...</span>
          </div>
        ) : apiError ? (
          <div className="um-empty-state">
            <div className="um-empty-icon mb-3" style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
              <ShieldAlert size={24} />
            </div>
            <h5 className="text-danger fw-bold mb-2">Connection Error</h5>
            <p className="text-secondary max-w-md">{apiError}</p>
          </div>
        ) : filteredAreas.length === 0 ? (
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

      {/* ── styles ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes umSpin { to { transform: rotate(360deg); } }

        /* ── toolbar filters ── */
        .um-filter-select {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 0.85rem;
          padding: 0.5rem 1rem;
          outline: none;
          transition: all 0.25s;
          font-family: inherit;
          cursor: pointer;
        }
        .um-filter-select:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.12);
        }
        .um-filter-select option {
          background: #0f172a;
          color: #e2e8f0;
        }

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
        .um-search-input:focus  { border-color: #38bdf8; box-shadow: 0 0 10px rgba(56,189,248,0.12); }
        .um-search-input::placeholder { color: #475569; }

        .um-count-badge {
          display:inline-flex; align-items:center; font-size:0.72rem; font-weight:700; color:#94a3b8;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
          border-radius:20px; padding:0.32rem 0.8rem;
        }
        .um-save-badge {
          display:inline-flex; align-items:center; font-size:0.72rem; font-weight:700;
          color:#4ade80; background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.2);
          border-radius:20px; padding:0.32rem 0.8rem;
        }

        .um-btn-primary {
          display:inline-flex; align-items:center;
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          border:none; border-radius:25px; color:#fff; font-size:0.8rem; font-weight:800;
          padding:0.58rem 1.3rem; cursor:pointer; transition:all 0.25s; letter-spacing:0.01em;
        }
        .um-btn-primary:hover { filter:brightness(1.12); transform:translateY(-1px); box-shadow:0 6px 20px rgba(14,165,233,0.35); }
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
        .um-tr:hover { background:rgba(56,189,248,0.03); }
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
        .um-action-btn.settings { color:#38bdf8; }
        .um-action-btn.settings:hover { background:rgba(56,189,248,0.12); border-color:rgba(56,189,248,0.3); transform:translateY(-1px); }
        .um-action-btn.delete   { color:#f87171; }
        .um-action-btn.delete:hover   { background:rgba(248,113,113,0.12); border-color:rgba(248,113,113,0.3); transform:translateY(-1px); }

        .um-empty-state {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:4rem 2rem; text-align:center;
        }
        .um-empty-icon {
          width:56px; height:56px; border-radius:14px;
          background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.15);
          display:flex; align-items:center; justify-content:center; color:#38bdf8;
        }
        .um-spinner {
          width:32px; height:32px; border:3px solid rgba(255,255,255,0.06);
          border-top-color:#38bdf8; border-radius:50%; animation:umSpin 0.7s linear infinite;
        }

        .um-modal .modal-content {
          background: #070d1e;
          border: 1px solid rgba(255,255,255,0.1);
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
        .um-form-input:focus     { border-color:#38bdf8; box-shadow:0 0 0 3px rgba(56,189,248,0.12); }
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
