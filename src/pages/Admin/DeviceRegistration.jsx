import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2, Cpu, Server,
  Layers, MapPin, Building2, Zap, FileText, ChevronDown, X, Save
} from 'lucide-react';
import { getSochiotLocationData, getSochiotDeviceDetails } from '../../services/authService';

const DeviceRegistration = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saveError, setSaveError] = useState(null);

  /* ── Dropdown data ── */
  const [sites, setSites] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [areas, setAreas] = useState([]);
  const [energyGroups, setEnergyGroups] = useState([]);
  const [sochiotDevices, setSochiotDevices] = useState([]);

  /* ── Step 1 form ── */
  const [deviceInfo, setDeviceInfo] = useState({
    siteId: '',
    name: '',
    sochiotDeviceId: '',
    category: 'OTHER',
    description: '',
    buildingId: '',
    areaId: '',
    floorNo: '',
    roomNo: '',
    energyGroupId: ''
  });

  /* ── Step 2 form: template settings rows ── */
  const [templateRows, setTemplateRows] = useState([
    { sochiotDeviceId: '', moduleId: '', sochiotFieldName: '', displayName: '', warningHigh: '', dataType: 'FLOAT', isCommand: false, graphable: true, displayOrder: 1, modules: [], eventFields: [] }
  ]);

  const categoryOptions = [
    { value: 'ENERGY_METER', label: 'Energy Meter' },
    { value: 'UG_TANK', label: 'UG Tank' },
    { value: 'AG_TANK', label: 'AG Tank' },
    { value: 'PUMP', label: 'Pump' },
    { value: 'VALVE', label: 'Valve' },
    { value: 'GENERATOR', label: 'DG Generator' },
    { value: 'LT_PANEL', label: 'LT Panel' },
    { value: 'FIRE_PUMP', label: 'Fire Pump' },
    { value: 'HVAC_CHILLER', label: 'HVAC Chiller' },
    { value: 'HVAC_AHU', label: 'HVAC AHU' },
    { value: 'HVAC_COOLING_TOWER', label: 'Cooling Tower' },
    { value: 'VRV', label: 'VRV' },
    { value: 'AQI_SENSOR', label: 'AQI Sensor' },
    { value: 'BREAKER', label: 'Breaker' },
    { value: 'STP', label: 'STP' },
    { value: 'WTP', label: 'WTP' },
    { value: 'SENSOR', label: 'Sensor' },
    { value: 'CONTROLLER', label: 'Controller' },
    { value: 'OTHER', label: 'Other Device' }
  ];

  const dataTypeOptions = ['STRING', 'FLOAT', 'INTEGER', 'BOOLEAN', 'JSON'];

  /* ── Fetch helper ── */
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('sochiot_token');
    if (!token) { window.location.href = '/login'; return; }
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    const r = await fetch(url, { ...options, headers });
    if (r.status === 401) { localStorage.removeItem('sochiot_token'); window.location.href = '/login'; }
    return r;
  };

  /* ── Fetch data on mount ── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/`);
        if (res?.ok) {
          const j = await res.json();
          const siteList = j.data || [];
          setSites(siteList);
          if (siteList.length > 0) {
            setDeviceInfo(prev => ({ ...prev, siteId: String(siteList[0].id) }));
          }
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  /* ── Fetch buildings/areas/energy-groups when site changes ── */
  useEffect(() => {
    if (!deviceInfo.siteId) return;
    const sid = deviceInfo.siteId;
    const loadRelated = async () => {
      try {
        const [bRes, aRes, eRes] = await Promise.all([
          fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${sid}/buildings`),
          fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${sid}/areas`),
          fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${sid}/energy-groups`)
        ]);
        if (bRes?.ok) { const j = await bRes.json(); setBuildings(j.data || []); }
        if (aRes?.ok) { const j = await aRes.json(); setAreas(j.data || []); }
        if (eRes?.ok) { const j = await eRes.json(); setEnergyGroups(j.data || []); }

        // Fetch Sochiot devices for this site's sochiotLocationId
        const selectedSite = sites.find(s => String(s.id) === String(sid));
        if (selectedSite && selectedSite.sochiotLocationId) {
          const data = await getSochiotLocationData(selectedSite.sochiotLocationId);
          if (data?.locationVOS?.[0]) {
            const gateways = data.locationVOS[0].gatewayVOList || [];
            const deviceList = [];
            gateways.forEach(g => {
              if (g.deviceEntityVOS) {
                g.deviceEntityVOS.forEach(d => {
                  deviceList.push({
                    label: `${d.name} (${d.id})`,
                    id: d.id,
                    uuid: d.uuid
                  });
                });
              }
            });
            setSochiotDevices(deviceList);
          }
        }
      } catch (e) { console.error(e); }
    };
    loadRelated();
  }, [deviceInfo.siteId, sites]);

  /* ── Step 1 validation ── */
  const isStep1Valid = deviceInfo.name.trim() && deviceInfo.sochiotDeviceId && deviceInfo.siteId;

  /* ── Add/Remove template rows ── */
  const addRow = () => {
    setTemplateRows(prev => [...prev, {
      sochiotDeviceId: '', moduleId: '', sochiotFieldName: '', displayName: '', warningHigh: '', dataType: 'FLOAT',
      isCommand: false, graphable: true, displayOrder: prev.length + 1, modules: [], eventFields: []
    }]);
  };
  const removeRow = (idx) => setTemplateRows(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx, field, val) => {
    setTemplateRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  const handleDeviceChangeInRow = async (idx, sochiotDeviceId) => {
    // We update using functional setTemplateRows state to ensure atomic state updates
    setTemplateRows(prev => prev.map((r, i) => i === idx ? {
      ...r,
      sochiotDeviceId,
      moduleId: '',
      sochiotFieldName: '',
      modules: [],
      eventFields: []
    } : r));

    if (!sochiotDeviceId) return;

    try {
      const details = await getSochiotDeviceDetails(sochiotDeviceId);
      if (details && details.modules) {
        const modulesList = details.modules.map(m => ({
          label: m.name || `Module ${m.id}`,
          id: m.id,
          eventFields: [
            ...(m.eventFieldVOS || []).map(f => f.fieldName),
            ...(m.settingFieldVOList || []).map(f => f.fieldName)
          ]
        }));
        setTemplateRows(prev => prev.map((r, i) => i === idx ? { ...r, modules: modulesList } : r));
      }
    } catch (e) {
      console.error('Error fetching device modules:', e);
    }
  };

  const handleModuleChangeInRow = (idx, moduleId) => {
    setTemplateRows(prev => {
      const target = prev[idx];
      const selectedMod = (target?.modules || []).find(m => String(m.id) === String(moduleId));
      return prev.map((r, i) => i === idx ? {
        ...r,
        moduleId,
        sochiotFieldName: '',
        eventFields: selectedMod ? (selectedMod.eventFields || []) : []
      } : r);
    });
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSaving(true);
    setSaveError(null);
    const siteId = deviceInfo.siteId;
    const payload = {
      siteId: parseInt(siteId, 10),
      sochiotDeviceId: parseInt(deviceInfo.sochiotDeviceId, 10),
      name: deviceInfo.name.trim(),
      description: deviceInfo.description?.trim() || null,
      category: deviceInfo.category,
      areaId: deviceInfo.areaId ? parseInt(deviceInfo.areaId, 10) : null,
      buildingId: deviceInfo.buildingId ? parseInt(deviceInfo.buildingId, 10) : null,
      floorNo: deviceInfo.floorNo ? parseInt(deviceInfo.floorNo, 10) : null,
      roomNo: deviceInfo.roomNo ? parseInt(deviceInfo.roomNo, 10) : null,
      energyGroupId: deviceInfo.energyGroupId ? parseInt(deviceInfo.energyGroupId, 10) : null,
      isActive: true,
      template_settings: templateRows
        .filter(r => r.sochiotFieldName.trim())
        .map((r, i) => ({
          moduleId: r.moduleId ? parseInt(r.moduleId, 10) : i + 1,
          sochiotFieldName: r.sochiotFieldName.trim(),
          displayName: r.displayName.trim() || r.sochiotFieldName.trim(),
          dataType: r.dataType || 'FLOAT',
          warningHigh: r.warningHigh ? parseFloat(r.warningHigh) : null,
          isCommand: r.isCommand,
          graphable: r.graphable,
          displayOrder: r.displayOrder || i + 1
        })),
      default_values: {}
    };

    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${siteId}/devices/from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ Device "${deviceInfo.name}" registered successfully!`);
        setTimeout(() => navigate('/admin/manage-devices'), 2000);
      } else {
        setSaveError(json.message || json.error || `Error ${res.status}`);
      }
    } catch (e) {
      console.error(e);
      setSaveError('Network error. Failed to register device.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Custom Select Component ── */
  const CustomSelect = ({ label, icon, value, onChange, options, placeholder }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', close);
      return () => document.removeEventListener('mousedown', close);
    }, []);
    const selected = options.find(o => String(o.value) === String(value));

    return (
      <div className="dr-field" ref={ref}>
        <label className="dr-label">{icon}{label}</label>
        <button type="button" className={`dr-select-btn${open ? ' active' : ''}`} onClick={() => setOpen(o => !o)}>
          <span className={selected ? 'dr-sel-value' : 'dr-sel-placeholder'}>
            {selected ? selected.label : (placeholder || 'Select...')}
          </span>
          <ChevronDown size={14} className={`dr-sel-arrow${open ? ' rotated' : ''}`} />
        </button>
        {open && (
          <div className="dr-select-dropdown">
            {options.map((opt, i) => (
              <div key={i}
                className={`dr-select-option${String(opt.value) === String(value) ? ' selected' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {opt.label}
              </div>
            ))}
            {options.length === 0 && <div className="dr-select-option disabled">No options available</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dr-wrapper">
      {/* Header */}
      <div className="dr-header">
        <div className="dr-header-left">
          <button className="dr-back-btn" onClick={() => navigate('/admin/manage-devices')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="dr-title">Register New Device</h2>
            <p className="dr-subtitle">Add a new device to your infrastructure</p>
          </div>
        </div>
        <button className="dr-close-btn" onClick={() => navigate('/admin/manage-devices')}>
          <X size={20} />
        </button>
      </div>

      {/* Step Indicator */}
      <div className="dr-stepper">
        <div className={`dr-step${step >= 1 ? ' active' : ''}${step > 1 ? ' completed' : ''}`} onClick={() => setStep(1)}>
          <div className="dr-step-circle">
            {step > 1 ? <Check size={16} /> : <span>1</span>}
          </div>
          <div className="dr-step-info">
            <span className="dr-step-label">Device Info</span>
            <span className="dr-step-desc">Basic details & location</span>
          </div>
        </div>
        <div className="dr-step-line" />
        <div className={`dr-step${step >= 2 ? ' active' : ''}`} onClick={() => isStep1Valid && setStep(2)}>
          <div className="dr-step-circle">
            <span>2</span>
          </div>
          <div className="dr-step-info">
            <span className="dr-step-label">Template Settings</span>
            <span className="dr-step-desc">Event fields & mapping</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="dr-content">
        {step === 1 && (
          <div className="dr-form-step animate-in">
            <div className="dr-section-title">
              <Cpu size={18} /> Device Information
            </div>

            <div className="dr-grid-2">
              <CustomSelect
                label="Site"
                icon={<MapPin size={14} />}
                value={deviceInfo.siteId}
                onChange={(v) => setDeviceInfo(p => ({ ...p, siteId: v }))}
                options={sites.map(s => ({ value: String(s.id), label: s.name }))}
                placeholder="Select Site"
              />
              <div className="dr-field">
                <label className="dr-label"><Server size={14} /> Device Name <span className="dr-req">*</span></label>
                <input
                  className="dr-input"
                  placeholder="e.g. Incomer-1 LT Panel"
                  value={deviceInfo.name}
                  onChange={(e) => setDeviceInfo(p => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="dr-grid-2">
              <div className="dr-field">
                <label className="dr-label"><Zap size={14} /> Sochiot Device ID <span className="dr-req">*</span></label>
                <input
                  className="dr-input"
                  placeholder="e.g. 101"
                  type="number"
                  value={deviceInfo.sochiotDeviceId}
                  onChange={(e) => setDeviceInfo(p => ({ ...p, sochiotDeviceId: e.target.value }))}
                />
              </div>
              <CustomSelect
                label="Device Category"
                icon={<Layers size={14} />}
                value={deviceInfo.category}
                onChange={(v) => setDeviceInfo(p => ({ ...p, category: v }))}
                options={categoryOptions}
                placeholder="Select Category"
              />
            </div>

            <div className="dr-grid-2">
              <CustomSelect
                label="Area (Optional)"
                icon={<MapPin size={14} />}
                value={deviceInfo.areaId}
                onChange={(v) => setDeviceInfo(p => ({ ...p, areaId: v }))}
                options={[{ value: '', label: 'No Area Selected' }, ...areas.map(a => ({ value: String(a.id), label: a.name }))]}
                placeholder="No Area Selected"
              />
              <CustomSelect
                label="Building / Block (Optional)"
                icon={<Building2 size={14} />}
                value={deviceInfo.buildingId}
                onChange={(v) => setDeviceInfo(p => ({ ...p, buildingId: v }))}
                options={[{ value: '', label: 'No Building Selected' }, ...buildings.map(b => ({ value: String(b.id), label: b.name }))]}
                placeholder="No Building Selected"
              />
            </div>

            <div className="dr-grid-2">
              <div className="dr-field">
                <label className="dr-label"><Layers size={14} /> Floor Number (Optional)</label>
                <input
                  className="dr-input"
                  placeholder="e.g. 3"
                  type="number"
                  value={deviceInfo.floorNo}
                  onChange={(e) => setDeviceInfo(p => ({ ...p, floorNo: e.target.value }))}
                />
              </div>
              <div className="dr-field">
                <label className="dr-label"><Building2 size={14} /> Room Number (Optional)</label>
                <input
                  className="dr-input"
                  placeholder="e.g. 302"
                  type="number"
                  value={deviceInfo.roomNo}
                  onChange={(e) => setDeviceInfo(p => ({ ...p, roomNo: e.target.value }))}
                />
              </div>
            </div>

            <div className="dr-grid-1">
              <CustomSelect
                label="Energy Group (Optional)"
                icon={<Zap size={14} />}
                value={deviceInfo.energyGroupId}
                onChange={(v) => setDeviceInfo(p => ({ ...p, energyGroupId: v }))}
                options={[{ value: '', label: 'No Energy Group Selected' }, ...energyGroups.map(e => ({ value: String(e.id), label: e.name }))]}
                placeholder="No Energy Group Selected"
              />
            </div>

            <div className="dr-grid-1">
              <div className="dr-field">
                <label className="dr-label"><FileText size={14} /> Description / Location Notes</label>
                <textarea
                  className="dr-textarea"
                  placeholder="e.g. Ground floor plant room, serves block A & B..."
                  rows={3}
                  value={deviceInfo.description}
                  onChange={(e) => setDeviceInfo(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="dr-form-step animate-in">
            <div className="dr-section-title">
              <Layers size={18} /> Template Settings
              <span className="dr-section-badge">{templateRows.length} field{templateRows.length > 1 ? 's' : ''}</span>
            </div>
            <p className="dr-section-hint">
              Define the event fields this device will report. Each row maps a Sochiot field to a display name.
            </p>

            <div className="dr-template-header">
              <span style={{ flex: 2 }}>Device ID</span>
              <span style={{ flex: 1.5 }}>Module ID</span>
              <span style={{ flex: 2 }}>Event Field</span>
              <span style={{ flex: 2 }}>Display Name</span>
              <span style={{ flex: 1.5 }}>Threshold Value</span>
              <span style={{ width: 44 }}></span>
            </div>

            {templateRows.map((row, idx) => (
              <div className="dr-template-row" key={idx}>
                {/* 1. Device ID Dropdown */}
                <select
                  className="dr-input dr-template-input dr-mini-select"
                  style={{ flex: 2 }}
                  value={row.sochiotDeviceId}
                  onChange={(e) => handleDeviceChangeInRow(idx, e.target.value)}
                >
                  <option value="">Select Device</option>
                  {sochiotDevices.map(d => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>

                {/* 2. Module ID Dropdown */}
                <select
                  className="dr-input dr-template-input dr-mini-select"
                  style={{ flex: 1.5 }}
                  value={row.moduleId}
                  onChange={(e) => handleModuleChangeInRow(idx, e.target.value)}
                  disabled={!row.sochiotDeviceId}
                >
                  <option value="">Select Module</option>
                  {(row.modules || []).map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>

                {/* 3. Event Field Input with Autocomplete Datalist */}
                <div style={{ flex: 2, position: 'relative', display: 'flex' }}>
                  <input
                    className="dr-input dr-template-input"
                    style={{ width: '100%' }}
                    placeholder="Type or Select Field"
                    value={row.sochiotFieldName}
                    list={`fields-${idx}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateRow(idx, 'sochiotFieldName', val);
                      if (!row.displayName) {
                        const titleCase = val
                          .replace(/_/g, ' ')
                          .replace(/([A-Z])/g, ' $1')
                          .trim()
                          .replace(/^\w/, (c) => c.toUpperCase());
                        updateRow(idx, 'displayName', titleCase);
                      }
                    }}
                  />
                  <datalist id={`fields-${idx}`}>
                    {(row.eventFields || []).map(f => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>

                {/* 4. Display Name Input */}
                <input
                  className="dr-input dr-template-input"
                  style={{ flex: 2 }}
                  placeholder="e.g. Voltage R"
                  value={row.displayName}
                  onChange={(e) => updateRow(idx, 'displayName', e.target.value)}
                />

                {/* 5. Threshold Value Input */}
                <input
                  className="dr-input dr-template-input"
                  style={{ flex: 1.5 }}
                  placeholder="e.g. 240"
                  type="number"
                  value={row.warningHigh}
                  onChange={(e) => updateRow(idx, 'warningHigh', e.target.value)}
                />

                {/* Delete Row Button */}
                <button
                  className="dr-row-delete"
                  onClick={() => removeRow(idx)}
                  disabled={templateRows.length <= 1}
                  title="Remove row"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <button className="dr-add-row-btn" onClick={addRow}>
              <Plus size={16} /> Add Field
            </button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {saveError && (
        <div className="dr-error-banner">
          <X size={14} /> {saveError}
          <button onClick={() => setSaveError(null)} className="dr-error-close"><X size={12} /></button>
        </div>
      )}
      {saveMsg && (
        <div className="dr-success-banner">
          <Check size={14} /> {saveMsg}
        </div>
      )}

      <div className="dr-footer">
        <button className="dr-btn-ghost" onClick={() => navigate('/admin/manage-devices')}>
          Cancel
        </button>
        <div className="dr-footer-right">
          {step > 1 && (
            <button className="dr-btn-outline" onClick={() => setStep(1)}>
              <ArrowLeft size={14} /> Back
            </button>
          )}
          {step === 1 && (
            <button className="dr-btn-primary" disabled={!isStep1Valid} onClick={() => setStep(2)}>
              Next <ArrowRight size={14} />
            </button>
          )}
          {step === 2 && (
            <button className="dr-btn-submit" disabled={saving} onClick={handleSubmit}>
              {saving ? (
                <><span className="dr-spinner" /> Registering...</>
              ) : (
                <><Save size={14} /> Register Device</>
              )}
            </button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .dr-wrapper {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 0%, #1e0e05 0%, #0c0502 60%, #030100 100%);
          padding: 0;
          display: flex;
          flex-direction: column;
          font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Header ── */
        .dr-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 40px;
          border-bottom: 1px solid rgba(255, 107, 0, 0.15);
          background: rgba(12, 5, 2, 0.85);
          backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
        }
        .dr-header-left { display: flex; align-items: center; gap: 20px; }
        .dr-back-btn {
          background: rgba(255, 107, 0, 0.05);
          border: 1px solid rgba(255, 107, 0, 0.25);
          border-radius: 12px;
          padding: 12px;
          color: #ff6b00;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dr-back-btn:hover {
          background: rgba(255, 107, 0, 0.15);
          border-color: #ff6b00;
          box-shadow: 0 0 16px rgba(255, 107, 0, 0.25);
          transform: translateX(-2px);
        }
        .dr-title { font-size: 1.75rem; font-weight: 800; color: #f8fafc; margin: 0; letter-spacing: -0.5px; }
        .dr-subtitle { font-size: 0.9rem; color: #94a3b8; margin: 4px 0 0; font-weight: 500; }
        .dr-close-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 10px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.25s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dr-close-btn:hover { color: #f43f5e; border-color: rgba(244, 63, 94, 0.4); background: rgba(244, 63, 94, 0.05); transform: rotate(90deg); }

        /* ── Stepper ── */
        .dr-stepper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 32px 40px;
          background: rgba(12, 5, 2, 0.4);
          border-bottom: 1px solid rgba(255, 107, 0, 0.08);
        }
        .dr-step {
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          opacity: 0.5;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dr-step:hover { opacity: 0.85; }
        .dr-step.active { opacity: 1; }
        .dr-step.completed { opacity: 0.9; }
        .dr-step-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.02);
          border: 2px solid rgba(255,255,255,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-weight: 800;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dr-step.active .dr-step-circle {
          background: linear-gradient(135deg, #ff6b00, #b23b00);
          border-color: #ff6b00;
          color: #fff;
          box-shadow: 0 0 25px rgba(255, 107, 0, 0.45);
        }
        .dr-step.completed .dr-step-circle {
          background: #10b981;
          border-color: #10b981;
          color: #fff;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.35);
        }
        .dr-step-info { display: flex; flex-direction: column; }
        .dr-step-label { font-size: 0.95rem; font-weight: 700; color: #f8fafc; transition: color 0.3s; }
        .dr-step.active .dr-step-label { color: #ff8c3a; }
        .dr-step-desc { font-size: 0.78rem; color: #94a3b8; margin-top: 2px; }
        .dr-step-line {
          width: 120px;
          height: 2px;
          background: rgba(255, 107, 0, 0.15);
          margin: 0 24px;
          position: relative;
        }

        /* ── Form Content ── */
        .dr-content {
          flex: 1;
          padding: 48px 40px;
          max-width: 1280px; /* INCREASED FROM 900px FOR WIDER/BEAUTIFUL WIDTH */
          margin: 0 auto;
          width: 100%;
        }
        .dr-form-step { animation: drSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes drSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dr-section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.15rem;
          font-weight: 800;
          color: #f8fafc;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 28px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255, 107, 0, 0.15);
        }
        .dr-section-title svg { color: #ff6b00; filter: drop-shadow(0 0 8px rgba(255, 107, 0, 0.4)); }
        .dr-section-badge {
          margin-left: auto;
          background: rgba(255, 107, 0, 0.08);
          color: #ff8c3a;
          font-size: 0.75rem;
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid rgba(255, 107, 0, 0.25);
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .dr-section-hint {
          color: #94a3b8;
          font-size: 0.9rem;
          margin: -18px 0 28px;
          line-height: 1.5;
        }

        .dr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 28px; }
        .dr-grid-1 { display: grid; grid-template-columns: 1fr; gap: 28px; margin-bottom: 28px; }

        /* ── Fields ── */
        .dr-field { display: flex; flex-direction: column; gap: 8px; position: relative; }
        .dr-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #cbd5e1; /* BRIGHTER FOR CLEAR READING */
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .dr-label svg { color: #ff6b00; } /* GLOWING ORANGE FOR ICONS */
        .dr-req { color: #ff6b00; font-size: 0.9rem; margin-left: 2px; }

        .dr-input {
          background: rgba(18, 9, 3, 0.75);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 12px;
          padding: 14px 18px;
          color: #f8fafc;
          font-size: 0.92rem;
          font-weight: 500;
          outline: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }
        .dr-input::placeholder { color: #64748b; } /* LIGHTER AND MUCH MORE READABLE PLACEHOLDER */
        .dr-input:focus {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.15), 0 0 20px rgba(255, 107, 0, 0.12);
          background: rgba(28, 14, 5, 0.85);
        }

        .dr-textarea {
          background: rgba(18, 9, 3, 0.75);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 12px;
          padding: 14px 18px;
          color: #f8fafc;
          font-size: 0.92rem;
          font-weight: 500;
          outline: none;
          resize: vertical;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          line-height: 1.5;
        }
        .dr-textarea::placeholder { color: #64748b; } /* LIGHTER AND MUCH MORE READABLE PLACEHOLDER */
        .dr-textarea:focus {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.15), 0 0 20px rgba(255, 107, 0, 0.12);
          background: rgba(28, 14, 5, 0.85);
        }

        /* ── Custom Select ── */
        .dr-select-btn {
          width: 100%;
          background: rgba(18, 9, 3, 0.75);
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 12px;
          padding: 14px 18px;
          color: #f8fafc;
          font-size: 0.92rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }
        .dr-select-btn:hover { border-color: rgba(255, 107, 0, 0.45); background: rgba(24, 12, 4, 0.8); }
        .dr-select-btn.active {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.15), 0 0 20px rgba(255, 107, 0, 0.12);
          background: rgba(28, 14, 5, 0.9);
        }
        .dr-sel-placeholder { color: #64748b; } /* BRIGHTER PLACEHOLDER IN SELECT */
        .dr-sel-value { color: #f8fafc; }
        .dr-sel-arrow { color: #ff6b00; transition: transform 0.25s; }
        .dr-sel-arrow.rotated { transform: rotate(180deg); }

        .dr-select-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: rgba(16, 7, 2, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 107, 0, 0.35);
          border-radius: 12px;
          padding: 8px 0;
          max-height: 280px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 20px 50px rgba(0,0,0,0.85), 0 0 30px rgba(255, 107, 0, 0.1);
          animation: drDropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dr-select-dropdown::-webkit-scrollbar { width: 6px; }
        .dr-select-dropdown::-webkit-scrollbar-track { background: transparent; }
        .dr-select-dropdown::-webkit-scrollbar-thumb { background: rgba(255, 107, 0, 0.3); border-radius: 6px; }
        .dr-select-dropdown::-webkit-scrollbar-thumb:hover { background: rgba(255, 107, 0, 0.5); }

        .dr-select-option {
          padding: 12px 18px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.15s;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .dr-select-option:last-child { border-bottom: none; }
        .dr-select-option:hover { background: rgba(255, 107, 0, 0.12); color: #fff; padding-left: 24px; }
        .dr-select-option.selected { background: rgba(255, 107, 0, 0.18); color: #ff6b00; font-weight: 700; }
        .dr-select-option.disabled { color: #64748b; cursor: default; }

        /* ── Template Rows ── */
        .dr-template-header {
          display: flex;
          gap: 16px;
          padding: 0 16px 14px;
          border-bottom: 1px solid rgba(255, 107, 0, 0.15);
          margin-bottom: 16px;
        }
        .dr-template-header span {
          font-size: 0.78rem;
          font-weight: 800;
          color: #ff9e59; /* MUCH BRIGHTER AND WARMEST COLOR, NOT DARK BROWN! */
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .dr-template-row {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 14px;
          padding: 6px 0;
        }
        .dr-template-input {
          padding: 12px 16px !important;
          font-size: 0.88rem !important;
          border-radius: 10px !important;
        }
        .dr-mini-select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ff6b00'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2.5' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 12px;
          padding-right: 32px !important;
          cursor: pointer;
        }
        .dr-mini-select option {
          background: #100602;
          color: #cbd5e1;
        }
        .dr-row-delete {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(244, 63, 94, 0.05);
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: #f43f5e;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }
        .dr-row-delete:hover:not(:disabled) {
          background: rgba(244, 63, 94, 0.18);
          border-color: #f43f5e;
          box-shadow: 0 0 16px rgba(244, 63, 94, 0.25);
          transform: scale(1.05);
        }
        .dr-row-delete:disabled { opacity: 0.25; cursor: not-allowed; }

        .dr-add-row-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 107, 0, 0.04);
          border: 1px dashed rgba(255, 107, 0, 0.35);
          border-radius: 12px;
          padding: 14px 20px;
          color: #ff8c3a;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 14px;
          width: 100%;
          justify-content: center;
        }
        .dr-add-row-btn:hover {
          background: rgba(255, 107, 0, 0.09);
          border-color: #ff6b00;
          color: #ff6b00;
          box-shadow: 0 0 16px rgba(255, 107, 0, 0.1);
        }

        /* ── Footer ── */
        .dr-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 40px;
          border-top: 1px solid rgba(255, 107, 0, 0.15);
          background: rgba(12, 5, 2, 0.85);
          backdrop-filter: blur(20px);
          position: sticky;
          bottom: 0;
          z-index: 50;
          box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.4);
        }
        .dr-footer-right { display: flex; gap: 14px; }

        .dr-btn-ghost {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 30px;
          padding: 12px 28px;
          color: #94a3b8;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
        }
        .dr-btn-ghost:hover { background: rgba(255,255,255,0.08); color: #f8fafc; }

        .dr-btn-outline {
          background: transparent;
          border: 1px solid rgba(255, 107, 0, 0.35);
          border-radius: 30px;
          padding: 12px 28px;
          color: #ff8c3a;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s;
        }
        .dr-btn-outline:hover { background: rgba(255, 107, 0, 0.08); color: #ff6b00; border-color: #ff6b00; }

        .dr-btn-primary {
          background: linear-gradient(135deg, #ff6b00, #b23b00);
          border: none;
          border-radius: 30px;
          padding: 12px 32px;
          color: #fff;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s;
          box-shadow: 0 4px 20px rgba(255, 107, 0, 0.3);
          letter-spacing: 0.02em;
        }
        .dr-btn-primary:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); box-shadow: 0 6px 28px rgba(255, 107, 0, 0.45); }
        .dr-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }

        .dr-btn-submit {
          background: linear-gradient(135deg, #ff6b00, #b23b00);
          border: none;
          border-radius: 30px;
          padding: 12px 32px;
          color: #fff;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.25s;
          box-shadow: 0 4px 20px rgba(255, 107, 0, 0.3);
          letter-spacing: 0.02em;
        }
        .dr-btn-submit:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); box-shadow: 0 6px 28px rgba(255, 107, 0, 0.45); }
        .dr-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .dr-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: drSpin 0.6s linear infinite;
        }
        @keyframes drSpin { to { transform: rotate(360deg); } }

        /* ── Banners ── */
        .dr-error-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 40px;
          background: rgba(244, 63, 94, 0.08);
          border-top: 1px solid rgba(244, 63, 94, 0.25);
          color: #fda4af;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .dr-error-close { background: transparent; border: none; color: #f43f5e; cursor: pointer; margin-left: auto; display: flex; align-items: center; }
        .dr-success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 40px;
          background: rgba(16, 185, 129, 0.08);
          border-top: 1px solid rgba(16, 185, 129, 0.25);
          color: #6ee7b7;
          font-size: 0.88rem;
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dr-grid-2 { grid-template-columns: 1fr; gap: 20px; }
          .dr-stepper { flex-direction: column; gap: 16px; padding: 24px; }
          .dr-step-line { width: 2px; height: 24px; margin: 8px 0; }
          .dr-template-header { display: none; }
          .dr-template-row { flex-wrap: wrap; gap: 12px; }
          .dr-template-input { flex: 1 1 100% !important; }
          .dr-content { padding: 24px 16px; }
          .dr-header { padding: 16px 20px; }
          .dr-footer { padding: 16px 20px; flex-wrap: wrap; gap: 12px; }
        }
      `}} />
    </div>
  );
};

export default DeviceRegistration;
