import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Container, Button } from 'react-bootstrap';
import { Sun, Battery, BatteryCharging, UtilityPole, PlugZap, Zap, RefreshCw, Download, CloudRain, Wind, Droplets, Activity, Clock, History, Server, Building2, Lightbulb, MoreVertical, Thermometer } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

// --- MOCK DATA GENERATORS ---
const generatePowerMetrics = () => {
  const data = [];
  let soc = 100;
  for (let i = 0; i < 24; i++) {
    const time = `${i.toString().padStart(2, '0')}:00`;
    const production = (i > 6 && i < 18) ? Math.max(0, Math.sin((i - 6) * Math.PI / 12) * 3500 + (Math.random() * 500)) : 0;
    const load = 500 + Math.random() * 1000 + (i > 18 && i < 22 ? 2000 : 0);
    let battery = 0;
    let grid = 0;
    if (production > load) {
       if (soc < 100) { battery = -(production - load); soc += 2; } 
       else { grid = -(production - load); }
    } else {
       if (soc > 20) { battery = (load - production); soc -= 3; } 
       else { grid = (load - production); }
    }
    data.push({ time, soc: Math.max(0, Math.min(100, soc)), production: parseFloat(production.toFixed(0)), battery: parseFloat(battery.toFixed(0)), grid: parseFloat(grid.toFixed(0)), load: parseFloat(load.toFixed(0)) });
  }
  return data;
};

const generateHistory = () => {
  const data = [];
  for (let i = 1; i <= 15; i++) {
    data.push({ date: `Jul ${i}`, pvYield: 15 + Math.random() * 10, load: 10 + Math.random() * 8, battCharge: 5 + Math.random() * 5, battDischarge: 4 + Math.random() * 5 });
  }
  return data;
};

const generateHourly = () => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    const isDay = i > 6 && i < 18;
    const ampm = i < 12 ? 'am' : 'pm';
    const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
    data.push({ time: `${displayHour}${ampm}`, solar: isDay ? parseFloat((Math.random() * 1.5 + 0.5).toFixed(2)) : 0, fromBattery: (!isDay || Math.random() > 0.8) ? parseFloat((Math.random() * 1.0 + 0.2).toFixed(2)) : 0, fromGrid: (!isDay && Math.random() > 0.5) ? parseFloat((Math.random() * 0.5).toFixed(2)) : 0, toBattery: isDay ? -parseFloat((Math.random() * 1.5 + 0.5).toFixed(2)) : 0 });
  }
  return data;
};

const WEATHER_LOCATIONS = {
  'Delhi': { lat: 28.6139, lon: 77.2090, temp: '35°C', weather: 'Clear', hum: '42%', wind: '12 km/h' },
  'Noida': { lat: 28.5355, lon: 77.3910, temp: '36°C', weather: 'Sunny', hum: '40%', wind: '10 km/h' },
  'Ghaziabad': { lat: 28.6692, lon: 77.4538, temp: '35°C', weather: 'Clear', hum: '41%', wind: '11 km/h' },
  'Gurugram': { lat: 28.4595, lon: 77.0266, temp: '37°C', weather: 'Hot', hum: '38%', wind: '14 km/h' },
  'Mumbai': { lat: 19.0760, lon: 72.8777, temp: '31°C', weather: 'Humid', hum: '80%', wind: '18 km/h' }
};

// --- STYLED COMPONENTS & ICONS ---
const DashboardTheme = { bg: '#0a101d', panelBg: '#131b2c', cardBg: '#1b2436', border: '#2c3a50', text: '#e2e8f0', muted: '#94a3b8', accent: '#f97316', green: '#10b981', blue: '#0ea5e9', red: '#ef4444', purple: '#d946ef' };

const RealGridIcon = ({ size = 24, color = "#8b949e" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22L11 2h2l5 22" />
    <path d="M4 8h16" />
    <path d="M2 14h20" />
    <path d="M12 2v20" />
    <path d="M6 14l6-6 6 6" />
    <path d="M8 22l4-8 4 8" />
  </svg>
);

const RealSolarIcon = ({ size = 24, color = "#facc15" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="4 14 20 14 22 6 2 6 4 14" fill="rgba(250, 204, 21, 0.1)" />
    <line x1="8" y1="14" x2="7" y2="6" /><line x1="12" y1="14" x2="12" y2="6" /><line x1="16" y1="14" x2="17" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M12 14v6" /><path d="M8 20h8" />
  </svg>
);

const RealBatteryIcon = ({ size = 24, color = "#10b981" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="12" rx="2" fill="rgba(16, 185, 129, 0.1)" />
    <path d="M21 10v4" />
    <rect x="5" y="8" width="10" height="8" rx="1" fill={color} stroke="none" />
    <path d="M11 10l-2 3h3l-2 3" stroke="#181a1f" strokeWidth="1.5" />
  </svg>
);

// --- NEW CUSTOM ICONS ---
const GridIconBig = () => (
  <svg width="45" height="55" viewBox="0 0 60 70" fill="none" stroke="#718096" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 10 L15 65 M30 10 L45 65" />
    <path d="M5 20 L55 20 M10 35 L50 35 M12 50 L48 50" />
    <path d="M15 65 L45 65" />
    <path d="M22 20 L10 35 M38 20 L50 35 M17 35 L12 50 M43 35 L48 50" />
    <path d="M22 20 L38 35 M38 20 L22 35 M17 35 L33 50 M43 35 L27 50" />
    <path d="M5 20 L5 25 M55 20 L55 25" />
    <path d="M5 25 Q 17 30 30 30 Q 43 30 55 25" stroke="#4a5568" strokeDasharray="4 4"/>
  </svg>
);

const SolarIconBig = () => (
  <svg width="55" height="50" viewBox="0 0 60 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="20" r="12" fill="url(#sunGrad)" />
    <path d="M30 2 L30 5 M30 35 L30 38 M12 20 L15 20 M45 20 L48 20 M17 7 L19 9 M43 33 L41 31 M17 33 L19 31 M43 7 L41 9" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="sunGrad" x1="30" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fde047" />
        <stop offset="1" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="panelGrad" x1="30" y1="25" x2="30" y2="45" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3b82f6" />
        <stop offset="1" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    <path d="M10 25 L50 25 L55 40 L5 40 Z" fill="url(#panelGrad)" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M20 25 L16 40 M30 25 L30 40 M40 25 L44 40 M10 25 L50 25 M7 32 L53 32 M5 40 L55 40" stroke="#93c5fd" strokeWidth="1"/>
    <path d="M28 40 L28 45 L32 45 L32 40 M24 45 L36 45" stroke="#475569" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const BatteryIconBig = () => (
  <svg width="35" height="50" viewBox="0 0 40 55" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="2" width="16" height="4" rx="2" fill="#10b981" />
    <rect x="2" y="8" width="36" height="45" rx="4" stroke="#10b981" strokeWidth="3" />
    <rect x="7" y="13" width="26" height="35" rx="2" fill="rgba(16,185,129,0.2)" />
    <path d="M22 20 L15 28 H24 L16 40 L26 29 H18 L22 20 Z" fill="#10b981" style={{ filter: 'drop-shadow(0 0 5px #10b981)' }} />
  </svg>
);

const BuildingIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.8))' }}>
    <path d="M6 28 V8 L16 4 V28 M16 12 H26 V28" />
    <path d="M2 28 H28" />
    <rect x="9" y="12" width="2" height="3" fill="#a855f7"/><rect x="9" y="18" width="2" height="3" fill="#a855f7"/><rect x="9" y="24" width="2" height="3" fill="#a855f7"/>
    <rect x="12" y="8" width="2" height="3" fill="#a855f7"/><rect x="12" y="14" width="2" height="3" fill="#a855f7"/><rect x="12" y="20" width="2" height="3" fill="#a855f7"/>
    <rect x="19" y="16" width="2" height="3" fill="#a855f7"/><rect x="19" y="22" width="2" height="3" fill="#a855f7"/>
    <rect x="23" y="16" width="2" height="3" fill="#a855f7"/><rect x="23" y="22" width="2" height="3" fill="#a855f7"/>
  </svg>
);

const ServerIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.8))' }}>
    <rect x="4" y="4" width="22" height="6" rx="1" /><rect x="4" y="12" width="22" height="6" rx="1" /><rect x="4" y="20" width="22" height="6" rx="1" />
    <circle cx="8" cy="7" r="1" fill="#a855f7" /><circle cx="8" cy="15" r="1" fill="#a855f7" /><circle cx="8" cy="23" r="1" fill="#a855f7" />
    <path d="M22 7 H24 M22 15 H24 M22 23 H24" />
  </svg>
);

const DropIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="rgba(168,85,247,0.3)" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.8))' }}>
    <path d="M15 3 C15 3 6 12 6 19 A 9 9 0 0 0 24 19 C24 12 15 3 15 3 Z" />
    <path d="M11 20 A 4 4 0 0 0 15 24" stroke="#fff" strokeWidth="1.5" fill="none" />
  </svg>
);

const LightningIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(168,85,247,1))' }}>
    <path d="M16 3 L6 16 H15 L14 27 L24 14 H15 L16 3 Z" fill="rgba(168,85,247,0.4)" strokeWidth="2" />
  </svg>
);

const LampIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.8))' }}>
    <path d="M12 28 H22 M17 28 V12 C17 6 12 5 7 5 H3" />
    <path d="M3 3 L9 7 L8 9 H2 Z" fill="rgba(168,85,247,0.3)" />
    <circle cx="5" cy="9" r="2" fill="#fff" stroke="none" style={{ filter: 'drop-shadow(0 0 6px #fff)' }}/>
  </svg>
);

const MiniWave = ({ color }) => (
  <svg width="100%" height="25" viewBox="0 0 200 25" preserveAspectRatio="none" className="mt-2" style={{ overflow: 'hidden' }}>
     <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stopColor={color} stopOpacity="0.4"/>
           <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
     </defs>
     <g style={{ animation: 'waveMove 5s linear infinite' }}>
       <path d="M0,15 Q10,5 20,15 T40,15 T60,15 T80,15 T100,15 T120,15 T140,15 T160,15 T180,15 T200,15 T220,15 T240,15 T260,15 L260,30 L0,30 Z" fill={`url(#grad-${color.replace('#','')})`} />
       <path d="M0,15 Q10,5 20,15 T40,15 T60,15 T80,15 T100,15 T120,15 T140,15 T160,15 T180,15 T200,15 T220,15 T240,15 T260,15" fill="none" stroke={color} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
     </g>
  </svg>
);

const FlowLine = ({ path, color, flowing = true, reverse = false }) => {
  const markerId = `arrow-${color.replace('#', '')}`;
  return (
  <>
     <defs>
       <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
         <path d="M 0 0 L 8 4 L 0 8 z" fill={color} />
       </marker>
     </defs>
     <path d={path} fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.4" markerEnd={`url(#${markerId})`} />
     {flowing && (
       <path d={path} fill="none" stroke={color} strokeWidth="3" strokeDasharray="8 8"
         style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.2))', animation: `dashFlow ${reverse ? 'reverse' : 'normal'} 1.5s linear infinite` }} />
     )}
  </>
)};

const SolarDashboard = ({ mainMeters = [], subMeters = [] }) => {
  const { isDark } = useTheme();
  const currentTheme = isDark ? 
    { bg: '#0a101d', panelBg: '#131b2c', cardBg: '#1b2436', border: '#2c3a50', text: '#e2e8f0', muted: '#94a3b8', accent: '#f97316', green: '#10b981', blue: '#0ea5e9', red: '#ef4444', purple: '#d946ef', yellow: '#facc15', shadow: 'none', glow: true, progressGrad: 'linear-gradient(90deg, #a855f7, #d946ef)' } : 
    { bg: '#d2d3db', panelBg: '#d2d3db', cardBg: 'rgba(255, 255, 255, 0.25)', border: 'rgba(0, 0, 0, 0.08)', text: '#1e293b', muted: '#475569', accent: '#c2410c', green: '#047857', blue: '#0369a1', red: '#b91c1c', purple: '#7e22ce', yellow: '#b45309', shadow: '0 4px 20px rgba(0, 0, 0, 0.03)', glow: false, progressGrad: 'linear-gradient(90deg, #7e22ce, #a21caf)' };

  const [topRightTab, setTopRightTab] = useState('Power Metrics');
  const [bottomRightTab, setBottomRightTab] = useState('BMS');
  const [powerData, setPowerData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2025-07-16');
  const [weatherCity, setWeatherCity] = useState('Delhi');
  
  const [liveNodes, setLiveNodes] = useState({
    grid: 925,
    solar: 925,
    total: 1850,
    loads: [650, 450, 300, 200, 150, 100],
    batterySoc: 62.0,
    batteryV: 53.2,
    batteryA: 28.3,
    gridV: 230.1,
    gridA: 4.02,
    gridHz: 50.0,
    solarV: 312.6,
    solarA: 2.96,
    invEff: 96.5,
    invTemp: 42.3
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveNodes(prev => {
        const fluct = (val, maxDelta) => Math.max(0, val + (Math.random() * maxDelta * 2 - maxDelta));
        const grid = Math.round(fluct(925, 30));
        const solar = Math.round(fluct(925, 30));
        const total = grid + solar;
        const baseLoads = [650, 450, 300, 200, 150, 100];
        const baseTotal = 1850;
        const loads = baseLoads.map(b => Math.round(b * (total / baseTotal)));
        const sum = loads.reduce((a,b)=>a+b, 0);
        loads[5] += (total - sum);

        return {
          grid,
          solar,
          total,
          loads,
          batterySoc: Math.min(100, Math.max(0, parseFloat((prev.batterySoc + (Math.random() * 0.2 - 0.1)).toFixed(1)))),
          batteryV: parseFloat(fluct(53.2, 0.2).toFixed(1)),
          batteryA: parseFloat(fluct(28.3, 0.5).toFixed(1)),
          gridV: parseFloat(fluct(230.1, 1).toFixed(1)),
          gridA: parseFloat(fluct(4.02, 0.1).toFixed(2)),
          gridHz: parseFloat(fluct(50.0, 0.05).toFixed(1)),
          solarV: parseFloat(fluct(312.6, 2).toFixed(1)),
          solarA: parseFloat(fluct(2.96, 0.1).toFixed(2)),
          invEff: parseFloat(fluct(96.5, 0.2).toFixed(1)),
          invTemp: parseFloat(fluct(42.3, 0.5).toFixed(1))
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  const currentCity = WEATHER_LOCATIONS[weatherCity];

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.getBoundingClientRect().width;
        if (width > 0) {
          const widthScale = width / 1150;
          const availableHeight = window.innerHeight - 120; // Accounts for header and padding
          const heightScale = availableHeight / 700;
          setScale(Math.min(widthScale, heightScale)); // Fits both width and height without scrolling
        }
      }
    };

    const observer = new ResizeObserver(handleResize);
    window.addEventListener('resize', handleResize);
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
      // Trigger once immediately
      handleResize();
    }
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Compute real data where available
  const hasRealMain = mainMeters && mainMeters.length > 0;
  const realTotalKw = mainMeters ? mainMeters.reduce((s, m) => s + (m.loadKw || 0), 0) : 0;
  const realTotalW = Math.round(realTotalKw * 1000);
  const realV = hasRealMain ? (mainMeters.reduce((s, m) => s + Math.max(m.vR||0, m.vY||0, m.vB||0), 0) / mainMeters.length).toFixed(1) : null;
  const realA = hasRealMain ? mainMeters.reduce((s, m) => s + (m.iR||0)+(m.iY||0)+(m.iB||0), 0).toFixed(2) : null;
  const realHz = hasRealMain ? (mainMeters[0].freq || 50).toFixed(1) : null;
  const realKwh = hasRealMain ? mainMeters.reduce((s, m) => s + (m.kwh || 0), 0).toFixed(2) : null;

  // Use real data or fallback to dummy
  const gridW = hasRealMain ? realTotalW : liveNodes.grid;
  const gridV = hasRealMain ? realV : liveNodes.gridV;
  const gridA = hasRealMain ? realA : liveNodes.gridA;
  const gridHz = hasRealMain ? realHz : liveNodes.gridHz;
  const gridKwh = hasRealMain ? realKwh : "6.35";

  // Calculate dummy total but use real if it's there
  const totalSystemW = gridW + liveNodes.solar;

  // Submeters override
  const defaultLoadTitles = [
    "COMMERCIAL WING A INCOMER",
    "DATA CENTER MAIN UPS INPUT",
    "WATER PLANT & UTILITY MOTORS ROOM",
    "PHASE-NEUTRAL VOLTAGE",
    "PHASE-NEUTRAL VOLTAGE",
    "OUTDOOR STREET & PARKING LIGHTS"
  ];

  const displayLoads = liveNodes.loads.map((dummyW, i) => {
    // If we have a mapped submeter for this index, use it. Otherwise use dummy.
    const realSub = subMeters && subMeters[i];
    if (realSub && realSub.isOnline) {
      const realSubW = Math.round((realSub.loadKw || 0) * 1000);
      return {
        title: realSub.name,
        w: realSubW,
        pct: totalSystemW > 0 ? ((realSubW / totalSystemW) * 100).toFixed(1) : "0.0",
        kwh: (realSub.kwh || 0).toFixed(2)
      };
    }
    
    // Otherwise fallback to dummy
    return {
      title: defaultLoadTitles[i],
      w: dummyW,
      pct: totalSystemW > 0 ? ((dummyW / totalSystemW) * 100).toFixed(1) : "0.0",
      kwh: i === 0 ? "5.21" : i === 1 ? "3.45" : i === 2 ? "2.87" : i === 3 ? "1.52" : i === 4 ? "1.09" : "0.92"
    };
  });

  const totalLoadW = displayLoads.reduce((sum, l) => sum + l.w, 0);

  useEffect(() => {
    setPowerData(generatePowerMetrics());
    setHistoryData(generateHistory());
    setHourlyData(generateHourly());
  }, [selectedDate]);

  return (
    <div className="theme-transition" style={{ background: currentTheme.bg, minHeight: '100vh', color: currentTheme.text, fontFamily: "'Inter', sans-serif" }}>
       <style>{`
          .theme-transition, .theme-transition * {
             transition: background-color 0.6s ease, background 0.6s ease, border-color 0.6s ease, box-shadow 0.6s ease, color 0.6s ease, fill 0.6s ease, stroke 0.6s ease;
          }
          @keyframes dashFlow { from { stroke-dashoffset: 16; } to { stroke-dashoffset: 0; } }
          @keyframes waveMove { from { transform: translateX(0); } to { transform: translateX(-40px); } }
          .action-hover:hover { opacity: 0.8; }
          ::-webkit-scrollbar { height: 8px; width: 8px; }
          ::-webkit-scrollbar-track { background: ${currentTheme.bg}; }
          ::-webkit-scrollbar-thumb { background: ${currentTheme.border}; border-radius: 4px; }
       `}</style>

       <Container fluid className="pt-2 px-4 pb-0">
          <Row className="g-0">
             {/* LEFT PARTITION: ENERGY METERING OVERVIEW */}
             <Col xl={12} lg={12} className="position-relative">
                <Card className="border-0 h-100" style={{ background: currentTheme.panelBg, overflow: 'hidden', boxShadow: currentTheme.shadow, minHeight: 'calc(100vh - 90px)' }}>
                   <div ref={containerRef} style={{ width: '100%', height: `${680 * scale}px`, position: 'relative', display: 'flex', justifyContent: 'center' }}>
                      <div style={{ position: 'absolute', top: 0, width: '1150px', height: '680px', transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                         
                         {/* SVG Connecting Lines */}
                         <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                            <FlowLine path="M 300 88 L 340 88 L 340 140 L 380 140" color={currentTheme.blue} />
                            <FlowLine path="M 300 258 L 340 258 L 340 200 L 380 200" color={currentTheme.yellow} />
                            <FlowLine path="M 300 428 L 340 428 L 340 260 L 380 260" color={currentTheme.green} />
                            <FlowLine path="M 300 598 L 340 598 L 340 320 L 380 320" color={currentTheme.red} />
                            <FlowLine path="M 510 380 L 510 430" color={currentTheme.purple} />
                            <FlowLine path="M 640 500 L 700 500" color={currentTheme.purple} />
                            <FlowLine path="M 700 68 L 700 593" color={currentTheme.purple} />
                            <FlowLine path="M 700 68 L 750 68" color={currentTheme.purple} />
                            <FlowLine path="M 700 173 L 750 173" color={currentTheme.purple} />
                            <FlowLine path="M 700 278 L 750 278" color={currentTheme.purple} />
                            <FlowLine path="M 700 383 L 750 383" color={currentTheme.purple} />
                            <FlowLine path="M 700 488 L 750 488" color={currentTheme.purple} />
                            <FlowLine path="M 700 593 L 750 593" color={currentTheme.purple} />
                         </svg>

                         {/* COL 1: INPUTS */}
                         <div style={{ position: 'absolute', left: '20px', top: '10px', background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', padding: '15px 20px', width: '280px', height: '155px', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: currentTheme.shadow }}>
                            <div className="d-flex w-100">
                               <div className="me-3 d-flex align-items-start justify-content-center" style={{ width: '50px' }}>
                                  <GridIconBig />
                               </div>
                               <div>
                                  <div className={`fw-bold mb-1 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '13px', letterSpacing: '0.5px' }}>GRID (UTILITY)</div>
                                  <div style={{ color: currentTheme.blue, fontSize: '30px', fontWeight: 'bold', lineHeight: '1.2', transition: 'color 0.3s ease' }}>{gridW} W</div>
                                  <div className={`fw-bold mt-1 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '12px' }}>{gridV} V <span className="text-muted mx-1">|</span> {gridA} A <span className="text-muted mx-1">|</span> {gridHz} Hz</div>
                               </div>
                            </div>
                            <MiniWave color={currentTheme.blue} />
                            <div className="d-flex flex-column mt-1">
                               <span className="text-muted" style={{ fontSize: '11px' }}>Today's Energy</span>
                               <span className={`fw-bold text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '13px' }}>{gridKwh} kWh</span>
                            </div>
                         </div>

                         <div style={{ position: 'absolute', left: '20px', top: '180px', background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', padding: '15px 20px', width: '280px', height: '155px', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: currentTheme.shadow }}>
                            <div className="d-flex w-100">
                               <div className="me-3 d-flex align-items-start justify-content-center" style={{ width: '50px' }}>
                                  <SolarIconBig />
                               </div>
                               <div>
                                  <div className={`fw-bold mb-1 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '13px', letterSpacing: '0.5px' }}>SOLAR (PV)</div>
                                  <div style={{ color: currentTheme.yellow, fontSize: '30px', fontWeight: 'bold', lineHeight: '1.2', transition: 'color 0.3s ease' }}>{liveNodes.solar} W</div>
                                  <div className={`fw-bold mt-1 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '12px' }}>{liveNodes.solarV} V <span className="text-muted mx-1">|</span> {liveNodes.solarA} A</div>
                               </div>
                            </div>
                            <MiniWave color={currentTheme.yellow} />
                            <div className="d-flex flex-column mt-1">
                               <span className="text-muted" style={{ fontSize: '11px' }}>Today's Energy</span>
                               <span className="fw-bold" style={{ color: currentTheme.yellow, fontSize: '13px' }}>12.70 kWh</span>
                            </div>
                         </div>

                         <div style={{ position: 'absolute', left: '20px', top: '350px', background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', padding: '15px 20px', width: '280px', height: '155px', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: currentTheme.shadow }}>
                            <div className="d-flex w-100">
                               <div className="me-3 d-flex align-items-start justify-content-center" style={{ width: '50px' }}>
                                  <BatteryIconBig />
                               </div>
                               <div>
                                  <div className={`fw-bold mb-1 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '13px', letterSpacing: '0.5px' }}>UPS</div>
                                  <div style={{ color: currentTheme.green, fontSize: '30px', fontWeight: 'bold', lineHeight: '1.2', transition: 'color 0.3s ease' }}>{liveNodes.batterySoc.toFixed(1)}%</div>
                                  <div className={`fw-bold mt-1 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '12px' }}>{liveNodes.batteryV} V <span className="text-muted mx-1">|</span> {liveNodes.batteryA} A</div>
                               </div>
                            </div>
                            <div className="w-100 mt-2">
                              <div style={{ background: isDark ? '#2e3238' : '#cbd5e1', height: '8px', borderRadius: '4px', width: '100%', position: 'relative' }}>
                                 <div style={{ background: currentTheme.green, height: '100%', borderRadius: '4px', width: `${liveNodes.batterySoc}%`, boxShadow: isDark ? `0 0 8px ${currentTheme.green}` : 'none', transition: 'width 2s ease-in-out' }}></div>
                              </div>
                              <div className="d-flex justify-content-end fw-bold mt-1" style={{ fontSize: '11px', color: currentTheme.green }}>Charging</div>
                            </div>
                            <div className="d-flex justify-content-between align-items-end mt-1">
                               <span className="text-muted" style={{ fontSize: '11px' }}>Today's Charge</span>
                               <span className={`fw-bold text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '13px' }}>5.21 kWh</span>
                            </div>
                         </div>

                         <div style={{ position: 'absolute', left: '20px', top: '520px', background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', padding: '15px 20px', width: '280px', height: '155px', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: currentTheme.shadow }}>
                            <div className="d-flex w-100">
                               <div className="me-3 d-flex align-items-start justify-content-center" style={{ width: '50px' }}>
                                  <Zap color={currentTheme.red} size={45} strokeWidth={1.5} />
                               </div>
                               <div>
                                  <div className={`fw-bold mb-1 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '13px', letterSpacing: '0.5px' }}>DG SET</div>
                                  <div style={{ color: currentTheme.red, fontSize: '30px', fontWeight: 'bold', lineHeight: '1.2', transition: 'color 0.3s ease' }}>0 W</div>
                                  <div className={`fw-bold mt-1 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '12px' }}>0.0 V <span className="text-muted mx-1">|</span> 0.0 A</div>
                               </div>
                            </div>
                            <MiniWave color={currentTheme.red} />
                            <div className="mt-auto d-flex flex-column">
                               <span className="text-muted" style={{ fontSize: '11px' }}>Today's Energy</span>
                               <span className={`fw-bold text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '13px' }}>0.00 kWh</span>
                            </div>
                         </div>

                         {/* COL 2: INVERTER */}
                         <div style={{ position: 'absolute', left: '380px', top: '100px', background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: '16px', padding: '24px 20px', width: '260px', height: '280px', zIndex: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: currentTheme.shadow }}>
                            <div className="w-100 d-flex justify-content-center position-relative mb-2">
                               <span className={`fw-bold text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '16px', letterSpacing: '1px' }}>TRUEiSENSE</span>
                               <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                               </div>
                            </div>
                            
                            {/* Inverter 3D Image */}
                            <div className="mb-3">
                               <svg width="100" height="90" viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: isDark ? 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}>
                                 <defs>
                                   <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="100">
                                     <stop offset="0%" stopColor="#e2e8f0" />
                                     <stop offset="100%" stopColor="#cbd5e1" />
                                   </linearGradient>
                                   <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="100">
                                     <stop offset="0%" stopColor="#1e293b" />
                                     <stop offset="100%" stopColor="#0f172a" />
                                   </linearGradient>
                                 </defs>
                                 {/* Main Body */}
                                 <rect x="10" y="10" width="80" height="60" rx="6" fill="url(#bodyGrad)" />
                                 {/* Side bevels */}
                                 <path d="M10 16 L20 10 L80 10 L90 16 L90 70 L10 70 Z" fill="#f8fafc" opacity="0.5" />
                                 <path d="M10 16 L20 10 L20 70 L10 70 Z" fill="#94a3b8" opacity="0.3" />
                                 <path d="M90 16 L80 10 L80 70 L90 70 Z" fill="#475569" opacity="0.2" />
                                 {/* Screen Area */}
                                 <rect x="35" y="30" width="30" height="12" rx="3" fill="#0f172a" />
                                 <rect x="38" y="34" width="8" height="4" rx="1" fill="#10b981" />
                                 <circle cx="60" cy="36" r="1.5" fill="#10b981" />
                                 {/* Bottom Base */}
                                 <path d="M10 70 L90 70 L85 85 L15 85 Z" fill="url(#baseGrad)" />
                                 {/* Feet */}
                                 <rect x="25" y="85" width="8" height="4" rx="1" fill="#475569" />
                                 <rect x="67" y="85" width="8" height="4" rx="1" fill="#475569" />
                               </svg>
                            </div>

                            <div className="text-center w-100" style={{ color: currentTheme.green, fontSize: '38px', fontWeight: 'bold', textShadow: isDark ? `0 0 15px rgba(16,185,129,0.4)` : 'none', transition: 'color 0.3s ease', lineHeight: '1' }}>{totalSystemW} W</div>
                            
                            <div className={`d-flex justify-content-between w-100 mt-4 px-2 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '13px' }}>
                               <div className="text-start">
                                  <div className="text-muted mb-1" style={{ fontSize: '11px' }}>Efficiency</div>
                                  <b style={{ fontSize: '15px', color: currentTheme.text }}>{liveNodes.invEff.toFixed(1)} %</b>
                               </div>
                               <div style={{ width: '1px', background: currentTheme.border, height: '30px' }}></div>
                               <div className="text-start" style={{ width: '80px' }}>
                                  <div className="text-muted mb-1" style={{ fontSize: '11px' }}>Temperature</div>
                                  <b style={{ fontSize: '15px', color: currentTheme.text }}>{liveNodes.invTemp.toFixed(1)} °C</b>
                               </div>
                            </div>

                            <svg width="100%" height="30" style={{ position: 'absolute', bottom: 10, left: 0, overflow: 'hidden' }}>
                               <g style={{ animation: 'waveMove 4s linear infinite' }}>
                                 <path d="M 0 15 Q 20 5 40 15 T 80 15 T 120 15 T 160 15 T 200 15 T 240 15 T 280 15 T 320 15 L 320 30 L 0 30 Z" fill={isDark ? "rgba(16,185,129,0.05)" : "rgba(5,150,105,0.05)"} />
                                 <path d="M 0 15 Q 20 5 40 15 T 80 15 T 120 15 T 160 15 T 200 15 T 240 15 T 280 15 T 320 15" fill="none" stroke={currentTheme.green} strokeWidth="1.5" style={{ filter: isDark ? 'drop-shadow(0 0 4px rgba(16,185,129,0.6))' : 'none' }} />
                               </g>
                            </svg>
                         </div>

                         {/* TOTAL OUTPUT */}
                         <div style={{ position: 'absolute', left: '380px', top: '430px', background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: '16px', padding: '24px 20px', width: '260px', height: '140px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: currentTheme.shadow }}>
                            <div className={`text-center fw-bold mb-2 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '14px', letterSpacing: '0.5px' }}>TOTAL OUTPUT</div>
                            <div className="text-center mb-3" style={{ color: currentTheme.purple, fontSize: '42px', fontWeight: 'bold', textShadow: isDark ? '0 0 15px rgba(168,85,247,0.4)' : 'none', transition: 'color 0.3s ease', lineHeight: '1' }}>{totalSystemW} W</div>
                            <div className="w-100" style={{ height: '1px', background: currentTheme.border, marginBottom: '15px' }}></div>
                             <div className="d-flex justify-content-between w-100 text-muted" style={{ fontSize: '12px' }}>
                               <span>Today's Consumption</span>
                               <span className={`fw-bold text-${isDark ? 'white' : 'dark'}`}>14.86 kWh</span>
                             </div>
                         </div>

                         <div style={{ position: 'absolute', left: '655px', top: '465px', color: currentTheme.purple, fontSize: '10px', fontWeight: 'bold', zIndex: 10 }}>POWER<br/>FLOW</div>

                         {/* COL 3: LOADS */}
                         <div style={{ position: 'absolute', left: '750px', top: '5px', color: currentTheme.purple, fontSize: '13px', fontWeight: 'bold' }}>OUTGOING (DISTRIBUTION)</div>

                         {[
                            { y: 10, icon: BuildingIcon, loadIdx: 0 },
                            { y: 115, icon: ServerIcon, loadIdx: 1 },
                            { y: 220, icon: DropIcon, loadIdx: 2 },
                            { y: 325, icon: LightningIcon, loadIdx: 3 },
                            { y: 430, icon: LightningIcon, loadIdx: 4 },
                            { y: 535, icon: LampIcon, loadIdx: 5 }
                         ].map((item, i) => {
                            const load = displayLoads[item.loadIdx];
                            return (
                            <div key={i} style={{ position: 'absolute', left: '750px', top: `${item.y + 20}px`, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: '12px', padding: '12px 15px', width: '380px', minHeight: '75px', height: 'auto', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 10, boxShadow: currentTheme.shadow }}>
                               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px' }}>
                                  <item.icon />
                               </div>
                               <div className="flex-grow-1">
                                  <div className={`fw-bold mb-2 text-${isDark ? 'white' : 'dark'}`} style={{ fontSize: '10.5px', letterSpacing: '0.3px', lineHeight: '1.2' }}>{load.title}</div>
                                  <div style={{ background: isDark ? '#2e3238' : '#cbd5e1', height: '6px', borderRadius: '3px', width: '70%' }}>
                                     <div style={{ background: currentTheme.progressGrad, height: '100%', borderRadius: '3px', width: `${load.pct}%`, boxShadow: isDark ? '0 0 8px rgba(168,85,247,0.6)' : 'none', transition: 'width 2s ease-in-out' }}></div>
                                  </div>
                               </div>
                               <div className="text-end" style={{ minWidth: '90px' }}>
                                  <div style={{ color: currentTheme.purple, fontSize: '18px', fontWeight: 'bold' }}>{load.w} W</div>
                                  <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{load.pct} %</div>
                                  <div className="text-muted" style={{ fontSize: '10px' }}>Today: {load.kwh} kWh</div>
                               </div>
                            </div>
                         )})}

                          <div style={{ position: 'absolute', left: '750px', top: '640px', width: '380px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                             <div className={`fw-bold text-${isDark ? 'white' : 'dark'}`}>Total Outgoing Load</div>
                             <div style={{ color: currentTheme.purple, transition: 'color 0.3s ease' }}><b>{totalLoadW} W (100%)</b></div>
                          </div>
                      </div>
                   </div>
                </Card>
             </Col>

           </Row>
        </Container>
    </div>
  );
};

export default SolarDashboard;
