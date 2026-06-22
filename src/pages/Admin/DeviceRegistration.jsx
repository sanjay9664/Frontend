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
              <span style={{ width: 40 }}></span>
            </div>

            {templateRows.map((row, idx) => (
              <div className="dr-template-row" key={idx}>
                <select
                  className="dr-input dr-template-input dr-mini-select"
                  style={{ flex: 2 }}
                  value={row.sochiotDeviceId}
                  onChange={(e) => handleDeviceChangeInRow(idx, e.target.value)}
                >
                  <option value="" style={{ background: '#120600', color: '#fff' }}>SELECT DEVICE</option>
                  {sochiotDevices.map(d => (
                    <option key={d.id} value={d.id} style={{ background: '#120600', color: '#fff' }}>
                      {d.label}
                    </option>
                  ))}
                </select>

                <select
                  className="dr-input dr-template-input dr-mini-select"
                  style={{ flex: 1.5 }}
                  value={row.moduleId}
                  onChange={(e) => handleModuleChangeInRow(idx, e.target.value)}
                  disabled={!row.sochiotDeviceId}
                >
                  <option value="" style={{ background: '#120600', color: '#fff' }}>SELECT MODULE</option>
                  {(row.modules || []).map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#120600', color: '#fff' }}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  className="dr-input dr-template-input dr-mini-select"
                  style={{ flex: 2 }}
                  value={row.sochiotFieldName}
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
                  disabled={!row.moduleId}
                >
                  <option value="" style={{ background: '#120600', color: '#fff' }}>SELECT FIELD</option>
                  {(row.eventFields || []).map(f => (
                    <option key={f} value={f} style={{ background: '#120600', color: '#fff' }}>
                      {f}
                    </option>
                  ))}
                </select>

                <input
                  className="dr-input dr-template-input"
                  style={{ flex: 2 }}
                  placeholder="e.g. Voltage R"
                  value={row.displayName}
                  onChange={(e) => updateRow(idx, 'displayName', e.target.value)}
                />

                <input
                  className="dr-input dr-template-input"
                  style={{ flex: 1.5 }}
                  placeholder="e.g. 240"
                  type="number"
                  value={row.warningHigh}
                  onChange={(e) => updateRow(idx, 'warningHigh', e.target.value)}
                />

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
        .dr-wrapper {
          min-height: 100vh;
          background: #080300;
          padding: 0;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .dr-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 32px;
          border-bottom: 1px solid rgba(224, 94, 0, 0.1);
          background: rgba(18, 6, 0, 0.7);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .dr-header-left { display: flex; align-items: center; gap: 16px; }
        .dr-back-btn {
          background: rgba(224, 94, 0, 0.06);
          border: 1px solid rgba(224, 94, 0, 0.15);
          border-radius: 10px;
          padding: 10px;
          color: #e05e00;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dr-back-btn:hover { background: rgba(224, 94, 0, 0.15); box-shadow: 0 0 12px rgba(224, 94, 0, 0.15); }
        .dr-title { font-size: 1.5rem; font-weight: 900; color: #f1f5f9; margin: 0; letter-spacing: -0.5px; }
        .dr-subtitle { font-size: 0.8rem; color: #64748b; margin: 2px 0 0; font-weight: 500; }
        .dr-close-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 8px;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dr-close-btn:hover { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }

        /* ── Stepper ── */
        .dr-stepper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 28px 32px;
          background: rgba(18, 6, 0, 0.3);
          border-bottom: 1px solid rgba(224, 94, 0, 0.06);
        }
        .dr-step {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          opacity: 0.4;
          transition: all 0.3s;
        }
        .dr-step.active { opacity: 1; }
        .dr-step.completed { opacity: 0.85; }
        .dr-step-circle {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,0.04);
          border: 2px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-weight: 800;
          font-size: 0.85rem;
          transition: all 0.3s;
        }
        .dr-step.active .dr-step-circle {
          background: linear-gradient(135deg, #e05e00, #8C3B06);
          border-color: #e05e00;
          color: #fff;
          box-shadow: 0 0 20px rgba(224, 94, 0, 0.35);
        }
        .dr-step.completed .dr-step-circle {
          background: #10b981;
          border-color: #10b981;
          color: #fff;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.3);
        }
        .dr-step-info { display: flex; flex-direction: column; }
        .dr-step-label { font-size: 0.85rem; font-weight: 700; color: #e2e8f0; }
        .dr-step-desc { font-size: 0.7rem; color: #64748b; }
        .dr-step-line {
          width: 80px;
          height: 2px;
          background: rgba(224, 94, 0, 0.12);
          margin: 0 20px;
          position: relative;
        }

        /* ── Form Content ── */
        .dr-content {
          flex: 1;
          padding: 32px;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }
        .dr-form-step { animation: drSlideIn 0.35s ease; }
        @keyframes drSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .dr-section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1rem;
          font-weight: 800;
          color: #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(224, 94, 0, 0.12);
        }
        .dr-section-title svg { color: #e05e00; }
        .dr-section-badge {
          margin-left: auto;
          background: rgba(224, 94, 0, 0.08);
          color: #e05e00;
          font-size: 0.7rem;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid rgba(224, 94, 0, 0.2);
        }
        .dr-section-hint {
          color: #64748b;
          font-size: 0.8rem;
          margin: -16px 0 20px;
        }

        .dr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .dr-grid-1 { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px; }

        /* ── Fields ── */
        .dr-field { display: flex; flex-direction: column; gap: 6px; position: relative; }
        .dr-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .dr-label svg { color: #6b4c2a; }
        .dr-req { color: #e05e00; font-size: 0.8rem; }

        .dr-input {
          background: rgba(20, 8, 0, 0.95);
          border: 1px solid rgba(224, 94, 0, 0.15);
          border-radius: 10px;
          padding: 12px 16px;
          color: #e2e8f0;
          font-size: 0.85rem;
          font-weight: 500;
          outline: none;
          transition: all 0.25s;
          font-family: inherit;
        }
        .dr-input::placeholder { color: #475569; }
        .dr-input:focus {
          border-color: #e05e00;
          box-shadow: 0 0 0 3px rgba(224, 94, 0, 0.1), 0 0 16px rgba(224, 94, 0, 0.06);
        }
        .dr-input option { background: #1a0800; color: #e2e8f0; }

        .dr-textarea {
          background: rgba(20, 8, 0, 0.95);
          border: 1px solid rgba(224, 94, 0, 0.15);
          border-radius: 10px;
          padding: 12px 16px;
          color: #e2e8f0;
          font-size: 0.85rem;
          font-weight: 500;
          outline: none;
          resize: vertical;
          transition: all 0.25s;
          font-family: inherit;
        }
        .dr-textarea::placeholder { color: #475569; }
        .dr-textarea:focus {
          border-color: #e05e00;
          box-shadow: 0 0 0 3px rgba(224, 94, 0, 0.1);
        }

        /* ── Custom Select ── */
        .dr-select-btn {
          width: 100%;
          background: rgba(20, 8, 0, 0.95);
          border: 1px solid rgba(224, 94, 0, 0.15);
          border-radius: 10px;
          padding: 12px 16px;
          color: #e2e8f0;
          font-size: 0.85rem;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.25s;
          font-family: inherit;
        }
        .dr-select-btn:hover { border-color: rgba(224, 94, 0, 0.35); }
        .dr-select-btn.active {
          border-color: #e05e00;
          box-shadow: 0 0 0 3px rgba(224, 94, 0, 0.1);
          background: rgba(30, 10, 0, 0.98);
        }
        .dr-sel-placeholder { color: #475569; }
        .dr-sel-value { color: #e2e8f0; }
        .dr-sel-arrow { color: #e05e00; transition: transform 0.2s; }
        .dr-sel-arrow.rotated { transform: rotate(180deg); }

        .dr-select-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: rgba(18, 6, 0, 0.98);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(224, 94, 0, 0.25);
          border-radius: 10px;
          padding: 6px 0;
          max-height: 240px;
          overflow-y: auto;
          z-index: 100;
          box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 0 20px rgba(224, 94, 0, 0.08);
          animation: drDropIn 0.15s ease;
        }
        .dr-select-dropdown::-webkit-scrollbar { width: 4px; }
        .dr-select-dropdown::-webkit-scrollbar-thumb { background: rgba(224, 94, 0, 0.3); border-radius: 4px; }
        @keyframes drDropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dr-select-option {
          padding: 10px 16px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #c8c8c8;
          cursor: pointer;
          transition: all 0.15s;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .dr-select-option:last-child { border-bottom: none; }
        .dr-select-option:hover { background: rgba(224, 94, 0, 0.12); color: #fff; padding-left: 20px; }
        .dr-select-option.selected { background: rgba(224, 94, 0, 0.18); color: #e05e00; font-weight: 700; }
        .dr-select-option.disabled { color: #475569; cursor: default; }

        /* ── Template Rows ── */
        .dr-template-header {
          display: flex;
          gap: 10px;
          padding: 0 8px 10px;
          border-bottom: 1px solid rgba(224, 94, 0, 0.1);
          margin-bottom: 10px;
        }
        .dr-template-header span {
          font-size: 0.68rem;
          font-weight: 800;
          color: #6b4c2a;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .dr-template-row {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
          padding: 4px 0;
        }
        .dr-template-input {
          padding: 10px 12px !important;
          font-size: 0.8rem !important;
          border-radius: 8px !important;
        }
        .dr-mini-select {
          appearance: auto;
          cursor: pointer;
        }
        .dr-row-delete {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.1);
          color: #ef4444;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .dr-row-delete:hover:not(:disabled) { background: rgba(239, 68, 68, 0.15); box-shadow: 0 0 12px rgba(239, 68, 68, 0.2); }
        .dr-row-delete:disabled { opacity: 0.3; cursor: not-allowed; }

        .dr-add-row-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(224, 94, 0, 0.05);
          border: 1px dashed rgba(224, 94, 0, 0.25);
          border-radius: 10px;
          padding: 12px 20px;
          color: #e05e00;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 6px;
          width: 100%;
          justify-content: center;
        }
        .dr-add-row-btn:hover { background: rgba(224, 94, 0, 0.1); border-color: rgba(224, 94, 0, 0.4); }

        /* ── Footer ── */
        .dr-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 32px;
          border-top: 1px solid rgba(224, 94, 0, 0.1);
          background: rgba(18, 6, 0, 0.7);
          backdrop-filter: blur(12px);
          position: sticky;
          bottom: 0;
          z-index: 50;
        }
        .dr-footer-right { display: flex; gap: 10px; }

        .dr-btn-ghost {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 25px;
          padding: 10px 24px;
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
        }
        .dr-btn-ghost:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }

        .dr-btn-outline {
          background: transparent;
          border: 1px solid rgba(224, 94, 0, 0.25);
          border-radius: 25px;
          padding: 10px 24px;
          color: #e05e00;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.25s;
        }
        .dr-btn-outline:hover { background: rgba(224, 94, 0, 0.08); }

        .dr-btn-primary {
          background: linear-gradient(135deg, #e05e00, #8C3B06);
          border: none;
          border-radius: 25px;
          padding: 10px 28px;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.25s;
          box-shadow: 0 4px 16px rgba(224, 94, 0, 0.3);
          letter-spacing: 0.01em;
        }
        .dr-btn-primary:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(224, 94, 0, 0.4); }
        .dr-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .dr-btn-submit {
          background: linear-gradient(135deg, #e05e00, #8C3B06);
          border: none;
          border-radius: 25px;
          padding: 10px 28px;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s;
          box-shadow: 0 4px 16px rgba(224, 94, 0, 0.3);
          letter-spacing: 0.01em;
        }
        .dr-btn-submit:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(224, 94, 0, 0.4); }
        .dr-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .dr-spinner {
          width: 14px;
          height: 14px;
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
          padding: 12px 32px;
          background: rgba(239, 68, 68, 0.08);
          border-top: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          font-size: 0.82rem;
          font-weight: 600;
        }
        .dr-error-close { background: transparent; border: none; color: #ef4444; cursor: pointer; margin-left: auto; }
        .dr-success-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 32px;
          background: rgba(224, 94, 0, 0.08);
          border-top: 1px solid rgba(224, 94, 0, 0.2);
          color: #e05e00;
          font-size: 0.82rem;
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dr-grid-2 { grid-template-columns: 1fr; }
          .dr-stepper { flex-direction: column; gap: 16px; }
          .dr-step-line { width: 2px; height: 24px; }
          .dr-template-header { display: none; }
          .dr-template-row { flex-wrap: wrap; }
          .dr-template-input { flex: 1 1 100% !important; }
          .dr-content { padding: 24px 16px; }
          .dr-header { padding: 16px 20px; }
          .dr-footer { padding: 16px 20px; flex-wrap: wrap; gap: 10px; }
        }
      `}} />
    </div>
  );
};

export default DeviceRegistration;
