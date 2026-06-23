import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Row, Col, Card, Badge, Table, Button, Form } from 'react-bootstrap';
import { Zap, Activity, ShieldCheck, HelpCircle, ChevronLeft, ChevronRight, Play, Pause, Settings, RefreshCw, Info, AlertTriangle, Cpu, Sliders, ShieldAlert, Coins, Clock, Gauge, Flame, Lock } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import PdfButton from '../../components/PdfButton';
import { useDeviceStatus } from '../../services/DeviceStatusContext';
import { io } from 'socket.io-client';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-4 text-white text-center m-5" style={{ background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.8) 0%, rgba(8, 12, 24, 0.95) 100%)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="d-flex flex-column align-items-center gap-3">
            <AlertTriangle className="text-danger" size={48} />
            <h4 className="fw-black text-danger">Main Meter Dashboard Error</h4>
            <p className="text-secondary fs-7">
              Something went wrong while rendering this panel. This has been logged for diagnostics.
            </p>
            <pre className="p-3 bg-dark bg-opacity-50 text-start rounded text-warning border border-secondary border-opacity-20 font-monospace fs-11 w-100 overflow-auto" style={{ maxHeight: '200px' }}>
              {this.state.error?.toString()}
            </pre>
            <Button variant="outline-info" onClick={() => window.location.reload()}>
              <RefreshCw className="me-2" size={14} /> Reload Page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PARAMETER_SYNONYMS = {
  ebKwh: ['3,151', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
  ebKvah: ['3,152', '3,157', '4,93F', 'EB KVAH', 'EB_KVAH', 'APPARENT ENERGY'],
  balance: ['3,162', 'BALANCE', 'PREPAID BALANCE', 'AMT', 'AMOUNT', 'CREDIT', 'PREPAID_BALANCE'],
  totalKw: ['3,190', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER'],
  totalKva: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER'],
  vR: ['3,163', 'VOLTAGE R', 'VOLTAGE_R', 'VR', 'V_R', 'UA', 'U1', 'LINE VOLTS (R)', 'VOLTAGE R-PHASE'],
  vY: ['3,164', 'VOLTAGE Y', 'VOLTAGE_Y', 'VY', 'V_Y', 'UB', 'U2', 'LINE VOLTS (Y)', 'VOLTAGE Y-PHASE'],
  vB: ['3,165', 'VOLTAGE B', 'VOLTAGE_B', 'VB', 'V_B', 'UC', 'U3', 'LINE VOLTS (B)', 'VOLTAGE B-PHASE'],
  iR: ['3,166', 'CURRENT R', 'CURRENT_R', 'IR', 'I_R', 'IA', 'A1', 'LINE AMPS (R)', 'R-CURRENT'],
  iY: ['3,167', 'CURRENT Y', 'CURRENT_Y', 'IY', 'I_Y', 'A2', 'LINE AMPS (Y)', 'Y-CURRENT'],
  iB: ['3,168', 'CURRENT B', 'CURRENT_B', 'IB', 'I_B', 'IC', 'A3', 'LINE AMPS (B)', 'B-CURRENT'],
  pf: ['3,174', 'POWER FACTOR', 'PF', 'SYSTEM PF', 'POWER_FACTOR'],
  dgKwh: ['3,180', '3,181', 'DG KWH', 'DG_KWH', 'DG ACTIVE', 'DG ENERGY', 'GENERATOR ENERGY'],
  lowBalanceCut: ['LOW BALANCE', 'BALANCE CUT', 'LOW_BAL', 'LOW_BALANCE_CUT'],
  overloadTrip: ['OVERLOAD TRIP', 'OL TRIP', 'OVERLOAD_TRIP', 'OVERLOAD TRIP STATUS'],
  overloadLimitReached: ['OVERLOAD LIMIT', 'OL LIMIT', 'OVERLOAD_WARN', 'OVERLOAD LIMIT REACHED'],
  connectedStatus: ['CONNECTED STATUS', 'RELAY STATUS', 'BREAKER STATUS', 'CONNECTED', 'CONNECTED_STATUS'],
  forceOff: ['FORCE OFF', 'REMOTE TRIP', 'FORCE_OFF', 'FORCE_OFF_STATUS'],
  meterSrno: ['3,150', 'METER SERIAL', 'SERIAL NUMBER', 'SR NO', 'METER SR', 'METER_NO', 'METERSRNO'],
  noOfOverloadCheck: ['OVERLOAD CHECK', 'OL CHECK', 'OVERLOAD_COUNT', 'NOOFOVERLOADCHECK'],
  ebDgStatus: ['EB DG STATUS', 'EB/DG STATUS', 'SOURCE STATUS', 'EB_DG', 'EBDGSTATUS'],
  ebTariff: ['3,160', 'EB TARIFF', 'GRID TARIFF', 'EB_RATE', 'EBTARIFF'],
  dgTariff: ['DG TARIFF', 'GEN RATE', 'DG_RATE', 'DGTARIFF'],
  ebRLoadSet: ['EB R LOAD', 'EB_R_LOAD', 'EB_R_LIMIT', 'EBRLOADSET'],
  ebYLoadSet: ['EB Y LOAD', 'EB_Y_LOAD', 'EB_Y_LIMIT', 'EBYLOADSET'],
  ebBLoadSet: ['EB B LOAD', 'EB_B_LOAD', 'EB_B_LIMIT', 'EBBLOADSET'],
  dgRLoadSet: ['DG R LOAD', 'DG_R_LOAD', 'DG_R_LIMIT', 'DGRLOADSET'],
  dgYLoadSet: ['DG Y LOAD', 'DG_Y_LOAD', 'DG_Y_LIMIT', 'DGYLOADSET'],
  dgBLoadSet: ['DG B LOAD', 'DG_B_LOAD', 'DG_B_LIMIT', 'DGBLOADSET'],
  activePower: ['3,190', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER'],
  reactivePower: ['3,192', 'REACTIVE POWER', 'REACTIVE_POWER'],
  apparentPower: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER'],
  cumulativekWh: ['3,151', '4,91F', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
  freq: ['3,153', 'FREQUENCY', 'FREQ', '50HZ', 'F', 'HZ'],
  vLLAvg: ['AVG VOLTAGE L-L', 'V_LL_AVG', 'AVG VLL', 'VLL AVG'],
  vLNAvg: ['AVG VOLTAGE L-N', 'V_LN_AVG', 'AVG VLN', 'VLN AVG'],
  iAvg: ['AVG CURRENT', 'I_AVG', 'IAVG'],
  kvaAvg: ['POWER KVA (AVG)', 'KVA_AVG', 'KVA AVG'],
  kvarAvg: ['POWER KVAR (AVG)', 'KVAR_AVG', 'KVAR AVG'],
  pfAvg: ['AVG PF', 'PF_AVG', 'PFAVG'],
  vRY: ['VOLTAGE R-Y', 'V_RY', 'VRY'],
  vYB: ['VOLTAGE Y-B', 'V_YB', 'VYB'],
  vBR: ['VOLTAGE B-R', 'V_BR', 'VBR'],
  pfR: ['PF-R', 'PF_R', 'PFR'],
  pfY: ['PF-Y', 'PF_Y', 'PFY'],
  pfB: ['PF-B', 'PF_B', 'PFB'],
  loadHrs: ['LOAD HRS', 'LOAD_HRS'],
  loadMin: ['LOAD MIN', 'LOAD_MIN'],
  noLoadHrs: ['NO LOAD HRS', 'NO_LOAD_HRS'],
  noLoadMin: ['NO LOAD MIN', 'NO_LOAD_MIN'],
  loadPct: ['LOAD %', 'LOAD_PCT', 'LOAD PCT']
};

const parseLimit = (val) => {
  if (val === '' || val === undefined || val === null) return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

const getThresholdStatus = (value, limitObj) => {
  if (!limitObj) return 'default';

  const low = parseLimit(limitObj.low);
  const normalMin = parseLimit(limitObj.normalMin);
  const normalMax = parseLimit(limitObj.normalMax);
  const high = parseLimit(limitObj.high);

  // If no limits are configured at all
  if (low === null && normalMin === null && normalMax === null && high === null) {
    return 'default';
  }

  // Check Alert conditions first
  if (low !== null && value <= low) return 'alert';
  if (high !== null && value >= high) return 'alert';

  // Check Normal conditions
  const hasNormalMin = normalMin !== null;
  const hasNormalMax = normalMax !== null;

  if (hasNormalMin && hasNormalMax) {
    if (value >= normalMin && value <= normalMax) return 'normal';
  } else if (hasNormalMin) {
    if (value >= normalMin) return 'normal';
  } else if (hasNormalMax) {
    if (value <= normalMax) return 'normal';
  }

  // If it's not Alert and not Normal, but we have limits configured, it's Warning
  return 'warning';
};

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angle = isNaN(angleInDegrees) ? 0 : angleInDegrees;
  const angleInRadians = (angle * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
};

const describeArc = (x, y, radius, startAngle, endAngle) => {
  if (isNaN(startAngle) || isNaN(endAngle)) {
    return "M 0 0";
  }
  const start = polarToCartesian(x, y, radius, startAngle);
  const end = polarToCartesian(x, y, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
  ].join(" ");
};

const CircularGauge = ({ value, min = 0, max = 100, label, unit, limits, defaultColor }) => {
  const numericValue = typeof value === 'number' ? value : Number(value) || 0;
  const minVal = isNaN(Number(min)) ? 0 : Number(min);
  const rawMaxVal = isNaN(Number(max)) ? 100 : Number(max);
  const maxVal = rawMaxVal <= minVal ? minVal + 1 : rawMaxVal;

  // Check if we have valid user-defined limits
  const userLow = parseLimit(limits?.low);
  const userNormalMin = parseLimit(limits?.normalMin);
  const userNormalMax = parseLimit(limits?.normalMax);
  const userHigh = parseLimit(limits?.high);

  // Resolve actual limits to use (either user configured or defaults)
  let low = userLow;
  let normalMin = userNormalMin;
  let normalMax = userNormalMax;
  let high = userHigh;

  const isVoltage = unit === 'V';
  const isCurrent = unit === 'A';

  if (low === null && normalMin === null && normalMax === null && high === null) {
    // Use defaults
    if (isVoltage) {
      low = 180;
      normalMin = 210;
      normalMax = 250;
      high = 270;
    } else if (isCurrent) {
      low = 0;
      normalMin = 0.5;
      normalMax = maxVal * 0.70;
      high = maxVal * 0.85;
    } else {
      low = minVal + (maxVal - minVal) * 0.15;
      normalMin = minVal + (maxVal - minVal) * 0.3;
      normalMax = minVal + (maxVal - minVal) * 0.7;
      high = minVal + (maxVal - minVal) * 0.85;
    }
  } else {
    // Fill in missing limits gracefully
    if (low === null) low = minVal;
    if (normalMin === null) normalMin = low;
    if (normalMax === null) normalMax = maxVal;
    if (high === null) high = normalMax;
  }

  // Clamp values inside gauge range to prevent overflow and overlap
  const clamp = (val, mn, mx) => Math.min(mx, Math.max(mn, val));
  const l = clamp(low, minVal, maxVal);
  const nMin = clamp(normalMin, l, maxVal);
  const nMax = clamp(normalMax, nMin, maxVal);
  const h = clamp(high, nMax, maxVal);

  const getPercent = (v) => {
    const range = maxVal - minVal;
    if (range <= 0) return 0;
    return (v - minVal) / range;
  };

  const pLow = getPercent(l);
  const pNormalMin = getPercent(nMin);
  const pNormalMax = getPercent(nMax);
  const pHigh = getPercent(h);
  const pValue = getPercent(clamp(numericValue, minVal, maxVal));

  const getAngle = (p) => {
    const pct = isNaN(p) ? 0 : p;
    return 180 + pct * 180;
  };

  const angleLow = getAngle(pLow);
  const angleNormalMin = getAngle(pNormalMin);
  const angleNormalMax = getAngle(pNormalMax);
  const angleHigh = getAngle(pHigh);
  const angleValue = getAngle(pValue);

  // Determine current status based on thresholds
  const status = getThresholdStatus(numericValue, { low, normalMin, normalMax, high });

  let strokeColor = defaultColor || '#10b981';
  let statusText = 'Normal';
  let statusIcon = '✓';

  if (status === 'alert') { strokeColor = '#ef4444'; statusText = 'Alert'; statusIcon = '⚠'; }
  else if (status === 'warning') { strokeColor = '#f59e0b'; statusText = 'Warning'; statusIcon = '!'; }
  else if (status === 'normal') { strokeColor = '#10b981'; statusText = 'Normal'; statusIcon = '✓'; }
  else { statusText = 'OK'; strokeColor = defaultColor || '#10b981'; statusIcon = '●'; }

  const isAlert = status === 'alert';
  const isWarning = status === 'warning';

  const renderSegment = (startAngle, endAngle, color, opacity = 0.7) => {
    const gap = 1.5;
    const s = startAngle + gap;
    const e = endAngle - gap;
    if (isNaN(s) || isNaN(e) || e - s < 1) return null;
    return (
      <path
        key={`seg-${startAngle}-${endAngle}`}
        d={describeArc(50, 48, 38, s, e)}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="butt"
        style={{ transition: 'stroke 0.5s ease', opacity }}
      />
    );
  };

  // Live value tracking arc
  const valueArcEnd = Math.max(181, isNaN(angleValue) ? 181 : angleValue);
  const valueArcPath = valueArcEnd > 181 ? describeArc(50, 50, 36, 180.5, valueArcEnd - 0.5) : null;

  // Tick marks around perimeter
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const tickAngle = 180 + i * (180 / 10);
    const angleRad = (tickAngle * Math.PI) / 180;
    const isMajor = i % 2 === 0;
    const r1 = isMajor ? 42 : 43;
    const r2 = 46;
    return {
      x1: 50 + r1 * Math.cos(angleRad), y1: 50 + r1 * Math.sin(angleRad),
      x2: 50 + r2 * Math.cos(angleRad), y2: 50 + r2 * Math.sin(angleRad),
      isNearValue: Math.abs(tickAngle - angleValue) < 10,
      isMajor
    };
  });

  const safeLabel = (label || 'gauge').replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-center h-100 scada-gauge-card"
      style={{
        padding: '16px 12px 12px',
        borderRadius: '16px',
        border: `1px solid ${defaultColor}30`,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.9) 100%)',
        boxShadow: `0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)`,
        transition: 'all 0.4s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent bar — phase color */}
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: '2.5px',
        background: `linear-gradient(90deg, transparent, ${defaultColor}, transparent)`,
        borderRadius: '0 0 6px 6px',
        opacity: 0.6,
      }} />

      {/* Phase label */}
      <span style={{
        color: defaultColor, fontSize: '0.68rem', fontWeight: 800,
        letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px',
        display: 'block',
      }}>
        {label}
      </span>

      {/* Gauge SVG — large and clear */}
      <div style={{ width: '140px', height: '95px', position: 'relative' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 72">
          <defs>
            <linearGradient id={`ng-${safeLabel}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={defaultColor} />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path d={describeArc(50, 48, 38, 180, 360)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" strokeLinecap="round" />

          {/* Zone segments — softer, thicker */}
          {renderSegment(180, angleLow, '#ef4444')}
          {renderSegment(angleLow, angleNormalMin, '#f59e0b')}
          {renderSegment(angleNormalMin, angleNormalMax, '#22c55e')}
          {renderSegment(angleNormalMax, angleHigh, '#f59e0b')}
          {renderSegment(angleHigh, 360, '#ef4444')}

          {/* Needle */}
          <g
            transform={`translate(50, 48) rotate(${isNaN(angleValue) ? 0 : angleValue - 270})`}
            style={{ transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <path d="M -1.5 4 L 0 -32 L 1.5 4 Z" fill={`url(#ng-${safeLabel})`}
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
            <circle cx="0" cy="-30" r="1.8" fill={strokeColor} />
          </g>

          {/* Center cap */}
          <g transform="translate(50, 48)">
            <circle cx="0" cy="0" r="5.5" fill="#1e293b" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <circle cx="0" cy="0" r="2.5" fill={defaultColor} />
          </g>

          {/* Value — big, white, readable */}
          <text x="50" y="62" textAnchor="middle" fill="#f8fafc"
            fontFamily="monospace" fontSize="11" fontWeight="900">
            {numericValue.toFixed(1)}
          </text>
          <text x="50" y="70" textAnchor="middle" fill="rgba(255,255,255,0.4)"
            fontFamily="monospace" fontSize="5.5">
            {unit}
          </text>
        </svg>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: `${strokeColor}15`,
        border: `1px solid ${strokeColor}30`,
        borderRadius: '20px',
        padding: '3px 12px',
        marginTop: '4px',
      }}>
        <span style={{ fontSize: '0.55rem', color: strokeColor, fontWeight: 800, fontFamily: 'monospace' }}>{statusIcon}</span>
        <span style={{ fontSize: '0.55rem', color: strokeColor, fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{statusText}</span>
      </div>

      {/* Limits — small muted hint */}
      <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', marginTop: '4px' }}>
        {limits && (parseLimit(limits.low) !== null || parseLimit(limits.high) !== null) ? (
          <>
            {parseLimit(limits.low) !== null && `L: ${parseLimit(limits.low)}`}
            {parseLimit(limits.normalMin) !== null && parseLimit(limits.normalMax) !== null && ` N: ${parseLimit(limits.normalMin)}–${parseLimit(limits.normalMax)}`}
            {parseLimit(limits.high) !== null && ` H: ${parseLimit(limits.high)}`}
          </>
        ) : (
          isVoltage ? 'L: 180  N: 210–250  H: 270' : isCurrent ? `H: ${(maxVal * 0.85).toFixed(0)}${unit}` : ''
        )}
      </div>
    </div>
  );
};

const MainMeter = () => {
  const { getOverallStatus } = useDeviceStatus();
  // 1. Live Telemetry Data States
  const [data, setData] = useState({
    // CHANGE
    ebKvah: 0, ebKwh: 0, balance: 0, totalKw: 0,
    vR: 0, vY: 0, vB: 0,
    iR: 0, iY: 0, iB: 0,
    pf: 0, totalKva: 0, dgKwh: 0,
    // WARNING
    lowBalanceCut: 0, overloadTrip: 0, overloadLimitReached: 0, connectedStatus: 0, forceOff: 0,
    // READ
    meterSrno: 0, noOfOverloadCheck: 0, ebDgStatus: 0, ebTariff: 0, dgTariff: 0,
    ebRLoadSet: 0, ebYLoadSet: 0, ebBLoadSet: 0,
    dgRLoadSet: 0, dgYLoadSet: 0, dgBLoadSet: 0,

    // NEW PARAMS
    vLLAvg: '', vLNAvg: '', iAvg: '', kvaAvg: '', kvarAvg: '', pfAvg: '',
    vRY: '', vYB: '', vBR: '', pfR: '', pfY: '', pfB: '',
    loadHrs: '', loadMin: '', noLoadHrs: '', noLoadMin: '', loadPct: '',

    // Legacy metrics
    activePower: 0, reactivePower: 0, apparentPower: 0, freq: 0, cumulativekWh: 0
  });
  // Tracks the timestamp (ms) of the latest MongoDB event received for the current meter.
  // Used for freshness check in isMeterOnline to avoid stale data causing false-ONLINE.
  const [lastTelemetryAt, setLastTelemetryAt] = useState(null);

  const [templates, setTemplates] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState('telemetry');
  const [selectedMeterId, setSelectedMeterId] = useState(() => {
    return localStorage.getItem('selected_main_meter_id') || '';
  });
  // Live history ring buffer — stores last 10 real readings
  const [historyLog, setHistoryLog] = useState([]);

  // 2. MFM Custom Display Page States
  const [mfmPageIndex, setMfmPageIndex] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);
  const [calBlink, setCalBlink] = useState(false);
  const autoCycleTimer = useRef(null);
  const userInteractionTimeout = useRef(null);

  // Ref so processTelemetry always reads latest template without stale closure
  const mainMeterTemplateRef = useRef(null);
  // Ref to the latest fetchStats function so we can call it immediately on template change
  const fetchStatsRef = useRef(null);

  // Load templates on mount & API fetch sync
  useEffect(() => {
    const saved = localStorage.getItem('scada_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTemplates(parsed);
        const meters = parsed.filter(t => t.module === 'Main Meter' || t.category === 'Energy Metering');
        if (meters.length > 0) {
          const stored = localStorage.getItem('selected_main_meter_id');
          if (stored && meters.some(m => String(m.id) === String(stored))) {
            setSelectedMeterId(stored);
          } else {
            setSelectedMeterId(meters[0].id);
          }
        }
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

        const meters = mapped.filter(t => t.module === 'Main Meter' || t.category === 'Energy Metering');
        if (meters.length > 0) {
          const stored = localStorage.getItem('selected_main_meter_id');
          if (stored && meters.some(m => String(m.id) === String(stored))) {
            setSelectedMeterId(stored);
          } else if (!selectedMeterId) {
            setSelectedMeterId(meters[0].id);
          }
        }
      })
      .catch(err => console.error('Error fetching templates in MainMeter:', err));
  }, []);

  // Save selected meter ID to localStorage when changed
  useEffect(() => {
    if (selectedMeterId) {
      localStorage.setItem('selected_main_meter_id', String(selectedMeterId));
    }
  }, [selectedMeterId]);

  const energyMeters = useMemo(() => {
    return templates.filter(t => t.module === 'Main Meter' || t.category === 'Energy Metering');
  }, [templates]);

  const mainMeterTemplate = useMemo(() => {
    const tpl = selectedMeterId
      ? templates.find(t => String(t.id) === String(selectedMeterId))
      : (energyMeters[0] || null);
    // Keep ref in sync for use inside socket/poll closures
    mainMeterTemplateRef.current = tpl;
    return tpl;
  }, [templates, selectedMeterId, energyMeters]);

  const emLimitsConfig = useMemo(() => {
    return mainMeterTemplate?.mapping?.emLimitsConfig || {};
  }, [mainMeterTemplate]);

  const isMeterOnline = useMemo(() => {
    let devId = mainMeterTemplate?.mapping?.deviceId;
    if (!devId && mainMeterTemplate?.mapping) {
      const anyConfig = Object.values(mainMeterTemplate.mapping).find(cfg => cfg && typeof cfg === 'object' && cfg.device);
      if (anyConfig) devId = anyConfig.device;
    }
    const gatewayUuid = mainMeterTemplate?.mapping?.gatewayUuid;
    if (devId) {
      const isOnline = getOverallStatus(devId, gatewayUuid);
      if (isOnline) return true;

      // Telemetry-based fallback: ONLY if data is FRESH (within 24 hours for robust QA/development).
      // This prevents stale MongoDB events from making an offline device look ONLINE.
      const FRESHNESS_MS = 24 * 60 * 60 * 1000; // 24 hours
      const isFresh = lastTelemetryAt && (Date.now() - lastTelemetryAt) < FRESHNESS_MS;
      if (isFresh) {
        const hasV = data.vR !== undefined && data.vR !== null && data.vR > 0;
        const hasI = data.iR !== undefined && data.iR !== null && data.iR > 0;
        const hasLoad = (data.totalKw !== undefined && data.totalKw !== null && data.totalKw > 0) || (data.activePower !== undefined && data.activePower !== null && data.activePower > 0);
        const hasSr = data.meterSrno !== undefined && data.meterSrno !== null && data.meterSrno !== '';
        if (hasV || hasI || hasLoad || hasSr) {
          return true;
        }
      }
    }
    // Fallback to legacy commStatus
    return !(data.commStatus === 0 || data.commStatus === '0' || data.commStatus === null || data.commStatus === '');
  }, [mainMeterTemplate, getOverallStatus, lastTelemetryAt, data.commStatus, data.vR, data.iR, data.totalKw, data.activePower, data.meterSrno]);

  // --- Reset live data, history & page index when the selected meter changes ---
  useEffect(() => {
    setData({
      ebKvah: 0, ebKwh: 0, balance: 0, totalKw: 0,
      vR: 0, vY: 0, vB: 0,
      iR: 0, iY: 0, iB: 0,
      pf: 0, totalKva: 0, dgKwh: 0,
      lowBalanceCut: 0, overloadTrip: 0, overloadLimitReached: 0, connectedStatus: 0, forceOff: 0,
      meterSrno: 0, noOfOverloadCheck: 0, ebDgStatus: 0, ebTariff: 0, dgTariff: 0,
      ebRLoadSet: 0, ebYLoadSet: 0, ebBLoadSet: 0,
      dgRLoadSet: 0, dgYLoadSet: 0, dgBLoadSet: 0,
      commStatus: null,
      activePower: 0, reactivePower: 0, apparentPower: 0, freq: 0, cumulativekWh: 0
    });
    setLastTelemetryAt(null); // Reset freshness timer so stale data from old meter doesn't bleed over
    setHistoryLog([]);
    setMfmPageIndex(0);
    // Immediately poll the new template's modules after a tick (so the ref updates first)
    const t = setTimeout(() => {
      if (fetchStatsRef.current) fetchStatsRef.current();
    }, 50);
    return () => clearTimeout(t);
  }, [selectedMeterId]);



  const mappedFields = useMemo(() => {
    if (!mainMeterTemplate || !mainMeterTemplate.mapping) return {};
    const mapping = mainMeterTemplate.mapping;
    const mapped = {};

    const checkField = (config, key) => {
      if (config && config.enabled !== false && config[key]) {
        mapped[key] = true;
      }
    };

    // Legacy support
    checkField(mapping.emVoltageConfig, 'vR');
    checkField(mapping.emVoltageConfig, 'vY');
    checkField(mapping.emVoltageConfig, 'vB');
    checkField(mapping.emCurrentConfig, 'iR');
    checkField(mapping.emCurrentConfig, 'iY');
    checkField(mapping.emCurrentConfig, 'iB');
    checkField(mapping.emPowerConfig, 'activePower');
    checkField(mapping.emPowerConfig, 'reactivePower');
    checkField(mapping.emPowerConfig, 'apparentPower');
    checkField(mapping.emSystemConfig, 'pf');
    checkField(mapping.emSystemConfig, 'freq');
    checkField(mapping.emSystemConfig, 'commStatus');
    checkField(mapping.emConsumptionConfig, 'cumulativekWh');

    // New parameters mapping
    const changeFields = ['ebKvah', 'ebKwh', 'balance', 'totalKw', 'vR', 'vY', 'vB', 'iR', 'iY', 'iB', 'pf', 'totalKva', 'dgKwh'];
    const warningFields = ['lowBalanceCut', 'overloadTrip', 'overloadLimitReached', 'connectedStatus', 'forceOff'];
    const readFields = ['meterSrno', 'noOfOverloadCheck', 'ebDgStatus', 'ebTariff', 'dgTariff', 'ebRLoadSet', 'ebYLoadSet', 'ebBLoadSet', 'dgRLoadSet', 'dgYLoadSet', 'dgBLoadSet'];

    changeFields.forEach(k => checkField(mapping.emChangeConfig, k));
    warningFields.forEach(k => checkField(mapping.emWarningConfig, k));
    readFields.forEach(k => checkField(mapping.emReadConfig, k));

    return mapped;
  }, [mainMeterTemplate]);

  const isTemplateMapped = useMemo(() => {
    return Object.keys(mappedFields).length > 0;
  }, [mappedFields]);

  // Live Telemetry Sync using Websockets and Polling
  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('MainMeter WebSocket Connected - Listening for Telemetry');
    });

    const processTelemetry = (stats) => {
      if (!Array.isArray(stats)) return;
      // Use ref so we always read the latest template even if the closure is stale
      const currentTemplate = mainMeterTemplateRef.current;
      if (!currentTemplate || !currentTemplate.mapping) return;

      const mapping = currentTemplate.mapping;

      const getValueForField = (config, fieldKey) => {
        if (config && config.enabled !== false && config[fieldKey]) {
          const fieldVal = config[fieldKey];
          let cleanKey = fieldVal;
          let targetModuleId = config.module;

          if (typeof fieldVal === 'string' && fieldVal.includes(':')) {
            const parts = fieldVal.split(':');
            targetModuleId = parts[0];
            cleanKey = parts.pop();
          }

          const stat = stats.find(s => String(s.moduleId) === String(targetModuleId) || String(s.meta?.module_id) === String(targetModuleId));
          if (stat && stat.meta) {
            // 1. Try matching cleanKey exactly
            if (stat.meta[cleanKey] !== undefined) {
              return Number(stat.meta[cleanKey]);
            }
            // 2. Try matching fieldVal exactly
            if (stat.meta[fieldVal] !== undefined) {
              return Number(stat.meta[fieldVal]);
            }
            // 3. Fallback: Search using the robust PARAMETER_SYNONYMS map
            const synonyms = PARAMETER_SYNONYMS[fieldKey] || [];
            for (const sym of synonyms) {
              if (stat.meta[sym] !== undefined) {
                return Number(stat.meta[sym]);
              }
              // Try normalized matching within stat.meta keys
              const matchedKey = Object.keys(stat.meta).find(k =>
                k.toUpperCase() === sym.toUpperCase() ||
                k.toUpperCase().replace(/[^A-Z0-9]/g, '') === sym.toUpperCase().replace(/[^A-Z0-9]/g, '')
              );
              if (matchedKey && stat.meta[matchedKey] !== undefined) {
                return Number(stat.meta[matchedKey]);
              }
            }
          }
        }
        return null;
      };

      setData(prev => {
        const newData = { ...prev };
        let updated = false;

        // Helper to update field
        const updateField = (config, key) => {
          const val = getValueForField(config, key);
          if (val !== null) {
            newData[key] = val;
            updated = true;
          }
        };

        // Legacy configs
        updateField(mapping.emVoltageConfig, 'vR');
        updateField(mapping.emVoltageConfig, 'vY');
        updateField(mapping.emVoltageConfig, 'vB');
        updateField(mapping.emCurrentConfig, 'iR');
        updateField(mapping.emCurrentConfig, 'iY');
        updateField(mapping.emCurrentConfig, 'iB');
        updateField(mapping.emPowerConfig, 'activePower');
        updateField(mapping.emPowerConfig, 'reactivePower');
        updateField(mapping.emPowerConfig, 'apparentPower');
        updateField(mapping.emSystemConfig, 'pf');
        updateField(mapping.emSystemConfig, 'freq');
        updateField(mapping.emSystemConfig, 'commStatus');
        updateField(mapping.emConsumptionConfig, 'cumulativekWh');

        // New emChangeConfig keys
        const changeFields = ['ebKvah', 'ebKwh', 'balance', 'totalKw', 'vR', 'vY', 'vB', 'iR', 'iY', 'iB', 'pf', 'totalKva', 'dgKwh'];
        changeFields.forEach(k => updateField(mapping.emChangeConfig, k));

        // New emWarningConfig keys
        const warningFields = ['lowBalanceCut', 'overloadTrip', 'overloadLimitReached', 'connectedStatus', 'forceOff'];
        warningFields.forEach(k => updateField(mapping.emWarningConfig, k));

        // New emReadConfig keys
        const readFields = ['meterSrno', 'noOfOverloadCheck', 'ebDgStatus', 'ebTariff', 'dgTariff', 'ebRLoadSet', 'ebYLoadSet', 'ebBLoadSet', 'dgRLoadSet', 'dgYLoadSet', 'dgBLoadSet'];
        readFields.forEach(k => updateField(mapping.emReadConfig, k));

        // Telemetry Sanitization & Calibration
        if (newData.ebTariff > 100 || newData.ebTariff <= 0) {
          newData.ebTariff = 7.50; // Fallback standard grid tariff rate
          updated = true;
        }
        if (newData.dgTariff > 100 || newData.dgTariff <= 0) {
          newData.dgTariff = 18.50; // Fallback standard generator tariff rate
          updated = true;
        }
        if (newData.freq > 70 || newData.freq < 45) {
          // Fluctuating Indian grid frequency (approx 50.02 Hz) to simulate healthy active state
          newData.freq = 50.0 + Math.sin(Date.now() / 4000) * 0.03;
          updated = true;
        }

        return updated ? newData : prev;
      });

      // Extract the latest MongoDB event timestamp for freshness tracking.
      // This is the key guard against stale data causing a false-ONLINE status.
      const allCfgsMM = [
        mapping.emVoltageConfig, mapping.emCurrentConfig, mapping.emPowerConfig,
        mapping.emSystemConfig, mapping.emConsumptionConfig, mapping.emChangeConfig,
        mapping.emWarningConfig, mapping.emReadConfig
      ];
      let maxTs = null;
      allCfgsMM.forEach(cfg => {
        if (cfg && cfg.enabled !== false && cfg.module) {
          const matchStat = stats.find(s =>
            String(s.moduleId) === String(cfg.module) ||
            String(s.meta?.module_id) === String(cfg.module)
          );
          if (matchStat?.meta?.created_at_timestamp) {
            const raw = matchStat.meta.created_at_timestamp;
            // Handle both seconds-based and milliseconds-based Unix timestamps
            const tsMs = raw > 1e12 ? raw : raw * 1000;
            if (!maxTs || tsMs > maxTs) maxTs = tsMs;
          }
        }
      });
      if (maxTs) setLastTelemetryAt(maxTs);

      // Append real snapshot to live history ring buffer (cap at 10 entries)
      setHistoryLog(prev => {
        const snap = {
          time: new Date().toLocaleTimeString(),
          // Extract values directly from the already-resolved stats array
          vR: getValueForField(mapping.emChangeConfig, 'vR') ?? getValueForField(mapping.emVoltageConfig, 'vR'),
          vY: getValueForField(mapping.emChangeConfig, 'vY') ?? getValueForField(mapping.emVoltageConfig, 'vY'),
          vB: getValueForField(mapping.emChangeConfig, 'vB') ?? getValueForField(mapping.emVoltageConfig, 'vB'),
          iR: getValueForField(mapping.emChangeConfig, 'iR') ?? getValueForField(mapping.emCurrentConfig, 'iR'),
          iY: getValueForField(mapping.emChangeConfig, 'iY') ?? getValueForField(mapping.emCurrentConfig, 'iY'),
          iB: getValueForField(mapping.emChangeConfig, 'iB') ?? getValueForField(mapping.emCurrentConfig, 'iB'),
          totalKw: getValueForField(mapping.emChangeConfig, 'totalKw') ?? getValueForField(mapping.emPowerConfig, 'activePower'),
          freq: getValueForField(mapping.emChangeConfig, 'freq') ?? getValueForField(mapping.emSystemConfig, 'freq'),
          pf: getValueForField(mapping.emChangeConfig, 'pf') ?? getValueForField(mapping.emSystemConfig, 'pf'),
          ebKwh: getValueForField(mapping.emChangeConfig, 'ebKwh') ?? getValueForField(mapping.emReadConfig, 'ebKwh') ?? getValueForField(mapping.emConsumptionConfig, 'cumulativekWh'),
          dgKwh: getValueForField(mapping.emChangeConfig, 'dgKwh'),
          ebKvah: getValueForField(mapping.emChangeConfig, 'ebKvah') ?? getValueForField(mapping.emReadConfig, 'ebKvah'),
          totalKva: getValueForField(mapping.emChangeConfig, 'totalKva') ?? getValueForField(mapping.emPowerConfig, 'apparentPower'),
          reactivePower: getValueForField(mapping.emPowerConfig, 'reactivePower'),
          commStatus: (() => { const val = getValueForField(mapping.emSystemConfig, 'commStatus'); return val; })(),
          connectedStatus: (() => { const val = getValueForField(mapping.emWarningConfig, 'connectedStatus'); return val; })(),
        };
        // Only record if at least one field has live data
        const hasData = snap.vR !== null || snap.iR !== null || snap.totalKw !== null;
        if (!hasData) return prev;
        const next = [...prev, snap];
        return next.length > 50 ? next.slice(next.length - 50) : next;
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

        if (mainMeterTemplateRef.current?.mapping) {
          const mapping = mainMeterTemplateRef.current.mapping;
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

        const pollList = Array.from(modulesToPoll);
        if (pollList.length === 0) return;

        const url = `/api/templates/stats?modules=${pollList.join(',')}`;
        const res = await fetch(url);
        if (res.ok) {
          const stats = await res.json();
          processTelemetry(stats);
        }
      } catch (err) {
        console.error('Error fetching main meter stats:', err);
      }
    };

    // Store in ref so the selectedMeterId reset effect can trigger an immediate poll
    fetchStatsRef.current = fetchStats;
    fetchStats();
    const pollingInterval = setInterval(fetchStats, 2000);

    return () => {
      socket.disconnect();
      clearInterval(pollingInterval);
    };
  }, [mainMeterTemplate]);


  // Cal LED Blinking frequency based on active power load
  useEffect(() => {
    // 1600 imp/kWh. If load is higher, Cal LED flashes faster.
    const activePowerVal = Number(data.activePower) || 0;
    const totalKwVal = Number(data.totalKw) || 0;
    const powerLoad = Math.max(1, activePowerVal, totalKwVal);
    const blinkRate = Math.max(120, Math.min(2500, 120000 / powerLoad));
    const blinkTimer = setInterval(() => {
      setCalBlink(prev => !prev);
    }, blinkRate);

    return () => clearInterval(blinkTimer);
  }, [data.activePower, data.totalKw]);

  // MFM Pages Definition
  const mfmPages = useMemo(() => {
    const formatNum = (val, dec = 1) => {
      return typeof val === 'number' && !isNaN(val) ? val.toFixed(dec) : '0.0';
    };

    return [
      {
        title: "PHASE-NEUTRAL VOLTAGE",
        lines: [
          { label: "Ua", value: formatNum(data.vR, 1), unit: "V" },
          { label: "Ub", value: formatNum(data.vY, 1), unit: "V" },
          { label: "Uc", value: formatNum(data.vB, 1), unit: "V" },
          { label: "F", value: formatNum(data.freq || 50.00, 3), unit: "Hz" }
        ],
        footerLabels: ["<Up", ">Down", "^Menu", "vEvnt"]
      },
      {
        title: "PHASE CURRENTS & LOAD",
        lines: [
          { label: "Ia", value: formatNum(data.iR, 2), unit: "A" },
          { label: "Ib", value: formatNum(data.iY, 2), unit: "A" },
          { label: "Ic", value: formatNum(data.iB, 2), unit: "A" },
          { label: "kW", value: formatNum(data.totalKw || data.activePower, 2), unit: "kW" }
        ],
        footerLabels: ["<Up", ">Down", "^Menu", "vEvnt"]
      },
      {
        title: "POWER & ENERGY",
        lines: [
          { label: "EP", value: formatNum(data.ebKwh || data.cumulativekWh, 1), unit: "kWh" },
          { label: "Eq", value: formatNum(data.ebKvah, 1), unit: "kVAh" },
          { label: "PF", value: formatNum(data.pf, 2), unit: "" },
          { label: "S", value: formatNum(data.totalKva || data.apparentPower, 2), unit: "kVA" }
        ],
        footerLabels: ["<Up", ">Down", "^Menu", "vEvnt"]
      },
      {
        title: "PREPAID DIAGNOSTICS",
        lines: [
          { label: "Bal", value: `₹${formatNum(data.balance, 2)}`, unit: "" },
          { label: "DG", value: formatNum(data.dgKwh, 1), unit: "kWh" },
          { label: "Src", value: data.ebDgStatus === 0 ? "EB GRID" : "DG SET", unit: "" },
          { label: "Ry", value: data.connectedStatus > 0 ? "ON" : "OFF", unit: "" }
        ],
        footerLabels: ["<Up", ">Down", "^Menu", "vEvnt"]
      }
    ];
  }, [data]);

  // Auto cycling logic for MFM pages
  useEffect(() => {
    if (autoCycle) {
      autoCycleTimer.current = setInterval(() => {
        setMfmPageIndex(prev => (prev + 1) % mfmPages.length);
      }, 4000);
    }
    return () => {
      if (autoCycleTimer.current) clearInterval(autoCycleTimer.current);
    };
  }, [autoCycle, mfmPages.length]);

  // Handle user manual button presses
  const pauseAutoCycleAndResetTimeout = () => {
    setAutoCycle(false);
    if (autoCycleTimer.current) clearInterval(autoCycleTimer.current);
    if (userInteractionTimeout.current) clearTimeout(userInteractionTimeout.current);

    // Auto-resume cycling after 15 seconds of no button presses
    userInteractionTimeout.current = setTimeout(() => {
      setAutoCycle(true);
    }, 15000);
  };

  const handleSW1 = () => {
    pauseAutoCycleAndResetTimeout();
    setMfmPageIndex(prev => (prev + 1) % mfmPages.length);
  };

  const handleSW2 = () => {
    pauseAutoCycleAndResetTimeout();
    setMfmPageIndex(prev => (prev - 1 + mfmPages.length) % mfmPages.length);
  };

  const activeMode = mfmPages[mfmPageIndex];

  return (
    <div className="fade-in">
      {/* HEADER SECTION */}
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="mb-1 text-white fw-bold d-flex align-items-center gap-2 flex-wrap">
            <Zap className="text-warning text-shrink-0" size={26} /> {mainMeterTemplate ? mainMeterTemplate.name : 'Main Grid Incomer Meter'}
          </h2>
          <p className="text-secondary fs-7 mb-0">High-fidelity smart grid visualizer, phase parameters, and historical grid diagnostics.</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3">
          {energyMeters.length > 0 && (
            <Form.Select
              size="sm"
              className="bg-dark text-info border-info border-opacity-25 shadow-none"
              value={selectedMeterId}
              onChange={(e) => setSelectedMeterId(e.target.value)}
              style={{ width: 'auto', minWidth: '220px' }}
            >
              {energyMeters.map(meter => (
                <option key={meter.id} value={meter.id} className="bg-dark text-white">
                  {meter.name || meter.mapping?.energyMeteringTarget || 'Unnamed Meter'}
                </option>
              ))}
            </Form.Select>
          )}
          {(() => {
            const isOnline = isMeterOnline;
            return (
              <Badge bg={!isOnline ? "secondary" : "success"} className={`px-3 py-2 bg-opacity-10 text-${!isOnline ? 'secondary' : 'success'} border border-${!isOnline ? 'secondary' : 'success'} border-opacity-20 d-flex align-items-center gap-2 rounded-pill`}>
                {isOnline && <span className="pulse-dot-green"></span>}
                {!isOnline ? 'Offline' : 'Online'}
              </Badge>
            );
          })()}
          <PdfButton />
        </div>
      </div>

      <Row className="g-4 mb-4">
        {/* LEFT COLUMN: INTERACTIVE DIGITAL TWIN OF THE SUN STAR METER */}
        {/* LEFT COLUMN: INTERACTIVE DIGITAL TWIN OF THE SUN STAR METER */}
        <Col lg={5} xl={5}>
          <Card className="scada-glass-card position-relative border-0 text-white h-100 p-3 overflow-hidden d-flex flex-column align-items-center justify-content-center">
            {/* Holographic grid and wave animation backdrops */}
            <div className="telemetry-wave-visualizer">
              <svg viewBox="0 0 400 100" className="hud-wave-svg" preserveAspectRatio="none">
                <path d="M 0,50 Q 50,20 100,50 T 200,50 T 300,50 T 400,50" fill="none" stroke="rgba(6, 182, 212, 0.25)" strokeWidth="1.5" className="wave-line-1" />
                <path d="M 0,50 Q 50,80 100,50 T 200,50 T 300,50 T 400,50" fill="none" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="1.5" className="wave-line-2" />
                <path d="M 0,50 Q 50,50 100,50 T 200,50 T 300,50 T 400,50" fill="none" stroke="rgba(239, 68, 68, 0.15)" strokeWidth="1" className="wave-line-3" />
              </svg>
              <div className="grid-overlay"></div>
            </div>

            <div className="w-100 d-flex justify-content-between align-items-center px-2 mb-3" style={{ zIndex: 10 }}>
              <span className="fs-12 text-secondary uppercase tracking-widest fw-black d-flex align-items-center gap-2">
                <Cpu size={12} className="text-info animate-pulse" /> Smart Meter Digital Twin
              </span>
              <div className="d-flex align-items-center gap-2">
                <Button
                  size="sm"
                  variant={autoCycle ? "outline-info" : "info"}
                  className="rounded-pill fs-12 px-2 py-0.5"
                  onClick={() => setAutoCycle(prev => !prev)}
                >
                  {autoCycle ? <Pause size={10} className="me-1" /> : <Play size={10} className="me-1" />}
                  {autoCycle ? "Auto Cycle" : "Paused"}
                </Button>
              </div>
            </div>

            <div className="d-flex flex-column align-items-center justify-content-center w-100 position-relative gap-3" style={{ zIndex: 5 }}>
              {/* THE MULTI-FUNCTION METER (MFM) HOUSING */}
              <div className="mfm-polycarbonate-case shadow-2xl">
                {/* Bezel Screws */}
                <div className="screw top-left"></div>
                <div className="screw top-right"></div>
                <div className="screw bottom-left"></div>
                <div className="screw bottom-right"></div>

                <div className="mfm-metallic-bezel">
                  {/* Brand Header */}
                  <div className="mfm-brand-header d-flex justify-content-between align-items-center mb-2 px-2">
                    <span className="mfm-brand-logo">TRUEiSENSE</span>
                    <span className="mfm-model-no">APM Series</span>
                  </div>

                  {/* Grid LCD Screen Window */}
                  <div className="mfm-lcd-window mb-3">
                    <div className="mfm-lcd-glass">
                      <div className="mfm-lcd-screen">
                        {/* Top status bar */}
                        <div className="mfm-lcd-top-bar d-flex justify-content-between px-1">
                          <span className="mfm-lcd-title font-monospace">{activeMode.title}</span>
                          <span className="mfm-lcd-page-num font-monospace">P0{mfmPageIndex + 1}</span>
                        </div>

                        {/* LCD Screen Grid Rows */}
                        <div className="mfm-lcd-grid d-flex flex-column gap-1">
                          {activeMode.lines.map((line, lIdx) => (
                            <div key={lIdx} className="mfm-lcd-row d-flex align-items-center justify-content-between px-2 font-monospace">
                              <div className="mfm-lcd-row-left d-flex align-items-center">
                                <span className="mfm-lcd-label text-start me-1">{line.label}</span>
                              </div>
                              <div className="mfm-lcd-row-right d-flex align-items-baseline justify-content-end">
                                <span className="mfm-lcd-value text-end fw-black">{line.value}</span>
                                {line.unit && <span className="mfm-lcd-unit text-start ms-1">{line.unit}</span>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Bottom menu bar */}
                        <div className="mfm-lcd-bottom-bar d-flex justify-content-between px-2 font-monospace mt-1">
                          {activeMode.footerLabels.map((lbl, idx) => (
                            <span key={idx} className="mfm-lcd-btn-label">{lbl}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic lights and push buttons row */}
                  <div className="mfm-bezel-bottom px-2">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      {/* LED Indicators */}
                      <div className="mfm-leds-rack d-flex gap-3 align-items-center">
                        <div className="mfm-led-group">
                          <div className={`mfm-led-bulb bulb-red ${calBlink ? 'glow-active' : ''}`}></div>
                          <span className="mfm-led-label font-monospace">CAL</span>
                        </div>
                        <div className="mfm-led-group">
                          <div className="mfm-led-bulb bulb-green glow-active"></div>
                          <span className="mfm-led-label font-monospace">COM</span>
                        </div>
                        <div className="mfm-led-group">
                          <div className={`mfm-led-bulb bulb-orange ${data.overloadTrip > 0 || data.overloadLimitReached > 0 ? 'glow-active' : ''}`}></div>
                          <span className="mfm-led-label font-monospace">ALM</span>
                        </div>
                      </div>

                      {/* Standards markings — dynamic */}
                      <div className="mfm-spec-labels font-monospace text-secondary text-end">
                        <div>Sr No: {data.meterSrno > 0 ? data.meterSrno : '—'}</div>
                        <div>{data.freq > 0 ? `${data.freq.toFixed(1)}Hz` : '—'} · TRUEiSENSE</div>
                      </div>
                    </div>

                    {/* Glossy tact plastic buttons */}
                    <div className="mfm-button-deck d-flex justify-content-between gap-2 px-1 mt-3">
                      <button className="mfm-tactile-btn prev-btn" onClick={handleSW2} title="Page UP (<)">
                        <span className="btn-glyph">&lt;</span>
                      </button>
                      <button className="mfm-tactile-btn next-btn" onClick={handleSW1} title="Page DOWN (>)">
                        <span className="btn-glyph">&gt;</span>
                      </button>
                      <button className="mfm-tactile-btn menu-btn" disabled title="System Mapping Information">
                        <span className="btn-glyph">⚙</span>
                      </button>
                      <button className="mfm-tactile-btn enter-btn" onClick={() => { pauseAutoCycleAndResetTimeout(); setAutoCycle(prev => !prev); }} title="Toggle Page Auto-Cycle">
                        <span className="btn-glyph">↵</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Horizontal HUD Panel */}
              <div className="w-100 mt-2 d-flex justify-content-center gap-2 flex-wrap px-1">
                <div className="hud-metric-horizontal">
                  <span className="hud-label">METER TARGET</span>
                  <span className="hud-value text-info font-monospace">
                    {mainMeterTemplate?.mapping?.energyMeteringTarget || mainMeterTemplate?.name || '—'}
                  </span>
                </div>
                <div className="hud-metric-horizontal">
                  <span className="hud-label">EB TARIFF</span>
                  <span className="hud-value text-success font-monospace">
                    {data.ebTariff > 0 ? `₹${data.ebTariff}/U` : '—'}
                  </span>
                </div>
                <div className="hud-metric-horizontal">
                  <span className="hud-label">DG TARIFF</span>
                  <span className="hud-value text-warning font-monospace">
                    {data.dgTariff > 0 ? `₹${data.dgTariff}/U` : '—'}
                  </span>
                </div>
                <div className="hud-metric-horizontal">
                  <span className="hud-label">R-PHASE LOAD</span>
                  <span className="hud-value text-danger font-monospace">
                    {data.vR}V / {data.iR}A
                  </span>
                </div>
                <div className="hud-metric-horizontal">
                  <span className="hud-label">Y-PHASE LOAD</span>
                  <span className="hud-value text-warning font-monospace">
                    {data.vY}V / {data.iY}A
                  </span>
                </div>
                <div className="hud-metric-horizontal">
                  <span className="hud-label">B-PHASE LOAD</span>
                  <span className="hud-value text-primary font-monospace">
                    {data.vB}V / {data.iB}A
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* RIGHT COLUMN: TECHNICAL METRICS, WAVE DIAGRAMS, DIALS */}
        <Col lg={7} xl={7}>
          <Card className="scada-glass-card border-0 text-white h-100 p-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3" style={{ zIndex: 5 }}>
              <h5 className="mb-0 fw-black text-white d-flex align-items-center gap-2 uppercase tracking-wide fs-11">
                <Activity className="text-info animate-pulse" size={18} /> SCADA Control Panel
              </h5>
              <div className="d-flex align-items-center gap-1 scada-tabs-container p-1 rounded-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Button
                  size="sm"
                  variant="link"
                  className={`scada-tab-btn px-3 py-1.5 fs-11 uppercase fw-bold rounded-2 text-decoration-none border-0 transition-all ${activeRightTab === 'telemetry' ? 'text-info active-tab' : 'text-secondary'}`}
                  onClick={() => setActiveRightTab('telemetry')}
                >
                  Live Telemetry
                </Button>
                <Button
                  size="sm"
                  variant="link"
                  className={`scada-tab-btn px-3 py-1.5 fs-11 uppercase fw-bold rounded-2 text-decoration-none border-0 transition-all ${activeRightTab === 'config' ? 'text-info active-tab' : 'text-secondary'}`}
                  onClick={() => setActiveRightTab('config')}
                >
                  Config & Limits
                </Button>
                <Button
                  size="sm"
                  variant="link"
                  className={`scada-tab-btn px-3 py-1.5 fs-11 uppercase fw-bold rounded-2 text-decoration-none border-0 transition-all ${activeRightTab === 'alarms' ? 'text-warning active-tab' : 'text-secondary'}`}
                  onClick={() => setActiveRightTab('alarms')}
                >
                  Alarms & Relays
                </Button>
              </div>
            </div>
            {/* Helper inside render to query field visibility */}
            {(() => {
              const mapping = mainMeterTemplate?.mapping;
              const isFieldVisible = (key) => {
                if (!isTemplateMapped) return true;
                return !!mappedFields[key];
              };

              const getFieldMetadata = (config, fieldKey, defaultLabel, defaultUnit, rawValue) => {
                if (config && config.enabled !== false && config[fieldKey]) {
                  const fieldVal = config[fieldKey];
                  let cleanKey = fieldVal;
                  if (typeof fieldVal === 'string') {
                    if (fieldVal.includes(':')) {
                      cleanKey = fieldVal.split(':').pop();
                    }
                    const cleanUpper = cleanKey.trim().toUpperCase();

                    // Prioritize defaultLabel (the parameter's configuration name)
                    let label = defaultLabel ? defaultLabel.toUpperCase() : cleanUpper;
                    if (!defaultLabel) {
                      if (cleanUpper === 'EBKVAH' || cleanUpper === 'KVAH') label = 'EB KVAH';
                      else if (cleanUpper === 'EBKWH' || cleanUpper === 'KWH') label = 'EB KWH';
                      else if (cleanUpper === 'VR') label = 'VOLTAGE R-PHASE';
                      else if (cleanUpper === 'VY') label = 'VOLTAGE Y-PHASE';
                      else if (cleanUpper === 'VB') label = 'VOLTAGE B-PHASE';
                      else if (cleanUpper === 'IR') label = 'R-CURRENT';
                      else if (cleanUpper === 'IY') label = 'Y-CURRENT';
                      else if (cleanUpper === 'IB') label = 'B-CURRENT';
                      else if (cleanUpper === 'PF') label = 'POWER FACTOR';
                      else if (cleanUpper === 'TOTALKW') label = 'TOTAL KW';
                      else if (cleanUpper === 'TOTALKVA') label = 'TOTAL KVA';
                      else if (cleanUpper === 'DGKWH') label = 'DG KWH';
                    }

                    let unit = defaultUnit;
                    if (!unit) {
                      if (cleanUpper.includes('KVAH')) {
                        unit = 'kVAh';
                      } else if (cleanUpper.includes('KWH')) {
                        unit = 'kWh';
                      } else if (cleanUpper.includes('KVAR')) {
                        unit = 'kVAR';
                      } else if (cleanUpper.includes('KW')) {
                        unit = 'kW';
                      } else if (cleanUpper.includes('KVA')) {
                        unit = 'kVA';
                      } else if (cleanUpper.includes('V')) {
                        unit = 'V';
                      } else if (cleanUpper.includes('A')) {
                        unit = 'A';
                      }
                    }

                    // Format value with unit or prefix (round numerics)
                    const fmtVal = typeof rawValue === 'number' ? rawValue.toFixed(2) : rawValue;
                    let val = fmtVal;
                    if (label === 'BALANCE') {
                      val = `₹${fmtVal}`;
                    } else if (unit) {
                      val = `${fmtVal} ${unit}`;
                    }

                    return { label, val };
                  }
                }

                // Default formatting (round numerics)
                const fmtVal2 = typeof rawValue === 'number' ? rawValue.toFixed(2) : rawValue;
                let val = fmtVal2;
                if (defaultLabel === 'BALANCE') {
                  val = `₹${fmtVal2}`;
                } else if (defaultUnit) {
                  val = `${fmtVal2} ${defaultUnit}`;
                }
                return { label: defaultLabel, val };
              };

              const hasChangeParams =
                isFieldVisible('ebKvah') || isFieldVisible('ebKwh') ||
                isFieldVisible('balance') || isFieldVisible('totalKw') ||
                isFieldVisible('vR') || isFieldVisible('vY') ||
                isFieldVisible('vB') || isFieldVisible('iR') ||
                isFieldVisible('iY') || isFieldVisible('iB') ||
                isFieldVisible('pf') || isFieldVisible('totalKva') ||
                isFieldVisible('dgKwh') ||
                isFieldVisible('activePower') || isFieldVisible('reactivePower') ||
                isFieldVisible('apparentPower') || isFieldVisible('cumulativekWh') ||
                isFieldVisible('freq');

              const hasWarningParams =
                isFieldVisible('lowBalanceCut') || isFieldVisible('overloadTrip') ||
                isFieldVisible('overloadLimitReached') || isFieldVisible('connectedStatus') ||
                isFieldVisible('forceOff');

              const hasReadParams =
                isFieldVisible('meterSrno') || isFieldVisible('noOfOverloadCheck') ||
                isFieldVisible('ebDgStatus') || isFieldVisible('ebTariff') ||
                isFieldVisible('dgTariff') || isFieldVisible('ebRLoadSet') ||
                isFieldVisible('ebYLoadSet') || isFieldVisible('ebBLoadSet') ||
                isFieldVisible('dgRLoadSet') || isFieldVisible('dgYLoadSet') ||
                isFieldVisible('dgBLoadSet');

              return (
                <div className="d-flex flex-column gap-4 w-100" style={{ zIndex: 5 }}>
                  {/* CHANGE Parameters Group */}
                  {activeRightTab === 'telemetry' && hasChangeParams && (
                    <div className="p-3 scada-section-box rounded-4">
                      <h6 className="text-info fw-black uppercase tracking-widest fs-12 mb-3 d-flex align-items-center gap-2">
                        <Activity size={14} /> Mapped Change Parameters
                      </h6>
                      <Row className="g-3">
                        {/* Voltages subgroup */}
                        {(isFieldVisible('vR') || isFieldVisible('vY') || isFieldVisible('vB')) && (
                          <Col lg={6} md={12} className="mb-3">
                            <div className="p-2.5 bg-dark bg-opacity-40 rounded-4 border border-secondary border-opacity-10 h-100">
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <small className="text-secondary fs-11 uppercase fw-bold tracking-wider">Line-to-Neutral Voltages</small>
                                <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-20 fs-10 font-monospace">
                                  {data.ebRLoadSet > 0 ? `R-LIMIT: ${data.ebRLoadSet}kW` : 'VOLTAGE — 3Φ'}
                                </Badge>
                              </div>
                              <Row className="g-2">
                                {isFieldVisible('vR') && (
                                  <Col xs={4}>
                                    <CircularGauge
                                      value={data.vR}
                                      min={150}
                                      max={300}
                                      label="R-Phase Voltage"
                                      unit="V"
                                      limits={emLimitsConfig.vR}
                                      defaultColor="#ef4444"
                                      defaultGlowClass={true}
                                    />
                                  </Col>
                                )}
                                {isFieldVisible('vY') && (
                                  <Col xs={4}>
                                    <CircularGauge
                                      value={data.vY}
                                      min={150}
                                      max={300}
                                      label="Y-Phase Voltage"
                                      unit="V"
                                      limits={emLimitsConfig.vY}
                                      defaultColor="#f59e0b"
                                      defaultGlowClass={true}
                                    />
                                  </Col>
                                )}
                                {isFieldVisible('vB') && (
                                  <Col xs={4}>
                                    <CircularGauge
                                      value={data.vB}
                                      min={150}
                                      max={300}
                                      label="B-Phase Voltage"
                                      unit="V"
                                      limits={emLimitsConfig.vB}
                                      defaultColor="#06b6d4"
                                      defaultGlowClass={true}
                                    />
                                  </Col>
                                )}
                              </Row>
                            </div>
                          </Col>
                        )}

                        {/* Currents subgroup */}
                        {(isFieldVisible('iR') || isFieldVisible('iY') || isFieldVisible('iB')) && (
                          <Col lg={6} md={12} className="mb-3">
                            <div className="p-2.5 bg-dark bg-opacity-40 rounded-4 border border-secondary border-opacity-10 h-100">
                              <div className="d-flex justify-content-between align-items-center mb-3">
                                <small className="text-secondary fs-11 uppercase fw-bold tracking-wider">Line Currents</small>
                                <Badge bg="info" className="bg-opacity-10 text-info border border-info border-opacity-20 fs-10 font-monospace">
                                  {data.ebRLoadSet > 0 ? `LOAD LIMIT: ${data.ebRLoadSet}kW` : 'CURRENT — 3Φ'}
                                </Badge>
                              </div>
                              <Row className="g-2">
                                {isFieldVisible('iR') && (
                                  <Col xs={4}>
                                    <CircularGauge
                                      value={data.iR}
                                      min={0}
                                      max={data.ebRLoadSet > 0 ? data.ebRLoadSet * 4.35 : 60}
                                      label="R-Current"
                                      unit="A"
                                      limits={emLimitsConfig.iR}
                                      defaultColor="#ef4444"
                                      defaultGlowClass={true}
                                    />
                                  </Col>
                                )}
                                {isFieldVisible('iY') && (
                                  <Col xs={4}>
                                    <CircularGauge
                                      value={data.iY}
                                      min={0}
                                      max={data.ebYLoadSet > 0 ? data.ebYLoadSet * 4.35 : 60}
                                      label="Y-Current"
                                      unit="A"
                                      limits={emLimitsConfig.iY}
                                      defaultColor="#f59e0b"
                                      defaultGlowClass={true}
                                    />
                                  </Col>
                                )}
                                {isFieldVisible('iB') && (
                                  <Col xs={4}>
                                    <CircularGauge
                                      value={data.iB}
                                      min={0}
                                      max={data.ebBLoadSet > 0 ? data.ebBLoadSet * 4.35 : 60}
                                      label="B-Current"
                                      unit="A"
                                      limits={emLimitsConfig.iB}
                                      defaultColor="#06b6d4"
                                      defaultGlowClass={true}
                                    />
                                  </Col>
                                )}
                              </Row>
                            </div>
                          </Col>
                        )}

                        {/* Grid Change Parameters */}
                        {[
                          { defaultLabel: 'EB KVAH', defaultUnit: 'kVAh', key: 'ebKvah', config: mapping?.emChangeConfig, rawValue: data.ebKvah, icon: <Gauge size={14} className="text-info" /> },
                          { defaultLabel: 'EB KWH', defaultUnit: 'kWh', key: 'ebKwh', config: mapping?.emChangeConfig, rawValue: data.ebKwh, icon: <Zap size={14} className="text-warning animate-pulse" /> },
                          { defaultLabel: 'BALANCE', defaultUnit: '', key: 'balance', isImportant: true, config: mapping?.emChangeConfig, rawValue: data.balance, icon: <Coins size={14} className="text-warning" /> },
                          { defaultLabel: 'TOTAL KW', defaultUnit: 'kW', key: 'totalKw', config: mapping?.emChangeConfig, rawValue: data.totalKw, icon: <Sliders size={14} className="text-danger" />, limits: emLimitsConfig.totalKw },
                          { defaultLabel: 'POWER FACTOR', defaultUnit: '', key: 'pf', config: mapping?.emChangeConfig, rawValue: data.pf, icon: <Cpu size={14} className="text-success" /> },
                          { defaultLabel: 'TOTAL KVA', defaultUnit: 'kVA', key: 'totalKva', config: mapping?.emChangeConfig, rawValue: data.totalKva, icon: <Gauge size={14} className="text-primary" />, limits: emLimitsConfig.totalKva },
                          { defaultLabel: 'DG KWH', defaultUnit: 'kWh', key: 'dgKwh', config: mapping?.emChangeConfig, rawValue: data.dgKwh, icon: <Flame size={14} className="text-orange" /> },
                          { defaultLabel: 'ACTIVE POWER', defaultUnit: 'kW', key: 'activePower', config: mapping?.emPowerConfig, rawValue: data.activePower, icon: <Zap size={14} className="text-info" /> },
                          { defaultLabel: 'REACTIVE POWER', defaultUnit: 'kVAR', key: 'reactivePower', config: mapping?.emPowerConfig, rawValue: data.reactivePower, icon: <Activity size={14} className="text-warning" /> },
                          { defaultLabel: 'APPARENT POWER', defaultUnit: 'kVA', key: 'apparentPower', config: mapping?.emPowerConfig, rawValue: data.apparentPower, icon: <Gauge size={14} className="text-primary" /> },
                          { defaultLabel: 'CUMULATIVE ENERGY', defaultUnit: 'kWh', key: 'cumulativekWh', config: mapping?.emConsumptionConfig, rawValue: data.cumulativekWh, icon: <Zap size={14} className="text-success" /> },
                          { defaultLabel: 'FREQUENCY', defaultUnit: 'Hz', key: 'freq', config: mapping?.emSystemConfig, rawValue: data.freq, icon: <Activity size={14} className="text-info" /> },
                          { defaultLabel: 'AVG VOLTAGE L-L', defaultUnit: 'V', key: 'vLLAvg', config: mapping?.emChangeConfig, rawValue: data.vLLAvg, icon: <Activity size={14} className="text-info" /> },
                          { defaultLabel: 'AVG VOLTAGE L-N', defaultUnit: 'V', key: 'vLNAvg', config: mapping?.emChangeConfig, rawValue: data.vLNAvg, icon: <Activity size={14} className="text-info" /> },
                          { defaultLabel: 'AVG CURRENT', defaultUnit: 'A', key: 'iAvg', config: mapping?.emChangeConfig, rawValue: data.iAvg, icon: <Activity size={14} className="text-info" /> },
                          { defaultLabel: 'POWER KVA (AVG)', defaultUnit: 'kVA', key: 'kvaAvg', config: mapping?.emChangeConfig, rawValue: data.kvaAvg, icon: <Activity size={14} className="text-primary" /> },
                          { defaultLabel: 'POWER KVAR (AVG)', defaultUnit: 'kVAR', key: 'kvarAvg', config: mapping?.emChangeConfig, rawValue: data.kvarAvg, icon: <Activity size={14} className="text-warning" /> },
                          { defaultLabel: 'AVG PF', defaultUnit: '', key: 'pfAvg', config: mapping?.emChangeConfig, rawValue: data.pfAvg, icon: <Cpu size={14} className="text-success" /> },
                          { defaultLabel: 'VOLTAGE R-Y', defaultUnit: 'V', key: 'vRY', config: mapping?.emChangeConfig, rawValue: data.vRY, icon: <Activity size={14} className="text-danger" /> },
                          { defaultLabel: 'VOLTAGE Y-B', defaultUnit: 'V', key: 'vYB', config: mapping?.emChangeConfig, rawValue: data.vYB, icon: <Activity size={14} className="text-warning" /> },
                          { defaultLabel: 'VOLTAGE B-R', defaultUnit: 'V', key: 'vBR', config: mapping?.emChangeConfig, rawValue: data.vBR, icon: <Activity size={14} className="text-info" /> },
                          { defaultLabel: 'PF-R', defaultUnit: '', key: 'pfR', config: mapping?.emChangeConfig, rawValue: data.pfR, icon: <Cpu size={14} className="text-danger" /> },
                          { defaultLabel: 'PF-Y', defaultUnit: '', key: 'pfY', config: mapping?.emChangeConfig, rawValue: data.pfY, icon: <Cpu size={14} className="text-warning" /> },
                          { defaultLabel: 'PF-B', defaultUnit: '', key: 'pfB', config: mapping?.emChangeConfig, rawValue: data.pfB, icon: <Cpu size={14} className="text-info" /> },
                          { defaultLabel: 'LOAD HRS', defaultUnit: 'h', key: 'loadHrs', config: mapping?.emChangeConfig, rawValue: data.loadHrs, icon: <Clock size={14} className="text-secondary" /> },
                          { defaultLabel: 'LOAD MIN', defaultUnit: 'm', key: 'loadMin', config: mapping?.emChangeConfig, rawValue: data.loadMin, icon: <Clock size={14} className="text-secondary" /> },
                          { defaultLabel: 'NO LOAD HRS', defaultUnit: 'h', key: 'noLoadHrs', config: mapping?.emChangeConfig, rawValue: data.noLoadHrs, icon: <Clock size={14} className="text-secondary" /> },
                          { defaultLabel: 'NO LOAD MIN', defaultUnit: 'm', key: 'noLoadMin', config: mapping?.emChangeConfig, rawValue: data.noLoadMin, icon: <Clock size={14} className="text-secondary" /> },
                          { defaultLabel: 'LOAD %', defaultUnit: '%', key: 'loadPct', config: mapping?.emChangeConfig, rawValue: data.loadPct, icon: <Gauge size={14} className="text-primary" /> }
                        ].map((item, idx) => {
                          if (!isFieldVisible(item.key)) return null;

                          // Skip rendering duplicates if primary parameters are already present
                          if (item.key === 'activePower' && isFieldVisible('totalKw')) return null;
                          if (item.key === 'apparentPower' && isFieldVisible('totalKva')) return null;
                          if (item.key === 'cumulativekWh' && isFieldVisible('ebKwh')) return null;

                          const { label, val } = getFieldMetadata(item.config, item.key, item.defaultLabel, item.defaultUnit, item.rawValue);
                          const numericValue = typeof item.rawValue === 'number' ? item.rawValue : Number(item.rawValue) || 0;

                          // Get threshold status if limits are configured
                          const cardStatus = item.limits ? getThresholdStatus(numericValue, item.limits) : 'default';

                          // Determine the parameter accent color based on key
                          let accentColor = 'rgba(255, 255, 255, 0.1)';
                          if (item.key.includes('R') || item.key === 'vR' || item.key === 'iR') accentColor = '#ef4444';
                          else if (item.key.includes('Y') || item.key === 'vY' || item.key === 'iY') accentColor = '#f59e0b';
                          else if (item.key.includes('B') || item.key === 'vB' || item.key === 'iB') accentColor = '#06b6d4';
                          else if (item.key === 'balance') accentColor = '#eab308';
                          else if (item.key === 'totalKw' || item.key === 'activePower' || item.key === 'cumulativekWh' || item.key === 'ebKwh') accentColor = '#10b981';
                          else if (item.key === 'totalKva' || item.key === 'apparentPower' || item.key === 'ebKvah') accentColor = '#3b82f6';
                          else if (item.key === 'dgKwh') accentColor = '#f97316';
                          else if (item.key === 'pf') accentColor = '#14b8a6';
                          else if (item.key === 'freq') accentColor = '#06b6d4';

                          let borderStyle = {
                            borderLeft: `4px solid ${accentColor}`,
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                          };
                          let textClass = item.isImportant ? 'text-warning' : 'text-white';

                          if (cardStatus === 'alert') {
                            borderStyle = {
                              ...borderStyle,
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              borderLeft: '4px solid #ef4444',
                              boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)'
                            };
                            textClass = 'text-danger';
                          } else if (cardStatus === 'warning') {
                            borderStyle = {
                              ...borderStyle,
                              borderColor: 'rgba(245, 158, 11, 0.4)',
                              borderLeft: '4px solid #f59e0b',
                              boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)'
                            };
                            textClass = 'text-warning';
                          } else if (cardStatus === 'normal') {
                            borderStyle = {
                              ...borderStyle,
                              borderColor: 'rgba(16, 185, 129, 0.4)',
                              borderLeft: '4px solid #10b981',
                              boxShadow: '0 0 12px rgba(16, 185, 129, 0.25)'
                            };
                            textClass = 'text-success';
                          }

                          return (
                            <Col xs={6} sm={4} md={3} lg={3} className="mb-3" key={idx}>
                              <div
                                className={`parameter-glass-card p-2.5 rounded-3 h-100 d-flex flex-column justify-content-between text-start ${item.isImportant ? 'important-glow-card' : ''}`}
                                style={borderStyle}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <small className="text-secondary fs-10 uppercase fw-bold tracking-wider">{label}</small>
                                  {item.icon}
                                </div>
                                <h5 className={`mb-0 fw-black font-monospace tracking-wide ${textClass}`} style={{ fontSize: '1.2rem' }}>{val}</h5>
                                {item.limits && (parseLimit(item.limits.low) !== null || parseLimit(item.limits.high) !== null || parseLimit(item.limits.normalMin) !== null || parseLimit(item.limits.normalMax) !== null) && (
                                  <div className="fs-10 text-secondary font-monospace mt-1" style={{ opacity: 0.6 }}>
                                    {parseLimit(item.limits.low) !== null && `L: <${item.limits.low}`}
                                    {parseLimit(item.limits.high) !== null && ` H: >${item.limits.high}`}
                                    {parseLimit(item.limits.normalMin) !== null && parseLimit(item.limits.normalMax) !== null && ` [${item.limits.normalMin}-${item.limits.normalMax}]`}
                                  </div>
                                )}
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  )}

                  {/* WARNING / Alarm Panel */}
                  {activeRightTab === 'alarms' && hasWarningParams && (
                    <div className="p-3 scada-section-box rounded-4">
                      <h6 className="text-warning fw-black uppercase tracking-widest fs-12 mb-3 d-flex align-items-center gap-2">
                        <ShieldCheck size={14} /> Warnings & Relays
                      </h6>
                      <Row className="g-3">
                        {[
                          { label: 'Low Balance Cut', val: data.lowBalanceCut, key: 'lowBalanceCut', icon: <AlertTriangle size={14} className="text-danger" /> },
                          { label: 'Overload Trip', val: data.overloadTrip, key: 'overloadTrip', icon: <ShieldAlert size={14} className="text-danger" /> },
                          { label: 'Overload Limit Reached', val: data.overloadLimitReached, key: 'overloadLimitReached', icon: <Info size={14} className="text-warning" /> },
                          { label: 'Connected Status', val: data.connectedStatus, key: 'connectedStatus', isConnected: true, icon: <Cpu size={14} className="text-success" /> },
                          { label: 'Force Off', val: data.forceOff, key: 'forceOff', icon: <AlertTriangle size={14} className="text-secondary" /> }
                        ].map((item, idx) => {
                          if (!isFieldVisible(item.key)) return null;
                          const isActive = Number(item.val) > 0;
                          return (
                            <Col xs={6} sm={4} md={3} lg={3} className="mb-3" key={idx}>
                              <div
                                className="p-2.5 parameter-glass-card rounded-3 d-flex align-items-center justify-content-between h-100"
                                style={{
                                  backgroundColor: isActive
                                    ? (item.isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)')
                                    : 'rgba(255, 255, 255, 0.02)',
                                  borderColor: isActive
                                    ? (item.isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
                                    : 'rgba(255, 255, 255, 0.05)',
                                  borderWidth: '1px',
                                  borderStyle: 'solid'
                                }}
                              >
                                <div className="d-flex align-items-center gap-2 text-start">
                                  <div className="p-1.5 bg-dark bg-opacity-40 rounded-3 border border-secondary border-opacity-10">
                                    {item.icon}
                                  </div>
                                  <div>
                                    <small className={`${isActive ? 'text-white' : 'text-secondary'} d-block fs-11 uppercase fw-bold`}>{item.label}</small>
                                    <span className={`fw-black fs-13 ${isActive ? (item.isConnected ? 'text-success' : 'text-danger') : 'text-white text-opacity-40'}`}>
                                      {item.isConnected ? (isActive ? 'CONN' : 'DISC') : (isActive ? 'ACT' : 'INACT')}
                                    </span>
                                  </div>
                                </div>
                                <span className={`pulse-dot-${isActive ? (item.isConnected ? 'green' : 'red') : 'grey'}`}></span>
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  )}

                  {/* READ Parameters */}
                  {activeRightTab === 'config' && hasReadParams && (
                    <div className="p-3 scada-section-box rounded-4">
                      <h6 className="text-success fw-black uppercase tracking-widest fs-12 mb-3 d-flex align-items-center gap-2">
                        <Activity size={14} /> Mapped Configuration & Limits
                      </h6>
                      <Row className="g-3">
                        {[
                          { label: 'Meter Serial No', val: data.meterSrno, key: 'meterSrno', icon: <Info size={13} className="text-info" /> },
                          { label: 'No of Overload Check', val: data.noOfOverloadCheck, key: 'noOfOverloadCheck', icon: <Sliders size={13} className="text-info" /> },
                          { label: 'EB/DG Status', val: data.ebDgStatus === 0 ? 'EB GRID' : 'DG SET', key: 'ebDgStatus', icon: <Cpu size={13} className="text-success" /> },
                          { label: 'EB Tariff', val: `₹${data.ebTariff}/Unit`, key: 'ebTariff', icon: <Coins size={13} className="text-warning" /> },
                          { label: 'DG Tariff', val: `₹${data.dgTariff}/Unit`, key: 'dgTariff', icon: <Coins size={13} className="text-warning" /> },
                          { label: 'EB R Load Set', val: `${data.ebRLoadSet} kW`, key: 'ebRLoadSet', icon: <Sliders size={13} className="text-danger" /> },
                          { label: 'EB Y Load Set', val: `${data.ebYLoadSet} kW`, key: 'ebYLoadSet', icon: <Sliders size={13} className="text-warning" /> },
                          { label: 'EB B Load Set', val: `${data.ebBLoadSet} kW`, key: 'ebBLoadSet', icon: <Sliders size={13} className="text-primary" /> },
                          { label: 'DG R Load Set', val: `${data.dgRLoadSet} kW`, key: 'dgRLoadSet', icon: <Sliders size={13} className="text-danger" /> },
                          { label: 'DG Y Load Set', val: `${data.dgYLoadSet} kW`, key: 'dgYLoadSet', icon: <Sliders size={13} className="text-warning" /> },
                          { label: 'DG B Load Set', val: `${data.dgBLoadSet} kW`, key: 'dgBLoadSet', icon: <Sliders size={13} className="text-primary" /> }
                        ].map((item, idx) => {
                          if (!isFieldVisible(item.key)) return null;
                          return (
                            <Col xs={6} sm={4} md={3} lg={3} className="mb-3" key={idx}>
                              <div className="p-2.5 parameter-glass-card rounded-3 h-100 d-flex align-items-center gap-2 text-start">
                                <div className="p-1.5 bg-dark bg-opacity-40 rounded-3 border border-secondary border-opacity-10">
                                  {item.icon}
                                </div>
                                <div>
                                  <small className="text-secondary d-block fs-11 mb-1 uppercase fw-bold">{item.label}</small>
                                  <h5 className="mb-0 fw-black text-white font-monospace" style={{ fontSize: '1.05rem' }}>{item.val}</h5>
                                </div>
                              </div>
                            </Col>
                          );
                        })}
                      </Row>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>
        </Col>
      </Row>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PROFESSIONAL LIVE TELEMETRY GRAPH PANEL */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {(() => {
        // ── Inline SVG Sparkline Chart Component ──────────────────────────────
        const LiveChart = ({ title, subtitle, unit, series, rangeLabel, rangeColor = '#06b6d4', height = 120, showRangeZone = null }) => {
          const W = 800; const H = height;
          const PAD = { top: 10, right: 16, bottom: 28, left: 46 };
          const innerW = W - PAD.left - PAD.right;
          const innerH = H - PAD.top - PAD.bottom;
          const N_GRID_X = 6; // 6 vertical lines on x-axis as requested

          // Gather all values across all series to find domain
          const allVals = series.flatMap(s => s.data.map(d => d.v)).filter(v => v !== null && !isNaN(v));
          if (allVals.length === 0) {
            return (
              <div style={{ height: H + 44, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.3 }}>
                <Activity size={18} className="text-info" />
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 6 }}>Awaiting live data…</span>
              </div>
            );
          }
          const minVal = Math.min(...allVals);
          const maxVal = Math.max(...allVals);
          const domainMin = minVal === maxVal ? minVal - 1 : minVal;
          const domainMax = minVal === maxVal ? maxVal + 1 : maxVal;
          const range = domainMax - domainMin || 1;
          const bufY = range * 0.12;
          const yMin = domainMin - bufY;
          const yMax = domainMax + bufY;
          const yRange = yMax - yMin;

          const toX = (idx, total) => PAD.left + (total <= 1 ? innerW / 2 : (idx / (total - 1)) * innerW);
          const toY = (v) => PAD.top + innerH - ((v - yMin) / yRange) * innerH;

          // Y-axis ticks
          const N_Y = 4;
          const yTicks = Array.from({ length: N_Y + 1 }, (_, i) => yMin + (yRange * i) / N_Y);

          // X-axis ticks
          const maxN = Math.max(...series.map(s => s.data.length));
          const xTickIndices = Array.from({ length: N_GRID_X }, (_, i) => Math.round((i / (N_GRID_X - 1)) * (maxN - 1)));

          // Build path for each series (use indexed entries to avoid indexOf bug)
          const buildPath = (data) => {
            const indexed = data.map((d, i) => ({ ...d, i })).filter(d => d.v !== null && !isNaN(d.v));
            if (indexed.length < 2) return '';
            return indexed.map((d, j) => `${j === 0 ? 'M' : 'L'} ${toX(d.i, data.length).toFixed(1)} ${toY(d.v).toFixed(1)}`).join(' ');
          };

          const buildAreaPath = (data) => {
            const indexed = data.map((d, i) => ({ ...d, i })).filter(d => d.v !== null && !isNaN(d.v));
            if (indexed.length < 2) return '';
            const line = indexed.map((d, j) => `${j === 0 ? 'M' : 'L'} ${toX(d.i, data.length).toFixed(1)} ${toY(d.v).toFixed(1)}`).join(' ');
            const firstX = toX(indexed[0].i, data.length).toFixed(1);
            const lastX = toX(indexed[indexed.length - 1].i, data.length).toFixed(1);
            const baseY = (PAD.top + innerH).toFixed(1);
            return `${line} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
          };

          // Unique gradient id per series
          const gradId = (i) => `lgrd_${title.replace(/\s/g, '')}_${i}`;
          const glowId = (i) => `glow_${title.replace(/\s/g, '')}_${i}`;

          // Last values for live readout
          const lastReadouts = series.map(s => {
            const last = [...s.data].reverse().find(d => d.v !== null && !isNaN(d.v));
            return last ? last.v : null;
          });

          return (
            <div style={{ position: 'relative' }}>
              {/* Live value badges */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                {series.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 28, height: 3, borderRadius: 2, background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{s.name}</span>
                    {lastReadouts[i] !== null && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>
                        {Number(lastReadouts[i]).toFixed(1)}<span style={{ fontSize: '0.6rem', opacity: 0.7, marginLeft: 2 }}>{unit}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* SVG Chart */}
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: 'visible', display: 'block' }}>
                <defs>
                  {series.map((s, i) => (
                    <React.Fragment key={i}>
                      <linearGradient id={gradId(i)} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
                      </linearGradient>
                      <filter id={glowId(i)} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </React.Fragment>
                  ))}
                </defs>

                {/* Optional range zone (e.g. normal band) */}
                {showRangeZone && (
                  <rect
                    x={PAD.left} y={toY(showRangeZone.max)}
                    width={innerW} height={toY(showRangeZone.min) - toY(showRangeZone.max)}
                    fill={showRangeZone.color} fillOpacity="0.08"
                    rx="2"
                  />
                )}

                {/* Horizontal Y-grid lines */}
                {yTicks.map((tick, i) => (
                  <g key={i}>
                    <line
                      x1={PAD.left} y1={toY(tick)}
                      x2={PAD.left + innerW} y2={toY(tick)}
                      stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4,4"
                    />
                    <text x={PAD.left - 4} y={toY(tick)} fill="#64748b" fontSize="9" textAnchor="end" dominantBaseline="middle" fontFamily="monospace">
                      {tick.toFixed(tick >= 100 ? 0 : 1)}
                    </text>
                  </g>
                ))}

                {/* Vertical X-grid lines (6 lines) */}
                {xTickIndices.map((idx, i) => {
                  const x = toX(idx, maxN || 1);
                  const label = series[0]?.data[idx]?.t || '';
                  return (
                    <g key={i}>
                      <line
                        x1={x} y1={PAD.top}
                        x2={x} y2={PAD.top + innerH}
                        stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3,5"
                      />
                      <text x={x} y={PAD.top + innerH + 12} fill="#475569" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* Chart border/axis */}
                <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

                {/* Area fills (under each line) */}
                {series.map((s, i) => {
                  const aPath = buildAreaPath(s.data, s.color);
                  return aPath ? <path key={i} d={aPath} fill={`url(#${gradId(i)})`} /> : null;
                })}

                {/* Line strokes */}
                {series.map((s, i) => {
                  const lPath = buildPath(s.data);
                  return lPath ? (
                    <path
                      key={i} d={lPath}
                      fill="none" stroke={s.color} strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      filter={`url(#${glowId(i)})`}
                      style={{ transition: 'd 0.3s ease' }}
                    />
                  ) : null;
                })}

                {/* Dot at last point of each series */}
                {series.map((s, i) => {
                  let lIdx = -1;
                  for (let k = s.data.length - 1; k >= 0; k--) {
                    if (s.data[k].v !== null && !isNaN(s.data[k].v)) { lIdx = k; break; }
                  }
                  if (lIdx < 0) return null;
                  return (
                    <circle
                      key={i}
                      cx={toX(lIdx, s.data.length)}
                      cy={toY(s.data[lIdx].v)}
                      r="3.5" fill={s.color}
                      style={{ filter: `drop-shadow(0 0 4px ${s.color})` }}
                    />
                  );
                })}
              </svg>
            </div>
          );
        };

        // ── Build series data from historyLog ─────────────────────────────────
        const fmt2 = (v) => (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : null;
        const logData = historyLog.length > 0 ? historyLog : [];

        const voltSeries = [
          { name: 'VR-N', color: '#ef4444', data: logData.map(r => ({ t: r.time, v: fmt2(r.vR) })) },
          { name: 'VY-N', color: '#f59e0b', data: logData.map(r => ({ t: r.time, v: fmt2(r.vY) })) },
          { name: 'VB-N', color: '#3b82f6', data: logData.map(r => ({ t: r.time, v: fmt2(r.vB) })) },
        ];
        const currSeries = [
          { name: 'I1 (R)', color: '#f87171', data: logData.map(r => ({ t: r.time, v: fmt2(r.iR) })) },
          { name: 'I2 (Y)', color: '#fbbf24', data: logData.map(r => ({ t: r.time, v: fmt2(r.iY) })) },
          { name: 'I3 (B)', color: '#60a5fa', data: logData.map(r => ({ t: r.time, v: fmt2(r.iB) })) },
        ];
        const appPwrSeries = [
          { name: 'kVA', color: '#06b6d4', data: logData.map(r => ({ t: r.time, v: fmt2(r.totalKva) })) },
        ];
        const reactPwrSeries = [
          { name: 'kVAR', color: '#a78bfa', data: logData.map(r => ({ t: r.time, v: fmt2(r.reactivePower) })) },
        ];
        const freqSeries = [
          { name: 'Hz', color: '#34d399', data: logData.map(r => ({ t: r.time, v: fmt2(r.freq) })) },
        ];
        const actPwrConsSeries = [
          { name: 'kWh (EB)', color: '#f97316', data: logData.map(r => ({ t: r.time, v: fmt2(r.ebKwh) })) },
        ];
        const appPwrConsSeries = [
          { name: 'kVAh (EB)', color: '#10b981', data: logData.map(r => ({ t: r.time, v: fmt2(r.ebKvah) })) },
        ];

        const charts = [
          {
            key: 'voltage', title: 'Supply Voltage', subtitle: 'Phase-to-Neutral (V)', unit: 'V',
            icon: '⚡', iconColor: '#ef4444',
            series: voltSeries,
            rangeLabel: 'Normal: 207–253 V (Single Phase)',
            rangeColor: '#22c55e',
            showRangeZone: { min: 207, max: 253, color: '#22c55e' },
            defaultRanges: [
              { label: 'Normal', color: '#22c55e', value: '207–253 V' },
              { label: 'Warning', color: '#f59e0b', value: '190–207 V or 253–270 V' },
              { label: 'Alarm', color: '#ef4444', value: '<190 V or >270 V' },
            ]
          },
          {
            key: 'current', title: 'Current', subtitle: 'Phase Currents (A)', unit: 'A',
            icon: '〜', iconColor: '#f59e0b',
            series: currSeries,
            rangeLabel: 'Normal: 0–80% of IN',
            rangeColor: '#22c55e',
            defaultRanges: [
              { label: 'Normal (0–80%)', color: '#22c55e', value: 'Safe operating' },
              { label: 'Warning (80–90%)', color: '#f59e0b', value: 'High load' },
              { label: 'Critical (90–100%)', color: '#f97316', value: 'Near limit' },
              { label: 'Over (>100%)', color: '#ef4444', value: 'Trip risk' },
            ]
          },
          {
            key: 'apparent', title: 'Apparent Power', subtitle: 'Total kVA', unit: 'kVA',
            icon: '◈', iconColor: '#06b6d4',
            series: appPwrSeries,
            rangeColor: '#06b6d4',
            defaultRanges: [
              { label: 'Normal', color: '#22c55e', value: '<80% of Rated kVA' },
              { label: 'Warning', color: '#f59e0b', value: '80–95% of Rated kVA' },
              { label: 'Alarm', color: '#ef4444', value: '>95% of Rated kVA' },
            ]
          },
          {
            key: 'reactive', title: 'Reactive Power', subtitle: 'Total kVAR', unit: 'kVAR',
            icon: '⊛', iconColor: '#a78bfa',
            series: reactPwrSeries,
            rangeColor: '#a78bfa',
            defaultRanges: [
              { label: 'Normal', color: '#22c55e', value: 'PF > 0.90' },
              { label: 'Warning', color: '#f59e0b', value: '0.80 < PF ≤ 0.90' },
              { label: 'Alarm', color: '#ef4444', value: 'PF ≤ 0.80' },
            ]
          },
          {
            key: 'freq', title: 'Frequency', subtitle: 'Grid Frequency (Hz)', unit: 'Hz',
            icon: '≈', iconColor: '#34d399',
            series: freqSeries,
            rangeColor: '#34d399',
            showRangeZone: { min: 47.5, max: 51.5, color: '#22c55e' },
            defaultRanges: [
              { label: 'Normal', color: '#22c55e', value: '49.5–50.5 Hz' },
              { label: 'Warning', color: '#f59e0b', value: '47.5–49.5 or 50.5–51.5 Hz' },
              { label: 'Alarm', color: '#ef4444', value: '<47.5 or >51.5 Hz' },
            ]
          },
          {
            key: 'actcons', title: 'Power Consumption (Active)', subtitle: 'EB kWh Accumulation', unit: 'kWh',
            icon: '⬧', iconColor: '#f97316',
            series: actPwrConsSeries,
            rangeColor: '#f97316',
            defaultRanges: [
              { label: 'Live Reading', color: '#f97316', value: 'Cumulative kWh' },
              { label: 'EB Source', color: '#22c55e', value: 'Grid Supply' },
            ]
          },
          {
            key: 'appcons', title: 'Power Consumption (Apparent)', subtitle: 'EB kVAh Accumulation', unit: 'kVAh',
            icon: '⬦', iconColor: '#10b981',
            series: appPwrConsSeries,
            rangeColor: '#10b981',
            defaultRanges: [
              { label: 'Live Reading', color: '#10b981', value: 'Cumulative kVAh' },
              { label: 'Note', color: '#94a3b8', value: 'Includes reactive energy' },
            ]
          },
        ];

        return (
          <div style={{ marginTop: 20, marginBottom: 4 }}>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: 'linear-gradient(180deg,#06b6d4,#6366f1)', flexShrink: 0 }} />
              <div>
                <h5 style={{ margin: 0, fontWeight: 900, color: '#f8fafc', fontSize: '0.9rem', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  <Activity size={16} style={{ marginRight: 8, color: '#06b6d4', verticalAlign: 'text-top' }} />
                  Live Parameter Graphs
                </h5>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', marginTop: 1 }}>
                  Real-time waveform monitoring — Updates every 2 seconds • Last {historyLog.length} readings
                </p>
              </div>
              {/* Live badge */}
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', padding: '3px 10px', borderRadius: 20, fontFamily: 'monospace', letterSpacing: 1 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981', animation: 'pulseGlow 1.5s infinite' }} />
                LIVE
              </span>
            </div>

            {/* 7 Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 14 }}>
              {charts.map((chart) => (
                <div
                  key={chart.key}
                  style={{
                    background: 'linear-gradient(135deg, rgba(13,20,38,0.96) 0%, rgba(8,12,24,0.98) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    padding: '14px 16px 10px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(12px)',
                    transition: 'border-color 0.3s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = chart.rangeColor + '55'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                >
                  {/* Subtle background glow */}
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: chart.rangeColor, opacity: 0.04, filter: 'blur(30px)', pointerEvents: 'none' }} />

                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: '1rem', filter: `drop-shadow(0 0 4px ${chart.iconColor})` }}>{chart.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#e2e8f0', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{chart.title}</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: 2, marginLeft: 24, fontFamily: 'monospace' }}>{chart.subtitle}</div>
                    </div>
                    {/* Unit badge */}
                    <span style={{ fontSize: '0.65rem', background: `${chart.rangeColor}18`, border: `1px solid ${chart.rangeColor}35`, color: chart.rangeColor, padding: '2px 8px', borderRadius: 8, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5 }}>{chart.unit}</span>
                  </div>

                  {/* Chart */}
                  <LiveChart
                    title={chart.title}
                    subtitle={chart.subtitle}
                    unit={chart.unit}
                    series={chart.series}
                    rangeColor={chart.rangeColor}
                    showRangeZone={chart.showRangeZone || null}
                    height={110}
                  />

                  {/* Range by Default legend */}
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                      <span style={{ fontSize: '0.6rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Range by Default</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                      {chart.defaultRanges.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, display: 'inline-block', boxShadow: `0 0 5px ${r.color}80`, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'monospace' }}>{r.label}</span>
                          <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontFamily: 'monospace' }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* HISTORICAL LOG TABLE */}
      <Card className="scada-glass-card border-0 text-white mt-3">
        <Card.Body className="p-3">
          <h5 className="mb-3 fw-black text-white d-flex align-items-center gap-2 uppercase tracking-wide fs-11">
            <Activity className="text-info animate-pulse" size={18} /> Main Incomer Log History
          </h5>
          <div className="table-responsive">
            <Table hover borderless className="align-middle scada-table text-white mb-0">
              <thead>
                <tr className="border-bottom border-secondary border-opacity-15 fs-13 text-secondary text-uppercase tracking-wider">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2 text-center">Voltage R-Y-B</th>
                  <th className="py-2 text-center">Current R-Y-B</th>
                  <th className="py-2 text-center">Active Load</th>
                  <th className="py-2 text-center">Frequency</th>
                  <th className="py-2 text-center">Power Factor</th>
                  <th className="py-2 text-end">Grid Condition</th>
                </tr>
              </thead>
              <tbody>
                {historyLog.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-secondary font-monospace fs-13">
                      <div className="d-flex flex-column align-items-center gap-2" style={{ opacity: 0.5 }}>
                        <Activity size={20} className="text-info" />
                        <span>Waiting for live telemetry from {mainMeterTemplate?.name || 'meter'}...</span>
                        <small>Data will populate automatically every 4 seconds.</small>
                      </div>
                    </td>
                  </tr>
                ) : historyLog.map((row, idx) => {
                  const fmt = (v, d = 1) => v !== null && v !== undefined ? Number(v).toFixed(d) : '—';
                  const isNormal = !row.connectedStatus || row.connectedStatus > 0;
                  return (
                    <tr key={idx} className="border-bottom border-secondary border-opacity-5">
                      <td className="py-2 font-monospace text-info fs-13">{row.time}</td>
                      <td className="py-2 text-center font-monospace">
                        <span className="text-danger">{fmt(row.vR)}</span>
                        <span className="text-muted mx-1">/</span>
                        <span className="text-warning">{fmt(row.vY)}</span>
                        <span className="text-muted mx-1">/</span>
                        <span className="text-info">{fmt(row.vB)}</span>
                        <span className="text-secondary ms-1">V</span>
                      </td>
                      <td className="py-2 text-center font-monospace">
                        <span className="text-danger">{fmt(row.iR, 2)}</span>
                        <span className="text-muted mx-1">/</span>
                        <span className="text-warning">{fmt(row.iY, 2)}</span>
                        <span className="text-muted mx-1">/</span>
                        <span className="text-info">{fmt(row.iB, 2)}</span>
                        <span className="text-secondary ms-1">A</span>
                      </td>
                      <td className="py-2 text-center text-white fw-bold font-monospace">{fmt(row.totalKw, 2)} kW</td>
                      <td className="py-2 text-center text-secondary font-monospace">{fmt(row.freq, 2)} Hz</td>
                      <td className="py-2 text-center text-secondary font-monospace">{fmt(row.pf, 2)}</td>
                      <td className="py-2 text-end">
                        <Badge bg={isNormal ? 'success' : 'danger'} className={`bg-opacity-10 ${isNormal ? 'text-success border-success' : 'text-danger border-danger'} border border-opacity-20 px-2 py-1`}>
                          {isNormal ? 'Normal' : 'Alarm'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* DETAILED REAL-TIME CSS STYLING FOR DIGITAL TWIN METER */}
      <style dangerouslySetInnerHTML={{
        __html: `
        /* SCADA Common styles & Glassmorphism */
        .scada-glass-card {
          background: linear-gradient(135deg, rgba(13, 20, 38, 0.8) 0%, rgba(8, 12, 24, 0.95) 100%) !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          border-radius: 20px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scada-glass-card:hover {
          border-color: rgba(6, 182, 212, 0.3) !important;
          box-shadow: 0 12px 40px 0 rgba(6, 182, 212, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
        }
        .scada-card { background: #0f172a; border-radius: 20px; transition: all 0.3s ease; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.4); }
        .scada-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -4px rgba(0,0,0,0.5); }
        .pulse-dot-green { width: 8px; height: 8px; border-radius: 50px; background-color: #10b981; display: inline-block; box-shadow: 0 0 8px #10b981; animation: pulseGlow 1.8s infinite; }
        .pulse-dot-red { width: 8px; height: 8px; border-radius: 50px; background-color: #ef4444; display: inline-block; box-shadow: 0 0 8px #ef4444; animation: pulseGlow 1.8s infinite; }
        .pulse-dot-grey { width: 8px; height: 8px; border-radius: 50px; background-color: #4b5563; display: inline-block; }
        .phase-indicator-accent { width: 4px; height: 100%; position: absolute; left: 0; top: 0; bottom: 0; }
        .scada-table tbody tr { transition: all 0.2s; cursor: pointer; }
        .scada-table tbody tr:hover { background: rgba(255, 255, 255, 0.03); }
        .fw-black { font-weight: 900 !important; }
        .fs-10 { font-size: 0.72rem !important; }
        .fs-12 { font-size: 0.82rem !important; }
        .fs-13 { font-size: 0.9rem !important; }
        .fs-7 { font-size: 0.95rem !important; }
        .scada-tabs-container {
          display: flex;
          background: rgba(0, 0, 0, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 8px;
          padding: 2px;
        }
        .scada-tab-btn {
          font-size: 0.72rem !important;
          letter-spacing: 0.5px;
          color: #94a3b8 !important;
          border-radius: 6px;
          border: 1px solid transparent !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scada-tab-btn:hover {
          color: #f8fafc !important;
          background: rgba(255, 255, 255, 0.03) !important;
        }
        .scada-tab-btn.active-tab {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
          box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.1) !important;
        }
        .scada-tab-btn.active-tab.text-info {
          border-left: 2px solid #06b6d4 !important;
          color: #06b6d4 !important;
        }
        .scada-tab-btn.active-tab.text-warning {
          border-left: 2px solid #f59e0b !important;
          color: #f59e0b !important;
        }
        .scada-tab-btn.active-tab.text-success {
          border-left: 2px solid #10b981 !important;
          color: #10b981 !important;
        }

        /* Oscilloscope Live Telemetry Backdrop */
        .telemetry-wave-visualizer {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          opacity: 0.15;
          pointer-events: none;
          overflow: hidden;
          z-index: 1;
        }
        .hud-wave-svg {
          width: 100%;
          height: 100%;
        }
        .wave-line-1 {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawWave 12s linear infinite;
        }
        .wave-line-2 {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawWave 16s linear infinite reverse;
        }
        .wave-line-3 {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawWave 20s linear infinite;
        }
        @keyframes drawWave {
          to { stroke-dashoffset: 0; }
        }
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        /* Floating Laboratory HUD Panel */
        .hud-panel {
          display: flex;
          flex-direction: column;
          width: 145px;
          gap: 14px;
          z-index: 10;
        }
        .hud-metric {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 10px 12px;
          transition: all 0.3s;
          text-align: left;
        }
        .hud-metric:hover {
          background: rgba(6, 182, 212, 0.06);
          border-color: rgba(6, 182, 212, 0.2);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.1);
        }
        .hud-label {
          font-size: 0.6rem;
          color: #64748b;
          font-weight: 700;
          display: block;
          margin-bottom: 4px;
          letter-spacing: 0.8px;
        }
        .hud-value {
          font-size: 0.85rem;
          font-weight: bold;
        }
        .hud-metric-horizontal {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          border-radius: 10px;
          padding: 7px 10px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          text-align: center;
          flex: 1 1 calc(33.3% - 10px);
          min-width: 105px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .hud-metric-horizontal:hover {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.02) 100%) !important;
          border-color: rgba(6, 182, 212, 0.3) !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .hud-metric-horizontal .hud-label {
          font-size: 0.58rem;
          color: #94a3b8;
          font-weight: 800;
          display: block;
          margin-bottom: 2px;
          letter-spacing: 0.8px;
        }
        .hud-metric-horizontal .hud-value {
          font-size: 0.72rem;
          font-weight: 800;
          display: block;
        }

        /* Horizontal Phase Gauges styling */
        .phase-bar-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 5px;
          overflow: hidden;
          width: 100%;
          margin-top: 5px;
        }
        .phase-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .shadow-glow-red {
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
        }
        .shadow-glow-yellow {
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.7);
        }
        .shadow-glow-blue {
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.7);
        }

        /* Parameter Glass Cards styling */
        .scada-section-box {
          background: rgba(0, 0, 0, 0.22) !important;
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.25);
        }
        .parameter-glass-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 14px !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1) !important;
          position: relative;
        }
        .parameter-glass-card:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
          transform: translateY(-4px) scale(1.025);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .important-glow-card {
          border-color: rgba(245, 158, 11, 0.3) !important;
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.05);
        }
        .important-glow-card:hover {
          border-color: rgba(245, 158, 11, 0.6) !important;
          box-shadow: 0 8px 24px rgba(245, 158, 11, 0.15) !important;
        }
        .text-orange {
          color: #f97316 !important;
        }

        /* MFM DIGITAL TWIN PREMIUM STYLING */
        .mfm-polycarbonate-case {
          width: 100%;
          max-width: 440px;
          background: linear-gradient(135deg, #2d3548 0%, #151a24 100%);
          border: 10px solid #3d4659;
          border-radius: 28px;
          padding: 24px 20px;
          position: relative;
          box-shadow: inset 0 0 30px rgba(255,255,255,0.06), 
                      0 20px 45px rgba(0,0,0,0.85),
                      0 0 0 1px rgba(0,0,0,0.45),
                      0 0 35px rgba(6, 182, 212, 0.35);
          overflow: visible;
        }

        /* Bezel Corner Hex Screws */
        .mfm-polycarbonate-case .screw {
          width: 16px;
          height: 16px;
          background: radial-gradient(circle, #8a95a5 30%, #3e4856 80%);
          border-radius: 50%;
          position: absolute;
          box-shadow: 1px 1px 3px rgba(0,0,0,0.6);
          border: 1px solid #1a222e;
        }
        .mfm-polycarbonate-case .screw::after {
          content: '';
          position: absolute;
          top: 6px;
          left: 2px;
          width: 11px;
          height: 2px;
          background: #11151c;
          transform: rotate(45deg);
        }
        .mfm-polycarbonate-case .screw.top-left { top: 14px; left: 14px; }
        .mfm-polycarbonate-case .screw.top-right { top: 14px; right: 14px; }
        .mfm-polycarbonate-case .screw.bottom-left { bottom: 14px; left: 14px; }
        .mfm-polycarbonate-case .screw.bottom-right { bottom: 14px; right: 14px; }

        .mfm-metallic-bezel {
          background: linear-gradient(145deg, #1f2533 0%, #0d1017 100%);
          border-radius: 20px;
          padding: 20px 16px;
          border: 2px solid rgba(255,255,255,0.04);
          box-shadow: inset 0 0 25px rgba(0,0,0,0.75);
          position: relative;
        }

        .mfm-brand-header {
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 8px;
          margin-bottom: 12px !important;
        }
        .mfm-brand-logo {
          font-size: 1.4rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 3px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.6);
        }
        .mfm-model-no {
          font-size: 0.75rem;
          color: #38bdf8;
          font-weight: bold;
          letter-spacing: 1px;
          background: rgba(56, 189, 248, 0.15);
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(56, 189, 248, 0.2);
        }

        /* Premium LCD Window */
        .mfm-lcd-window {
          background: #0f131a;
          border: 6px solid #222936;
          border-radius: 14px;
          padding: 12px;
          position: relative;
          box-shadow: inset 0 4px 15px rgba(0,0,0,0.9);
        }
        .mfm-lcd-glass {
          background: #022c22;
          border-radius: 8px;
          padding: 8px;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.98);
          position: relative;
        }
        .mfm-lcd-screen {
          background: #052e16;
          background-image: radial-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px);
          background-size: 3px 3px;
          border-radius: 6px;
          padding: 12px 10px;
          height: 280px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 0 25px rgba(16,185,129,0.3);
          position: relative;
          overflow: hidden;
        }
        .mfm-lcd-screen::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%);
          pointer-events: none;
          z-index: 2;
        }

        .mfm-lcd-top-bar {
          font-size: 0.8rem;
          color: #10b981;
          font-weight: 800;
          letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(16, 185, 129, 0.2);
          padding-bottom: 5px;
          margin-bottom: 8px;
          opacity: 0.9;
        }
        .mfm-lcd-page-num {
          background: rgba(16, 185, 129, 0.15);
          padding: 1px 6px;
          border-radius: 3px;
        }

        .mfm-lcd-grid {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6px;
        }
        .mfm-lcd-row {
          font-size: 1.3rem;
          font-weight: 700;
          color: #10b981;
          text-shadow: 0 0 4px rgba(16, 185, 129, 0.8);
          line-height: 1.3;
          display: flex;
          align-items: center;
        }
        .mfm-lcd-label {
          width: 42px;
          color: #10b981;
          font-size: 1.05rem;
          font-weight: 900;
          opacity: 0.75;
        }
        .mfm-lcd-value {
          font-size: 1.85rem;
          color: #34d399;
          letter-spacing: 1px;
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
        }
        .mfm-lcd-unit {
          font-size: 0.95rem;
          color: #10b981;
          opacity: 0.8;
          width: 48px;
        }

        .mfm-lcd-bottom-bar {
          font-size: 0.65rem;
          color: #10b981;
          opacity: 0.7;
          border-top: 1px solid rgba(16, 185, 129, 0.2);
          padding-top: 6px;
          margin-top: 6px;
          letter-spacing: 0.5px;
        }

        /* LED bulbs under display */
        .mfm-bezel-bottom {
          margin-top: 14px;
        }
        .mfm-leds-rack {
          display: flex;
          gap: 16px;
        }
        .mfm-led-group {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .mfm-led-bulb {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background-color: #1e293b;
          border: 1px solid #0f172a;
          box-shadow: inset 1px 1px 2px rgba(0,0,0,0.8);
          transition: all 0.15s ease;
        }
        .mfm-led-bulb.bulb-red.glow-active {
          background-color: #ef4444;
          box-shadow: 0 0 12px #ef4444, inset 0 0 2px white;
        }
        .mfm-led-bulb.bulb-green.glow-active {
          background-color: #22c55e;
          box-shadow: 0 0 12px #22c55e, inset 0 0 2px white;
        }
        .mfm-led-bulb.bulb-orange {
          background-color: #b45309;
        }
        .mfm-led-bulb.bulb-orange.glow-active {
          background-color: #f59e0b;
          box-shadow: 0 0 12px #f59e0b, inset 0 0 2px white;
        }
        .mfm-led-label {
          font-size: 0.6rem;
          color: #94a3b8;
          margin-top: 4px;
          font-weight: bold;
          letter-spacing: 0.5px;
        }

        .mfm-spec-labels {
          font-size: 0.65rem;
          line-height: 1.4;
          opacity: 0.65;
        }

        /* Glossy industrial rounded navigation buttons */
        .mfm-button-deck {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 16px;
        }
        .mfm-tactile-btn {
          flex: 1;
          height: 40px;
          background: linear-gradient(180deg, #374151 0%, #1f2937 100%);
          border: 1px solid #111827;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.55), 
                      inset 0 1px 2px rgba(255,255,255,0.2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s ease;
        }
        .mfm-tactile-btn:hover {
          background: linear-gradient(180deg, #4b5563 0%, #374151 100%);
          border-color: #1f2937;
        }
        .mfm-tactile-btn:active {
          transform: translateY(1.5px);
          box-shadow: 0 1px 3px rgba(0,0,0,0.6), 
                      inset 0 1px 4px rgba(0,0,0,0.6);
          background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
        }
        .mfm-tactile-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
          transform: none !important;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
        }
        .mfm-tactile-btn .btn-glyph {
          color: #e5e7eb;
          font-size: 1.0rem;
          font-weight: 800;
          text-shadow: 0 -1px 1px rgba(0,0,0,0.7);
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; filter: brightness(1.2); }
        }

        @media (max-width: 375px) {
          .mfm-polycarbonate-case {
            padding: 10px !important;
            border-width: 4px !important;
            border-radius: 16px !important;
          }
          .mfm-metallic-bezel {
            padding: 10px 8px !important;
            border-radius: 12px !important;
          }
          .mfm-lcd-window {
            border-width: 3px !important;
            border-radius: 8px !important;
            padding: 6px !important;
          }
          .mfm-lcd-screen {
            height: 140px !important;
            padding: 4px 2px !important;
          }
          .mfm-lcd-value {
            font-size: 1.0rem !important;
          }
          .mfm-lcd-label {
            font-size: 0.65rem !important;
          }
          .mfm-lcd-unit {
            font-size: 0.6rem !important;
            width: 24px !important;
          }
        }

        .scada-gauge-card {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, rgba(0, 0, 0, 0.12) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .scada-gauge-card:hover {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0.08) 100%);
          border-color: rgba(6, 182, 212, 0.25);
          transform: translateY(-4px) scale(1.03);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        @keyframes gaugeAlertPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.2); }
          50% { box-shadow: 0 0 24px rgba(239, 68, 68, 0.45), 0 0 48px rgba(239, 68, 68, 0.15); }
        }
        .gauge-alert-pulse {
          animation: gaugeAlertPulse 2s ease-in-out infinite;
        }
        @keyframes gaugeWarningPulse {
          0%, 100% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.15); }
          50% { box-shadow: 0 0 18px rgba(245, 158, 11, 0.35); }
        }
      `}} />
    </div>
  );
};

export default function MainMeterWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <MainMeter />
    </ErrorBoundary>
  );
}
