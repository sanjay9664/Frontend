import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Row, Col, Card, Badge, Table, Tab, Tabs, Modal, Button, Form } from 'react-bootstrap';
import { Zap, Activity, Cpu, ShieldCheck, RefreshCcw, Settings2, Plus, Trash2, FolderTree, CheckCircle2, Check } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import PdfButton from '../../components/PdfButton';
import { useDeviceStatus } from '../../services/DeviceStatusContext';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import './MFMMeter.css';

const GROUP_EVENT_NAME = 'energy-meter-groups-updated';
const GROUP_COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#a78bfa', '#f43f5e'];
const createGroupId = () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const FIELD_LABELS = {
  ebKvah: { label: 'EB KVAH', unit: 'kVAh' },
  ebKwh: { label: 'EB KWH', unit: 'kWh' },
  balance: { label: 'Balance', unit: 'Rs' },
  totalKw: { label: 'Total KW', unit: 'kW' },
  vR: { label: 'Voltage-R', unit: 'V' },
  vY: { label: 'Voltage-Y', unit: 'V' },
  vB: { label: 'Voltage-B', unit: 'V' },
  iR: { label: 'R-Current', unit: 'A' },
  iY: { label: 'Y-Current', unit: 'A' },
  iB: { label: 'B-Current', unit: 'A' },
  pf: { label: 'Power Factor', unit: '' },
  totalKva: { label: 'Total KVA', unit: 'kVA' },
  dgKwh: { label: 'DG KWH', unit: 'kWh' },
  freq: { label: 'Frequency', unit: 'Hz' },
  lowBalanceCut: { label: 'Low Balance Cut', unit: '' },
  overloadTrip: { label: 'Overload Trip', unit: '' },
  overloadLimitReached: { label: 'Overload Limit Reached', unit: '' },
  connectedStatus: { label: 'Connected Status', unit: '' },
  forceOff: { label: 'Force Off', unit: '' },
  meterSrno: { label: 'Meter Serial No', unit: '' },
  noOfOverloadCheck: { label: 'No of Overload Check', unit: '' },
  ebDgStatus: { label: 'EB/DG Status', unit: '' },
  ebTariff: { label: 'EB Tariff', unit: 'Rs' },
  dgTariff: { label: 'DG Tariff', unit: 'Rs' },
  ebRLoadSet: { label: 'EB R Load Set', unit: 'kW' },
  ebYLoadSet: { label: 'EB Y Load Set', unit: 'kW' },
  ebBLoadSet: { label: 'EB B Load Set', unit: 'kW' },
  dgRLoadSet: { label: 'DG R Load Set', unit: 'kW' },
  dgYLoadSet: { label: 'DG Y Load Set', unit: 'kW' },
  dgBLoadSet: { label: 'DG B Load Set', unit: 'kW' },
  activePower: { label: 'Active Power', unit: 'kW' },
  reactivePower: { label: 'Reactive Power', unit: 'kVAr' },
  apparentPower: { label: 'Apparent Power', unit: 'kVA' },
  cumulativekWh: { label: 'Cumulative KWH', unit: 'kWh' },
  commStatus: { label: 'Comm Status', unit: '' },
  vLLAvg: { label: 'AVG VOLTAGE L-L', unit: 'V' },
  vLNAvg: { label: 'AVG VOLTAGE L-N', unit: 'V' },
  iAvg: { label: 'AVG CURRENT', unit: 'A' },
  kvaAvg: { label: 'POWER KVA (AVG)', unit: 'kVA' },
  kvarAvg: { label: 'POWER KVAR (AVG)', unit: 'kVAR' },
  pfAvg: { label: 'AVG PF', unit: '' },
  vRY: { label: 'VOLTAGE R-Y', unit: 'V' },
  vYB: { label: 'VOLTAGE Y-B', unit: 'V' },
  vBR: { label: 'VOLTAGE B-R', unit: 'V' },
  pfR: { label: 'PF-R', unit: '' },
  pfY: { label: 'PF-Y', unit: '' },
  pfB: { label: 'PF-B', unit: '' },
  loadHrs: { label: 'LOAD HRS', unit: 'h' },
  loadMin: { label: 'LOAD MIN', unit: 'm' },
  noLoadHrs: { label: 'NO LOAD HRS', unit: 'h' },
  noLoadMin: { label: 'NO LOAD MIN', unit: 'm' },
  loadPct: { label: 'LOAD %', unit: '%' },
};

const TelemetryCard = ({ label, value, unit, colorClass, type, isMapped = true, isOnline = true }) => {
  const active = isMapped && isOnline;
  // Show last known data when mapped but offline (dimmed, amber color)
  const showLastKnown = isMapped && !isOnline && value !== '—';
  const hasVisibleValue = active || showLastKnown;
  return (
    <div
      className={`p-2 rounded-3 telemetry-card-glow card-hover-${type} d-flex flex-column justify-content-between h-100`}
      style={{
        opacity: active ? 1 : showLastKnown ? 0.78 : 0.32,
        filter: active ? 'none' : showLastKnown ? 'none' : 'grayscale(1) brightness(0.6)',
        pointerEvents: 'auto'
      }}
    >
      <span className="text-secondary uppercase tracking-wide mb-1 opacity-75" style={{ fontSize: '0.62rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <div className="d-flex align-items-baseline justify-content-between mt-auto">
        <span
          className={`fw-bold font-monospace fs-5 ${active ? colorClass : showLastKnown ? 'text-warning' : 'text-secondary'}`}
          style={{ letterSpacing: '0.5px', opacity: showLastKnown ? 0.85 : 1 }}
        >
          {value}
        </span>
        {hasVisibleValue && unit && value !== '—' && (
          <span className="opacity-75 ms-1" style={{ fontSize: '0.65rem', color: 'inherit' }}>{unit}</span>
        )}
      </div>
    </div>
  );
};

const MiniMFMMeter = ({ meter, isMapped = true, isOnline, onClick }) => {
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPage(p => (p + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const getPageData = () => {
    const tv = meter.telemetryValues || {};
    const parseNum = (v) => {
      if (v === null || v === undefined) return 0;
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };
    const hasTelemetry = Object.keys(tv).length > 0;
    const showActive = !isMapped || isOnline || hasTelemetry;
    switch (page) {
      case 0:
        return {
          title: "PHASE-NEUTRAL VOLTAGE",
          pageCode: "P01",
          lines: [
            { label: "Ua", value: showActive ? parseNum(tv.vR ?? meter.vR ?? meter.voltage).toFixed(1) : "—", unit: "V" },
            { label: "Ub", value: showActive ? parseNum(tv.vY ?? meter.vY).toFixed(1) : "—", unit: "V" },
            { label: "Uc", value: showActive ? parseNum(tv.vB ?? meter.vB).toFixed(1) : "—", unit: "V" },
            { label: "F", value: showActive ? parseNum(tv.freq ?? meter.freq ?? 50.0).toFixed(3) : "—", unit: "Hz" },
          ]
        };
      case 1:
        return {
          title: "LINE CURRENTS",
          pageCode: "P02",
          lines: [
            { label: "Ia", value: showActive ? parseNum(tv.iR ?? meter.iR ?? meter.current).toFixed(1) : "—", unit: "A" },
            { label: "Ib", value: showActive ? parseNum(tv.iY ?? meter.iY).toFixed(1) : "—", unit: "A" },
            { label: "Ic", value: showActive ? parseNum(tv.iB ?? meter.iB).toFixed(1) : "—", unit: "A" },
            { label: "IN", value: showActive ? "0.0" : "—", unit: "A" },
          ]
        };
      case 2:
      default:
        return {
          title: "SYSTEM POWER",
          pageCode: "P03",
          lines: [
            { label: "kW", value: showActive ? parseNum(tv.activePower ?? tv.totalKw ?? meter.activePower ?? meter.load).toFixed(1) : "—", unit: "kW" },
            { label: "kVAr", value: showActive ? parseNum(tv.reactivePower ?? meter.reactivePower).toFixed(1) : "—", unit: "kVAr" },
            { label: "kVA", value: showActive ? parseNum(tv.apparentPower ?? tv.totalKva ?? meter.apparentPower).toFixed(1) : "—", unit: "kVA" },
            { label: "PF", value: showActive ? parseNum(tv.pf ?? meter.pf).toFixed(3) : "—", unit: "" },
          ]
        };
    }
  };

  const pageData = getPageData();
  const hasTelemetry = Object.keys(meter.telemetryValues || {}).length > 0;
  const showActive = !isMapped || isOnline || hasTelemetry;

  return (
    <div className="w-100 d-flex flex-column align-items-center scada-meter-wrapper" onClick={onClick} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
      <div className="mb-2 text-center" style={{ minHeight: '36px' }}>
        <h6 className="fw-bold text-white mb-0" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>{meter.label}</h6>
        <Badge bg="secondary" className="bg-opacity-10 border border-secondary border-opacity-10 px-2 py-0 fs-12 uppercase text-muted" style={{ fontSize: '0.6rem' }}>{meter.type}</Badge>
      </div>
      <div className="mfm-polycarbonate-case shadow-2xl mx-auto" style={{ maxWidth: '270px', padding: '14px 10px', borderWidth: '8px', borderRadius: '24px' }}>
        {/* Bezel Screws */}
        <div className="screw top-left" style={{ top: '6px', left: '6px', width: '10px', height: '10px' }}></div>
        <div className="screw top-right" style={{ top: '6px', right: '6px', width: '10px', height: '10px' }}></div>
        <div className="screw bottom-left" style={{ bottom: '6px', left: '6px', width: '10px', height: '10px' }}></div>
        <div className="screw bottom-right" style={{ bottom: '6px', right: '6px', width: '10px', height: '10px' }}></div>

        <div className="mfm-metallic-bezel" style={{ padding: '12px 10px', borderRadius: '12px' }}>
          {/* Brand Header */}
          <div className="mfm-brand-header d-flex justify-content-between align-items-center mb-2 px-1">
            <span className="mfm-brand-logo" style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>TRUEiSENSE</span>
            <span className="mfm-model-no" style={{ fontSize: '0.6rem', padding: '1px 4px' }}>APM Series</span>
          </div>

          {/* Grid LCD Screen Window */}
          <div className="mfm-lcd-window" style={{ padding: '6px', borderWidth: '4px', borderRadius: '8px', opacity: showActive ? 1 : 0.6 }}>
            <div className="mfm-lcd-screen" style={{ height: '185px', padding: '6px' }}>
              <div className="lcd-grid-overlay"></div>

              {/* Screen Header */}
              <div className="d-flex justify-content-between align-items-start mb-2 border-bottom border-success border-opacity-25 pb-1">
                <span className="text-success fw-bold opacity-75" style={{ fontSize: '0.6rem' }}>{pageData.title}</span>
                <span className="bg-success bg-opacity-25 text-success px-1 rounded" style={{ fontSize: '0.6rem' }}>{pageData.pageCode}</span>
              </div>

              {/* Display Lines */}
              <div className="d-flex flex-column gap-1 flex-grow-1 justify-content-center">
                {pageData.lines.map((line, idx) => (
                  <div key={idx} className="d-flex justify-content-between align-items-end">
                    <span className="text-success fw-bold opacity-75" style={{ fontSize: '0.8rem', width: '30px' }}>{line.label}</span>
                    <div className="d-flex align-items-baseline gap-1">
                      <span className="text-success fw-bold" style={{ fontSize: '1.4rem', letterSpacing: '1px', fontFamily: 'monospace' }}>{line.value}</span>
                      <span className="text-success opacity-75" style={{ fontSize: '0.7rem', width: '30px' }}>{line.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Nav Bar */}
              <div className="d-flex justify-content-between mt-auto pt-1 border-top border-success border-opacity-25 text-success opacity-75" style={{ fontSize: '0.55rem' }}>
                <span>&lt;Up</span>
                <span>&gt;Down</span>
                <span>^Menu</span>
                <span>vEvnt</span>
              </div>
            </div>
          </div>

          {/* LED Indicators and Specs */}
          <div className="mfm-led-panel d-flex justify-content-between align-items-center mt-2 px-1">
            <div className="d-flex gap-2">
              <div className="d-flex flex-column align-items-center">
                <div className="mfm-led-bulb bulb-blue" style={{ width: '8px', height: '8px' }}></div>
                <span className="mfm-led-label" style={{ fontSize: '0.5rem', marginTop: '2px' }}>CAL</span>
              </div>
              <div className="d-flex flex-column align-items-center">
                <div className={`mfm-led-bulb bulb-green ${isOnline && isMapped ? 'glow-active pulse-dot-green' : ''}`} style={{ width: '8px', height: '8px', animation: isOnline && isMapped ? 'pulseGlow 1.8s infinite' : 'none' }}></div>
                <span className="mfm-led-label" style={{ fontSize: '0.5rem', marginTop: '2px' }}>COM</span>
              </div>
              <div className="d-flex flex-column align-items-center">
                <div className={`mfm-led-bulb bulb-orange ${meter.status === 'Warning' ? 'glow-active' : ''}`} style={{ width: '8px', height: '8px' }}></div>
                <span className="mfm-led-label" style={{ fontSize: '0.5rem', marginTop: '2px' }}>ALM</span>
              </div>
            </div>

            <div className="mfm-spec-labels text-end" style={{ fontSize: '0.55rem' }}>
              <div className="text-white fw-bold">{meter.telemetryValues?.meterSrno || meter.id}</div>
              <div>50.0Hz • TRUEiSENSE</div>
            </div>
          </div>

          {/* Hardware Nav Buttons */}
          <div className="mfm-button-deck d-flex gap-1 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              className="mfm-tactile-btn flex-fill"
              style={{ height: '28px', borderRadius: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
                setPage(p => (p - 1 + 3) % 3);
              }}
              title="Page Up (<)"
            >
              <span className="btn-glyph text-white fw-bold" style={{ fontSize: '0.7rem' }}>&lt;</span>
            </button>
            <button
              className="mfm-tactile-btn flex-fill"
              style={{ height: '28px', borderRadius: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
                setPage(p => (p + 1) % 3);
              }}
              title="Page Down (>)"
            >
              <span className="btn-glyph text-white fw-bold" style={{ fontSize: '0.7rem' }}>&gt;</span>
            </button>
            <button
              className="mfm-tactile-btn flex-fill"
              style={{ height: '28px', borderRadius: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              title="Menu"
            >
              <span className="btn-glyph text-white fw-bold" style={{ fontSize: '0.7rem' }}>⚙</span>
            </button>
            <button
              className="mfm-tactile-btn flex-fill"
              style={{ height: '28px', borderRadius: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              title="Enter"
            >
              <span className="btn-glyph text-white fw-bold" style={{ fontSize: '0.7rem' }}>⏎</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, unit, colorClass }) => (
  <div className="d-flex justify-content-between align-items-center p-2 mb-2 rounded" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)' }}>
    <span className="text-secondary fs-13">{label}</span>
    <div className="d-flex align-items-baseline gap-1">
      <span className={`fw-bold font-monospace fs-5 ${colorClass}`}>{value}</span>
      <span className={`fs-12 ${colorClass} opacity-75`}>{unit}</span>
    </div>
  </div>
);

const normalizeMeterGroups = (groups, meters) => {
  const templateIdMap = new Map();
  const meterLookup = new Map();
  const globallyAssigned = new Set();
  const usedGroupIds = new Set();
  meters.forEach(meter => {
    const templateId = String(meter.templateId ?? meter.id);
    templateIdMap.set(templateId, templateId);
    templateIdMap.set(String(meter.id), templateId);
    meterLookup.set(templateId, {
      id: templateId,
      label: meter.label,
      type: meter.type || 'Sub Meter',
      category: meter.type || 'Sub Meter'
    });
  });
  return (Array.isArray(groups) ? groups : [])
    .map((group, index) => {
      const requestedId = String(group?.id || '').trim();
      const safeId = requestedId && !usedGroupIds.has(requestedId) ? requestedId : createGroupId();
      usedGroupIds.add(safeId);

      const groupMeterIds = Array.from(
        new Set((Array.isArray(group?.meterIds) ? group.meterIds : []).map(id => String(id)))
      )
        .map(id => templateIdMap.get(id))
        .filter(Boolean)
        .filter(id => {
          if (globallyAssigned.has(id)) return false;
          globallyAssigned.add(id);
          return true;
        });

      return {
        id: safeId,
        name: String(group?.name || '').trim() || `Group ${index + 1}`,
        color: group?.color || GROUP_COLORS[index % GROUP_COLORS.length],
        meterIds: groupMeterIds,
        meterDetails: groupMeterIds.map(id => meterLookup.get(id)).filter(Boolean)
      };
    })
    .filter(group => group.name);
};

const fetchSavedMeterGroups = async (meters) => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const tenantId = userData?.tenantId;
  const url = tenantId
    ? `${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates/energy-meter-groups?tenantId=${tenantId}`
    : `${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates/energy-meter-groups`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch saved energy meter groups');
  }
  const data = await response.json();
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  return normalizeMeterGroups(groups, meters);
};

const SubMeters = () => {
  const location = useLocation();
  const { getOverallStatus, refreshStatuses } = useDeviceStatus();
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [meters, setMeters] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showGroupingSettings, setShowGroupingSettings] = useState(false);
  const [meterGroups, setMeterGroups] = useState([]);
  const [groupSaveStatus, setGroupSaveStatus] = useState(null);
  const [showSaveSuccessPopup, setShowSaveSuccessPopup] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('Group created successfully');
  const groupsHydratedRef = useRef(false);
  const TELEMETRY_FRESHNESS_MS = 24 * 60 * 60 * 1000;

  const getMeterOnlineStatus = (meterLabel) => {
    const meter = meters.find(
      m => String(m.label).trim().toUpperCase() === String(meterLabel).trim().toUpperCase()
    );
    const template = getTemplateForMeter(meterLabel);
    if (template?.mapping) {
      let devId = template.mapping.deviceId;
      if (!devId) {
        const anyConfig = Object.values(template.mapping).find(cfg => cfg && typeof cfg === 'object' && cfg.device);
        if (anyConfig) devId = anyConfig.device;
      }
      const gatewayUuid = template.mapping.gatewayUuid;
      if (devId) {
        const isOnline = getOverallStatus(devId, gatewayUuid);
        if (isOnline) return true;
      }
    }

    // Telemetry fallback is allowed only for fresh readings, otherwise stale data
    // would incorrectly keep an offline sub-meter marked as online.
    if (meter) {
      const lastTelemetryTs = Number(meter.lastTelemetryTimestamp);
      const isFreshTelemetry =
        Number.isFinite(lastTelemetryTs) &&
        lastTelemetryTs > 0 &&
        Date.now() - lastTelemetryTs < TELEMETRY_FRESHNESS_MS;
      const hasV = meter.voltage !== undefined && meter.voltage !== null && Number(meter.voltage) > 0;
      const hasI = meter.current !== undefined && meter.current !== null && Number(meter.current) > 0;
      const hasLoad = meter.load !== undefined && meter.load !== null && Number(meter.load) > 0;
      const hasTelemetry = meter.telemetryValues && Object.keys(meter.telemetryValues).length > 0;
      const hasCommStatus =
        meter.telemetryValues?.commStatus !== undefined &&
        meter.telemetryValues?.commStatus !== null &&
        meter.telemetryValues?.commStatus !== '' &&
        meter.telemetryValues?.commStatus !== 0 &&
        meter.telemetryValues?.commStatus !== '0';

      if (isFreshTelemetry && (hasV || hasI || hasLoad || hasTelemetry || hasCommStatus)) {
        return true;
      }
    }
    return false; // Default offline
  };

  // Helper to check if a specific meter has an active device mapping (i.e. is mapped)
  const getMeterMappedStatus = (meterLabel) => {
    const template = getTemplateForMeter(meterLabel);
    if (template?.mapping) {
      let devId = template.mapping.deviceId;
      if (!devId) {
        const anyConfig = Object.values(template.mapping).find(cfg => cfg && typeof cfg === 'object' && cfg.device);
        if (anyConfig) devId = anyConfig.device;
      }
      if (devId) return true;
    }
    return false;
  };

  // Sync meters list dynamically with Sub Meters templates
  useEffect(() => {
    const subMeterTemplates = templates.filter(t => t.module === 'Sub Meters');
    if (subMeterTemplates.length > 0) {
      setMeters(prev => {
        return subMeterTemplates.map(t => {
          const label = t.mapping?.energyMeteringTarget || t.name;
          const meterId = `SM-${t.id}`;
          const existing = prev.find(m => m.id === meterId || String(m.label).toUpperCase() === String(label).toUpperCase());
          return {
            id: meterId,
            templateId: String(t.id),
            label: label,
            type: t.category || 'Sub Meter',
            load: existing?.load ?? 0.0,
            voltage: existing?.voltage ?? 0.0,
            current: existing?.current ?? 0.0,
            pf: existing?.pf ?? 0.0,
            status: existing?.status ?? 'Stopped',
            vR: existing?.vR ?? null,
            vY: existing?.vY ?? null,
            vB: existing?.vB ?? null,
            iR: existing?.iR ?? null,
            iY: existing?.iY ?? null,
            iB: existing?.iB ?? null,
            freq: existing?.freq ?? null,
            activePower: existing?.activePower ?? null,
            reactivePower: existing?.reactivePower ?? null,
            apparentPower: existing?.apparentPower ?? null,
            moduleEvents: existing?.moduleEvents ?? null,
            telemetryValues: existing?.telemetryValues ?? null
          };
        });
      });
    }
  }, [templates]);

  useEffect(() => {
    let active = true;

    const hydrateGroups = async () => {
      if (meters.length === 0) {
        if (active) setMeterGroups([]);
        return;
      }

      setMeterGroups(prev => {
        if (!groupsHydratedRef.current) {
          return prev;
        }

        const normalizedCurrent = normalizeMeterGroups(prev, meters);
        const prevSerialized = JSON.stringify(prev);
        const normalizedSerialized = JSON.stringify(normalizedCurrent);
        return prevSerialized === normalizedSerialized ? prev : normalizedCurrent;
      });

      if (!groupsHydratedRef.current) {
        try {
          const backendGroups = await fetchSavedMeterGroups(meters);
          if (!active) return;
          groupsHydratedRef.current = true;
          setMeterGroups(backendGroups);
        } catch (error) {
          console.error('Failed to load groups from backend:', error);
          if (!active) return;
          groupsHydratedRef.current = true;
          setMeterGroups([]);
          setGroupSaveStatus('Could not load saved groups');
          setTimeout(() => setGroupSaveStatus(null), 3000);
        }
      }
    };

    hydrateGroups();
    return () => {
      active = false;
    };
  }, [meters]);

  useEffect(() => {
    let active = true;
    const syncGroups = async () => {
      try {
        const groups = await fetchSavedMeterGroups(meters);
        if (active) {
          groupsHydratedRef.current = true;
          setMeterGroups(groups);
        }
      } catch (error) {
        console.error('Failed to sync groups from backend:', error);
      }
    };
    window.addEventListener(GROUP_EVENT_NAME, syncGroups);
    return () => {
      active = false;
      window.removeEventListener(GROUP_EVENT_NAME, syncGroups);
    };
  }, [meters]);

  useEffect(() => {
    if (location.state?.openGroupSettings) {
      setShowGroupingSettings(true);
    }
  }, [location.state]);

  // Trigger status refresh when templates state is updated
  useEffect(() => {
    if (templates.length > 0 && refreshStatuses) {
      refreshStatuses();
    }
  }, [templates, refreshStatuses]);

  // Derive activeMeter dynamically from meters array so it updates in real-time
  const activeMeter = useMemo(() => {
    if (!selectedMeter) return null;
    return meters.find(m => m.id === selectedMeter.id) || selectedMeter;
  }, [meters, selectedMeter]);

  const assignedMeterIds = useMemo(
    () => new Set(meterGroups.flatMap(group => group.meterIds.map(id => String(id)))),
    [meterGroups]
  );

  const ungroupedMeters = useMemo(
    () => meters.filter(meter => !assignedMeterIds.has(String(meter.templateId ?? meter.id))),
    [meters, assignedMeterIds]
  );

  const getAssignedGroupForMeter = (meterId, currentGroupId = null) => {
    const targetId = String(meterId);
    return meterGroups.find(
      group => group.id !== currentGroupId && group.meterIds.includes(targetId)
    );
  };

  const getGroupMeterOptions = (groupId) =>
    [...meters].sort((left, right) => {
      const leftKey = String(left.templateId ?? left.id);
      const rightKey = String(right.templateId ?? right.id);
      const leftChecked = meterGroups.find(group => group.id === groupId)?.meterIds.includes(leftKey);
      const rightChecked = meterGroups.find(group => group.id === groupId)?.meterIds.includes(rightKey);
      const leftAssignedElsewhere = !!getAssignedGroupForMeter(leftKey, groupId);
      const rightAssignedElsewhere = !!getAssignedGroupForMeter(rightKey, groupId);

      if (leftChecked !== rightChecked) return leftChecked ? -1 : 1;
      if (leftAssignedElsewhere !== rightAssignedElsewhere) return leftAssignedElsewhere ? 1 : -1;
      return String(left.label || '').localeCompare(String(right.label || ''));
    });

  const duplicateGroupNames = useMemo(() => {
    const counts = new Map();
    meterGroups.forEach(group => {
      const normalizedName = String(group.name || '').trim().toLowerCase();
      if (!normalizedName) return;
      counts.set(normalizedName, (counts.get(normalizedName) || 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([name]) => name)
    );
  }, [meterGroups]);

  const addMeterGroup = () => {
    setMeterGroups(prev => [
      ...prev,
      {
        id: createGroupId(),
        name: `Group ${prev.length + 1}`,
        color: GROUP_COLORS[prev.length % GROUP_COLORS.length],
        meterIds: []
      }
    ]);
  };

  const removeMeterGroup = (groupId) => {
    setMeterGroups(prev => prev.filter(group => group.id !== groupId));
  };

  const updateMeterGroup = (groupId, field, value) => {
    setMeterGroups(prev => prev.map(group => (group.id === groupId ? { ...group, [field]: value } : group)));
  };

  const toggleMeterAssignment = (groupId, meterId) => {
    const targetId = String(meterId);
    setMeterGroups(prev => {
      const assignedElsewhere = prev.find(
        group => group.id !== groupId && group.meterIds.includes(targetId)
      );

      if (assignedElsewhere) {
        return prev;
      }

      return prev.map(group => {
        const isSelected = group.meterIds.includes(targetId);
        if (group.id === groupId) {
          return {
            ...group,
            meterIds: isSelected
              ? group.meterIds.filter(id => id !== targetId)
              : [...group.meterIds, targetId]
          };
        }
        return group;
      });
    });
  };

  const saveMeterGroups = async () => {
    if (duplicateGroupNames.size > 0) {
      setGroupSaveStatus('Use a different group name');
      setSaveSuccessMessage('Group name already exists');
      setShowSaveSuccessPopup(true);
      setTimeout(() => setGroupSaveStatus(null), 3000);
      setTimeout(() => setShowSaveSuccessPopup(false), 2600);
      return;
    }

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const tenantId = userData?.tenantId;
    const normalized = normalizeMeterGroups(meterGroups, meters);
    try {
      const response = await fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates/energy-meter-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: normalized, tenantId })
      });

      if (!response.ok) {
        throw new Error('Failed to save energy meter groups');
      }

      const data = await response.json();
      const savedGroups = normalizeMeterGroups(data?.groups || normalized, meters);
      setMeterGroups(savedGroups);
      window.dispatchEvent(new Event(GROUP_EVENT_NAME));
      setGroupSaveStatus('Group saved');
      setSaveSuccessMessage('Group saved successfully');
      setShowSaveSuccessPopup(true);
      setShowGroupingSettings(false);
    } catch (error) {
      console.error('Failed to save groups to backend:', error);
      setGroupSaveStatus('Group save failed');
      setSaveSuccessMessage('Could not save group to database');
      setShowSaveSuccessPopup(true);
    } finally {
      setTimeout(() => setGroupSaveStatus(null), 3000);
      setTimeout(() => setShowSaveSuccessPopup(false), 2600);
    }
  };

  // Derive activeSections mapped/saved in the template settings
  const activeSections = useMemo(() => {
    if (!activeMeter) return null;
    const template = templates.find(t =>
      t.module === 'Sub Meters' &&
      String(t.mapping?.energyMeteringTarget || '').trim().toUpperCase() === String(activeMeter.label || '').trim().toUpperCase()
    );
    if (!template || !template.mapping) return null;
    const mapping = template.mapping;

    const changeFields = [];
    const warningFields = [];
    const readFields = [];

    const skipKeys = new Set(['organization', 'client', 'zone', 'subZone', 'building', 'device', 'module', 'enabled', 'mappingId', 'fixedCharge']);

    const extractMapped = (config, targetArray) => {
      if (!config || config.enabled === false) return;
      Object.keys(config).forEach(key => {
        if (!skipKeys.has(key) && config[key] && String(config[key]).trim() !== '') {
          targetArray.push(key);
        }
      });
    };

    extractMapped(mapping.emChangeConfig, changeFields);
    extractMapped(mapping.emWarningConfig, warningFields);
    extractMapped(mapping.emReadConfig, readFields);

    return {
      change: changeFields,
      warning: warningFields,
      read: readFields
    };
  }, [templates, activeMeter]);

  const hasAnyMappedField = useMemo(() => {
    if (!activeSections) return false;
    return activeSections.change.length > 0 || activeSections.warning.length > 0 || activeSections.read.length > 0;
  }, [activeSections]);

  const formatTelemetryValue = (val) => {
    if (val === null || val === undefined) return '—';
    return String(val); // Keep exact float/decimals as received
  };

  // Load templates on mount & API fetch sync
  useEffect(() => {
    const saved = localStorage.getItem('scada_templates');
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse templates from local storage:', e);
      }
    }

    fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const mapped = data.map(t => {
          const hasDef = t.defaultValues && typeof t.defaultValues === 'object' && Object.keys(t.defaultValues).length > 0;
          const defValues = hasDef ? t.defaultValues : null;
          const mappingSource = defValues || t.settings?.[0]?.meta || {};
          return {
            id: t.id,
            name: t.name,
            category: (defValues && defValues.category) || t.category || 'Water Management',
            module: (defValues && defValues.module) || t.settings?.[0]?.eventKey || 'AG Tank',
            mapping: mappingSource
          };
        });
        setTemplates(mapped);
        localStorage.setItem('scada_templates', JSON.stringify(mapped));
        if (refreshStatuses) refreshStatuses();
      })
      .catch(err => console.error('Error fetching templates in SubMeters:', err));
  }, [refreshStatuses]);

  // Helper to find template for a specific meter
  const getTemplateForMeter = (meterLabel) => {
    return templates.find(t =>
      t.module === 'Sub Meters' &&
      String(t.mapping?.energyMeteringTarget || t.name || '').trim().toUpperCase() === String(meterLabel || '').trim().toUpperCase()
    );
  };

  // Helper to check mapped fields for a meter
  const getMappedFieldsForMeter = (meterLabel) => {
    const template = getTemplateForMeter(meterLabel);
    if (!template || !template.mapping) return {};
    const mapping = template.mapping;
    const mapped = {};

    // Legacy configs
    if (mapping.emPowerConfig?.enabled !== false && mapping.emPowerConfig?.module && mapping.emPowerConfig?.activePower) {
      mapped.load = true;
    }
    if (mapping.emVoltageConfig?.enabled !== false && mapping.emVoltageConfig?.module && mapping.emVoltageConfig?.vR) {
      mapped.voltage = true;
    }
    if (mapping.emCurrentConfig?.enabled !== false && mapping.emCurrentConfig?.module && mapping.emCurrentConfig?.iR) {
      mapped.current = true;
    }
    if (mapping.emSystemConfig?.enabled !== false && mapping.emSystemConfig?.module && mapping.emSystemConfig?.pf) {
      mapped.pf = true;
    }

    // New emChangeConfig (module event based mapping)
    if (mapping.emChangeConfig?.enabled !== false && mapping.emChangeConfig?.module) {
      if (mapping.emChangeConfig.totalKw) mapped.load = true;
      if (mapping.emChangeConfig.vR) mapped.voltage = true;
      if (mapping.emChangeConfig.iR) mapped.current = true;
      if (mapping.emChangeConfig.pf) mapped.pf = true;
    }

    // emWarningConfig
    if (mapping.emWarningConfig?.enabled !== false && mapping.emWarningConfig?.module) {
      if (mapping.emWarningConfig.connectedStatus) mapped.warning = true;
    }

    // emReadConfig
    if (mapping.emReadConfig?.enabled !== false && mapping.emReadConfig?.module) {
      if (mapping.emReadConfig.meterSrno) mapped.read = true;
    }

    return mapped;
  };


  // Live Telemetry Sync using Websockets and Polling
  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    const fetchTemplates = () => {
      fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const mapped = data.map(t => {
            const hasDef = t.defaultValues && typeof t.defaultValues === 'object' && Object.keys(t.defaultValues).length > 0;
            const defValues = hasDef ? t.defaultValues : null;
            const mappingSource = defValues || t.settings?.[0]?.meta || {};
            return {
              id: t.id,
              name: t.name,
              category: (defValues && defValues.category) || t.category || 'Water Management',
              module: (defValues && defValues.module) || t.settings?.[0]?.eventKey || 'AG Tank',
              mapping: mappingSource
            };
          });
          setTemplates(mapped);
          localStorage.setItem('scada_templates', JSON.stringify(mapped));
        })
        .catch(err => console.error('Error fetching templates in SubMeters:', err));
    };

    socket.on('connect', () => {
      console.log('SubMeters WebSocket Connected - Listening for Telemetry');
    });

    socket.on('templates_updated', fetchTemplates);

    const processTelemetry = (stats) => {
      if (!Array.isArray(stats)) return;

      setMeters(prev => {
        let updated = false;
        const nextMeters = prev.map(meter => {
          const template = getTemplateForMeter(meter.label);
          if (!template || !template.mapping) return meter;

          const mapping = template.mapping;
          const updatedMeter = { ...meter };
          let meterUpdated = false;

          const PARAMETER_SYNONYMS = {
            ebKwh: ['3,151', '3,152', '4,91F', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
            ebKvah: ['3,152', '3,157', '4,93F', 'EB KVAH', 'EB_KVAH', 'APPARENT ENERGY'],
            balance: ['3,162', '3,168', 'BALANCE', 'PREPAID BALANCE', 'AMT', 'AMOUNT', 'CREDIT', 'PREPAID_BALANCE'],
            totalKw: ['3,190', '3,151', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER'],
            totalKva: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER'],
            vR: ['3,168', '3,163', 'VOLTAGE R', 'VOLTAGE_R', 'VR', 'V_R', 'UA', 'U1', 'LINE VOLTS (R)', 'VOLTAGE R-PHASE', 'Voltage-R'],
            vY: ['3,169', '3,164', 'VOLTAGE Y', 'VOLTAGE_Y', 'VY', 'V_Y', 'UB', 'U2', 'LINE VOLTS (Y)', 'VOLTAGE Y-PHASE', 'Voltage-Y'],
            vB: ['3,170', '3,165', 'VOLTAGE B', 'VOLTAGE_B', 'VB', 'V_B', 'UC', 'U3', 'LINE VOLTS (B)', 'VOLTAGE B-PHASE', 'Voltage-B'],
            iR: ['3,171', '3,166', 'CURRENT R', 'CURRENT_R', 'IR', 'I_R', 'IA', 'A1', 'LINE AMPS (R)', 'R-CURRENT', 'R-Current'],
            iY: ['3,172', '3,167', 'CURRENT Y', 'CURRENT_Y', 'IY', 'I_Y', 'A2', 'LINE AMPS (Y)', 'Y-CURRENT', 'Y-current', 'Y-Current'],
            iB: ['3,173', '3,168', 'CURRENT B', 'CURRENT_B', 'IB', 'I_B', 'IC', 'A3', 'LINE AMPS (B)', 'B-CURRENT', 'B-current', 'B-Current'],
            pf: ['3,174', 'POWER FACTOR', 'PF', 'SYSTEM PF', 'POWER_FACTOR'],
            dgKwh: ['3,180', '3,181', 'DG KWH', 'DG_KWH', 'DG ACTIVE', 'DG ENERGY', 'GENERATOR ENERGY'],
            fixedCharge: ['3,163', 'FIXED CHARGE', 'FIXED_CHARGE', 'CHARGES'],
            activePower: ['3,190', '3,151', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER', 'Total KW'],
            reactivePower: ['3,192', 'REACTIVE POWER', 'REACTIVE_POWER'],
            apparentPower: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER', 'Total KVA'],
            cumulativekWh: ['3,151', '3,152', '4,91F', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
            freq: ['3,153', 'FREQUENCY', 'FREQ', '50HZ', 'F', 'HZ'],
            lowBalanceCut: ['3,164', 'LOW BALANCE', 'BALANCE CUT', 'LOW_BAL', 'LOW_BALANCE_CUT'],
            overloadTrip: ['3,165', 'OVERLOAD TRIP', 'OL TRIP', 'OVERLOAD_TRIP'],
            overloadLimitReached: ['3,166', 'OVERLOAD LIMIT', 'OL LIMIT', 'OVERLOAD_WARN'],
            connectedStatus: ['3,167', 'CONNECTED STATUS', 'RELAY STATUS', 'BREAKER STATUS', 'CONNECTED', 'CONNECTED_STATUS'],
            forceOff: ['3,168', 'FORCE OFF', 'REMOTE TRIP', 'FORCE_OFF'],
            meterSrno: ['3,150', 'METER SERIAL', 'SERIAL NUMBER', 'SR NO', 'METER SR', 'METER_NO', 'METERSRNO', 'Meter_Srno'],
            noOfOverloadCheck: ['3,169', 'OVERLOAD CHECK', 'OL CHECK', 'OVERLOAD_COUNT', 'NOOFOVERLOADCHECK'],
            ebDgStatus: ['3,170', 'EB DG STATUS', 'EB/DG STATUS', 'SOURCE STATUS', 'EB_DG', 'EBDGSTATUS'],
            ebTariff: ['3,160', 'EB TARIFF', 'GRID TARIFF', 'EB_RATE', 'EBTARIFF'],
            dgTariff: ['3,172', 'DG TARIFF', 'GEN RATE', 'DG_RATE', 'DGTARIFF'],
            ebRLoadSet: ['3,173', 'EB R LOAD', 'EB_R_LOAD', 'EB_R_LIMIT', 'EBRLOADSET'],
            ebYLoadSet: ['3,174', 'EB Y LOAD', 'EB_Y_LOAD', 'EB_Y_LIMIT', 'EBYLOADSET'],
            ebBLoadSet: ['3,175', 'EB B LOAD', 'EB_B_LOAD', 'EB_B_LIMIT', 'EBBLOADSET'],
            dgRLoadSet: ['3,176', 'DG R LOAD', 'DG_R_LOAD', 'DG_R_LIMIT', 'DGRLOADSET'],
            dgYLoadSet: ['3,177', 'DG Y LOAD', 'DG_Y_LOAD', 'DG_Y_LIMIT', 'DGYLOADSET'],
            dgBLoadSet: ['3,178', 'DG B LOAD', 'DG_B_LOAD', 'DG_B_LIMIT', 'DGBLOADSET'],
          };

          const getValueForField = (config, fieldKey) => {
            if (config && config.enabled !== false && config[fieldKey]) {
              const fieldVal = config[fieldKey];
              let cleanKey = fieldVal;
              let targetModuleId = config.module;

              // Extract moduleId and clean field key from "moduleId::fieldId" format
              if (typeof fieldVal === 'string' && fieldVal.includes(':')) {
                const parts = fieldVal.split(':');
                targetModuleId = parts[0];
                cleanKey = parts.pop();
              }

              const stat = stats.find(s => String(s.moduleId) === String(targetModuleId) || String(s.meta?.module_id) === String(targetModuleId));
              if (stat && stat.meta) {
                // 1. Try matching cleanKey exactly in meta
                if (cleanKey && stat.meta[cleanKey] !== undefined) {
                  return stat.meta[cleanKey];
                }

                // 2. Try matching fieldVal exactly in meta (raw key)
                if (stat.meta[fieldVal] !== undefined) {
                  return stat.meta[fieldVal];
                }

                // 3. Case-insensitive match of cleanKey
                if (cleanKey) {
                  const cleanKeyLower = cleanKey.toLowerCase().trim();
                  const foundKey = Object.keys(stat.meta).find(k => k.toLowerCase().trim() === cleanKeyLower);
                  if (foundKey && stat.meta[foundKey] !== undefined) {
                    return stat.meta[foundKey];
                  }
                }

                // 4. Parse "[CHANGE] LABEL | ActualKey (register)" format
                if (typeof fieldVal === 'string' && fieldVal.includes('] ')) {
                  let inner = fieldVal.split('] ')[1];
                  if (inner) {
                    // Try "ActualKey" after pipe separator
                    if (inner.includes(' | ')) {
                      const afterPipe = inner.split(' | ')[1];
                      if (afterPipe) {
                        const actualKey = afterPipe.split(' (')[0].trim();
                        if (actualKey && stat.meta[actualKey] !== undefined) {
                          return stat.meta[actualKey];
                        }
                        // Case-insensitive
                        const foundPipeKey = Object.keys(stat.meta).find(k => k.toLowerCase().trim() === actualKey.toLowerCase().trim());
                        if (foundPipeKey && stat.meta[foundPipeKey] !== undefined) {
                          return stat.meta[foundPipeKey];
                        }
                      }
                      // Try the label before pipe
                      const beforePipe = inner.split(' | ')[0].split(' (')[0].trim();
                      if (beforePipe && stat.meta[beforePipe] !== undefined) {
                        return stat.meta[beforePipe];
                      }
                      const foundBeforePipeKey = Object.keys(stat.meta).find(k => k.toLowerCase().trim() === beforePipe.toLowerCase().trim());
                      if (foundBeforePipeKey && stat.meta[foundBeforePipeKey] !== undefined) {
                        return stat.meta[foundBeforePipeKey];
                      }
                    } else {
                      // No pipe, try the inner label directly
                      const innerKey = inner.split(' (')[0].trim();
                      if (innerKey && stat.meta[innerKey] !== undefined) {
                        return stat.meta[innerKey];
                      }
                      const foundInnerKey = Object.keys(stat.meta).find(k => k.toLowerCase().trim() === innerKey.toLowerCase().trim());
                      if (foundInnerKey && stat.meta[foundInnerKey] !== undefined) {
                        return stat.meta[foundInnerKey];
                      }
                    }
                  }
                }

                // 5. Fallback: Search using PARAMETER_SYNONYMS map (same as MainMeter)
                const synonyms = PARAMETER_SYNONYMS[fieldKey] || [];
                for (const sym of synonyms) {
                  if (stat.meta[sym] !== undefined) {
                    return stat.meta[sym];
                  }
                  // Try normalized matching within stat.meta keys
                  const matchedKey = Object.keys(stat.meta).find(k =>
                    k.toUpperCase() === sym.toUpperCase() ||
                    k.toUpperCase().replace(/[^A-Z0-9]/g, '') === sym.toUpperCase().replace(/[^A-Z0-9]/g, '')
                  );
                  if (matchedKey && stat.meta[matchedKey] !== undefined) {
                    return stat.meta[matchedKey];
                  }
                }
              }
            }
            return null;
          };

          const telemetryValues = { ...(meter.telemetryValues || {}) };
          const skipKeys = new Set(['organization', 'client', 'zone', 'subZone', 'building', 'device', 'module', 'enabled', 'mappingId', 'fixedCharge']);

          const configsToProcess = [
            { config: mapping.emVoltageConfig, fields: ['vR', 'vY', 'vB'] },
            { config: mapping.emCurrentConfig, fields: ['iR', 'iY', 'iB'] },
            { config: mapping.emPowerConfig, fields: ['activePower', 'reactivePower', 'apparentPower'] },
            { config: mapping.emSystemConfig, fields: ['pf', 'freq', 'commStatus'] },
            { config: mapping.emConsumptionConfig, fields: ['cumulativekWh'] },
            {
              config: mapping.emChangeConfig,
              fields: ['ebKvah', 'ebKwh', 'balance', 'totalKw', 'vR', 'vY', 'vB', 'iR', 'iY', 'iB', 'pf', 'totalKva', 'dgKwh']
            },
            {
              config: mapping.emWarningConfig,
              fields: ['lowBalanceCut', 'overloadTrip', 'overloadLimitReached', 'connectedStatus', 'forceOff']
            },
            {
              config: mapping.emReadConfig,
              fields: ['meterSrno', 'noOfOverloadCheck', 'ebDgStatus', 'ebTariff', 'dgTariff', 'ebRLoadSet', 'ebYLoadSet', 'ebBLoadSet', 'dgRLoadSet', 'dgYLoadSet', 'dgBLoadSet']
            }
          ];

          configsToProcess.forEach(({ config, fields }) => {
            if (config && config.enabled !== false) {
              fields.forEach(field => {
                const val = getValueForField(config, field);
                if (val !== null) {
                  telemetryValues[field] = val;
                }
              });
            }
          });

          // Telemetry Sanitization & Calibration (matching MainMeter logic)
          const ebTar = Number(telemetryValues.ebTariff);
          if (isNaN(ebTar) || ebTar > 100 || ebTar <= 0) {
            telemetryValues.ebTariff = 7.50; // Fallback standard grid tariff rate
          }
          const dgTar = Number(telemetryValues.dgTariff);
          if (isNaN(dgTar) || dgTar > 100 || dgTar <= 0) {
            telemetryValues.dgTariff = 18.50; // Fallback standard generator tariff rate
          }

          updatedMeter.telemetryValues = telemetryValues;

          // Extract the latest MongoDB event timestamp for freshness tracking.
          // This is used by getMeterOnlineStatus to decide if a telemetry fallback is valid.
          // We must do this here while we still have access to the `stats` array from the API.
          const allCfgs = [
            mapping.emVoltageConfig, mapping.emCurrentConfig, mapping.emPowerConfig,
            mapping.emSystemConfig, mapping.emConsumptionConfig, mapping.emChangeConfig,
            mapping.emWarningConfig, mapping.emReadConfig
          ];
          let latestTs = null;
          allCfgs.forEach(cfg => {
            if (cfg && cfg.enabled !== false && cfg.module) {
              const matchStat = stats.find(s =>
                String(s.moduleId) === String(cfg.module) ||
                String(s.meta?.module_id) === String(cfg.module)
              );
              if (matchStat?.meta?.created_at_timestamp) {
                const raw = matchStat.meta.created_at_timestamp;
                // Handle both seconds and milliseconds timestamps
                const tsMs = raw > 1e12 ? raw : raw * 1000;
                if (!latestTs || tsMs > latestTs) latestTs = tsMs;
              }
            }
          });
          if (latestTs) updatedMeter.lastTelemetryTimestamp = latestTs;

          // Assign individual fields with fallback
          if (telemetryValues.vR !== undefined && telemetryValues.vR !== null) updatedMeter.vR = Number(telemetryValues.vR);
          if (telemetryValues.vY !== undefined && telemetryValues.vY !== null) updatedMeter.vY = Number(telemetryValues.vY);
          if (telemetryValues.vB !== undefined && telemetryValues.vB !== null) updatedMeter.vB = Number(telemetryValues.vB);
          if (telemetryValues.iR !== undefined && telemetryValues.iR !== null) updatedMeter.iR = Number(telemetryValues.iR);
          if (telemetryValues.iY !== undefined && telemetryValues.iY !== null) updatedMeter.iY = Number(telemetryValues.iY);
          if (telemetryValues.iB !== undefined && telemetryValues.iB !== null) updatedMeter.iB = Number(telemetryValues.iB);

          if (telemetryValues.freq !== undefined && telemetryValues.freq !== null) {
            const fNum = Number(telemetryValues.freq);
            if (fNum >= 40 && fNum <= 65) {
              updatedMeter.freq = fNum;
            }
          }

          if (telemetryValues.activePower !== undefined && telemetryValues.activePower !== null) updatedMeter.activePower = Number(telemetryValues.activePower);
          else if (telemetryValues.totalKw !== undefined && telemetryValues.totalKw !== null) updatedMeter.activePower = Number(telemetryValues.totalKw);

          if (telemetryValues.reactivePower !== undefined && telemetryValues.reactivePower !== null) updatedMeter.reactivePower = Number(telemetryValues.reactivePower);

          if (telemetryValues.apparentPower !== undefined && telemetryValues.apparentPower !== null) updatedMeter.apparentPower = Number(telemetryValues.apparentPower);
          else if (telemetryValues.totalKva !== undefined && telemetryValues.totalKva !== null) updatedMeter.apparentPower = Number(telemetryValues.totalKva);

          if (telemetryValues.pf !== undefined && telemetryValues.pf !== null) updatedMeter.pf = Number(telemetryValues.pf);

          // Calculate average voltage across mapped phases
          const phaseVoltages = [];
          if (updatedMeter.vR !== undefined && updatedMeter.vR !== null && !isNaN(updatedMeter.vR)) phaseVoltages.push(updatedMeter.vR);
          if (updatedMeter.vY !== undefined && updatedMeter.vY !== null && !isNaN(updatedMeter.vY)) phaseVoltages.push(updatedMeter.vY);
          if (updatedMeter.vB !== undefined && updatedMeter.vB !== null && !isNaN(updatedMeter.vB)) phaseVoltages.push(updatedMeter.vB);
          if (phaseVoltages.length > 0) {
            updatedMeter.voltage = phaseVoltages.reduce((sum, v) => sum + v, 0) / phaseVoltages.length;
          } else {
            updatedMeter.voltage = 0.0;
          }

          // Calculate average current across mapped phases
          const phaseCurrents = [];
          if (updatedMeter.iR !== undefined && updatedMeter.iR !== null && !isNaN(updatedMeter.iR)) phaseCurrents.push(updatedMeter.iR);
          if (updatedMeter.iY !== undefined && updatedMeter.iY !== null && !isNaN(updatedMeter.iY)) phaseCurrents.push(updatedMeter.iY);
          if (updatedMeter.iB !== undefined && updatedMeter.iB !== null && !isNaN(updatedMeter.iB)) phaseCurrents.push(updatedMeter.iB);
          if (phaseCurrents.length > 0) {
            updatedMeter.current = phaseCurrents.reduce((sum, i) => sum + i, 0) / phaseCurrents.length;
          } else {
            updatedMeter.current = 0.0;
          }

          // Set overall load and pf
          updatedMeter.load = updatedMeter.activePower ?? (telemetryValues.totalKw !== undefined ? Number(telemetryValues.totalKw) : 0.0);
          updatedMeter.pf = updatedMeter.pf ?? 0.0;

          // Backwards compatibility for moduleEvents structure
          const moduleEvents = { change: [], warning: [], read: [] };
          const resolveSection = (config, target) => {
            if (!config || config.enabled === false) return;
            Object.keys(config).forEach(key => {
              if (skipKeys.has(key) || !config[key]) return;
              const val = getValueForField(config, key);
              const meta = FIELD_LABELS[key] || { label: key, unit: '' };
              target.push({ key, label: meta.label, value: val, unit: meta.unit });
            });
          };
          resolveSection(mapping.emChangeConfig, moduleEvents.change);
          resolveSection(mapping.emWarningConfig, moduleEvents.warning);
          resolveSection(mapping.emReadConfig, moduleEvents.read);
          updatedMeter.moduleEvents = moduleEvents;
          meterUpdated = true;

          if (meterUpdated) {
            updatedMeter.status = updatedMeter.load > 0.05 ? 'Running' : 'Stopped';
            updated = true;
          }

          return updatedMeter;
        });

        return updated ? nextMeters : prev;
      });
    };

    socket.on('telemetry_update', processTelemetry);

    const fetchStats = async () => {
      try {
        const modulesToPoll = new Set();

        const extractModuleId = (config, keys) => {
          if (!config) return null;
          if (config.module && config.module !== 'ALL') return config.module;
          for (const k of keys) {
            if (config[k] && typeof config[k] === 'string' && config[k].includes(':')) {
              const parts = config[k].split(':');
              if (parts[0]) return parts[0];
            }
          }
          return config.module || null;
        };

        meters.forEach(meter => {
          const template = getTemplateForMeter(meter.label);
          if (template?.mapping) {
            const mapping = template.mapping;
            const configFieldsMap = [
              { config: mapping.emVoltageConfig, fields: ['vR', 'vY', 'vB'] },
              { config: mapping.emCurrentConfig, fields: ['iR', 'iY', 'iB'] },
              { config: mapping.emPowerConfig, fields: ['activePower', 'reactivePower', 'apparentPower'] },
              { config: mapping.emSystemConfig, fields: ['pf', 'freq'] },
              { config: mapping.emConsumptionConfig, fields: ['cumulativekWh'] },
              {
                config: mapping.emChangeConfig,
                fields: ['ebKvah', 'ebKwh', 'balance', 'totalKw', 'vR', 'vY', 'vB', 'iR', 'iY', 'iB', 'pf', 'totalKva', 'dgKwh']
              },
              {
                config: mapping.emWarningConfig,
                fields: ['lowBalanceCut', 'overloadTrip', 'overloadLimitReached', 'connectedStatus', 'forceOff']
              },
              {
                config: mapping.emReadConfig,
                fields: ['meterSrno', 'noOfOverloadCheck', 'ebDgStatus', 'ebTariff', 'dgTariff', 'ebRLoadSet', 'ebYLoadSet', 'ebBLoadSet', 'dgRLoadSet', 'dgYLoadSet', 'dgBLoadSet']
              }
            ];

            configFieldsMap.forEach(({ config, fields }) => {
              if (config && config.enabled !== false) {
                const modId = extractModuleId(config, fields);
                if (modId) {
                  modulesToPoll.add(String(modId));
                }
              }
            });
          }
        });

        const pollList = Array.from(modulesToPoll);
        if (pollList.length === 0) return;

        const url = `${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates/stats?modules=${pollList.join(',')}`;
        const res = await fetch(url);
        if (res.ok) {
          const stats = await res.json();
          processTelemetry(stats);
        }
      } catch (err) {
        console.error('Error fetching sub meters stats:', err);
      }
    };

    fetchStats();
    const pollingInterval = setInterval(fetchStats, 2000);

    return () => {
      socket.disconnect();
      clearInterval(pollingInterval);
    };
  }, [templates, meters.length]);

  return (
    <div className="fade-in">
      {/* HEADER SECTION */}
      <div className="page-header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 text-white fw-bold d-flex align-items-center gap-2">
            <Cpu className="text-info" size={26} /> Facility Sub-Meters Dashboard
          </h2>
          <p className="text-secondary fs-7">Granular power metrics, current loading, and status indicators across individual feeds.</p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end">
          {groupSaveStatus && <Badge bg="success" className="px-3 py-2">{groupSaveStatus}</Badge>}
          <button
            onClick={() => setShowGroupingSettings(true)}
            className="btn btn-outline-info rounded-pill px-3 py-2 d-flex align-items-center gap-2"
            style={{ borderColor: 'rgba(56,189,248,0.35)', color: '#7dd3fc', background: 'rgba(56,189,248,0.08)' }}
          >
            <Settings2 size={16} /> MFM Group Settings
          </button>
          <PdfButton />
        </div>
      </div>

      {/* METERS CARD GRID */}
      <Row className="row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3 mb-4 justify-content-center">
        {meters.map((meter, index) => {
          const isMapped = getMeterMappedStatus(meter.label);
          const isOnline = getMeterOnlineStatus(meter.label);
          return (
            <Col key={index} className="d-flex justify-content-center">
              <MiniMFMMeter
                meter={meter}
                isMapped={isMapped}
                isOnline={isOnline}
                onClick={() => {
                  setSelectedMeter(meter);
                  if (refreshStatuses) refreshStatuses();
                }}
              />
            </Col>
          );
        })}
      </Row>

      {/* FILTER TABS & LOAD ANALYSIS */}
      <Card className="scada-card border-0 text-white mt-4" style={{ background: '#0f172a' }}>
        <Card.Body className="p-4">
          <h5 className="mb-4 fw-black text-white d-flex align-items-center gap-2 uppercase tracking-wide fs-11">
            <Activity className="text-info" size={18} /> Sub-Meters Performance Diagnostics
          </h5>

          <Tabs defaultActiveKey="all" className="scada-tabs border-bottom border-secondary border-opacity-15 mb-4">
            <Tab eventKey="all" title="ALL FEEDS">
              <div className="table-responsive mt-3">
                <Table hover borderless className="align-middle scada-table text-white mb-0">
                  <thead>
                    <tr className="border-bottom border-secondary border-opacity-15 fs-13 text-secondary text-uppercase tracking-wider">
                      <th className="py-3">Meter ID</th>
                      <th className="py-3">Feed Description</th>
                      <th className="py-3 text-center">Operational Load</th>
                      <th className="py-3 text-center">Avg. Volts</th>
                      <th className="py-3 text-center">Phase Amps</th>
                      <th className="py-3 text-center">cos φ</th>
                      <th className="py-3 text-end">Health Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meters.map((meter, idx) => {
                      const isMapped = getMeterMappedStatus(meter.label);
                      const isOnline = getMeterOnlineStatus(meter.label);
                      const hasTelemetry = Object.keys(meter.telemetryValues || {}).length > 0;
                      const showActive = !isMapped || isOnline || hasTelemetry;
                      const fmtNum = (v, d = 1) => { const n = Number(v); return isNaN(n) ? '0.0' : n.toFixed(d); };
                      return (
                        <tr key={idx} className="border-bottom border-secondary border-opacity-5">
                          <td className="py-3 font-monospace text-info fs-13">{meter.id}</td>
                          <td className="py-3 text-white fw-bold">{meter.label}</td>
                          <td className="py-3 text-center text-white fw-bold">{showActive ? `${fmtNum(meter.load)} kW` : '—'}</td>
                          <td className="py-3 text-center text-secondary">{showActive ? `${fmtNum(meter.voltage)} V` : '—'}</td>
                          <td className="py-3 text-center text-secondary">{showActive ? `${fmtNum(meter.current)} A` : '—'}</td>
                          <td className="py-3 text-center text-secondary font-monospace">{showActive ? fmtNum(meter.pf, 3) : '—'}</td>
                          <td className="py-3 text-end">{isMapped ? <StatusBadge status={isOnline ? meter.status : 'Offline'} /> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Tab>
            <Tab eventKey="critical" title="CRITICAL LOADS">
              <div className="table-responsive mt-3">
                <Table hover borderless className="align-middle scada-table text-white mb-0">
                  <thead>
                    <tr className="border-bottom border-secondary border-opacity-15 fs-13 text-secondary text-uppercase tracking-wider">
                      <th className="py-3">Meter ID</th>
                      <th className="py-3">Feed Description</th>
                      <th className="py-3 text-center">Operational Load</th>
                      <th className="py-3 text-center">Avg. Volts</th>
                      <th className="py-3 text-center">cos φ</th>
                      <th className="py-3 text-end">Health Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meters.filter(m => m.type === 'Server Room' || m.type === 'Utility').map((meter, idx) => {
                      const isMapped = getMeterMappedStatus(meter.label);
                      const isOnline = getMeterOnlineStatus(meter.label);
                      const hasTelemetry = Object.keys(meter.telemetryValues || {}).length > 0;
                      const showActive = !isMapped || isOnline || hasTelemetry;
                      const fmtNum = (v, d = 1) => { const n = Number(v); return isNaN(n) ? '0.0' : n.toFixed(d); };
                      return (
                        <tr key={idx} className="border-bottom border-secondary border-opacity-5">
                          <td className="py-3 font-monospace text-info fs-13">{meter.id}</td>
                          <td className="py-3 text-white fw-bold">{meter.label}</td>
                          <td className="py-3 text-center text-white fw-bold">{showActive ? `${fmtNum(meter.load)} kW` : '—'}</td>
                          <td className="py-3 text-center text-secondary">{showActive ? `${fmtNum(meter.voltage)} V` : '—'}</td>
                          <td className="py-3 text-center text-secondary font-monospace">{showActive ? fmtNum(meter.pf, 3) : '—'}</td>
                          <td className="py-3 text-end">{isMapped ? <StatusBadge status={isOnline ? meter.status : 'Offline'} /> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <Modal
        show={showGroupingSettings}
        onHide={() => setShowGroupingSettings(false)}
        size="xl"
        centered
        dialogClassName="scada-glass-modal"
        contentClassName="border-0 text-white"
      >
        <Modal.Header closeButton closeVariant="white" className="border-bottom border-secondary border-opacity-25 py-3" style={{ background: 'rgba(15, 23, 42, 0.55)' }}>
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <FolderTree className="text-info" size={18} /> Sub Meter Group Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ background: 'rgba(15, 23, 42, 0.94)' }}>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
            <div>
              <h6 className="text-info fw-bold mb-2">Group your MFM meters from here</h6>
              <p className="text-secondary mb-0" style={{ fontSize: '0.88rem' }}>
                User yahin se sub meters ko custom groups me daal sakta hai. Save karte hi Energy Metering Overview me grouped values dikh jayengi.
              </p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button onClick={addMeterGroup} className="btn btn-outline-info rounded-pill px-3 py-2 d-flex align-items-center gap-2">
                <Plus size={15} /> Add Group
              </button>
              <button onClick={saveMeterGroups} disabled={duplicateGroupNames.size > 0} className="btn btn-info rounded-pill px-4 py-2 fw-bold d-flex align-items-center gap-2">
                <Settings2 size={15} /> Save Groups
              </button>
            </div>
          </div>

          <Row className="g-4">
            <Col lg={4}>
              <div className="grouping-panel h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="grouping-panel-title">Available MFM Meters</span>
                  <Badge bg="dark" className="border border-info border-opacity-25 text-info">{meters.length}</Badge>
                </div>
                <div className="d-flex flex-column gap-2">
                  {meters.map(meter => {
                    const assignedGroup = meterGroups.find(group => group.meterIds.includes(String(meter.templateId ?? meter.id)));
                    return (
                      <div key={meter.id} className="group-meter-pill">
                        <div>
                          <div className="text-white fw-bold fs-13">{meter.label}</div>
                          <small className="text-secondary">{meter.type}</small>
                        </div>
                        <Badge
                          bg="none"
                          className="border"
                          style={{
                            color: assignedGroup?.color || '#94a3b8',
                            borderColor: `${assignedGroup?.color || '#94a3b8'}55`,
                            background: assignedGroup ? `${assignedGroup.color}15` : 'rgba(148,163,184,0.08)'
                          }}
                        >
                          {assignedGroup?.name || 'Ungrouped'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Col>

            <Col lg={8}>
              <div className="d-flex flex-column gap-3">
                {meterGroups.length === 0 ? (
                  <div className="grouping-panel text-center py-5">
                    <h6 className="text-white mb-2">No groups created yet</h6>
                    <p className="text-secondary mb-0">Start by creating a group like VRV, Utility Block, Commercial Wing or Lighting.</p>
                  </div>
                ) : (
                  meterGroups.map((group, index) => {
                    const hasNewGroup = meterGroups.some(g => g.isNew);
                    const isGroupDisabled = hasNewGroup && !group.isNew;
                    const normalizedName = String(group.name || '').trim().toLowerCase();
                    const hasDuplicateName = normalizedName && duplicateGroupNames.has(normalizedName);
                    return (
                      <div key={group.id} className="grouping-panel" style={{ opacity: isGroupDisabled ? 0.65 : 1 }}>
                        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
                          <div className="d-flex align-items-center gap-3 flex-grow-1">
                            <div className="grouping-strip" style={{ background: isGroupDisabled ? '#475569' : group.color }} />
                            <div className="d-flex gap-2 flex-wrap flex-grow-1">
                              <Form.Control
                                value={group.name}
                                onChange={(e) => updateMeterGroup(group.id, 'name', e.target.value)}
                                className={`grouping-input ${hasDuplicateName ? 'is-invalid' : ''}`}
                                placeholder={`Group ${index + 1}`}
                                disabled={isGroupDisabled}
                              />
                              <Form.Control
                                type="color"
                                value={group.color}
                                onChange={(e) => updateMeterGroup(group.id, 'color', e.target.value)}
                                className="grouping-color-input"
                                disabled={isGroupDisabled}
                              />
                              {hasDuplicateName && (
                                <div className="w-100">
                                  <small className="text-danger">This group name is already used. Choose a different name.</small>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeMeterGroup(group.id)}
                            disabled={isGroupDisabled}
                            className="btn btn-outline-danger rounded-pill px-3 py-2 d-flex align-items-center gap-2"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        </div>

                        <div className="d-flex flex-wrap gap-2">
                          {getGroupMeterOptions(group.id).map(meter => {
                            const meterKey = String(meter.templateId ?? meter.id);
                            const checked = group.meterIds.includes(meterKey);
                            const assignedElsewhere = getAssignedGroupForMeter(meterKey, group.id);
                            const disabled = (!checked && !!assignedElsewhere) || isGroupDisabled;
                            return (
                              <label
                                key={`${group.id}-${meter.id}`}
                                className={`grouping-chip ${checked ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                                style={{
                                  borderColor: checked ? (isGroupDisabled ? 'rgba(148,163,184,0.12)' : `${group.color}55`) : disabled ? 'rgba(239,68,68,0.28)' : 'rgba(148,163,184,0.12)',
                                  background: checked ? (isGroupDisabled ? 'rgba(148,163,184,0.08)' : `${group.color}15`) : disabled ? 'rgba(51, 65, 85, 0.55)' : 'rgba(15,23,42,0.72)',
                                  opacity: disabled ? 0.5 : 1,
                                  pointerEvents: disabled ? 'none' : 'auto'
                                }}
                              >
                                <span
                                  className={`grouping-checkmark ${checked ? 'visible' : ''}`}
                                  style={{
                                    background: checked ? (isGroupDisabled ? '#64748b' : '#d946ef') : 'rgba(148,163,184,0.18)',
                                    borderColor: checked ? (isGroupDisabled ? '#94a3b8' : '#e879f9') : 'rgba(255,255,255,0.16)',
                                    color: checked ? '#ffffff' : 'transparent'
                                  }}
                                >
                                  <Check size={12} strokeWidth={3} />
                                </span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => toggleMeterAssignment(group.id, meterKey)}
                                />
                                <span className="text-white fw-bold fs-13">{meter.label}</span>
                                <small className={disabled ? 'text-danger' : 'text-secondary'}>
                                  {disabled ? (isGroupDisabled ? 'Locked (Editing new group)' : `Locked in ${assignedElsewhere.name}`) : meter.type}
                                </small>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Col>
          </Row>

          <div className="grouping-panel mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="grouping-panel-title">Ungrouped meters still shown individually on overview</span>
              <Badge bg="dark" className="border border-warning border-opacity-25 text-warning">{ungroupedMeters.length}</Badge>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {ungroupedMeters.length === 0 ? (
                <span className="text-secondary">All sub meters are assigned to a custom group.</span>
              ) : (
                ungroupedMeters.map(meter => (
                  <div key={meter.id} className="group-ungrouped-chip">
                    <span className="text-white fw-bold fs-13">{meter.label}</span>
                    <small className="text-secondary">{meter.type}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={showSaveSuccessPopup}
        onHide={() => setShowSaveSuccessPopup(false)}
        centered
        dialogClassName="success-modal"
        contentClassName="border-0 text-white"
      >
        <Modal.Body className="p-4 text-center" style={{ background: 'linear-gradient(180deg, rgba(8,47,73,0.96), rgba(15,23,42,0.98))' }}>
          <div className="success-pop-wrap">
            <div className="success-pop-icon">
              <CheckCircle2 size={38} />
            </div>
            <h4 className="text-white fw-black mb-2">{saveSuccessMessage}</h4>
            <p className="text-info mb-0">Overview updated.</p>
          </div>
        </Modal.Body>
      </Modal>

      {/* DETAILED DATA MODAL */}
      <Modal show={selectedMeter !== null && activeMeter !== null} onHide={() => setSelectedMeter(null)} size="lg" centered dialogClassName="scada-glass-modal" contentClassName="border-0 text-white">
        {activeMeter && (() => {
          const isMapped = getMeterMappedStatus(activeMeter.label);
          const isOnline = getMeterOnlineStatus(activeMeter.label);
          const showActive = !isMapped || isOnline;
          return (
            <>
              <Modal.Header closeButton closeVariant="white" className="border-bottom border-secondary border-opacity-25 py-3" style={{ background: 'rgba(15, 23, 42, 0.4)', zIndex: 1 }}>
                <Modal.Title className="fw-bold d-flex align-items-center gap-2 w-100 justify-content-between pe-3">
                  <div className="d-flex align-items-center gap-2">
                    <Zap className={showActive ? "text-info animate-pulse glow-text-info" : "text-secondary"} />
                    <div className="d-flex flex-column">
                      <span className={`text-white fs-5 ${showActive ? 'glow-text-info' : ''} fw-black uppercase tracking-wider`}>{activeMeter?.label}</span>
                      <span className="text-muted fs-12 font-monospace mt-1">
                        {activeMeter?.telemetryValues?.meterSrno ? `Serial No: ${activeMeter.telemetryValues.meterSrno}` : activeMeter?.id} • {activeMeter?.type}
                      </span>
                    </div>
                  </div>
                  {isMapped && (
                    isOnline ? (
                      <span className="badge bg-success bg-opacity-10 border border-success border-opacity-25 text-success px-2 py-1 rounded d-flex align-items-center gap-1 fs-12">
                        <span className="pulse-dot-green"></span> ONLINE
                      </span>
                    ) : (
                      <div className="d-flex flex-column align-items-end gap-1">
                        <span className="badge bg-danger bg-opacity-10 border border-danger border-opacity-25 text-danger px-2 py-1 rounded d-flex align-items-center gap-1 fs-12">
                          <span className="pulse-dot-red"></span> OFFLINE
                        </span>
                        <span className="text-warning opacity-75" style={{ fontSize: '0.55rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                          ⚠ LAST KNOWN DATA
                        </span>
                      </div>
                    )
                  )}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body className="p-3" style={{ maxHeight: '80vh', overflowY: 'auto', zIndex: 1, position: 'relative' }}>
                {(() => {
                  const ALL_CHANGE_FIELDS = [
                    'ebKvah', 'ebKwh', 'balance', 'totalKw', 'pf', 'totalKva', 'dgKwh',
                    'activePower', 'reactivePower', 'apparentPower', 'cumulativekWh', 'freq',
                    'vR', 'vY', 'vB', 'iR', 'iY', 'iB',
                    'vLLAvg', 'vLNAvg', 'iAvg', 'kvaAvg', 'kvarAvg', 'pfAvg',
                    'vRY', 'vYB', 'vBR', 'pfR', 'pfY', 'pfB',
                    'loadHrs', 'loadMin', 'noLoadHrs', 'noLoadMin', 'loadPct'
                  ];

                  return (
                    <Row className="g-3">
                      {/* Left Column: Change Settings Telemetry */}
                      <Col xs={12}>
                        <div className="p-3 rounded-4 scada-glass-section border-change h-100">
                          <h6 className="text-info glow-text-info uppercase tracking-wider fs-12 mb-3 d-flex align-items-center gap-2 fw-bold">
                            <Zap size={14} className="animate-pulse" /> Change Settings Telemetry
                          </h6>
                          <Row className="g-2">
                            {ALL_CHANGE_FIELDS.map(key => {
                              const meta = FIELD_LABELS[key] || { label: key, unit: '' };
                              const isFieldMapped = activeMeter?.moduleEvents?.change?.some(e => e.key === key) ||
                                                    activeMeter?.moduleEvents?.warning?.some(e => e.key === key) ||
                                                    activeMeter?.moduleEvents?.read?.some(e => e.key === key);
                              
                              // HIDE UNMAPPED FIELDS IF METER IS MAPPED
                              if (isMapped && !isFieldMapped) return null;

                              const shouldShowValue = !isMapped || isFieldMapped;
                              const val = shouldShowValue ? (activeMeter?.telemetryValues?.[key] ?? activeMeter?.[key]) : null;
                              return (
                                <Col sm={4} xs={6} key={key} className="mb-2">
                                  <TelemetryCard
                                    label={meta.label}
                                    value={formatTelemetryValue(val)}
                                    unit={meta.unit}
                                    colorClass="text-info glow-text-info"
                                    type="change"
                                    isMapped={!isMapped || isFieldMapped}
                                    isOnline={!isMapped || isOnline}
                                  />
                                </Col>
                              );
                            })}
                          </Row>
                        </div>
                      </Col>
                    </Row>
                  );
                })()}
              </Modal.Body>
              <Modal.Footer className="border-top border-secondary border-opacity-25 py-2" style={{ background: 'rgba(15, 23, 42, 0.4)', zIndex: 1 }}>
                <Button variant="outline-secondary" className="px-4 py-2 text-white border-secondary border-opacity-25" onClick={() => setSelectedMeter(null)}>Close Dashboard</Button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      <style dangerouslySetInnerHTML={{
        __html: `
        .scada-card { background: #0f172a; border-radius: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 20px -2px rgba(0,0,0,0.4); }
        .scada-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -4px rgba(0,0,0,0.5); }
        .scada-glass-card { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
        .scada-tabs .nav-link { color: #64748b; font-weight: bold; border: 0; background: transparent; padding: 12px 24px; font-size: 0.72rem; letter-spacing: 1px; }
        .scada-tabs .nav-link.active { color: #0ea5e9 !important; background: transparent !important; border-bottom: 2px solid #0ea5e9; }
        .scada-table tbody tr { transition: all 0.2s; cursor: pointer; }
        .scada-table tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
        .fw-black { font-weight: 900 !important; }
        .fs-12 { font-size: 0.65rem !important; }
        .fs-13 { font-size: 0.8rem !important; }
        .fs-7 { font-size: 1.1rem !important; }
        .tracking-widest { letter-spacing: 2px !important; }
        .lcd-grid-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: 
            linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px);
          background-size: 10px 10px;
          pointer-events: none;
          z-index: 1;
        }

        /* Modal Backdrop blur */
        .modal-backdrop {
          backdrop-filter: blur(6px) !important;
          -webkit-backdrop-filter: blur(6px) !important;
          background-color: rgba(15, 23, 42, 0.7) !important;
        }
        /* Modal Window Entrance Animation and Glassmorphism */
        .scada-glass-modal .modal-content {
          background: rgba(15, 23, 42, 0.85) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 24px !important;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(14, 165, 233, 0.15) !important;
          animation: scada-modal-zoom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          overflow: hidden;
          position: relative;
        }
        /* Subtle diagonal scanline overlay for futuristic feel */
        .scada-glass-modal .modal-content::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
          background-size: 100% 4px, 6px 100%;
          z-index: 0;
          pointer-events: none;
          opacity: 0.4;
        }
        @keyframes scada-modal-zoom {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        /* Glowing Titles and Badges */
        .glow-text-info { text-shadow: 0 0 10px rgba(14, 165, 233, 0.5); }
        .glow-text-warning { text-shadow: 0 0 10px rgba(245, 158, 11, 0.5); }
        .glow-text-success { text-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
        .glow-text-danger { text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }

        /* Enhanced Glass Sections */
        .scada-glass-section {
          background: rgba(30, 41, 59, 0.4) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 16px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 1;
        }
        .scada-glass-section:hover {
          background: rgba(30, 41, 59, 0.55) !important;
          transform: translateY(-2px);
        }
        
        .border-change {
          border: 1px solid rgba(14, 165, 233, 0.35) !important;
          box-shadow: 0 8px 32px rgba(14, 165, 233, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }
        .border-warning {
          border: 1px solid rgba(245, 158, 11, 0.35) !important;
          box-shadow: 0 8px 32px rgba(245, 158, 11, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }
        .border-read {
          border: 1px solid rgba(34, 197, 94, 0.35) !important;
          box-shadow: 0 8px 32px rgba(34, 197, 94, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }

        /* Telemetry Cards */
        .telemetry-card-glow {
          background: rgba(15, 23, 42, 0.6) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.4);
          border-radius: 12px !important;
          transition: all 0.25s ease;
        }
        .telemetry-card-glow:hover {
          background: rgba(15, 23, 42, 0.8) !important;
          transform: scale(1.03);
        }
        .telemetry-card-glow.card-hover-change:hover {
          border-color: rgba(14, 165, 233, 0.6) !important;
          box-shadow: 0 4px 15px rgba(14, 165, 233, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }
        .telemetry-card-glow.card-hover-warning:hover {
          border-color: rgba(245, 158, 11, 0.6) !important;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }
        .telemetry-card-glow.card-hover-read:hover {
          border-color: rgba(34, 197, 94, 0.6) !important;
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }

        /* Live pulsating indicator dot */
        .pulse-dot-red {
          width: 8px;
          height: 8px;
          background-color: #ef4444;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px #ef4444;
          animation: pulse-dot 1.5s infinite;
        }
        .pulse-dot-green {
          width: 8px;
          height: 8px;
          background-color: #22c55e;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px #22c55e;
          animation: pulse-dot 1.5s infinite;
        }
        @keyframes pulse-dot {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        .grouping-panel {
          background: linear-gradient(180deg, rgba(15,23,42,0.78), rgba(15,23,42,0.62));
          border: 1px solid rgba(148,163,184,0.12);
          border-radius: 18px;
          padding: 18px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .grouping-panel-title {
          color: #cbd5e1;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .group-meter-pill,
        .group-ungrouped-chip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-radius: 14px;
          padding: 12px 14px;
          background: rgba(15,23,42,0.72);
          border: 1px solid rgba(148,163,184,0.1);
        }
        .group-ungrouped-chip {
          flex-direction: column;
          align-items: flex-start;
          min-width: 220px;
        }
        .grouping-strip {
          width: 12px;
          height: 48px;
          border-radius: 999px;
          box-shadow: 0 0 18px rgba(255,255,255,0.12);
        }
        .grouping-input {
          min-width: 240px;
          background: rgba(15,23,42,0.92) !important;
          color: #fff !important;
          border: 1px solid rgba(148,163,184,0.18) !important;
        }
        .grouping-color-input {
          width: 54px;
          min-height: 42px;
          background: transparent !important;
          border: 1px solid rgba(148,163,184,0.18) !important;
          border-radius: 12px;
          padding: 4px;
        }
        .grouping-chip {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 220px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,0.12);
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .grouping-chip:hover {
          transform: translateY(-2px);
        }
        .grouping-checkmark {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.16);
          margin-bottom: 10px;
          transition: all 0.18s ease;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .grouping-checkmark.visible {
          box-shadow: 0 0 14px rgba(217,70,239,0.18);
          transform: scale(1.03);
        }
        .grouping-chip input {
          display: none;
        }
        .grouping-chip.active {
          box-shadow: 0 12px 22px rgba(2,6,23,0.22);
        }
        .grouping-chip.disabled {
          cursor: not-allowed;
        }
        .grouping-chip.disabled:hover {
          transform: none;
        }
        .success-modal .modal-content {
          background: transparent !important;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0,0,0,0.45);
        }
        .success-pop-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 12px 4px;
        }
        .success-pop-icon {
          width: 78px;
          height: 78px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          color: #86efac;
          background: radial-gradient(circle, rgba(34,197,94,0.28), rgba(34,197,94,0.08));
          box-shadow: 0 0 30px rgba(34,197,94,0.22);
        }
      `}} />
    </div>
  );
};

export default SubMeters;
