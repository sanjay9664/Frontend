import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, ProgressBar, Toast, ToastContainer, Table } from 'react-bootstrap';
import { 
  Factory, ShieldAlert, Zap, Activity, Gauge, Fuel, History, 
  Fan, Settings, Thermometer, Droplets, FileDown, Home, 
  Database, AlertCircle, AlertTriangle, TrendingDown,
  ChevronRight, ArrowRightCircle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { io } from 'socket.io-client';

// VIBRANT BUT BALANCED SCADA PALETTE
const SCADA_COLORS = {
  bg: '#05070a', // Deep Black
  panel: 'rgba(255,255,255,0.03)',
  red: '#dc2626', // Vibrant Red
  yellow: '#f59e0b', // Vibrant Gold
  blue: '#2563eb', // Vibrant Blue
  green: '#10b981', // Vibrant Emerald
  cyan: '#0891b2', // Vibrant Cyan
  info: '#1e293b', 
  textMain: '#f8fafc',
  textDim: '#94a3b8',
  glow: 'rgba(8, 145, 178, 0.4)'
};

const SiemensStyleDG = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  
  // Determine activeDG based on route path: /dg-set/dg3 -> DG3, /dg-set/dg2 -> DG2, else DG1
  const activeDG = pathname.includes('dg3') ? 'DG3' : pathname.includes('dg2') ? 'DG2' : 'DG1';
  
  const [showToast, setShowToast] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const userRole = (localStorage.getItem('userRole') || 'user').toUpperCase();
  const hasDGSetWrite = (() => {
    try {
      const perms = JSON.parse(localStorage.getItem('scada_feature_permissions') || '{}');
      return perms.showDGSet_write === true;
    } catch (e) {
      return false;
    }
  })();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || hasDGSetWrite;

  // Initialize state with last known stats from localStorage if available, otherwise fallback to 0/empty
  const getInitialData = (dgName) => {
    let baseData = {
      voltage: { ry: 0, yb: 0, br: 0, rn: 0, yn: 0, bn: 0 },
      current: { r: 0, y: 0, b: 0, avg: 0 },
      power: { kw: 0, kvar: 0, kva: 0, pf: 0 },
      engine: { coolant: 0, oilPressure: 0, speed: 0, runtime: 0, freq: 0, battery: 0 },
      diesel: { 
          level: 0, 
          remaining: 0, 
          capacity: 2000, 
          spentToday: 0, 
          spentYesterday: 0,
          efficiency: 0, 
          lastFill: '-',
          temp: 0 
      },
      faults: {},
      generation: { today: 0, yesterday: 0, month: 0, morning: 0 }
    };

    const cached = localStorage.getItem(`dg_last_data_${dgName}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { ...baseData, ...parsed, faults: parsed.faults || {} };
      } catch (e) {}
    }
    
    return baseData;
  };

  const [data, setData] = useState(() => getInitialData(activeDG));
  const [templateRevision, setTemplateRevision] = useState(0);

  // Sync state when activeDG changes
  useEffect(() => {
    setData(getInitialData(activeDG));
  }, [activeDG]);

  // Listen for template updates from MainLayout fetching
  useEffect(() => {
    const handleStorage = () => setTemplateRevision(r => r + 1);
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Helper to clean corrupted template keys
  const cleanCorruptedMapping = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      let newKey = key;
      if (key.includes('Water Level') && key !== 'agLevelConfig' && key !== 'ugTankLevelConfig' && key !== 'Water Level' && key !== 'agLevel' && key !== 'waterLevel') {
        newKey = key.replace('Water Level', '').trim();
      }
      let value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) value = cleanCorruptedMapping(value);
      cleaned[newKey] = value;
    });
    return cleaned;
  };

  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('SCADA WebSocket Connected - Listening for Telemetry');
    });

    const saved = localStorage.getItem('scada_templates');
    if (!saved) return;
    const templates = JSON.parse(saved).map(t => ({
      ...t,
      mapping: cleanCorruptedMapping(t.mapping)
    }));
    
    const targetModuleName = `DG Set-${activeDG.replace('DG', '')}`;
    const template = templates.find(t => t.module === targetModuleName);

    if (!template || !template.mapping) return;

    const mapping = template.mapping;

    const processTelemetry = (stats) => {
        if (!Array.isArray(stats)) return;

        setData(prev => {
          let newData = { ...prev };
          let updated = false;
          
          // Helper to extract value
          const getValue = (config, fieldKey) => {
            if (!config || config.enabled === false || !config[fieldKey]) return null;
            
            let moduleId = config.module;
            let fieldId = config[fieldKey];
            
            if (fieldId.includes('::')) {
              const parts = fieldId.split('::');
              moduleId = parts[0];
              fieldId = parts[1];
            } else if (!moduleId || moduleId === 'ALL') {
              return null;
            }

            const stat = stats.find(s => String(s.moduleId) === String(moduleId) || String(s.meta?.module_id) === String(moduleId));
            if (stat && stat.meta && stat.meta[fieldId] !== undefined) {
              return Number(stat.meta[fieldId]);
            }
            return null;
          };

          // Engine
          const speed = getValue(mapping.dgEngineConfig, 'speed');
          if (speed !== null) { newData.engine.speed = speed; updated = true; }
          
          const coolant = getValue(mapping.dgEngineConfig, 'coolant');
          if (coolant !== null) { newData.engine.coolant = coolant; updated = true; }

          const oilPress = getValue(mapping.dgEngineConfig, 'oilPress');
          if (oilPress !== null) { newData.engine.oilPressure = oilPress; updated = true; }

          const battery = getValue(mapping.dgEngineConfig, 'battery');
          if (battery !== null) { newData.engine.battery = battery; updated = true; }

          const freq = getValue(mapping.dgEngineConfig, 'freq');
          if (freq !== null) { newData.engine.freq = freq; updated = true; }
          
          const runtime = getValue(mapping.dgEngineConfig, 'runtime');
          if (runtime !== null) { newData.engine.runtime = runtime; updated = true; }

          // Power
          const vL1L2 = getValue(mapping.dgPowerConfig, 'vL1L2');
          if (vL1L2 !== null) { newData.voltage.ry = vL1L2; updated = true; } 

          const iL1 = getValue(mapping.dgPowerConfig, 'iL1');
          if (iL1 !== null) { newData.current.r = iL1; updated = true; }
          
          const iL2 = getValue(mapping.dgPowerConfig, 'iL2');
          if (iL2 !== null) { newData.current.y = iL2; updated = true; }
          
          const iL3 = getValue(mapping.dgPowerConfig, 'iL3');
          if (iL3 !== null) { newData.current.b = iL3; updated = true; }

          const loadKW = getValue(mapping.dgPowerConfig, 'loadKW');
          if (loadKW !== null) { newData.power.kw = loadKW; updated = true; }

          const appKVA = getValue(mapping.dgPowerConfig, 'appKVA');
          if (appKVA !== null) { newData.power.kva = appKVA; updated = true; }

          const pf = getValue(mapping.dgPowerConfig, 'pf');
          if (pf !== null) { newData.power.pf = pf; updated = true; }
          
          const kwh = getValue(mapping.dgPowerConfig, 'kwh');
          if (kwh !== null) { newData.generation.today = kwh; updated = true; }

          // Fuel
          const fuelLvl = getValue(mapping.dgFuelConfig, 'level');
          if (fuelLvl !== null) {
              newData.diesel.level = fuelLvl;
              newData.diesel.remaining = (newData.diesel.capacity * fuelLvl) / 100;
              updated = true;
          }

          // Faults
          const faultKeys = ['emergencyStop', 'masterTrip', 'overVoltage', 'underVoltage', 'overFrequency', 'underFrequency', 'lowOilLevel', 'overTemp'];
          faultKeys.forEach(key => {
            const val = getValue(mapping.dgFaultConfig, key);
            if (val !== null) { 
               const warnVal = mapping.dgFaultConfig[`${key}_warn`];
               const alarmVal = mapping.dgFaultConfig[`${key}_alarm`];
               const healthyVal = mapping.dgFaultConfig[`${key}_healthy`];
               
               const effectiveAlarm = (alarmVal !== undefined && alarmVal !== '') ? String(alarmVal) : '0';
               const effectiveHealthy = (healthyVal !== undefined && healthyVal !== '') ? String(healthyVal) : '1';
               const effectiveWarn = (warnVal !== undefined && warnVal !== '') ? String(warnVal) : null;

               let status = 'gray';
               if (String(val) === effectiveAlarm) status = 'red';
               else if (effectiveWarn !== null && String(val) === effectiveWarn) status = 'orange';
               else if (String(val) === effectiveHealthy) status = 'green';
               
               newData.faults[key] = { value: val, status: status };
               updated = true; 
            }
          });

          if (updated) {
            localStorage.setItem(`dg_last_data_${activeDG}`, JSON.stringify(newData));
            return newData;
          }
          return prev;
        });
    };

    socket.on('telemetry_update', processTelemetry);

    // Fetch initial stats immediately on mount / change and poll every 2 seconds with targeted query
    const fetchStats = async () => {
      try {
        const modulesToPoll = new Set();

        const configFieldsMap = [
          { config: mapping.dgEngineConfig, fields: ['speed', 'coolant', 'oilPress', 'battery', 'freq', 'runtime'] },
          { config: mapping.dgPowerConfig, fields: ['vL1L2', 'iL1', 'iL2', 'iL3', 'loadKW', 'appKVA', 'pf', 'kwh'] },
          { config: mapping.dgFuelConfig, fields: ['level'] },
          { config: mapping.dgFaultConfig, fields: ['emergencyStop', 'masterTrip', 'overVoltage', 'underVoltage', 'overFrequency', 'underFrequency', 'lowOilLevel', 'overTemp'] }
        ];

        configFieldsMap.forEach(({ config, fields }) => {
          if (config && config.enabled !== false) {
            if (config.module && config.module !== 'ALL') {
              modulesToPoll.add(String(config.module));
            }
            fields.forEach(k => {
              if (config[k] && typeof config[k] === 'string' && config[k].includes('::')) {
                const parts = config[k].split('::');
                if (parts[0]) {
                  modulesToPoll.add(String(parts[0]));
                }
              }
            });
          }
        });

        const pollList = Array.from(modulesToPoll);
        if (pollList.length === 0) return;

        const res = await fetch(`/api/templates/stats?modules=${pollList.join(',')}`);
        if (res.ok) {
          const stats = await res.json();
          processTelemetry(stats);
        }
      } catch (err) {
        console.error('Error fetching DG telemetry stats:', err);
      }
    };

    fetchStats();
    const pollInterval = setInterval(fetchStats, 2000);

    return () => {
        socket.disconnect();
        clearInterval(pollInterval);
    };
  }, [activeDG, templateRevision]);

  const handlePdfDownload = () => {
    setGeneratingPdf(true);
    try {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleString();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`DG SET TELEMETRY REPORT`, 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Generated on: ${dateStr}`, 14, 30);
        doc.text(`Target Asset: ${activeDG}`, 14, 35);
        
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(14, 40, 196, 40);

        let startY = 48;

        // --- Engine Health ---
        autoTable(doc, {
            startY: startY,
            head: [['Engine Health', 'Value']],
            body: [
                ['Engine Speed (RPM)', data.engine.speed !== null ? data.engine.speed : '-'],
                ['Coolant Temp (°C)', data.engine.coolant !== null ? data.engine.coolant.toFixed(1) : '-'],
                ['Oil Pressure (BAR)', data.engine.oilPressure !== null ? data.engine.oilPressure.toFixed(1) : '-'],
                ['Frequency (Hz)', data.engine.freq !== null ? data.engine.freq.toFixed(1) : '-'],
                ['Battery Voltage (V)', data.engine.battery !== null ? data.engine.battery.toFixed(1) : '-'],
                ['Run Time (Hrs)', data.engine.runtime !== null ? data.engine.runtime : '-']
            ],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 5 }
        });
        startY = doc.lastAutoTable.finalY + 10;

        // --- Power Matrix ---
        autoTable(doc, {
            startY: startY,
            head: [['Power Matrix', 'Value']],
            body: [
                ['Total Watts (KW)', data.power.kw !== null ? data.power.kw : '-'],
                ['Total Apparent (KVA)', data.power.kva !== null ? data.power.kva : '-'],
                ['Power Factor', data.power.pf !== null ? data.power.pf : '-'],
                ['KWH Total Generation', data.generation.today !== null ? data.generation.today : '-']
            ],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 5 }
        });
        startY = doc.lastAutoTable.finalY + 10;

        // --- Electrical ---
        autoTable(doc, {
            startY: startY,
            head: [['Electrical Phase', 'Voltage (V)', 'Current (A)']],
            body: [
                ['Phase 1 (R/L1)', data.voltage.ry !== null ? data.voltage.ry : '-', data.current.r !== null ? data.current.r : '-'],
                ['Phase 2 (Y/L2)', data.voltage.yb !== null ? data.voltage.yb : '-', data.current.y !== null ? data.current.y : '-'],
                ['Phase 3 (B/L3)', data.voltage.br !== null ? data.voltage.br : '-', data.current.b !== null ? data.current.b : '-']
            ],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 5 }
        });
        startY = doc.lastAutoTable.finalY + 10;

        // --- Fuel Management ---
        autoTable(doc, {
            startY: startY,
            head: [['Fuel Management', 'Status']],
            body: [
                ['Fuel Level (%)', data.diesel.level !== null ? data.diesel.level.toFixed(1) : '-'],
                ['Remaining Volume (L)', data.diesel.remaining !== null ? data.diesel.remaining.toFixed(1) : '-'],
                ['Today Used (L)', data.diesel.spentToday !== null ? data.diesel.spentToday.toFixed(1) : '-'],
                ['Refill Date', data.diesel.lastFill]
            ],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 5 }
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount} - SCADA Automated Report`, 14, 285);
        }

        doc.save(`DG_SET_REPORT_${activeDG}.pdf`);
        setShowToast(true);
    } catch (e) {
        console.error('Error generating PDF', e);
    } finally {
        setGeneratingPdf(false);
    }
  };

  const DataBox = ({ label, value, unit, labelBg = SCADA_COLORS.info, valueColor = '#38bdf8' }) => (
    <div className="d-flex align-items-center mb-1 gap-1 flex-wrap flex-sm-nowrap w-100">
        <div className="data-box-label px-1 py-1 fw-black fs-12 text-center rounded-1 border border-white border-opacity-5 flex-grow-1 flex-sm-grow-0" style={{ width: '75px', minHeight: '26px', fontSize: '0.58rem', backgroundColor: labelBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1' }}>
            {label}
        </div>
        <div className="data-box-value bg-black border border-white border-opacity-10 px-2 py-1 fw-black fs-10 text-center rounded-1 flex-grow-1 font-monospace shadow-value" style={{ minWidth: '55px', minHeight: '26px', color: valueColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {typeof value === 'number' ? value.toFixed(1) : (value !== null && value !== undefined ? value : '-')}
        </div>
        <div className="text-secondary fw-black fs-13 ms-1" style={{ width: '20px', fontSize: '0.65rem' }}>{unit}</div>
    </div>
  );

  const SectionHeader = ({ title, icon, color = SCADA_COLORS.cyan }) => (
    <div className="text-center py-2 fw-black fs-11 border-bottom border-white border-opacity-5 mb-3 uppercase letter-spacing-1 d-flex align-items-center justify-content-center gap-2" 
         style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: color, letterSpacing: '2px' }}>
        {icon} {title}
    </div>
  );

  return (
    <div id="pdf-content" className="fade-in p-2 min-vh-100" style={{ backgroundColor: SCADA_COLORS.bg, color: SCADA_COLORS.textMain }}>
      {/* PREMIUM HIGH-GLOW NAV BAR */}
      <div className="d-flex flex-column flex-lg-row align-items-center bg-black border border-white border-opacity-10 p-3 mb-3 shadow-2xl justify-content-between rounded-4 gap-3">
        <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start gap-3 w-100 w-lg-auto">
            <div className="text-info px-4 py-1.5 fw-black fs-9 rounded-2 border border-info border-opacity-20 shadow-info">HMI CONTROL CENTER</div>
            <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle status-pulse" style={{width: 10, height: 10, backgroundColor: isAdmin ? '#22c55e' : '#f59e0b'}}></div>
                <small className={`${isAdmin ? 'text-success' : 'text-warning'} fw-black fs-12 uppercase tracking-tight`}>
                  {isAdmin ? 'System Online (ADMIN)' : 'System Online (READ-ONLY)'}
                </small>
            </div>
        </div>
        <div className="d-flex flex-wrap gap-2 justify-content-center w-100 w-lg-auto">
            <button onClick={() => navigate('/dashboard')} className="btn btn-sm fw-black border border-white border-opacity-10 rounded-2 px-4 py-1.5 bg-dark text-secondary hover-info fs-12">
                <Home size={14} className="me-2" /> DASHBOARD
            </button>
            <div className="d-flex align-items-center bg-white bg-opacity-5 px-3 py-1 rounded-2 border border-white border-opacity-5" style={{ minHeight: '32px' }}>
                <span className="text-info fw-black fs-12 uppercase tracking-wider" style={{ letterSpacing: '1px' }}>
                    {activeDG === 'DG3' ? 'DG Set-3' : activeDG === 'DG2' ? 'DG Set-2' : 'DG Set-1'}
                </span>
            </div>
            <button 
              onClick={handlePdfDownload} 
              disabled={!isAdmin}
              className={`btn btn-sm fw-black border border-white border-opacity-10 rounded-2 px-4 py-1.5 fs-12 ${isAdmin ? 'bg-primary text-white' : 'bg-secondary bg-opacity-20 text-muted opacity-50 cursor-not-allowed'}`}
            >
                <FileDown size={14} className="me-2" /> {isAdmin ? 'REPORTS' : 'REPORTS LOCKED'}
            </button>
        </div>
        <div className="text-secondary fs-13 font-monospace px-4 fw-black text-center w-100 w-lg-auto">
            {new Date().toLocaleTimeString()}
        </div>
      </div>

      <Row className="g-3">
        {/* LEFT: SAFETY & ASSET */}
        <Col xl={4}>
            <div className="bg-panel border border-white border-opacity-5 p-1 h-100 rounded-4 shadow-sm backdrop-blur">
                <SectionHeader title="Safety Status" icon={<ShieldAlert size={16} />} color="#ef4444" />
                <Row className="g-1 px-3 mb-4">
                    {[
                        { label: 'EMERGENCY STOP', key: 'emergencyStop' }, 
                        { label: 'MASTER TRIP / OVERLOAD', key: 'masterTrip' }, 
                        { label: 'OVER VOLTAGE (HIGH)', key: 'overVoltage' }, 
                        { label: 'UNDER VOLTAGE (LOW)', key: 'underVoltage' }, 
                        { label: 'OVER FREQ (OVER SPEED)', key: 'overFrequency' }, 
                        { label: 'UNDER FREQ (UNDER SPEED)', key: 'underFrequency' }, 
                        { label: 'LOW OIL LEVEL / PRESS', key: 'lowOilLevel' }, 
                        { label: 'OVER TEMP (HIGH COOLANT)', key: 'overTemp' }
                    ].filter(item => {
                        const saved = localStorage.getItem('scada_templates');
                        let currentMapping = null;
                        if (saved) {
                            try {
                                const templates = JSON.parse(saved);
                                const targetModuleName = `DG Set-${activeDG.replace('DG', '')}`;
                                const template = templates.find(t => t.module === targetModuleName);
                                if (template) currentMapping = template.mapping;
                            } catch (e) {}
                        }
                        return currentMapping && currentMapping.dgFaultConfig && currentMapping.dgFaultConfig[item.key];
                    }).map((item, i) => {
                        const faultObj = data.faults ? data.faults[item.key] : null;
                        let bgColor = 'rgba(255, 255, 255, 0.05)';
                        if (faultObj && faultObj.status) {
                             if (faultObj.status === 'red') bgColor = 'rgba(220, 38, 38, 0.4)';
                             else if (faultObj.status === 'orange') bgColor = 'rgba(245, 158, 11, 0.4)';
                             else if (faultObj.status === 'green') bgColor = 'rgba(34, 197, 94, 0.4)';
                        }
                        return (
                            <Col xs={6} key={i}>
                                <div className="text-white text-center py-2 fw-black fs-13 border border-white border-opacity-5 uppercase transition-all shadow-sm" style={{fontSize: '0.65rem', backgroundColor: bgColor, letterSpacing: '0.5px'}}>
                                    {item.label}
                                </div>
                            </Col>
                        );
                    })}
                </Row>
                
                {/* HIGH-POP DG IMAGE */}
                <div className="px-3 mb-4">
                    <div className="border border-info border-opacity-20 p-1 bg-black rounded-4 overflow-hidden shadow-2xl position-relative asset-box">
                        <img src="/dg_set.png" alt="DG" className="img-fluid" style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
                        <div className="position-absolute bottom-0 start-0 w-100 p-2 bg-gradient-scada border-top border-white border-opacity-10">
                             <div className="d-flex justify-content-around text-center py-1">
                                <div><small className="text-muted d-block fs-13 uppercase fw-black">SPEED</small><span className="text-white fw-black fs-10 digital-font">{data.engine.speed !== null ? data.engine.speed.toFixed(0) : '-'}</span></div>
                                <div className="border-start border-white border-opacity-10 px-4"><small className="text-muted d-block fs-13 uppercase fw-black">TOTAL WATTS</small><span className="text-info fw-black fs-10 digital-font">{data.power.kw !== null ? data.power.kw.toFixed(1) : '-'} <small className="fs-13">KW</small></span></div>
                                <div className="border-start border-white border-opacity-10 ps-4"><small className="text-muted d-block fs-13 uppercase fw-black">L1-L2 VOLTS</small><span className="text-warning fw-black fs-10 digital-font">{data.voltage.ry !== null ? data.voltage.ry.toFixed(0) : '-'} <small className="fs-13">V</small></span></div>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="px-3">
                    <SectionHeader title="Operating Ledger" icon={<History size={16} />} color="#94a3b8" />
                    <div className="p-4 bg-black bg-opacity-40 border border-white border-opacity-10 rounded-4 shadow-inner">
                         <div className="d-flex justify-content-between align-items-center mb-1">
                            <small className="text-secondary fw-black fs-12 uppercase">Accumulated Run Time</small>
                            <span className="text-info fw-black fs-8">{data.engine.runtime !== null ? data.engine.runtime : '-'} <small className="fs-13 text-secondary">HRS</small></span>
                         </div>
                         <ProgressBar now={75} variant="info" style={{ height: 5 }} className="bg-white bg-opacity-5 rounded-pill" />
                         <div className="d-flex justify-content-between mt-2">
                             <small className="text-muted fs-13 fw-bold">NEXT SERVICE 2500 HRS</small>
                             <small className="text-success fs-13 fw-bold">OPTIMAL</small>
                         </div>
                    </div>
                </div>
            </div>
        </Col>

        {/* CENTER: ELECTRICALS */}
        <Col xl={4}>
            <div className="bg-panel border border-white border-opacity-5 p-1 h-100 rounded-4 shadow-sm backdrop-blur">
                <Row className="g-1">
                    <Col xs={6}>
                        <SectionHeader title="HV Line Bus" icon={<Zap size={16} />} color="#f59e0b" />
                        <div className="p-2 pt-0">
                            <DataBox label="L1-L2 VOLTS" value={data.voltage.ry} unit="V" labelBg={SCADA_COLORS.red} valueColor={SCADA_COLORS.textMain} />
                            <DataBox label="L2-L3 VOLTS" value={data.voltage.yb} unit="V" labelBg={SCADA_COLORS.yellow} valueColor={SCADA_COLORS.textMain} />
                            <DataBox label="L3-L1 VOLTS" value={data.voltage.br} unit="V" labelBg={SCADA_COLORS.blue} valueColor={SCADA_COLORS.textMain} />
                        </div>
                    </Col>
                    <Col xs={6}>
                        <SectionHeader title="LV Phase Bus" icon={<Zap size={16} />} color="#f59e0b" />
                        <div className="p-2 pt-0">
                            <DataBox label="L1-N VOLTS" value={data.voltage.rn} unit="V" labelBg={SCADA_COLORS.red} valueColor={SCADA_COLORS.textMain} />
                            <DataBox label="L2-N VOLTS" value={data.voltage.yn} unit="V" labelBg={SCADA_COLORS.yellow} valueColor={SCADA_COLORS.textMain} />
                            <DataBox label="L3-N VOLTS" value={data.voltage.bn} unit="V" labelBg={SCADA_COLORS.blue} valueColor={SCADA_COLORS.textMain} />
                        </div>
                    </Col>
                    <Col xs={6}>
                        <SectionHeader title="Amperage" icon={<Activity size={16} />} color="#06b6d4" />
                        <div className="p-2 pt-0">
                            <DataBox label="L1 CURRENT" value={data.current.r} unit="A" labelBg={SCADA_COLORS.red} valueColor={SCADA_COLORS.textMain} />
                            <DataBox label="L2 CURRENT" value={data.current.y} unit="A" labelBg={SCADA_COLORS.yellow} valueColor={SCADA_COLORS.textMain} />
                            <DataBox label="L3 CURRENT" value={data.current.b} unit="A" labelBg={SCADA_COLORS.blue} valueColor={SCADA_COLORS.textMain} />
                        </div>
                    </Col>
                    <Col xs={6}>
                        <SectionHeader title="Power Matrix" icon={<TrendingDown size={16} />} color="#10b981" />
                        <div className="p-2 pt-0">
                            <DataBox label="TOTAL WATTS" value={data.power.kw} unit="KW" labelBg={SCADA_COLORS.cyan} valueColor="#fff" />
                            <DataBox label="TOTAL VA" value={data.power.kva} unit="KVA" labelBg="#334155" valueColor="#fff" />
                            <DataBox label="POWER FACTOR" value={data.power.pf} unit="PF" labelBg={SCADA_COLORS.green} valueColor="#fff" />
                        </div>
                    </Col>
                    <Col xs={12}>
                        <SectionHeader title="Engine Health" icon={<Gauge size={16} />} color="#94a3b8" />
                        <div className="p-3 pt-1">
                            <Row className="g-2">
                                <Col xs={6}>
                                    <div className="health-card text-center p-2 rounded-3 border border-white border-opacity-5">
                                        <small className="text-muted d-block fs-13 mb-1 fw-black uppercase">Coolant Temp</small>
                                        <span className="text-warning fw-black fs-9">{data.engine.coolant !== null ? `${data.engine.coolant.toFixed(1)}°C` : '-'}</span>
                                    </div>
                                </Col>
                                <Col xs={6}>
                                    <div className="health-card text-center p-2 rounded-3 border border-white border-opacity-5">
                                        <small className="text-muted d-block fs-13 mb-1 fw-black uppercase">Oil Pressure</small>
                                        <span className="text-white fw-black fs-9">{data.engine.oilPressure !== null ? data.engine.oilPressure.toFixed(1) : '-'} <small className="fs-13 text-muted">BAR</small></span>
                                    </div>
                                </Col>
                                <Col xs={6}>
                                    <div className="health-card text-center p-2 rounded-3 border border-white border-opacity-5">
                                        <small className="text-muted d-block fs-13 mb-1 fw-black uppercase">Frequency</small>
                                        <span className="text-success fw-black fs-9">{data.engine.freq !== null ? data.engine.freq.toFixed(1) : '-'} <small className="fs-13 text-muted">HZ</small></span>
                                    </div>
                                </Col>
                                <Col xs={6}>
                                    <div className="health-card text-center p-2 rounded-3 border border-white border-opacity-5">
                                        <small className="text-muted d-block fs-13 mb-1 fw-black uppercase">Battery V</small>
                                        <span className="text-info fw-black fs-9">{data.engine.battery !== null ? data.engine.battery.toFixed(1) : '-'} <small className="fs-13 text-muted">V</small></span>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </Col>
                </Row>

                <SectionHeader title="Production Stats" icon={<Database size={16} />} color="#06b6d4" />
                <div className="px-4 pb-4">
                    <Table borderless variant="dark" className="bg-transparent mb-0">
                        <tbody>
                            <tr className="border-bottom border-white border-opacity-5">
                                <td className="py-2 text-muted fw-black fs-12 uppercase">KWH Total</td>
                                <td className="py-2 text-end text-info fw-black fs-10">{data.generation.today} KWH</td>
                            </tr>
                            <tr>
                                <td className="py-2 text-muted fw-black fs-12 uppercase">Monthly Total</td>
                                <td className="py-2 text-end text-success fw-black fs-10">{data.generation.month} MWH</td>
                            </tr>
                        </tbody>
                    </Table>
                </div>
            </div>
        </Col>

        {/* RIGHT: DIESEL STATUS */}
        <Col xl={4}>
             <div className="bg-panel border border-white border-opacity-5 p-1 h-100 rounded-4 shadow-sm backdrop-blur">
                <SectionHeader title="Fuel Management" icon={<Fuel size={16} />} color="#f59e0b" />
                <div className="px-4 py-3">
                    <div className="text-center mb-4 mt-2">
                        <div className="position-relative d-inline-block p-1 bg-black rounded-4 border border-white border-opacity-5 shadow-2xl">
                             <div className="tank-visual-modern-scada">
                                <div className="liquid-fill" style={{ height: `${data.diesel.level !== null ? data.diesel.level : 0}%`, background: 'linear-gradient(to top, #d97706, #f59e0b)' }}>
                                     <div className="wave-scada"></div>
                                </div>
                             </div>
                             <div className="position-absolute top-50 start-50 translate-middle text-center w-100">
                                <h2 className="text-white fw-black mb-1 fs-7 digital-font" style={{textShadow: '0 0 15px rgba(245, 158, 11, 0.5)'}}>{data.diesel.level !== null ? `${data.diesel.level.toFixed(1)}%` : '-'}</h2>
                                <small className="text-warning fw-black uppercase fs-12 tracking-widest">Level</small>
                             </div>
                        </div>
                    </div>
                    
                    <Row className="g-2 mb-4">
                        <Col xs={6}>
                            <div className="p-3 rounded-4 bg-black border border-white border-opacity-10 text-center shadow-inner">
                                <small className="text-muted d-block fw-black fs-12 mb-1 uppercase">Today Used</small>
                                <span className="text-danger fw-black fs-9">{data.diesel.spentToday !== null ? data.diesel.spentToday.toFixed(1) : '-'} <small className="fs-12 text-muted">L</small></span>
                            </div>
                        </Col>
                        <Col xs={6}>
                             <div className="p-3 rounded-4 bg-black border border-white border-opacity-10 text-center shadow-inner">
                                <small className="text-muted d-block fw-black fs-12 mb-1 uppercase">Refill Date</small>
                                <span className="text-info fw-black fs-12">{data.diesel.lastFill}</span>
                            </div>
                        </Col>
                    </Row>

                    <div className="d-flex flex-column gap-2 mb-4">
                         <DataBox label="Current Ltrs" value={data.diesel.remaining} unit="L" labelBg="#1e293b" valueColor="#fff" />
                         <DataBox label="Efficiency" value={data.diesel.efficiency} unit="L/KWh" labelBg="#1e293b" valueColor="#fff" />
                    </div>
                </div>

                <SectionHeader title="System Auxiliaries" icon={<Settings size={16} />} color="#94a3b8" />
                <div className="px-4 py-2">
                    <Row className="g-2">
                        {[
                            {l: 'COOLING FAN', s: 'ONLINE', c: 'success'},
                            {l: 'EXHAUST MTR', s: 'ONLINE', c: 'success'},
                            {l: 'FUEL PUMP', s: 'IDLE', c: 'warning'},
                            {l: 'OIL COOLER', s: 'ONLINE', c: 'success'},
                        ].map((aux, i) => (
                            <Col xs={6} key={i}>
                                <div className="p-2 border border-white border-opacity-5 bg-black rounded-3 d-flex justify-content-between align-items-center shadow-inner px-3">
                                    <small className="fw-black fs-13 text-muted uppercase">{aux.l}</small>
                                    <div className={`status-dot bg-${aux.c}`}></div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>
                
                 <div className="mt-auto px-4 pb-4 pt-4 text-center">
                    <button 
                      disabled={!isAdmin}
                      className={`btn w-100 fw-black uppercase py-3 rounded-4 border-0 mb-3 fs-12 d-flex align-items-center justify-content-center gap-2 shadow-info ${isAdmin ? 'btn-info' : 'btn-secondary opacity-50'}`}
                    >
                         <ArrowRightCircle size={18} /> {isAdmin ? 'CONTROL SYNC ACTIVE' : 'VIEW ONLY MODE'}
                    </button>
                 </div>
             </div>
        </Col>
      </Row>

      {/* PDF OVERLAY */}
      {generatingPdf && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-80 d-flex flex-column align-items-center justify-content-center" style={{zIndex: 9999, backdropFilter: 'blur(10px)'}}>
            <div className="spinner-border text-info mb-4" style={{width: '3rem', height: '3rem'}}></div>
            <h4 className="text-white fw-black uppercase letter-spacing-2">Synchronizing SCADA Logs...</h4>
        </div>
      )}

      {/* SUCCESS TOAST */}
      <ToastContainer position="bottom-end" className="p-4">
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide className="bg-dark border border-info border-opacity-20 shadow-2xl">
            <Toast.Body className="text-white fs-12 p-3 d-flex align-items-center gap-3">
                <div className="bg-success bg-opacity-20 p-2 rounded-circle"><FileDown size={20} className="text-success" /></div>
                <div>
                     <div className="fw-black text-info uppercase">Export Complete</div>
                     <small className="text-muted">DG_SET_REPORT_SUCCESS.pdf</small>
                </div>
            </Toast.Body>
        </Toast>
      </ToastContainer>

      <style dangerouslySetInnerHTML={{ __html: `
        .fw-black { font-weight: 950 !important; }
        .fs-13 { font-size: 0.68rem !important; }
        .fs-12 { font-size: 0.78rem !important; }
        .fs-11 { font-size: 0.95rem !important; }
        .fs-10 { font-size: 1.15rem !important; }
        .fs-9 { font-size: 1.4rem !important; }
        .fs-8 { font-size: 1.8rem !important; }
        .fs-7 { font-size: 2.2rem !important; }
        .uppercase { text-transform: uppercase !important; }
        .letter-spacing-1 { letter-spacing: 1px !important; }
        .letter-spacing-2 { letter-spacing: 2px !important; }
        .bg-panel { background-color: rgba(15, 23, 42, 0.4); }
        .shadow-info { box-shadow: 0 0 20px rgba(8, 145, 178, 0.4); }
        .shadow-value { box-shadow: inset 0 2px 10px rgba(0,0,0,0.5); }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9); }
        .shadow-inner { box-shadow: inset 0 2px 8px rgba(0,0,0,0.6); }
        .backdrop-blur { backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); }
        .asset-box { border: 2px solid rgba(8, 145, 178, 0.3); }
        .bg-gradient-scada { background: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%); }
        .min-w-85 { min-width: 85px; }
        .digital-font { font-family: 'Courier New', Courier, monospace !important; }

        /* Modern Tank Visual */
        .tank-visual-modern-scada {
            width: 140px;
            height: 180px;
            background: rgba(255,255,255,0.03);
            border-radius: 12px;
            position: relative;
            overflow: hidden;
        }
        .liquid-fill {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            transition: height 1s ease-in-out;
        }
        .wave-scada {
            position: absolute;
            top: -15px;
            left: -50%;
            width: 200%;
            height: 30px;
            background: rgba(255,255,255,0.1);
            border-radius: 45%;
            animation: scada-wave 5s linear infinite;
        }
        @keyframes scada-wave {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .status-pulse { animation: status-pulse-anim 2s infinite; }
        @keyframes status-pulse-anim {
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; opacity: 0.8; }
        .health-card:hover { border-color: rgba(255,255,255,0.2) !important; background-color: rgba(255,255,255,0.05) !important; }
        .transition-all { transition: all 0.3s ease; }

        @media (max-width: 576px) {
          .fs-9 { font-size: 1.1rem !important; }
          .fs-8 { font-size: 1.4rem !important; }
          .fs-7 { font-size: 1.8rem !important; }
          .tank-visual-modern-scada {
             width: 100px !important;
             height: 140px !important;
          }
          .asset-box img {
             height: 180px !important;
          }
          .health-card span {
             font-size: 1.1rem !important;
          }
          .health-card small {
             font-size: 0.6rem !important;
          }
        }
      `}} />
    </div>
  );
};

export default SiemensStyleDG;
