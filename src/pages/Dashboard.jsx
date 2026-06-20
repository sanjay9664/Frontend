import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Badge, ProgressBar, Table } from 'react-bootstrap';
import {
  Zap, Droplets, Database, ShieldAlert, Activity,
  TrendingUp, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowUpRight, ArrowDownRight, LayoutPanelTop,
  Gauge, Thermometer, Battery, Wind, Globe, Cpu, Network
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

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

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const StatusCard = ({ title, value, unit, icon, color, trend, trendValue, path }) => {
    const handleNavigate = () => {
      if (!path) return; // Disable navigation if path is null
      const userRole = (localStorage.getItem('userRole') || 'user').toUpperCase();
      if (path === '/settings' && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        return;
      }
      navigate(path);
    };

    return (
      <Card
        onClick={handleNavigate}
        className="dash-card h-100 border-0 shadow-lg cursor-pointer transition-all overflow-hidden position-relative"
        style={{ background: 'linear-gradient(145deg, #0f172a 0%, #020617 100%)' }}
      >
        <div className={`card-accent-line bg-${color}`}></div>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div className={`icon-box bg-${color} bg-opacity-10 text-${color} border border-${color} border-opacity-20`}>
              {icon}
            </div>
            {trend && (
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
              <span className="scada-static-dot bg-success"></span>
              <small className="text-muted fs-12 fw-black tracking-widest">LIVE DATA</small>
            </div>
            <ChevronRight size={14} className="text-muted opacity-25" />
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
        <div className="d-flex gap-2">
          <button className="btn-scada-glass" onClick={() => window.location.reload()}><Activity size={16} className="me-2" /> RE-SCAN NODE</button>
          <button className="btn-scada-glow" onClick={() => window.location.reload()}><CheckCircle2 size={16} className="me-2" /> STATION RESET</button>
        </div>
      </div>

      {/* TOP METRICS */}
      <Row className="g-4 mb-5">
        <Col xl={3} md={6}>
          <StatusCard
            title="PUMP STATUS"
            value="10"
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
            value="05"
            unit="Low Level"
            icon={<Database size={20} />}
            color="danger"
            trend="down"
            trendValue="-1"
            path={null}
          />
        </Col>
        <Col xl={3} md={6}>
          <StatusCard
            title="VALVE STATUS"
            value="38"
            unit="Open"
            icon={<Droplets size={20} />}
            color="info"
            trend="up"
            trendValue="98%"
            path={null}
          />
        </Col>
        <Col xl={3} md={6}>
          <StatusCard
            title="Critical Alerts"
            value="03"
            unit="Unresolved"
            icon={<ShieldAlert size={20} />}
            color="danger"
            trend="down"
            trendValue="1 ACK"
            path={null}
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
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  { label: 'AVG DAILY LOAD', val: '640 KW', color: 'text-info' },
                  { label: 'PEAK CONSUMPTION', val: '1.2 MW', color: 'text-warning' },
                  { label: 'GRID EFFICIENCY', val: '98.5%', color: 'text-success' },
                  { label: 'POWER FACTOR', val: '0.99', color: 'text-primary' }
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
                { label: 'Ambient Temp', val: '32.4', unit: '°C', icon: <Thermometer size={18} />, color: '#ef4444', status: 'HOT' },
                { label: 'Humidity', val: '58', unit: '%', icon: <Wind size={18} />, color: '#0ea5e9', status: 'NORMAL' },
                { label: 'CO2', val: '', unit: '', icon: <Battery size={18} />, color: '#22c55e', status: 'FULL' },
                { label: 'TVOC', val: '', unit: '', icon: <Activity size={18} />, color: '#f59e0b', status: 'WARN' }
              ].map((s, i) => (
                <div 
                  key={i} 
                  className="sensor-tile-static p-3 mb-3 bg-black bg-opacity-30 rounded-4 border border-white border-opacity-5 cursor-pointer"
                  onClick={() => navigate('/aqi-sensor/temp-humidity')}
                  style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="p-1 rounded-circle bg-white bg-opacity-5" style={{ color: s.color }}>{s.icon}</div>
                    <Badge style={{ background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}44` }} className="fs-12 fw-black tracking-widest">{s.status}</Badge>
                  </div>
                  <small className="text-secondary fw-bold fs-12 uppercase d-block mb-1">{s.label}</small>
                  <h4 className="text-white fw-black mb-0 font-monospace">{s.val}<small className="fs-13 opacity-50 ms-1">{s.unit}</small></h4>
                </div>
              ))}
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
