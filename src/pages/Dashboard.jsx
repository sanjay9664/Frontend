import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Badge, ProgressBar, Table, Dropdown } from 'react-bootstrap';
import {
  Zap, Droplets, Database, ShieldAlert, Activity,
  TrendingUp, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowUpRight, ArrowDownRight, LayoutPanelTop,
  Gauge, Thermometer, Battery, Wind, Globe, Cpu, Network, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [selectedRole, setSelectedRole] = useState(() => {
    const rawRole = (localStorage.getItem('userRole') || 'Zone Manager').replace(/_/g, ' ').toLowerCase();
    if (rawRole.includes('super')) return 'Super Admin';
    if (rawRole.includes('org')) return 'Organization Admin';
    if (rawRole.includes('zone')) return 'Zone Manager';
    if (rawRole.includes('area')) return 'Area Manager';
    if (rawRole.includes('location')) return 'Location Manager';
    if (rawRole.includes('unit')) return 'Unit Head';
    if (rawRole.includes('operator')) return 'Operator';
    return 'Zone Manager'; // Default for preview
  });
  const [selectedOrg, setSelectedOrg] = useState(() => localStorage.getItem('scada_selectedOrg') || '');
  const [selectedZone, setSelectedZone] = useState(() => localStorage.getItem('scada_selectedZone') || '');
  const [selectedArea, setSelectedArea] = useState(() => localStorage.getItem('scada_selectedArea') || '');
  const [selectedLocation, setSelectedLocation] = useState(() => localStorage.getItem('scada_selectedLocation') || '');
  const [selectedUnit, setSelectedUnit] = useState(() => localStorage.getItem('scada_selectedUnit') || '');

  useEffect(() => { localStorage.setItem('scada_selectedOrg', selectedOrg); }, [selectedOrg]);
  useEffect(() => { localStorage.setItem('scada_selectedZone', selectedZone); }, [selectedZone]);
  useEffect(() => { localStorage.setItem('scada_selectedArea', selectedArea); }, [selectedArea]);
  useEffect(() => { localStorage.setItem('scada_selectedLocation', selectedLocation); }, [selectedLocation]);
  useEffect(() => { localStorage.setItem('scada_selectedUnit', selectedUnit); }, [selectedUnit]);


  const mockZones = { 'Org A': ['North Zone', 'South Zone'], 'Org B': ['East Zone', 'West Zone'] };
  const mockAreas = { 'North Zone': ['Area 1', 'Area 2'], 'South Zone': ['Area 3'], 'East Zone': ['Area 4'], 'West Zone': ['Area 5'] };
  const mockLocations = { 'Area 1': ['Loc 1A', 'Loc 1B'], 'Area 2': ['Loc 2A'], 'Area 3': ['Loc 3A'], 'Area 4': ['Loc 4A'], 'Area 5': ['Loc 5A'] };
  const mockUnits = { 'Loc 1A': ['Unit Alpha', 'Unit Beta'], 'Loc 1B': ['Unit Gamma'], 'Loc 2A': ['Unit Delta'], 'Loc 3A': ['Unit Epsilon'], 'Loc 4A': ['Unit Zeta'], 'Loc 5A': ['Unit Eta'] };

  const orgOptions = ['Org A', 'Org B'];
  const zoneOptions = selectedOrg ? mockZones[selectedOrg] || [] : [];
  const areaOptions = selectedZone ? mockAreas[selectedZone] || [] : [];
  const locationOptions = selectedArea ? mockLocations[selectedArea] || [] : [];
  const unitOptions = selectedLocation ? mockUnits[selectedLocation] || [] : [];

  useEffect(() => {
    // Set default fixed context based on role to simulate their permission boundaries
    // Note: No longer resetting previous values so localStorage persistence works!
    if (selectedRole !== 'Super Admin') setSelectedOrg('Org A');
    if (['Zone Manager', 'Area Manager', 'Location Manager', 'Unit Head', 'Operator'].includes(selectedRole)) setSelectedZone('North Zone');
    if (['Area Manager', 'Location Manager', 'Unit Head', 'Operator'].includes(selectedRole)) setSelectedArea('Area 1');
    if (['Location Manager', 'Unit Head', 'Operator'].includes(selectedRole)) setSelectedLocation('Loc 1A');
    if (['Unit Head', 'Operator'].includes(selectedRole)) setSelectedUnit('Unit Alpha');
  }, [selectedRole]);

  const seed = `${selectedRole}-${selectedOrg}-${selectedZone}-${selectedArea}-${selectedLocation}-${selectedUnit}`;
  const getDynamicValue = (min, max, specificSeed = '') => {
    let hash = 0;
    const str = seed + specificSeed;
    if (str.length === 0) return min;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const random = Math.abs(Math.sin(hash)) * (max - min) + min;
    return Math.round(random);
  };

  const dynamicMetrics = useMemo(() => ({
    pump: getDynamicValue(5, 30, 'pump'),
    tanks: getDynamicValue(1, 10, 'tanks'),
    valve: getDynamicValue(20, 80, 'valve'),
    alerts: getDynamicValue(0, 8, 'alerts'),
    temp: (getDynamicValue(200, 450, 'temp') / 10).toFixed(1),
    humidity: getDynamicValue(30, 85, 'humidity'),
    avgLoad: getDynamicValue(400, 950, 'load'),
    peakLoad: (getDynamicValue(1000, 2000, 'peak') / 1000).toFixed(1),
    efficiency: (getDynamicValue(900, 999, 'eff') / 10).toFixed(1),
    powerFactor: (getDynamicValue(90, 99, 'pf') / 100).toFixed(2),
  }), [seed]);

  // Mock data for graphs
  const chartData = useMemo(() => [
    { name: '00:00', power: 400, water: 240, fuel: 80 },
    { name: '04:00', power: 300, water: 139, fuel: 85 },
    { name: '08:00', power: 900, water: 980, fuel: 70 },
    { name: '12:00', power: 1200, water: 390, fuel: 65 },
    { name: '16:00', power: 1500, water: 480, fuel: 90 },
    { name: '20:00', power: 1100, water: 380, fuel: 95 },
    { name: '23:59', power: 800, water: 430, fuel: 100 },
  ], []);

  const dynamicChartData = useMemo(() => chartData.map(d => ({
    ...d,
    power: getDynamicValue(d.power - 200, d.power + 200, d.name + 'power'),
    water: getDynamicValue(d.water - 100, d.water + 100, d.name + 'water'),
    fuel: getDynamicValue(d.fuel - 20, d.fuel + 20, d.name + 'fuel'),
  })), [chartData, seed]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const modulesConfig = useMemo(() => {
    const saved = localStorage.getItem('scada_modules_config');
    return saved ? JSON.parse(saved) : null;
  }, []);

  const StatusCard = ({ title, value, unit, icon, color, trend, trendValue, path }) => {
    const isAllowed = useMemo(() => {
      if (!path) return true;
      const pathMap = {
        '/water-management': 'Water Management',
        '/motors': 'Motors',
        '/dg-set': 'DG Set',
        '/alarm-system': 'Alarm System',
        '/lt-panel': 'LT Panel',
        '/transformer': 'Transformer',
        '/fire-pumps': 'Fire',
        '/ticketing': 'Ticketing',
        '/maintenance': 'Maintenance',
        '/service': 'Service History',
        '/dpr': 'Daily DPR',
        '/energy-metering': 'Energy Metering',
        '/VRV': 'VRV',
        '/aqi-sensor': 'AQI Sensor',
        '/hvac': 'HVAC',
        '/ac': 'AC'
      };
      
      const entry = Object.entries(pathMap).find(([prefix]) => path.startsWith(prefix));
      if (entry && modulesConfig) {
        return modulesConfig[entry[1]] !== false;
      }
      return true;
    }, [path]);

    const handleNavigate = () => {
      if (!path || !isAllowed) return; // Disable navigation
      const userRole = (localStorage.getItem('userRole') || 'user').toUpperCase();
      if (path === '/settings' && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return;
      }
      navigate(path);
    };

    return (
      <Card
        onClick={handleNavigate}
        className={`dash-card h-100 border-0 shadow-lg transition-all overflow-hidden position-relative ${!isAllowed ? 'opacity-50' : 'cursor-pointer'}`}
        style={{ 
          background: 'linear-gradient(145deg, #0f172a 0%, #020617 100%)',
          cursor: isAllowed ? 'pointer' : 'not-allowed'
        }}
      >
        <div className={`card-accent-line bg-${color}`}></div>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className={`icon-box bg-${color} bg-opacity-10 text-${color} border border-${color} border-opacity-20`}>
              {icon}
            </div>
            {!isAllowed && (
              <Badge bg="secondary" className="bg-opacity-10 text-white rounded-pill px-2 border-0">
                <div className="d-flex align-items-center gap-1">
                  <Lock size={12} className="text-secondary" />
                  LOCKED
                </div>
              </Badge>
            )}
            {isAllowed && trend && (
              <Badge bg={trend === 'up' ? 'success' : 'danger'} className="bg-opacity-10 text-opacity-100 rounded-pill px-2 border-0">
                <div className="d-flex align-items-center gap-1">
                  {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {trendValue}
                </div>
              </Badge>
            )}
          </div>
          <h6 className="text-secondary fw-black uppercase tracking-widest fs-12 mb-1 opacity-75">{title}</h6>
          <div className="d-flex align-items-baseline gap-2">
            <h3 className="text-white fw-black mb-0 fs-3">{value}</h3>
            <small className="text-info-scada fw-bold uppercase fs-11 tracking-tighter">{unit}</small>
          </div>
          <div className="mt-4 pt-3 border-top border-white border-opacity-5 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <span className="scada-static-dot bg-success" style={{ boxShadow: '0 0 10px #10b981' }}></span>
              <small className="text-muted fs-12 fw-black tracking-widest">LIVE DATA</small>
            </div>
            {isAllowed && path ? (
              <Badge bg="transparent" className="text-info border border-info border-opacity-50 scada-btn-hover px-2 py-1 fs-11 fw-bold tracking-widest d-flex align-items-center gap-1">
                VIEW DETAILS <ArrowUpRight size={14} />
              </Badge>
            ) : isAllowed && !path ? (
              <ChevronRight size={14} className="text-muted opacity-25" />
            ) : (
              <Badge bg="transparent" className="text-danger border border-danger border-opacity-25 px-2 py-1 fs-11 fw-bold tracking-widest d-flex align-items-center gap-1">
                <Lock size={12} /> RESTRICTED
              </Badge>
            )}
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div className="dashboard-wrapper p-4">
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-start mb-5 pb-4 border-bottom border-white border-opacity-5">
        <div>
          <div className="d-flex align-items-center gap-3 mb-2">
            <Badge bg="info" className="bg-opacity-10 text-info px-3 py-2 border border-info border-opacity-20">
              <div className="d-flex align-items-center gap-2">
                <div className="scada-static-dot bg-success" style={{ width: 8, height: 8 }}></div>
                <span className="fw-black uppercase tracking-widest fs-12">System: Optimal</span>
              </div>
            </Badge>
            <div className="text-muted fw-bold fs-11 uppercase p-2 border border-white border-opacity-5 rounded bg-black bg-opacity-20">
              <Clock size={12} className="me-2 text-info" />
              {time.toLocaleDateString()} | {time.toLocaleTimeString()}
            </div>
          </div>
          <h1 className="text-white fw-black tracking-tight mb-2 size-2">TRUEiSENSE <span className="text-gradient"></span></h1>
          <div className="d-flex align-items-center gap-3 opacity-75">
            <small className="text-muted fs-11 uppercase f-tracking-widest fw-black">ID: SCH-9981-TXR</small>
            <div className="v-divider"></div>
            <small className="text-muted fs-11 uppercase f-tracking-widest fw-black">SECURE INDUSTRIAL HMI v4.0</small>
          </div>
        </div>
        <div className="d-flex gap-3 align-items-center">
          <div className="scada-dropdown-toggle border-warning text-warning d-flex align-items-center" style={{ cursor: 'default' }}>
            <ShieldAlert size={16} className="me-2" /> {selectedRole}
          </div>

          <div className="v-divider mx-2"></div>

          <button className="btn-scada-glass" onClick={() => window.location.reload()}><Activity size={16} className="me-2" /> RE-SCAN</button>
          <button className="btn-scada-glow" onClick={() => window.location.reload()}><CheckCircle2 size={16} className="me-2" /> RESET</button>
        </div>
      </div>

      {/* DYNAMIC HIERARCHY FILTERS */}
      {selectedRole !== 'Operator' && selectedRole !== 'Unit Head' && (
        <div className="scope-filter-panel rounded-4 p-3 mb-4 d-flex flex-wrap gap-3 align-items-center position-relative shadow-lg overflow-hidden">
          <div className="position-absolute top-0 start-0 w-100 h-100" style={{ background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.05) 0%, rgba(2, 6, 23, 0) 100%)', pointerEvents: 'none' }}></div>
          <span className="text-info-scada fs-11 fw-black tracking-widest text-uppercase d-flex align-items-center position-relative">
            <Network size={14} className="me-2"/> Scope Filters:
          </span>

          {selectedRole === 'Super Admin' && (
            <Dropdown>
              <Dropdown.Toggle variant="dark" className="scada-dropdown-toggle py-1 px-3 fs-11">
                <span className="text-info-scada opacity-75 me-2 fw-black">ORG:</span> {selectedOrg || 'SELECT'}
              </Dropdown.Toggle>
              <Dropdown.Menu variant="dark" className="scada-dropdown-menu">
                {orgOptions.map(org => (
                  <Dropdown.Item key={org} onClick={() => { setSelectedOrg(org); setSelectedZone(''); setSelectedArea(''); setSelectedLocation(''); setSelectedUnit(''); }} className="scada-dropdown-item fs-11">
                    {org}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}

          {['Super Admin', 'Organization Admin'].includes(selectedRole) && (
            <Dropdown>
              <Dropdown.Toggle variant="dark" className="scada-dropdown-toggle py-1 px-3 fs-11" disabled={!selectedOrg && selectedRole === 'Super Admin'}>
                <span className="text-info-scada opacity-75 me-2 fw-black">ZONE:</span> {selectedZone || 'SELECT'}
              </Dropdown.Toggle>
              <Dropdown.Menu variant="dark" className="scada-dropdown-menu">
                {zoneOptions.map(zone => (
                  <Dropdown.Item key={zone} onClick={() => { setSelectedZone(zone); setSelectedArea(''); setSelectedLocation(''); setSelectedUnit(''); }} className="scada-dropdown-item fs-11">
                    {zone}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}

          {['Super Admin', 'Organization Admin', 'Zone Manager'].includes(selectedRole) && (
            <Dropdown>
              <Dropdown.Toggle variant="dark" className="scada-dropdown-toggle py-1 px-3 fs-11" disabled={!selectedZone && ['Super Admin', 'Organization Admin'].includes(selectedRole)}>
                <span className="text-info-scada opacity-75 me-2 fw-black">AREA:</span> {selectedArea || 'SELECT'}
              </Dropdown.Toggle>
              <Dropdown.Menu variant="dark" className="scada-dropdown-menu">
                {areaOptions.map(area => (
                  <Dropdown.Item key={area} onClick={() => { setSelectedArea(area); setSelectedLocation(''); setSelectedUnit(''); }} className="scada-dropdown-item fs-11">
                    {area}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}

          {['Super Admin', 'Organization Admin', 'Zone Manager', 'Area Manager'].includes(selectedRole) && (
            <Dropdown>
              <Dropdown.Toggle variant="dark" className="scada-dropdown-toggle py-1 px-3 fs-11" disabled={!selectedArea && ['Super Admin', 'Organization Admin', 'Zone Manager'].includes(selectedRole)}>
                <span className="text-info-scada opacity-75 me-2 fw-black">LOC:</span> {selectedLocation || 'SELECT'}
              </Dropdown.Toggle>
              <Dropdown.Menu variant="dark" className="scada-dropdown-menu">
                {locationOptions.map(loc => (
                  <Dropdown.Item key={loc} onClick={() => { setSelectedLocation(loc); setSelectedUnit(''); }} className="scada-dropdown-item fs-11">
                    {loc}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}

          {['Super Admin', 'Organization Admin', 'Zone Manager', 'Area Manager', 'Location Manager'].includes(selectedRole) && (
            <Dropdown>
              <Dropdown.Toggle variant="dark" className="scada-dropdown-toggle py-1 px-3 fs-11" disabled={!selectedLocation && ['Super Admin', 'Organization Admin', 'Zone Manager', 'Area Manager'].includes(selectedRole)}>
                <span className="text-info-scada opacity-75 me-2 fw-black">UNIT:</span> {selectedUnit || 'SELECT'}
              </Dropdown.Toggle>
              <Dropdown.Menu variant="dark" className="scada-dropdown-menu">
                {unitOptions.map(unit => (
                  <Dropdown.Item key={unit} onClick={() => setSelectedUnit(unit)} className="scada-dropdown-item fs-11">
                    {unit}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}
          
          <div className="ms-auto d-flex gap-2">
             {selectedUnit && <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-20 px-3 py-2 fs-11 fw-black tracking-widest uppercase">Target: {selectedUnit}</Badge>}
             {!selectedUnit && <Badge bg="warning" className="bg-opacity-10 text-warning border border-warning border-opacity-20 px-3 py-2 fs-11 fw-black tracking-widest uppercase">Aggregated View</Badge>}
          </div>
        </div>
      )}

      {/* TOP METRICS */}
      <Row className="g-4 mb-5">
        <Col xl={3} md={6}>
          <StatusCard
            title="PUMP STATUS"
            value={dynamicMetrics.pump}
            unit="Active"
            icon={<Activity size={20} />}
            color="success"
            trend="up"
            trendValue="+2"
            path="/motors/overview"
          />
        </Col>
        <Col xl={3} md={6}>
          <StatusCard
            title="TANKS STATUS"
            value={dynamicMetrics.tanks}
            unit="Low Level"
            icon={<Database size={20} />}
            color="danger"
            trend="down"
            trendValue="-1"
            path="/water-management/tanks"
          />
        </Col>
        <Col xl={3} md={6}>
          <StatusCard
            title="VALVE STATUS"
            value={dynamicMetrics.valve}
            unit="Open"
            icon={<Droplets size={20} />}
            color="info"
            trend="up"
            trendValue="98%"
            path="/water-management/valves"
          />
        </Col>
        <Col xl={3} md={6}>
          <StatusCard
            title="Critical Alerts"
            value={dynamicMetrics.alerts}
            unit="Unresolved"
            icon={<ShieldAlert size={20} />}
            color="danger"
            trend="down"
            trendValue="1 ACK"
            path="/alarm-system"
          />
        </Col>
      </Row>

      {/* CHARTS & MAIN MONITORING */}
      <Row className="g-4 mb-5">
        <Col xl={8}>
          <Card className="bg-panel border-0 shadow-lg rounded-4 overflow-hidden mb-4">
            <div className="px-4 py-3 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center bg-black bg-opacity-20">
              <div>
                <h6 className="mb-0 text-info-scada fw-black tracking-widest uppercase fs-12">
                  <Activity size={16} className="me-2" /> Infrastructure Performance Telemetry
                </h6>
                <small className="text-muted fs-11 uppercase f-tracking-widest opacity-50">Real-time load analysis over 24H period</small>
              </div>
            </div>
            <Card.Body className="p-4">
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dynamicChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <ChartTooltip contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="power" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorPower)" strokeWidth={2} />
                    <Area type="monotone" dataKey="water" stroke="#10b981" fillOpacity={1} fill="url(#colorWater)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
            <div className="bg-black bg-opacity-30 p-4 border-top border-white border-opacity-5">
              <Row className="g-4 text-center">
                {[
                  { label: 'AVG DAILY LOAD', val: `${dynamicMetrics.avgLoad} KW`, color: 'text-info' },
                  { label: 'PEAK CONSUMPTION', val: `${dynamicMetrics.peakLoad} MW`, color: 'text-warning' },
                  { label: 'GRID EFFICIENCY', val: `${dynamicMetrics.efficiency}%`, color: 'text-success' },
                  { label: 'POWER FACTOR', val: dynamicMetrics.powerFactor, color: 'text-primary' }
                ].map((stat, i) => (
                  <Col xs={3} key={i}>
                    <small className="text-secondary fw-black uppercase fs-12 d-block mb-1 opacity-50">{stat.label}</small>
                    <h5 className={`${stat.color} fw-bold mb-0`}>{stat.val}</h5>
                  </Col>
                ))}
              </Row>
            </div>
          </Card>
        </Col>

        <Col xl={4}>
          <Card className="bg-panel border-0 shadow-lg rounded-4 overflow-hidden h-100 flex-column d-flex">
            <div className="px-4 py-3 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 text-white fw-black tracking-widest uppercase fs-12"><Cpu size={16} className="me-2 text-warning" /> Environmental Nodes</h6>
              <Badge bg="warning" className="text-dark fw-black">4 SENSORS</Badge>
            </div>
            <Card.Body className="p-4 flex-grow-1">
              {[
                { label: 'Ambient Temp', val: dynamicMetrics.temp, unit: '°C', icon: <Thermometer size={18} />, color: '#ef4444', status: 'HOT' },
                { label: 'Humidity', val: dynamicMetrics.humidity, unit: '%', icon: <Wind size={18} />, color: '#0ea5e9', status: 'NORMAL' },
                { label: 'CO2', val: '', unit: '', icon: <Battery size={18} />, color: '#22c55e', status: 'FULL' },
                { label: 'TVOC', val: '', unit: '', icon: <Activity size={18} />, color: '#f59e0b', status: 'WARN' }
              ].map((s, i) => {
                const aqiAllowed = !modulesConfig || modulesConfig["AQI Sensor"] !== false;
                return (
                  <div 
                    key={i} 
                    className={`sensor-tile-static p-3 mb-3 bg-black bg-opacity-30 rounded-4 border border-white border-opacity-5 ${aqiAllowed ? 'cursor-pointer' : 'opacity-50'}`}
                    onClick={() => { if (aqiAllowed) navigate('/aqi-sensor/temp-humidity'); }}
                    style={{ 
                      transition: 'all 0.2s ease', 
                      cursor: aqiAllowed ? 'pointer' : 'not-allowed'
                    }}
                    onMouseEnter={(e) => { if (aqiAllowed) e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.5)'; }}
                    onMouseLeave={(e) => { if (aqiAllowed) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="p-1 rounded-circle bg-white bg-opacity-5" style={{ color: s.color }}>{s.icon}</div>
                      <div className="d-flex align-items-center gap-2">
                        {!aqiAllowed && <Lock size={12} className="text-secondary" />}
                        <Badge style={{ background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}44` }} className="fs-12 fw-black tracking-widest">{s.status}</Badge>
                      </div>
                    </div>
                    <small className="text-secondary fw-bold fs-12 uppercase d-block mb-1">{s.label}</small>
                    <h4 className="text-white fw-black mb-0 font-monospace">{s.val}<small className="fs-13 opacity-50 ms-1">{s.unit}</small></h4>
                  </div>
                );
              })}
            </Card.Body>
            <div className="p-4 bg-black bg-opacity-50 text-center border-top border-white border-opacity-5">
              <Network size={20} className="text-info mb-2" />
              <p className="text-muted fs-11 uppercase fw-bold mb-0">Mesh Network integrity: <span className="text-info-scada">99.98%</span></p>
            </div>
          </Card>
        </Col>
      </Row>

      {/* NODE SCAN TABLE */}
      <Card className="bg-panel border-0 shadow-lg rounded-4 overflow-hidden">
        <div className="px-4 py-3 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center bg-black bg-opacity-20">
          <h6 className="mb-0 text-white fw-black tracking-widest uppercase fs-12"><LayoutPanelTop size={16} className="me-2 text-primary" /> Active Terminal Scan</h6>
          <Badge bg="primary" className="fw-black px-3">NODE SYNC ACTIVE</Badge>
        </div>
        <Card.Body className="p-0">
          <Table borderless responsive className="scada-table mb-0 align-middle">
            <thead>
              <tr>
                <th className="ps-4">Resource ID</th>
                <th>Status Protocol</th>
                <th>Telemetry Value</th>
                <th className="text-center">Maintenance Cycle</th>
                <th className="pe-4 text-end">Connection Map</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'LT-FEED-PANEL-01', status: 'Healthy', val: '415.2 V', score: 98, icon: <Zap size={14} />, color: 'success' },
                { name: 'DG-GEN-SYSTEM-01', status: 'Running', val: '124.5 KW', score: 85, icon: <Database size={14} />, color: 'info' },
                { name: 'UG-PUMP-ROOM-A', status: 'Active', val: '8.5 Bar', score: 92, icon: <Droplets size={14} />, color: 'primary' },
                { name: 'FIRE-SYSTEM-HUB', status: 'Standby', val: '7.2 Bar', score: 100, icon: <ShieldAlert size={14} />, color: 'warning' },
                { name: 'MAIN-XFR-LEVEL-1', status: 'Optimal', val: '52.4 °C', score: 94, icon: <Zap size={14} />, color: 'success' },
              ].map((item, i) => (
                <tr key={i}>
                  <td className="ps-4">
                    <div className="d-flex align-items-center gap-3 py-1">
                      <div className={`p-2 rounded bg-dark border border-white border-opacity-5 text-${item.color}`}>
                        {item.icon}
                      </div>
                      <span className="text-white fw-bold fs-12 tracking-wide font-monospace">{item.name}</span>
                    </div>
                  </td>
                  <td>
                    <Badge style={{ backgroundColor: `var(--bs-${item.color})`, color: '#fff' }} className="rounded-pill px-3 py-1 fs-12 fw-black tracking-widest uppercase shadow-sm border-0">
                      {item.status}
                    </Badge>
                  </td>
                  <td><span className="text-white font-monospace fw-bold fs-12 bg-black bg-opacity-40 px-3 py-2 rounded shadow-inner border border-white border-opacity-5">{item.val}</span></td>
                  <td>
                    <div className="px-5">
                      <ProgressBar now={item.score} variant={item.color} style={{ height: 4 }} className="bg-white bg-opacity-5 rounded-pill" />
                    </div>
                  </td>
                  <td className="pe-4 text-end">
                    <Badge bg="dark" className="border border-white border-opacity-10 text-muted fs-12 fw-black tracking-tighter">SECURED</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <style dangerouslySetInnerHTML={{
        __html: `
        .dashboard-wrapper { background: #020617; min-height: 100vh; }
        .bg-panel { background-color: #0f172a; border: 1px solid rgba(255, 255, 255, 0.05) !important; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
        .scope-filter-panel {
            background-color: #080f1e;
            border: 1px solid rgba(14, 165, 233, 0.2);
            box-shadow: 0 0 20px rgba(14, 165, 233, 0.05) inset, 0 10px 40px rgba(0,0,0,0.6);
        }
        .scada-btn-hover {
            transition: all 0.3s ease;
        }
        .scada-btn-hover:hover {
            background: rgba(14, 165, 233, 0.1) !important;
            box-shadow: 0 0 15px rgba(14, 165, 233, 0.4);
            transform: translateY(-1px);
        }
        .dash-card { transition: transform 0.2s ease; }
        .dash-card:hover { transform: translateY(-4px); border: 1px solid rgba(14, 165, 233, 0.2) !important; }
        .card-accent-line { position: absolute; top: 0; left: 0; height: 3px; width: 100%; border-radius: 4px 4px 0 0; }
        
        .text-gradient { background: linear-gradient(90deg, #0ea5e9, #38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .size-2 { font-size: 2.5rem; letter-spacing: -1px; }
        .f-tracking-widest { letter-spacing: 2px !important; }
        .v-divider { width: 1px; height: 12px; background: rgba(255,255,255,0.1); }

        .icon-box { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .scada-static-dot { border-radius: 50%; display: inline-block; width: 6px; height: 6px; }
        
        .btn-scada-glass {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: #94a3b8;
            padding: 10px 24px;
            border-radius: 12px;
            font-size: 0.72rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            cursor: pointer;
        }
        
        .btn-scada-glow {
            background: #0ea5e9;
            border: none;
            color: #020617;
            padding: 10px 24px;
            border-radius: 12px;
            font-size: 0.72rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            box-shadow: 0 4px 20px rgba(14, 165, 233, 0.4);
            cursor: pointer;
        }

        .scada-dropdown-toggle {
            background: rgba(15, 23, 42, 0.6) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: #f8fafc !important;
            padding: 10px 20px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            align-items: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: all 0.2s ease;
        }
        .scada-dropdown-toggle:hover, .scada-dropdown-toggle:focus {
            background: rgba(30, 41, 59, 0.8) !important;
            border-color: rgba(14, 165, 233, 0.4) !important;
            box-shadow: 0 0 15px rgba(14, 165, 233, 0.2);
        }
        .scada-dropdown-toggle::after {
            margin-left: 10px;
            vertical-align: middle;
            color: #0ea5e9;
        }
        .scada-dropdown-menu {
            background: rgba(15, 23, 42, 0.95) !important;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(14, 165, 233, 0.2) !important;
            border-radius: 12px;
            padding: 8px 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            min-width: 200px;
            margin-top: 8px !important;
        }
        .scada-dropdown-item {
            color: #cbd5e1 !important;
            font-size: 0.75rem;
            font-weight: 700;
            padding: 10px 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.2s;
        }
        .scada-dropdown-item:hover {
            background: rgba(14, 165, 233, 0.1) !important;
            color: #0ea5e9 !important;
            padding-left: 24px;
        }

        .scada-table thead th { 
            background: rgba(0, 0, 0, 0.2); 
            color: rgba(148, 163, 184, 0.5);
            font-size: 0.62rem; 
            text-transform: uppercase; 
            letter-spacing: 2px; 
            font-weight: 900;
            padding: 18px;
            border: 0;
        }
        .scada-table tbody td { 
            padding: 20px 18px; 
            border-bottom: 1px solid rgba(255, 255, 255, 0.02); 
            color: #fff !important;
            background-color: transparent;
        }

        .text-info-scada { color: #0ea5e9; }
        .fw-black { font-weight: 900 !important; }
        .fs-12 { font-size: 0.75rem !important; }
        .fs-11 { font-size: 0.85rem !important; }
        .cursor-pointer { cursor: pointer; }
        .transition-all { transition: all 0.2s ease; }
      `}} />
    </div>
  );
};

export default Dashboard;
