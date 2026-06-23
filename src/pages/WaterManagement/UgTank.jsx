import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Row, Col, Card, Button, Form, Badge, Modal, Spinner } from 'react-bootstrap';
import { Activity, Zap, ShieldCheck, Info, Droplets, ToggleRight, ToggleLeft, Layers, Maximize, Minimize, XCircle, X } from 'lucide-react';
import PdfButton from '../../components/PdfButton';
import { getSochiotDeviceDetails } from '../../services/authService';
import { useDeviceStatus } from '../../services/DeviceStatusContext';
import { io } from 'socket.io-client';

const UgTank = () => {
  const { getOverallStatus } = useDeviceStatus();
  const [activeStation, setActiveStation] = useState(1);
  const [controlMode, setControlMode] = useState('REMOTE');
  const [pulseTrigger, setPulseTrigger] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageRef = useRef(null);

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
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const [pumps1, setPumps1] = useState([
    { id: 1, status: 'Stopped', mode: 'AUTO', hz: '0.0', amp: '0.0', pressure: 0.0, startLimit: 1.5, stopLimit: 4.5, isOnline: true, isMapped: false },
    { id: 2, status: 'Stopped', mode: 'AUTO', hz: '0.0', amp: '0.0', pressure: 0.0, startLimit: 1.5, stopLimit: 4.5, isOnline: true, isMapped: false },
    { id: 3, status: 'Stopped', mode: 'AUTO', hz: '0.0', amp: '0.0', pressure: 0.0, startLimit: 1.5, stopLimit: 4.5, isOnline: true, isMapped: false },
    { id: 4, status: 'Stopped', mode: 'AUTO', hz: '0.0', amp: '0.0', pressure: 0.0, startLimit: 1.5, stopLimit: 4.5, isOnline: true, isMapped: false },
  ]);

  const [pumps2, setPumps2] = useState([
    { id: 1, status: 'Stopped', mode: 'AUTO', hz: '0.0', amp: '0.0', pressure: 0.0, startLimit: 1.5, stopLimit: 4.5, isOnline: true, isMapped: false },
    { id: 2, status: 'Stopped', mode: 'AUTO', hz: '0.0', amp: '0.0', pressure: 0.0, startLimit: 1.5, stopLimit: 4.5, isOnline: true, isMapped: false },
    { id: 3, status: 'Stopped', mode: 'AUTO', hz: '0.0', amp: '0.0', pressure: 0.0, startLimit: 1.5, stopLimit: 4.5, isOnline: true, isMapped: false },
    { id: 4, status: 'Stopped', mode: 'AUTO', hz: '0.0', amp: '0.0', pressure: 0.0, startLimit: 1.5, stopLimit: 4.5, isOnline: true, isMapped: false },
  ]);

  const [tanks, setTanks] = useState([
    { id: 1, name: 'FIRE RESERVOIR', level: 0, desc: 'PRIMARY FIRE', isOnline: true, isMapped: false },
    { id: 2, name: 'DOMESTIC SUMP', level: 0, desc: 'POTABLE SUPPLY', isOnline: true, isMapped: false },
    { id: 3, name: 'PROCESS TANK', level: 0, desc: 'INDUSTRIAL RECLAIM', isOnline: true, isMapped: false },
  ]);

  const [selectedPump, setSelectedPump] = useState(null);
  const [showPumpModal, setShowPumpModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitForm, setLimitForm] = useState({ start: 0, stop: 0 });
  const [actionFeedback, setActionFeedback] = useState(null);
  const [isSendingRules, setIsSendingRules] = useState(false);
  const [mappedOutletPressure, setMappedOutletPressure] = useState(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) pageRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const getJitter = () => (Math.random() - 0.5) * 0.15;
      setPumps1(prev => prev.map(p => p.status === 'Running' ? { ...p, pressure: Math.max(0, p.pressure + getJitter()) } : p));
      setPumps2(prev => prev.map(p => p.status === 'Running' ? { ...p, pressure: Math.max(0, p.pressure + getJitter()) } : p));
      setPulseTrigger(prev => prev + 1);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Sync global online/offline status into pump and tank arrays dynamically
  useEffect(() => {
    const saved = localStorage.getItem('scada_templates');
    if (!saved) return;
    try {
      const templates = JSON.parse(saved);
      let statsCache = [];
      try {
        const cached = localStorage.getItem('scada_ugtank_telemetry_cache');
        if (cached) statsCache = JSON.parse(cached);
      } catch(err) {}

      const updatePumpOnlineStatus = (prev) => {
        let changed = false;
        const next = prev.map(pump => {
          const template = templates.find(t =>
            t.module === 'UG Pump' && Number(t.mapping?.ugPumpRange?.pumpNo) === Number(pump.id)
          );
          if (template && template.mapping) {
            const deviceId = template.mapping.deviceId || template.mapping.ugStatusStartConfig?.device || template.mapping.ugStatusConfig?.device;
            let isOnline = getOverallStatus(deviceId, template.mapping.gatewayUuid);
            
            if (!isOnline && template.mapping) {
              const activeModules = new Set();
              ['ugStatusStartConfig', 'ugStatusStopConfig', 'ugAmpsConfig', 'ugStartCmdConfig', 'ugStopCmdConfig'].forEach(cfgKey => {
                const cfg = template.mapping[cfgKey];
                if (cfg && cfg.enabled !== false && cfg.module) {
                  activeModules.add(String(cfg.module));
                }
              });
              const hasRecentStats = statsCache.some(s => activeModules.has(String(s.moduleId)) || activeModules.has(String(s.meta?.module_id)));
              if (hasRecentStats) {
                isOnline = true;
              }
            }

            const isMapped = !!deviceId;
            if (pump.isOnline !== isOnline || pump.isMapped !== isMapped) {
              changed = true;
              return { ...pump, isOnline, isMapped };
            }
          } else {
            if (pump.isMapped !== false) {
              changed = true;
              return { ...pump, isMapped: false };
            }
          }
          return pump;
        });
        return changed ? next : prev;
      };
      setPumps1(prev => updatePumpOnlineStatus(prev));
      setPumps2(prev => updatePumpOnlineStatus(prev));

      setTanks(prev => {
        let changed = false;
        const next = prev.map((tank, index) => {
          const ugTemplates = templates.filter(t => t.module === 'UG Tank');
          let template = ugTemplates.find(t => t.mapping?.ugTankRange?.name === tank.name);
          if (template && template.mapping) {
            let deviceId = template.mapping.deviceId || template.mapping.ugTankLevelConfig?.device || template.mapping.ugLevelConfig?.device;
            if (!deviceId) {
              const anyConfig = Object.values(template.mapping).find(cfg => cfg && typeof cfg === 'object' && cfg.device);
              if (anyConfig) deviceId = anyConfig.device;
            }
            let isOnline = getOverallStatus(deviceId, template.mapping.gatewayUuid);
            
            if (!isOnline && template.mapping) {
              const activeModules = new Set();
              ['ugTankLevelConfig', 'ugLevelConfig', 'ugAmpsConfig', 'ugStatusStartConfig', 'ugStatusStopConfig'].forEach(cfgKey => {
                const cfg = template.mapping[cfgKey];
                if (cfg && cfg.enabled !== false && cfg.module) {
                  activeModules.add(String(cfg.module));
                }
              });
              const hasRecentStats = statsCache.some(s => activeModules.has(String(s.moduleId)) || activeModules.has(String(s.meta?.module_id)));
              if (hasRecentStats) {
                isOnline = true;
              }
            }

            const isMapped = !!deviceId;
            if (tank.isOnline !== isOnline || tank.isMapped !== isMapped) {
              changed = true;
              return { ...tank, isOnline, isMapped };
            }
          } else {
            if (tank.isMapped !== false || tank.isOnline !== false) {
              changed = true;
              return { ...tank, isMapped: false, isOnline: false };
            }
          }
          return tank;
        });
        return changed ? next : prev;
      });
    } catch (e) { console.error(e); }
  }, [getOverallStatus]);

  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('UgTank WebSocket Connected - Listening for Telemetry');
    });

    const processTelemetry = (stats) => {
      if (!Array.isArray(stats)) return;
      try {
        const saved = localStorage.getItem('scada_templates');
        if (!saved) return;
        const templates = JSON.parse(saved).map(t => ({
          ...t,
          mapping: cleanCorruptedMapping(t.mapping)
        }));

        setTanks(prev => {
          let updated = false;

          const ugTemplates = templates.filter(t =>
            t.module === 'UG Tank' || t.module === 'UG Pump'
          );

          const next = prev.map((tank, index) => {
            let template = ugTemplates.find(t => t.mapping?.ugTankRange?.name === tank.name);

            let config = null;

            if (template && template.mapping && template.mapping.ugTankLevelConfig && template.mapping.ugTankLevelConfig.module) {
              config = template.mapping.ugTankLevelConfig;
            }

            let isOnline = tank.isOnline;
            let isMapped = tank.isMapped;
            if (template && template.mapping) {
              let deviceId = template.mapping.deviceId || config?.device || template.mapping.ugLevelConfig?.device;
              if (!deviceId) {
                const anyConfig = Object.values(template.mapping).find(cfg => cfg && typeof cfg === 'object' && cfg.device);
                if (anyConfig) deviceId = anyConfig.device;
              }
              isOnline = getOverallStatus(deviceId, template.mapping.gatewayUuid);
              
              if (!isOnline && template.mapping) {
                const activeModules = new Set();
                ['ugTankLevelConfig', 'ugLevelConfig', 'ugAmpsConfig', 'ugStatusStartConfig', 'ugStatusStopConfig'].forEach(cfgKey => {
                  const cfg = template.mapping[cfgKey];
                  if (cfg && cfg.enabled !== false && cfg.module) {
                    activeModules.add(String(cfg.module));
                  }
                });
                const hasRecentStats = stats.some(s => activeModules.has(String(s.moduleId)) || activeModules.has(String(s.meta?.module_id)));
                if (hasRecentStats) {
                  isOnline = true;
                }
              }
              
              isMapped = !!deviceId;
            } else {
              isMapped = false;
              isOnline = false;
            }

            let nextTank = { ...tank };
            if (nextTank.isOnline !== isOnline || nextTank.isMapped !== isMapped) {
              nextTank.isOnline = isOnline;
              nextTank.isMapped = isMapped;
              updated = true;
            }

            if (!isMapped) {
              if (nextTank.level !== 0) {
                nextTank.level = 0;
                updated = true;
              }
            } else if (config && config.field && config.module) {
              const stat = stats.find(s => String(s.moduleId) === String(config.module) || String(s.meta?.module_id) === String(config.module));
              if (stat && stat.meta && stat.meta[config.field] !== undefined) {
                const newLevel = Math.round(Number(stat.meta[config.field]));
                if (nextTank.level !== newLevel) {
                  nextTank.level = newLevel;
                  updated = true;
                }
              }
            }
            return nextTank;
          });
          return updated ? next : prev;
        });

        // Helper to evaluate condition based on operator
        const evaluateCondition = (val, operator, threshold) => {
          const vNum = parseFloat(val);
          const tNum = parseFloat(threshold);
          
          const isNumeric = !isNaN(vNum) && !isNaN(tNum);
          
          const v = isNumeric ? vNum : String(val).trim();
          const t = isNumeric ? tNum : String(threshold).trim();
          
          switch (operator) {
            case '=': return v === t;
            case '>': return v > t;
            case '<': return v < t;
            default: return v === t;
          }
        };

        let commonPressureValue = null;
        const anyPressureTemplate = templates.find(t => t.module === 'Pressure' && t.mapping?.pressureConfig?.module);
        if (anyPressureTemplate) {
          const config = anyPressureTemplate.mapping.pressureConfig;
          const stat = stats.find(s => String(s.moduleId) === String(config.module) || String(s.meta?.module_id) === String(config.module));
          if (stat && stat.meta && stat.meta[config.field] !== undefined) {
            commonPressureValue = Number(stat.meta[config.field]);
          }
        }

        const updatePumpsStatus = (prevPumps) => {
          let pumpUpdated = false;
          const nextPumps = prevPumps.map(pump => {
            const template = templates.find(t =>
              t.module === 'UG Pump' &&
              Number(t.mapping?.ugPumpRange?.pumpNo) === Number(pump.id)
            );

            if (!template || !template.mapping) {
              let nextPump = { ...pump };
              let changed = false;
              if (pump.status !== 'Stopped') {
                nextPump = { ...nextPump, status: 'Stopped', hz: '0.0', amp: '0.0', pressure: 0.0 };
                changed = true;
              }
              if (pump.isMapped !== false) {
                nextPump.isMapped = false;
                changed = true;
              }
              if (changed) {
                pumpUpdated = true;
                return nextPump;
              }
              return pump;
            }

            const startCfg = template.mapping.ugStatusStartConfig;
            const stopCfg = template.mapping.ugStatusStopConfig;

            let newStatus = pump.status;
            let conditionMet = false;

            // 1. Check for START condition (Running)
            if (startCfg?.field && startCfg?.module) {
              const stat = stats.find(s => String(s.moduleId) === String(startCfg.module) || String(s.meta?.module_id) === String(startCfg.module));
              if (stat && stat.meta && stat.meta[startCfg.field] !== undefined) {
                const currentVal = stat.meta[startCfg.field];
                const isStartMet = evaluateCondition(currentVal, startCfg.operator || '=', startCfg.value || '10');

                if (isStartMet) {
                  newStatus = 'Running';
                  conditionMet = true;
                }
              }
            }

            // 2. Check for STOP condition (Stopped)
            if (!conditionMet && stopCfg?.field && stopCfg?.module) {
              const stat = stats.find(s => String(s.moduleId) === String(stopCfg.module) || String(s.meta?.module_id) === String(stopCfg.module));
              if (stat && stat.meta && stat.meta[stopCfg.field] !== undefined) {
                const currentVal = stat.meta[stopCfg.field];
                const isStopMet = evaluateCondition(currentVal, stopCfg.operator || '=', stopCfg.value || '10');

                if (isStopMet) {
                  newStatus = 'Stopped';
                  conditionMet = true;
                }
              }
            }

            // 3. Fallback
            if (!conditionMet && startCfg?.field && startCfg?.module) {
              newStatus = 'Stopped';
            }

            // Online status
            let isOnline = pump.isOnline;
            let deviceToCheck = startCfg?.device || template.mapping?.deviceId;
            if (!deviceToCheck && template.mapping) {
              const anyConfigWithDevice = Object.values(template.mapping).find(cfg => cfg && cfg.device);
              if (anyConfigWithDevice) deviceToCheck = anyConfigWithDevice.device;
            }

            if (deviceToCheck) {
              isOnline = getOverallStatus(deviceToCheck, template.mapping?.gatewayUuid);
            } else {
              const stat = stats.find(s => String(s.moduleId) === String(startCfg.module) || String(s.meta?.module_id) === String(startCfg.module));
              if (stat) {
                const modeObj = stat.meta?.mode || stat.mode;
                if (modeObj && modeObj.name) {
                  isOnline = modeObj.name === 'ONLINE';
                }
                else if (stat.meta?.created_at_timestamp) {
                  const ts = stat.meta.created_at_timestamp;
                  const lastSeen = isNaN(Number(ts)) ? new Date(ts).getTime() : (String(ts).length <= 10 ? Number(ts) * 1000 : Number(ts));
                  if (!isNaN(lastSeen)) {
                    isOnline = (Date.now() - lastSeen) < 86400000;
                  }
                }
              }
            }

            if (!isOnline && template.mapping) {
              const activeModules = new Set();
              ['ugStatusStartConfig', 'ugStatusStopConfig', 'ugAmpsConfig', 'ugStartCmdConfig', 'ugStopCmdConfig'].forEach(cfgKey => {
                const cfg = template.mapping[cfgKey];
                if (cfg && cfg.enabled !== false && cfg.module) {
                  activeModules.add(String(cfg.module));
                }
              });
              const hasRecentStats = stats.some(s => activeModules.has(String(s.moduleId)) || activeModules.has(String(s.meta?.module_id)));
              if (hasRecentStats) {
                isOnline = true;
              }
            }

            const isMapped = !!deviceToCheck;

            const startLimit = template.mapping.rule1Config?.consequence?.value ? Number(template.mapping.rule1Config.consequence.value) : pump.startLimit;
            const stopLimit = template.mapping.rule2Config?.consequence?.value ? Number(template.mapping.rule2Config.consequence.value) : pump.stopLimit;

            let newAmp = pump.amp;
            if (template.mapping.ugAmpsConfig?.field && template.mapping.ugAmpsConfig?.module) {
              const config = template.mapping.ugAmpsConfig;
              const stat = stats.find(s => String(s.moduleId) === String(config.module) || String(s.meta?.module_id) === String(config.module));
              if (stat && stat.meta && stat.meta[config.field] !== undefined) {
                newAmp = Number(stat.meta[config.field]).toFixed(1);
              }
            } else if (startCfg?.module) {
              const stat = stats.find(s => String(s.moduleId) === String(startCfg.module) || String(s.meta?.module_id) === String(startCfg.module));
              if (stat && stat.meta) {
                const currentKey = Object.keys(stat.meta).find(k => k.toLowerCase().includes('current'));
                if (currentKey && stat.meta[currentKey] !== undefined) {
                  newAmp = Number(stat.meta[currentKey]);
                }
              }
            }

            let newPressure = commonPressureValue !== null ? commonPressureValue : pump.pressure;
            const pressureTemplate = templates.find(t => 
              t.module === 'Pressure' && 
              t.mapping?.pressureTarget === `PUMP ${String(pump.id).padStart(2, '0')} PRESSURE`
            );
            
            if (pressureTemplate?.mapping?.pressureConfig?.field && pressureTemplate?.mapping?.pressureConfig?.module) {
              const config = pressureTemplate.mapping.pressureConfig;
              const stat = stats.find(s => String(s.moduleId) === String(config.module) || String(s.meta?.module_id) === String(config.module));
              if (stat && stat.meta && stat.meta[config.field] !== undefined) {
                newPressure = Number(stat.meta[config.field]);
              }
            }

            if (newStatus !== pump.status || isOnline !== pump.isOnline || isMapped !== pump.isMapped || startLimit !== pump.startLimit || stopLimit !== pump.stopLimit || newAmp !== pump.amp || newPressure !== pump.pressure) {
              pumpUpdated = true;
              return { ...pump, status: newStatus, isOnline, isMapped, startLimit, stopLimit, amp: newAmp, pressure: newPressure };
            }
            return pump;
          });
          return pumpUpdated ? nextPumps : prevPumps;
        };

        setPumps1(prev => updatePumpsStatus(prev));
        setPumps2(prev => updatePumpsStatus(prev));

        let newOutletPressure = commonPressureValue;
        const outletTemplate = templates.find(t => t.module === 'Pressure' && t.mapping?.pressureTarget === 'OUTLET PRESSURE');
        if (outletTemplate?.mapping?.pressureConfig?.field && outletTemplate?.mapping?.pressureConfig?.module) {
           const config = outletTemplate.mapping.pressureConfig;
           const stat = stats.find(s => String(s.moduleId) === String(config.module) || String(s.meta?.module_id) === String(config.module));
           if (stat && stat.meta && stat.meta[config.field] !== undefined) {
             newOutletPressure = Number(stat.meta[config.field]);
           }
        }
        setMappedOutletPressure(newOutletPressure);
      } catch (error) {
        console.error('Error handling WebSocket dynamic ug level:', error);
      }
    };

    socket.on('telemetry_update', processTelemetry);

    // ── INSTANT DATA LOAD STRATEGY ────────────────────────────────────────────
    // Step 1: Show cached data from last session IMMEDIATELY (0ms wait)
    try {
      const cached = localStorage.getItem('scada_ugtank_telemetry_cache');
      if (cached) processTelemetry(JSON.parse(cached));
    } catch (e) { /* ignore cache errors */ }

    // Step 2: HTTP fetch immediately on mount for fresh data (don't wait for WebSocket)
    const fetchStats = async () => {
      try {
                const saved = localStorage.getItem('scada_templates');
        const templates = saved ? JSON.parse(saved).map(t => ({
          ...t,
          mapping: cleanCorruptedMapping(t.mapping)
        })) : [];
        const modulesToPoll = new Set();
        templates.forEach(t => {
          if (t.mapping) {
            Object.values(t.mapping).forEach(cfg => {
              if (cfg && typeof cfg === 'object') {
                if (cfg.module && cfg.module !== 'ALL') {
                  modulesToPoll.add(String(cfg.module));
                }
                Object.values(cfg).forEach(val => {
                  if (typeof val === 'string' && val.includes('::')) {
                    const parts = val.split('::');
                    if (parts[0]) modulesToPoll.add(String(parts[0]));
                  }
                });
              }
            });
          }
        });
        const apiBase = (() => {
          if (typeof window !== 'undefined' && window.process?.env?.REACT_APP_BACKEND_URL) {
            return window.process.env.REACT_APP_BACKEND_URL.replace(/\/api$/, '');
          }
          return '';
        })();
        const pollList = Array.from(modulesToPoll);
        const url = pollList.length > 0 ? `${apiBase}/api/templates/stats?modules=${pollList.join(',')}` : `${apiBase}/api/templates/stats`;
        const res = await fetch(url);
        if (res.ok) {
          const stats = await res.json();
          // Save to cache for next page visit — instant load next time
          try { localStorage.setItem('scada_ugtank_telemetry_cache', JSON.stringify(stats)); } catch (e) {}
          processTelemetry(stats);
        }
      } catch (err) {
        console.error('Error fetching UgTank stats:', err);
      }
    };

    fetchStats(); // Immediate on mount

    // Step 3: Keep polling every 2s as backup (regardless of WebSocket state)
    const pollInterval = setInterval(fetchStats, 2000);
    // ─────────────────────────────────────────────────────────────────────────

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [getOverallStatus]);

  const activePumps = activeStation === 1 ? pumps1 : pumps2;
  const isAnyPumpRunning = useMemo(() => activePumps.some(p => p.status === 'Running'), [activePumps]);

  const masterPressureValue = useMemo(() => {
    if (mappedOutletPressure !== null) return mappedOutletPressure;
    if (!isAnyPumpRunning) return 0.0;
    const activeWithPressure = activePumps.filter(p => p.status === 'Running' && p.pressure > 0);
    if (activeWithPressure.length === 0) return 0.0;
    return activeWithPressure.reduce((acc, curr) => acc + curr.pressure, 0) / activeWithPressure.length;
  }, [activePumps, isAnyPumpRunning, mappedOutletPressure]);

  const technicalData = {
    custom_name: "UG-TANK-01-SEC-A",
    site_name: "Crystal IT Park",
    location: "Block B, Basement -2",
    meter_name: "Main UG Supply Meter",
    meter_number: "MTR-UG-9981",
    controller: "Schneider Modicon",
    grid_kw: "45.5",
    dg_kw: "0.0",
    overload_trip: "OK",
    low_balance_cut: "OFF",
    overload_limit_reached: "NO",
    grid_balance: "₹1,42,500",
    kwh: "12,450.2",
    kvah: "13,100.5",
    connection_status: "ONLINE",
    supply_status: "ACTIVE",
    updated_at: "2026-04-21 10:01:45",
    power_factor: "0.98",
    total_kva: "48.2",
    total_kw: "46.1",
    frequency: "50.02 Hz",
    avg_kvar: "4.2",
    voltage_ry: "415.2",
    voltage_yb: "414.8",
    voltage_br: "416.1",
    current_phase_r: "62.4",
    current_phase_y: "61.9",
    current_phase_b: "62.1"
  };

  const masterRotation = useMemo(() => {
    const angle = (masterPressureValue / 10) * 270 - 135;
    return Math.min(Math.max(angle, -135), 135);
  }, [masterPressureValue]);

  const [isSendingCommand, setIsSendingCommand] = useState(false);

  const handlePumpControl = async (id, updates) => {
    const userRole = (localStorage.getItem('userRole') || 'user').toUpperCase();
    let hasWriteAccess = false;
    try {
      const perms = JSON.parse(localStorage.getItem('scada_feature_permissions') || '{}');
      if (perms.showWaterManagement_write === true) {
        hasWriteAccess = true;
      }
    } catch (e) {}

    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && !hasWriteAccess) {
      setActionFeedback("ACCESS DENIED: ADMIN OR WRITE PRIVILEGES ONLY");
      setTimeout(() => setActionFeedback(null), 1500);
      return;
    }

    if (updates.status) {
      if (selectedPump && !selectedPump.isOnline) {
        setActionFeedback("DEVICE OFFLINE");
        setTimeout(() => setActionFeedback(null), 2000);
        return;
      }

      const isStart = updates.status === 'Running';

      // 1. Fetch Template
      const saved = localStorage.getItem('scada_templates');
      if (!saved) {
        setActionFeedback("ERROR: NO TEMPLATES FOUND");
        setTimeout(() => setActionFeedback(null), 2000);
        return;
      }

      const templates = JSON.parse(saved);
      // Find template for this specific pump
      const template = templates.find(t =>
        t.module === 'UG Pump' &&
        Number(t.mapping?.ugPumpRange?.pumpNo) === Number(id)
      );

      if (!template) {
        setActionFeedback("ERROR: PUMP NOT MAPPED");
        setTimeout(() => setActionFeedback(null), 2000);
        return;
      }

      const config = isStart ? template.mapping?.ugStartCmdConfig : template.mapping?.ugStopCmdConfig;

      if (!config || !config.module || !config.field) {
        setActionFeedback("ERROR:Water Level MAPPING MISSING");
        setTimeout(() => setActionFeedback(null), 2000);
        return;
      }

      setIsSendingCommand(true);
      setActionFeedback("SYNCHRONIZING...");

      try {
        const payload = {
          argValue: 1,
          cmdArg: isStart ? 1 : 0,
          moduleId: parseInt(config.module),
          cmdField: config.field
        };

        const response = await fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/command/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sochiot_token')}`
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          setActionFeedback(`${isStart ? 'STARTED' : 'STOPPED'} SUCCESSFULLY`);
          setTimeout(() => setActionFeedback(null), 800);
          setTimeout(() => setShowPumpModal(false), 500);
        } else {
          const errorData = await response.json();
          setActionFeedback(`FAILED: ${errorData.message || 'API ERROR'}`);
          setTimeout(() => setActionFeedback(null), 3000);
        }
      } catch (error) {
        setActionFeedback("FAILED: NETWORK ERROR");
        setTimeout(() => setActionFeedback(null), 3000);
      } finally {
        setIsSendingCommand(false);
      }
    } else {
      const setter = activeStation === 1 ? setPumps1 : setPumps2;
      setter(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      if (selectedPump && selectedPump.id === id) setSelectedPump(prev => ({ ...prev, ...updates }));
    }
  };

  const openPumpSettings = (p) => {
    setSelectedPump(p);
    setShowPumpModal(true);
  };

  const openLimitSettings = (e, p) => {
    e.stopPropagation();
    setSelectedPump(p);
    setLimitForm({ start: p.startLimit, stop: p.stopLimit });
    setShowLimitModal(true);
  };

  const handleSendRuleToEngine = async (limitType) => {
    const userRole = (localStorage.getItem('userRole') || 'user').toUpperCase();
    let hasWriteAccess = false;
    try {
      const perms = JSON.parse(localStorage.getItem('scada_feature_permissions') || '{}');
      if (perms.showWaterManagement_write === true) {
        hasWriteAccess = true;
      }
    } catch (e) {}

    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && !hasWriteAccess) {
      setActionFeedback("ACCESS DENIED: ADMIN OR WRITE PRIVILEGES ONLY");
      setTimeout(() => setActionFeedback(null), 1500);
      return;
    }

    if (!selectedPump) return;

    if (!limitForm.start || !limitForm.stop || Number(limitForm.start) === 0 || Number(limitForm.stop) === 0) {
      setActionFeedback("RULE IS NOT APPLIED");
      setTimeout(() => setActionFeedback(null), 2000);
      return;
    }

    // 1. Fetch Template for this specific pump
    const saved = localStorage.getItem('scada_templates');
    if (!saved) {
      setActionFeedback("ERROR: NO TEMPLATES FOUND");
      setTimeout(() => setActionFeedback(null), 2000);
      return;
    }

    const templates = JSON.parse(saved);
    // Find the template for "UG Pump" that matches this pump ID
    const templateIndex = templates.findIndex(t =>
      t.module === 'UG Pump' &&
      Number(t.mapping?.ugPumpRange?.pumpNo) === Number(selectedPump.id)
    );

    if (templateIndex === -1) {
      setActionFeedback("ERROR: PUMP NOT MAPPED");
      setTimeout(() => setActionFeedback(null), 2000);
      return;
    }

    const template = templates[templateIndex];
    const typesToSend = limitType === 'BOTH' ? ['LOWER', 'UPPER'] : [limitType];

    setIsSendingRules(true);
    setActionFeedback("SENDING RULES...");

    try {
      const apiURL = `${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/rule-engine/apply`;
      const token = localStorage.getItem('sochiot_token');
      let rulesProcessed = 0;

      for (const type of typesToSend) {
        // 2. Identify Config (Rule 1 for Lower, Rule 2 for Upper)
        const config = type === 'LOWER' ? template.mapping.rule1Config : template.mapping.rule2Config;
        const moduleId = type === 'LOWER' ? template.mapping.ugLowerConfig?.module : template.mapping.ugUpperConfig?.module;
        const isEnabled = type === 'LOWER' ? (template.mapping.ugLowerConfig?.enabled !== false) : (template.mapping.ugUpperConfig?.enabled !== false);

        if (!moduleId || !isEnabled) {
          console.warn(`Module ID missing or disabled for ${type} limit`);
          continue;
        }

        rulesProcessed++;

        // 3. Update Consequence Value to current UI limit
        const updatedValue = type === 'LOWER' ? limitForm.start : limitForm.stop;

        // 4. Send to API
        const payload = {
          moduleId: moduleId,
          settingFields: [
            { fieldName: "condition_date_time", currentValue: config?.condition?.timeDate || "" },
            { fieldName: "condition_date_time_repeat_days", currentValue: config?.condition?.repeatDays?.join(',') || "" },
            { fieldName: "consequence_value", currentValue: String(updatedValue) },
            { fieldName: "condition_type", currentValue: config?.condition?.type || "MODBUS" },
            { fieldName: "condition_modbus", currentValue: config?.condition?.modbus || "" },
            { fieldName: "comparison_type", currentValue: config?.condition?.comparisonType || (type === 'LOWER' ? "LESS_THAN" : "GREATER_THAN") },
            { fieldName: "comparison_value", currentValue: config?.condition?.comparisonValue || "" },
            { fieldName: "consequence_type", currentValue: config?.consequence?.type || "OUTPUT_2" },
            { fieldName: "consequence_modbus", currentValue: config?.consequence?.modbus || "" }
          ]
        };

        const response = await fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/rule-engine/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`${type} API request failed`);

        // Update local template object for persistence
        if (type === 'LOWER') {
          template.mapping.rule1Config = {
            ...template.mapping.rule1Config,
            consequence: { ...template.mapping.rule1Config?.consequence, value: String(updatedValue) }
          };
        } else {
          template.mapping.rule2Config = {
            ...template.mapping.rule2Config,
            consequence: { ...template.mapping.rule2Config?.consequence, value: String(updatedValue) }
          };
        }
      }

      if (rulesProcessed === 0) {
        setActionFeedback("RULE IS NOT APPLIED");
        setTimeout(() => setActionFeedback(null), 2000);
        setIsSendingRules(false);
        return;
      }

      // 5. Save updated templates to localStorage
      templates[templateIndex] = template;
      localStorage.setItem('scada_templates', JSON.stringify(templates));
      window.dispatchEvent(new Event('storage'));

      setActionFeedback("SETTINGS APPLIED SUCCESS");

      // 6. Update local state so UI reflects recent values immediately
      const setter = activeStation === 1 ? setPumps1 : setPumps2;
      setter(prev => prev.map(p => p.id === selectedPump.id ? {
        ...p,
        startLimit: Number(limitForm.start),
        stopLimit: Number(limitForm.stop)
      } : p));

      // Update selectedPump so the modal also has current data if it stays open
      setSelectedPump(prev => ({
        ...prev,
        startLimit: Number(limitForm.start),
        stopLimit: Number(limitForm.stop)
      }));

      setTimeout(() => {
        setActionFeedback(null);
        setShowLimitModal(false);
      }, 1500);
    } catch (error) {
      console.error("Error sending rules:", error);
      setActionFeedback("FAILED TO UPDATE RULES");
      setTimeout(() => setActionFeedback(null), 2000);
    } finally {
      setIsSendingRules(false);
    }
  };

  const handleApplyLimits = () => {
    handlePumpControl(selectedPump.id, { startLimit: parseFloat(limitForm.start), stopLimit: parseFloat(limitForm.stop) });
    setShowLimitModal(false);
  };

  return (
    <div className={`fade-in p-2 ${isFullscreen ? 'fullscreen-scada-page' : ''}`} ref={pageRef}>
      <div className="page-header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0 text-white fw-bold">UG Pump Network{isFullscreen ? ' [ENLARGED]' : ''}</h2>
          <small className="text-secondary fw-bold">STATION MONITORING & CONTROL</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="info" size="sm" className="fw-bold px-3" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={16} className="me-2" /> : <Maximize size={16} className="me-2" />}
            {isFullscreen ? 'NORMAL VIEW' : 'EXPAND VIEW'}
          </Button>
          <PdfButton />
        </div>
      </div>

      <Row className="g-3 mb-4">
        {[1, 2].map(station => (
          <Col md={6} key={station}>
            <div className={`p-3 rounded-4 border ${activeStation === station ? 'border-info bg-info bg-opacity-10' : 'border-secondary border-opacity-20 bg-dark bg-opacity-20'}`} onClick={() => setActiveStation(station)} style={{ cursor: 'pointer' }}>
              <h6 className="mb-0 text-white fw-bold">UG PUMP STATION #0{station}</h6>
            </div>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={9}>
          <Card className="bg-transparent border-0 mb-4 overflow-hidden shadow-2xl h-100">
            <div className="scada-schematic-bg rounded-4 border border-secondary border-opacity-10 overflow-auto"
              style={{ backgroundColor: '#020408', position: 'relative', height: isFullscreen ? 'auto' : 'auto', minHeight: isFullscreen ? '850px' : 'auto' }}>

              <div className="station-label-header p-3 border-bottom border-secondary border-opacity-10 d-flex justify-content-between align-items-center">
                <div className="text-white fw-bold fs-7 letter-spacing-2">UNIT STATION #0{activeStation} MONITORING</div>
                <div className="d-flex align-items-center gap-5">
                  <div className="text-center pe-5 border-end border-secondary border-opacity-20 d-none d-md-block">
                    <small className="text-secondary d-block fs-11 fw-bold uppercase mb-1">Station mode</small>
                    <div className="d-flex align-items-center justify-content-center bg-black bg-opacity-40 p-1 px-3 rounded-pill border border-secondary border-opacity-20" style={{ minWidth: '100px' }}>
                      <span className={`fs-10 fw-black letter-spacing-1 ${controlMode === 'REMOTE' ? 'text-info' : 'text-warning'}`}>
                        {controlMode === 'REMOTE' ? 'REMOTE MODE' : 'LOCAL MODE'}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <small className="text-secondary d-block fs-10 fw-bold uppercase">PRESSURE</small>
                    <span className="text-white fw-black fs-4">{masterPressureValue.toFixed(1)} <small className="fs-9 text-info">BAR</small></span>
                  </div>
                  <div className="text-center border-start border-secondary border-opacity-20 ps-5">
                    <small className="text-secondary d-block fs-10 fw-bold">FLOW</small>
                    <span className="text-white fw-black fs-4">{isAnyPumpRunning ? "2450" : "0"} <small className="fs-9 text-info">LPM</small></span>
                  </div>
                </div>
              </div>

              <div className="scada-schematic-wrapper" style={{ width: '100%', height: isFullscreen ? '850px' : 'auto', minHeight: '520px', padding: isFullscreen ? '40px' : '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100%" height="100%" viewBox="0 0 1200 540" preserveAspectRatio="xMidYMid meet"
                  style={{ maxWidth: '1200px', transition: 'all 0.5s ease' }}>

                  <defs>
                    <pattern id="thickGrid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.01)" strokeWidth="1" /></pattern>
                    <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#0369a1" /></linearGradient>
                    <filter id="liquidGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                    <pattern id="wavePattern" x="0" y="0" width="80" height="20" patternUnits="userSpaceOnUse"><path d="M0 15 Q20 0 40 15 T80 15 V20 H0 Z" fill="#38bdf8" /><animateTransform attributeName="patternTransform" type="translate" from="0 0" to="80 0" dur="4s" repeatCount="indefinite" /></pattern>
                    <clipPath id="tankInnerClip"><rect x="0" y="0" width="180" height="130" rx="8" /></clipPath>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#thickGrid)" />
                  <text x="60" y="30" fill="#f59e0b" fontSize="11" fontWeight="900">INLET RESERVOIRS</text>
                  <text x="320" y="30" fill="#64748b" fontSize="11" fontWeight="900">MAIN MANIFOLD SYSTEM</text>

                  {tanks.map((tank, idx) => {
                    const yPos = 40 + (idx * 160);
                    return (
                      <g key={tank.id} transform={`translate(60, ${yPos})`}>
                        <rect width="180" height="130" rx="10" fill="#0c121e" stroke={!tank.isOnline ? "#334155" : "#1e293b"} strokeWidth={isFullscreen ? 4 : 3} />
                        
                        {/* Floating Status Badge for Tank — show OFFLINE badge only, ONLINE badge removed */}
                        {tank.isMapped && !tank.isOnline && (
                        <g transform="translate(12, -8)">
                          <rect width="52" height="15" rx="4" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
                          <circle cx="8" cy="7.5" r="2.5" fill="#ef4444" />
                          <text x="16" y="10.5" fill="#ef4444" fontSize="7" fontWeight="black" letterSpacing="0.3">
                            OFFLINE
                          </text>
                        </g>
                        )}

                        <g clipPath="url(#tankInnerClip)">
                          <rect x="0" y={130 - (tank.level * 1.3)} width="180" height={tank.level * 1.3} fill={tank.isOnline ? "url(#waterGrad)" : "#475569"} fillOpacity={tank.isOnline ? "0.7" : "0.3"} />
                          {tank.isOnline && <rect x="0" y={125 - (tank.level * 1.3)} width="180" height="20" fill="url(#wavePattern)" fillOpacity="0.8" />}
                          <text x="90" y="75" textAnchor="middle" fill={tank.isOnline ? "#fff" : "#64748b"} fontSize="42" fontWeight="900" filter={tank.isOnline ? "url(#liquidGlow)" : "none"}>{tank.isOnline ? `${tank.level}%` : "--%"}</text>
                        </g>
                        <text x="90" y="152" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="900">{tank.name}</text>
                        <path d="M180 65 L220 65" fill="none" stroke="#1e293b" strokeWidth="18" />
                      </g>
                    )
                  })}

                  {/* Tank to Manifold 1 Flow (High Intensity) */}
                  {[105, 265, 425].map((y) => (
                    <g key={y}>
                      <path d={`M240 ${y} L280 ${y}`} fill="none" stroke="#1e293b" strokeWidth="26" strokeLinecap="round" />
                      {isAnyPumpRunning && (
                        <g>
                          <path d={`M240 ${y} L280 ${y}`} fill="none" stroke="#0077be" strokeWidth="18" strokeOpacity="0.4" />
                          <path d={`M240 ${y} L280 ${y}`} fill="none" stroke="#38bdf8" strokeWidth="18" strokeDasharray="30,20">
                            <animate attributeName="stroke-dashoffset" from="50" to="0" dur="0.8s" repeatCount="indefinite" />
                          </path>
                        </g>
                      )}
                    </g>
                  ))}

                  <path d="M280 100 L280 435" fill="none" stroke="#1e293b" strokeWidth="28" strokeLinecap="round" />
                  <path d="M280 270 L360 270" fill="none" stroke="#1e293b" strokeWidth="28" strokeLinecap="round" />
                  {isAnyPumpRunning && (
                    <g>
                      <path d="M280 270 L360 270" fill="none" stroke="#0077be" strokeWidth="20" strokeOpacity="0.4" />
                      <path d="M280 270 L360 270" fill="none" stroke="#38bdf8" strokeWidth="20" strokeDasharray="40,30">
                        <animate attributeName="stroke-dashoffset" from="70" to="0" dur="1s" repeatCount="indefinite" />
                      </path>
                    </g>
                  )}
                  <path d="M360 80 L360 450" fill="none" stroke="#1e293b" strokeWidth="28" strokeLinecap="round" />

                  {isAnyPumpRunning && (
                    <g>
                      <path d="M280 100 L280 435" fill="none" stroke="#0077be" strokeWidth="20" strokeOpacity="0.4" />
                      <path d="M280 100 L280 435" fill="none" stroke="#38bdf8" strokeWidth="20" strokeDasharray="40,30">
                        <animate attributeName="stroke-dashoffset" from="70" to="0" dur="1.2s" repeatCount="indefinite" />
                      </path>
                      <path d="M360 80 L360 450" fill="none" stroke="#0077be" strokeWidth="20" strokeOpacity="0.4" />
                      <path d="M360 80 L360 450" fill="none" stroke="#38bdf8" strokeWidth="20" strokeDasharray="40,30">
                        <animate attributeName="stroke-dashoffset" from="70" to="0" dur="1.2s" repeatCount="indefinite" />
                      </path>
                    </g>
                  )}

                  {[80, 180, 280, 380].map((y, i) => {
                    const p = activePumps[i];
                    const active = p.status === 'Running';
                    return (
                      <g key={i} onClick={() => openPumpSettings(p)} style={{ cursor: 'pointer' }}>
                        <path d={`M360 ${y + 35} L440 ${y + 35}`} fill="none" stroke="#1e293b" strokeWidth="16" />
                        {active && (<path d={`M360 ${y + 35} L440 ${y + 35}`} fill="none" stroke="#38bdf8" strokeWidth="8" strokeDasharray="10,10"><animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite" /></path>)}
                        <g transform={`translate(460, ${y + 35})`}>
                          <circle r="38" fill="#111827" stroke={!p.isOnline ? "#475569" : (active ? "#22c55e" : "#334155")} strokeWidth="4" />
                          {active && p.isOnline && (
                            <circle r="46" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="8,6" opacity="0.8">
                              <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="4s" repeatCount="indefinite" />
                            </circle>
                          )}
                          <Droplets size={32} x="-16" y="-16" className={!p.isOnline ? "text-secondary opacity-25" : (active ? "text-success" : "text-muted")} />
                        </g>

                        {/* Circle to Label Connection */}
                        <path d={`M498 ${y + 35} L540 ${y + 35}`} fill="none" stroke="#1e293b" strokeWidth="16" />
                        {active && (
                          <path d={`M498 ${y + 35} L540 ${y + 35}`} fill="none" stroke="#38bdf8" strokeWidth="8" strokeDasharray="10,10">
                            <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite" />
                          </path>
                        )}

                        <g transform={`translate(540, ${y + 5})`}>
                          <rect width="200" height="60" rx="8" fill="#0f172a" fillOpacity="0.9" stroke={!p.isOnline ? "#334155" : "#1e293b"} strokeWidth="2" />
                          
                          {/* Floating Status Badge for Pump */}
                          {p.isMapped && (
                          <g transform="translate(12, -8)">
                            <rect width="52" height="15" rx="4" fill="#0f172a" stroke={p.isOnline ? "#22c55e" : "#ef4444"} strokeWidth="1" />
                            <circle cx="8" cy="7.5" r="2.5" fill={p.isOnline ? "#22c55e" : "#ef4444"} />
                            {p.isOnline && (
                              <circle cx="8" cy="7.5" r="4.5" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.6">
                                <animate attributeName="r" values="2.5;6" dur="1.8s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                              </circle>
                            )}
                            <text x="16" y="10.5" fill={p.isOnline ? "#22c55e" : "#ef4444"} fontSize="7" fontWeight="black" letterSpacing="0.3">
                              {p.isOnline ? "ONLINE" : "OFFLINE"}
                            </text>
                          </g>
                          )}

                          <text x="14" y="20" fill="#94a3b8" fontSize="10" fontWeight="bold">PUMP P{p.id}</text>
                          <text x="70" y="20" fill="#f59e0b" fontSize="13" fontWeight="900">
                            {p.isMapped && p.isOnline && p.amp !== undefined ? `| ${Number(p.amp).toFixed(1)} A` : ''}
                          </text>
                          <text x="14" y="44" fill={!p.isMapped ? "#64748b" : (!p.isOnline ? "#64748b" : (active ? "#22c55e" : "#475569"))} fontSize={!p.isMapped || !p.isOnline ? "12" : "16"} fontWeight="900">
                            {!p.isMapped ? "STOPPED" : (!p.isOnline ? "OFFLINE" : p.status.toUpperCase())}
                            {p.isMapped && <tspan fill={!p.isOnline ? '#64748b' : (p.mode === 'AUTO' ? '#38bdf8' : '#f59e0b')} fontSize="10" dy="-1">| {p.mode}</tspan>}
                          </text>
                          <g transform="translate(165, 30)" style={{ cursor: 'pointer' }} onClick={(e) => openLimitSettings(e, p)}>
                            <circle r="22" fill="#111827" stroke="#334155" strokeWidth="1.5" />

                            {/* Numeric Scale */}
                            {[0, 2.5, 5, 7.5, 10].map(v => {
                              const angle = (v / 10) * 270 - 135;
                              const x = Math.sin(angle * Math.PI / 180) * 16;
                              const y = -Math.cos(angle * Math.PI / 180) * 16;
                              return (
                                <text key={v} x={x} y={y + 3} textAnchor="middle" fill="#94a3b8" fontSize="5" fontWeight="bold">
                                  {v}
                                </text>
                              )
                            })}

                            {/* Tick Marks */}
                            {[...Array(21)].map((_, i) => {
                              const val = i * 0.5;
                              const angle = (val / 10) * 270 - 135;
                              return <line key={i} x1="0" y1="-21" x2="0" y2={i % 2 === 0 ? "-17" : "-19"} stroke="#334155" strokeWidth="0.5" transform={`rotate(${angle})`} />
                            })}

                            {/* User Set Limits (Markers) */}
                            <line x1="0" y1="-22" x2="0" y2="-15" stroke="#22c55e" strokeWidth="2.5" transform={`rotate(${(p.startLimit / 10) * 270 - 135})`} style={{ transition: 'all 0.5s ease' }} />
                            <line x1="0" y1="-22" x2="0" y2="-15" stroke="#ef4444" strokeWidth="2.5" transform={`rotate(${(p.stopLimit / 10) * 270 - 135})`} style={{ transition: 'all 0.5s ease' }} />

                            {/* Needle */}
                            <line x1="0" y1="0" x2="0" y2="-19" stroke={active && p.isOnline ? "#ef4444" : "#475569"} strokeWidth="2" strokeLinecap="round" transform={`rotate(${(p.pressure / 10) * 270 - 135})`} style={{ transition: 'transform 0.8s ease-out' }} />
                            <circle r="2.5" fill="#fff" />

                            <text y="24" textAnchor="middle" fill={p.isOnline ? "#38bdf8" : "#475569"} fontSize="9" fontWeight="900">{active && p.isOnline ? p.pressure.toFixed(1) : "0.0"} <tspan fontSize="6" dy="-1">BAR</tspan></text>
                          </g>
                        </g>
                        {/* Pump Output Connection to Final Manifold */}
                        <path d={`M740 ${y + 35} L820 ${y + 35}`} fill="none" stroke="#1e293b" strokeWidth="16" />
                        {active && (
                          <path d={`M740 ${y + 35} L820 ${y + 35}`} fill="none" stroke="#38bdf8" strokeWidth="8" strokeDasharray="10,10">
                            <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite" />
                          </path>
                        )}
                      </g>);
                  })}

                  <path d="M820 70 L820 460 L1040 460" fill="none" stroke="#1e293b" strokeWidth="28" strokeLinecap="round" />
                  {isAnyPumpRunning && (<path d="M820 75 L820 460 L1050 460" fill="none" stroke="#38bdf8" strokeWidth={isFullscreen ? 18 : 14} strokeOpacity="0.8" strokeDasharray="30,20" filter="url(#liquidGlow)"><animate attributeName="stroke-dashoffset" from="50" to="0" dur="1s" repeatCount="indefinite" /></path>)}

                  <g transform="translate(935, 230)">
                    <circle r={isFullscreen ? 95 : 75} fill="#f8fafc" stroke="#94a3b8" strokeWidth={isFullscreen ? 8 : 6} />
                    <circle r={isFullscreen ? 88 : 70} fill="none" stroke="#334155" strokeWidth="1" />
                    {[...Array(11)].map((_, t) => (<line key={t} x1="0" y1={isFullscreen ? "-85" : "-65"} x2="0" y2={t % 2 === 0 ? (isFullscreen ? "-65" : "-48") : (isFullscreen ? "-75" : "-55")} stroke={t > 7 ? "#ef4444" : "#1e293b"} strokeWidth={t % 2 === 0 ? "4" : "2"} transform={`rotate(${t * 27 - 135})`} />))}
                    <circle r="10" fill="#1e293b" /><g transform={`rotate(${masterRotation})`} style={{ transition: 'transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}><path d="M-6 0 L0 -85 L6 0 Z" fill="#1e293b" /></g>
                    <text x="0" y={isFullscreen ? 120 : 98} textAnchor="middle" fill="#fff" fontSize={isFullscreen ? 26 : 19} fontWeight="900" filter="url(#liquidGlow)">{masterPressureValue.toFixed(1)} BAR</text>
                  </g>
                  <text x="1040" y="495" textAnchor="end" fill="#38bdf8" fontSize={isFullscreen ? 28 : 20} fontWeight="900">➤ DIRECT TO ROOFTOP NETWORK</text>
                </svg>
              </div>
            </div>
          </Card>
        </Col>

        <Col lg={3} className="d-none d-lg-block">
          <div className="technical-panel rounded-4 border border-secondary border-opacity-10 bg-dark bg-opacity-20 h-100 overflow-hidden d-flex flex-column shadow-lg">
            <div className="p-3 border-bottom border-secondary border-opacity-10 bg-black bg-opacity-30 d-flex justify-content-between align-items-center">
              <div>
                <span className="text-white fw-bold fs-9 letter-spacing-2 uppercase d-block">ELECTRICAL PARAMETER</span>
                <small className="text-secondary" style={{ fontSize: '0.75rem' }}>{technicalData.updated_at}</small>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="pulse-dot green"></div>
                <span className="text-success fw-black fs-10">ONLINE</span>
              </div>
            </div>

            <div className="flex-grow-1 p-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: isFullscreen ? 'calc(100vh - 200px)' : '620px' }}>

              {/* SECTION: ELECTRICAL PHASE DATA */}
              <div className="manifest-section mb-4">
                <div className="section-head mb-2 d-flex align-items-center gap-2">
                  <div className="p-1 rounded bg-primary bg-opacity-10 text-primary"><Layers size={12} /></div>
                  <small className="text-primary fw-bold fs-10 letter-spacing-1 uppercase">Phase Analysis</small>
                </div>
                <div className="bg-black bg-opacity-30 rounded-3 p-2 mb-2 border border-secondary border-opacity-10">
                  <small className="text-secondary fs-12 d-block mb-2 text-center fw-bold" style={{ fontSize: '0.7rem' }}>AVG VOLTAGE (V)</small>
                  <div className="d-flex justify-content-around text-center">
                    <div><small className="text-muted fs-12 d-block" style={{ fontSize: '0.65rem' }}>RY</small><span className="text-white fs-11 fw-black">{technicalData.voltage_ry}</span></div>
                    <div><small className="text-muted fs-12 d-block" style={{ fontSize: '0.65rem' }}>YB</small><span className="text-white fs-11 fw-black">{technicalData.voltage_yb}</span></div>
                    <div><small className="text-muted fs-12 d-block" style={{ fontSize: '0.65rem' }}>BR</small><span className="text-white fs-11 fw-black">{technicalData.voltage_br}</span></div>
                  </div>
                </div>
                <div className="bg-black bg-opacity-30 rounded-3 p-2 mb-2 border border-secondary border-opacity-10">
                  <small className="text-secondary fs-12 d-block mb-2 text-center fw-bold" style={{ fontSize: '0.7rem' }}>CURRENT PER PHASE (A)</small>
                  <div className="d-flex justify-content-around text-center">
                    <div><small className="text-danger-custom fs-12 d-block" style={{ fontSize: '0.65rem' }}>R</small><span className="text-white fs-11 fw-black">{technicalData.current_phase_r}</span></div>
                    <div><small className="text-warning-custom fs-12 d-block" style={{ fontSize: '0.65rem' }}>Y</small><span className="text-white fs-11 fw-black">{technicalData.current_phase_y}</span></div>
                    <div><small className="text-info fs-12 d-block" style={{ fontSize: '0.65rem' }}>B</small><span className="text-white fs-11 fw-black">{technicalData.current_phase_b}</span></div>
                  </div>
                </div>
                <div className="data-grid bg-black bg-opacity-20 rounded-3 p-2 border border-secondary border-opacity-5">
                  <div className="data-row d-flex justify-content-between py-1 border-bottom border-secondary border-opacity-5">
                    <span className="text-muted fs-11">Power Factor</span>
                    <span className="text-white fs-11 fw-black">{technicalData.power_factor}</span>
                  </div>
                  <div className="data-row d-flex justify-content-between py-1 border-bottom border-secondary border-opacity-5">
                    <span className="text-muted fs-11">Frequency</span>
                    <span className="text-white fs-11 fw-black">{technicalData.frequency}</span>
                  </div>
                  <div className="data-row d-flex justify-content-between py-1">
                    <span className="text-muted fs-11">Total Load</span>
                    <span className="text-info fs-11 fw-black">{technicalData.total_kw} KW</span>
                  </div>
                </div>
              </div>

              {/* SECTION: POWER & CONSUMPTION */}
              <div className="manifest-section mb-4">
                <div className="section-head mb-2 d-flex align-items-center gap-2">
                  <div className="p-1 rounded bg-warning bg-opacity-10 text-warning"><Zap size={12} /></div>
                  <small className="text-warning fw-bold fs-10 letter-spacing-1 uppercase">Power & Billing</small>
                </div>
                <div className="data-grid bg-black bg-opacity-20 rounded-3 p-2 border border-secondary border-opacity-5">
                  <div className="d-flex gap-2 mb-2">
                    <div className="p-2 rounded bg-dark border border-secondary border-opacity-10 flex-grow-1 text-center">
                      <small className="text-muted fs-12 d-block mb-1" style={{ fontSize: '0.7rem' }}>Power consumption(KVA)</small>
                      <span className="text-white fw-black fs-8" style={{ fontSize: '1rem' }}>{technicalData.grid_kw}</span>
                    </div>
                    {/* <div className="p-2 rounded bg-dark border border-secondary border-opacity-10 flex-grow-1 text-center">
                                    <small className="text-muted fs-12 d-block mb-1" style={{fontSize: '0.7rem'}}>DG KW</small>
                                    <span className="text-white fw-black fs-8" style={{fontSize: '1rem'}}>{technicalData.dg_kw}</span>
                                </div> */}
                  </div>
                  <div className="data-row d-flex justify-content-between py-1 border-bottom border-secondary border-opacity-5">
                    {/* <span className="text-muted fs-11">Current Balance</span> */}
                    {/* <span className="text-success fs-11 fw-black">{technicalData.grid_balance}</span> */}
                  </div>
                  <div className="data-pair d-flex gap-2 py-2 border-bottom border-secondary border-opacity-5">
                    <div className="flex-fill">
                      <small className="text-muted fs-12 d-block" style={{ fontSize: '0.65rem' }}>KWH</small>
                      <span className="text-info fs-11 fw-bold">{technicalData.kwh}</span>
                    </div>
                    <div className="flex-fill border-start border-secondary border-opacity-20 ps-2">
                      <small className="text-muted fs-12 d-block" style={{ fontSize: '0.65rem' }}>KVAH</small>
                      <span className="text-info fs-11 fw-bold">{technicalData.kvah}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: ALARMS & STATUS */}
              <div className="manifest-section mb-4">
                <div className="section-head mb-2 d-flex align-items-center gap-2">
                  <div className="p-1 rounded bg-danger bg-opacity-10 text-danger"><Activity size={12} /></div>
                  <small className="text-danger fw-bold fs-10 letter-spacing-1 uppercase">Safety Monitors</small>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Badge bg="dark" className="border border-secondary border-opacity-20 flex-grow-1 py-1 text-muted fs-12 fw-bold" style={{ fontSize: '0.7rem' }}>OVERLOAD: {technicalData.overload_trip}</Badge>
                  <Badge bg="dark" className="border border-secondary border-opacity-20 flex-grow-1 py-1 text-muted fs-12 fw-bold" style={{ fontSize: '0.7rem' }}>LOW BAL: {technicalData.low_balance_cut}</Badge>
                  <Badge bg="dark" className="border border-secondary border-opacity-20 flex-grow-1 py-1 text-muted fs-12 fw-bold" style={{ fontSize: '0.7rem' }}>LIMIT: {technicalData.overload_limit_reached}</Badge>
                </div>
              </div>



            </div>

            <div className="p-2 border-top border-secondary border-opacity-10 bg-black bg-opacity-50 text-center">
              <small className="text-info fw-bold letter-spacing-1" style={{ fontSize: '0.65rem' }}>SYSTEM CONTROLLER: {technicalData.controller.toUpperCase()}</small>
            </div>
          </div>
        </Col>
      </Row>

      <Modal show={showPumpModal} onHide={() => setShowPumpModal(false)} centered size="lg" contentClassName="bg-transparent border-0 shadow-2xl custom-modal-wide">
        {selectedPump && (
          <Modal.Body className="p-0 text-white overflow-hidden rounded-5" style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Modal Header Bar */}
            <div className="p-4 text-center border-bottom border-white border-opacity-10" style={{ background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, transparent 100%)' }}>
              <Badge bg="info" className="bg-opacity-10 text-info px-3 py-1 mb-2 border border-info border-opacity-25 rounded-pill">
                <div className="d-flex align-items-center gap-2 fs-12 fw-black tracking-widest uppercase">
                  <Activity size={10} className="pulse-icon" /> Station Controller
                </div>
              </Badge>
              <h3 className="fw-black text-white mb-0 size-3 tracking-tighter" style={{ textShadow: '0 0 20px rgba(56, 189, 248, 0.3)' }}>
                PUMP STATION <span className="text-info-scada">P{selectedPump.id}</span>
              </h3>
            </div>

            <div className="p-4 px-5">
              {/* Mode Control Section */}
              <div className="d-flex justify-content-between align-items-center p-3 rounded-4 position-relative overflow-hidden mb-3"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="position-absolute top-0 start-0 h-100 w-1 bg-info bg-opacity-50"></div>
                <div>
                  <div className="fw-black fs-10 tracking-widest text-secondary uppercase">System Mode</div>
                  <div className="text-white fw-bold fs-6">AUTO / MANUAL OVERRIDE</div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className={`fs-11 fw-black tracking-widest ${selectedPump.mode === 'MANUAL' ? 'text-warning text-glow' : 'text-muted opacity-50'}`}>MANUAL</span>
                  <div className="mode-toggle-switch" onClick={() => handlePumpControl(selectedPump.id, { mode: selectedPump.mode === 'AUTO' ? 'MANUAL' : 'AUTO' })}>
                    {selectedPump.mode === 'AUTO' ? <ToggleRight className="text-info" size={36} /> : <ToggleLeft className="text-muted" size={36} />}
                  </div>
                  <span className={`fs-11 fw-black tracking-widest ${selectedPump.mode === 'AUTO' ? 'text-info text-glow' : 'text-muted opacity-50'}`}>AUTO</span>
                </div>
              </div>

              {/* Action Section */}
              <div className="mb-4">
                <Form.Label className="fs-11 text-secondary fw-black tracking-widest mb-2 uppercase text-center w-100">Pump CommutationWater Levels</Form.Label>
                <Row className="g-3">
                  <Col xs={6}>
                    <button
                      className="premium-action-btn open w-100"
                      disabled={selectedPump.mode === 'AUTO' || isSendingCommand}
                      style={{ padding: '16px' }}
                      onClick={() => handlePumpControl(selectedPump.id, { status: 'Running', hz: '50.0' })}>
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        {isSendingCommand && selectedPump.status !== 'Running' ? <Spinner size="sm" animation="border" /> : <Zap size={20} />}
                        <div>
                          <div className="btn-label fs-5">{isSendingCommand && selectedPump.status !== 'Running' ? 'SENDING...' : 'START PUMP'}</div>
                        </div>
                      </div>
                    </button>
                  </Col>
                  <Col xs={6}>
                    <button
                      className="premium-action-btn close w-100"
                      disabled={selectedPump.mode === 'AUTO' || isSendingCommand}
                      style={{ padding: '16px' }}
                      onClick={() => handlePumpControl(selectedPump.id, { status: 'Stopped', hz: '0.0' })}>
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        {isSendingCommand && selectedPump.status !== 'Stopped' ? <Spinner size="sm" animation="border" /> : <X size={20} />}
                        <div>
                          <div className="btn-label fs-5">{isSendingCommand && selectedPump.status !== 'Stopped' ? 'SENDING...' : 'STOP PUMP'}</div>
                        </div>
                      </div>
                    </button>
                  </Col>
                </Row>
              </div>

              {actionFeedback && (
                <div className="action-success-overlay position-absolute top-50 start-50 translate-middle w-75 p-4 rounded-4 shadow-2xl text-center border-2 border-white d-flex flex-column align-items-center gap-2"
                  style={{
                    backgroundColor: actionFeedback.includes('DENIED') ? '#7f1d1d' : '#064e3b',
                    zIndex: 1000,
                    boxShadow: actionFeedback.includes('DENIED') ? '0 0 40px rgba(239, 68, 68, 0.4)' : '0 0 40px rgba(6, 78, 59, 0.4)'
                  }}>
                  <div className="bg-white rounded-circle p-2 mb-2">
                    {actionFeedback.includes('DENIED') ? <XCircle size={40} className="text-danger" /> : <ShieldCheck size={40} style={{ color: '#059669' }} />}
                  </div>
                  <h4 className="text-white fw-black mb-0 letter-spacing-2">{actionFeedback}</h4>
                </div>
              )}
            </div>

            <div className="p-3 border-top border-white border-opacity-5 text-center bg-black bg-opacity-20 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2 text-muted fs-12 fw-bold tracking-widest">
                <ShieldCheck size={14} className="text-success" /> SECURE STATION LINK
              </div>
              <Button variant="link" className="text-secondary fs-12 fw-black text-decoration-none hover-white transition-all uppercase tracking-widest" onClick={() => setShowPumpModal(false)}>
                Dismiss Panel
              </Button>
            </div>
          </Modal.Body>
        )}
      </Modal>

      <Modal show={showLimitModal} onHide={() => setShowLimitModal(false)} centered contentClassName="bg-dark border-secondary shadow-lg rounded-4 overflow-hidden">
        {selectedPump && (
          <Modal.Body className="p-4 text-white position-relative">
            <Button
              variant="link"
              className="position-absolute top-0 end-0 m-2 text-secondary hover-text-white transition-all p-2"
              onClick={() => setShowLimitModal(false)}
            >
              <X size={20} />
            </Button>
            <div className="text-center mb-4 mt-2">
              <h5 className="fw-black text-info tracking-tighter uppercase fs-9">PUMP P{selectedPump.id} THRESHOLD SETUP</h5>
            </div>
            <div className="bg-black bg-opacity-30 p-3 p-sm-4 rounded-4 mb-4 border border-secondary border-opacity-10">
              <Form.Group className="mb-4">
                <Form.Label className="fs-9 text-muted uppercase fw-bold mb-2">AUTO-START THRESHOLD (kg/cm²)</Form.Label>
                <Form.Control type="number" step="0.1" value={limitForm.start} onChange={(e) => setLimitForm({ ...limitForm, start: e.target.value })} className="bg-dark border-secondary text-white fw-bold fs-4" />
                <small className="text-secondary opacity-50 fs-10 mt-1 d-block">PUMP WILL IGNITE BELOW THIS PRESSURE</small>
              </Form.Group>
              <Form.Group>
                <Form.Label className="fs-9 text-muted uppercase fw-bold mb-2">AUTO-STOP THRESHOLD (kg/cm²)</Form.Label>
                <Form.Control type="number" step="0.1" value={limitForm.stop} onChange={(e) => setLimitForm({ ...limitForm, stop: e.target.value })} className="bg-dark border-secondary text-white fw-bold fs-4" />
                <small className="text-secondary opacity-50 fs-10 mt-1 d-block">PUMP WILL TERMINATE ABOVE THIS PRESSURE</small>
              </Form.Group>
            </div>
            <div className="d-flex flex-column gap-2 mt-4">
              <div className="d-flex gap-3">

              </div>
              <Button
                variant="primary"
                className="w-100 py-3 fw-black tracking-widest d-flex align-items-center justify-content-center gap-2 shadow-glow-blue border-0"
                style={{ background: 'linear-gradient(45deg, #2563eb, #3b82f6)' }}
                disabled={isSendingRules}
                onClick={() => handleSendRuleToEngine('BOTH')}
              >
                {isSendingRules ? <Spinner size="sm" animation="border" className="me-2" /> : <Zap size={18} />}
                SYNC WITH RULE ENGINE
              </Button>
            </div>

            {actionFeedback && (
              <div className="action-success-overlay position-absolute top-50 start-50 translate-middle w-75 p-4 rounded-4 shadow-2xl text-center border-2 border-white d-flex flex-column align-items-center gap-2"
                style={{
                  backgroundColor: actionFeedback.includes('FAILED') || actionFeedback.includes('NOT APPLIED') || actionFeedback.includes('DEVICE OFFLINE') ? '#7f1d1d' : '#064e3b',
                  zIndex: 1000,
                  boxShadow: actionFeedback.includes('FAILED') || actionFeedback.includes('NOT APPLIED') || actionFeedback.includes('DEVICE OFFLINE') ? '0 0 40px rgba(239, 68, 68, 0.4)' : '0 0 40px rgba(6, 78, 59, 0.4)'
                }}>
                <div className="bg-white rounded-circle p-2 mb-2">
                  {actionFeedback.includes('FAILED') || actionFeedback.includes('NOT APPLIED') || actionFeedback.includes('DEVICE OFFLINE') ? <XCircle size={40} className="text-danger" /> : <ShieldCheck size={40} style={{ color: '#059669' }} />}
                </div>
                <h4 className="text-white fw-black mb-0 letter-spacing-2">{actionFeedback}</h4>
              </div>
            )}
          </Modal.Body>
        )}
      </Modal>

      <style dangerouslySetInnerHTML={{
        __html: `
        .fullscreen-scada-page { background-color: #111827 !important; min-height: 100vh !important; width: 100% !important; padding: 40px !important; overflow-y: scroll !important; }
        .scada-schematic-bg { transition: all 0.5s ease; background-image: radial-gradient(circle at 50% 50%, #0a1118 0%, #020408 100%); }
        .scada-selector-tile { background-color: #0c121e; cursor: pointer; transition: all 0.3s ease; }
        .scada-selector-tile.active-station { background-color: #0d1525; border-color: #38bdf8 !important; }
        .text-info { color: #38bdf8 !important; }
        .text-glow { text-shadow: 0 0 10px currentColor; }
        .text-info-scada { color: #38bdf8; }
        .fw-black { font-weight: 900 !important; }
        .premium-action-btn { 
            padding: 16px; 
            border-radius: 12px; 
            border: 1px solid rgba(255,255,255,0.1); 
            background: rgba(255,255,255,0.02); 
            color: #94a3b8; 
            transition: all 0.3s ease; 
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .premium-action-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .premium-action-btn .btn-label { font-size: 12px; font-weight: 900; letter-spacing: 1px; }
        
        .premium-action-btn.open.active { background: rgba(34, 197, 94, 0.15); border-color: #22c55e; color: #22c55e; box-shadow: 0 0 20px rgba(34, 197, 94, 0.1); }
        .premium-action-btn.open:hover:not(:disabled) { background: rgba(34, 197, 94, 0.1); border-color: #22c55e; color: #22c55e; }
        
        .premium-action-btn.close.active { background: rgba(239, 68, 68, 0.15); border-color: #ef4444; color: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.1); }
        .premium-action-btn.close:hover:not(:disabled) { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #ef4444; }

        .pulse-icon { animation: ag-pulse 2s infinite; }
        @keyframes ag-pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
        .custom-modal-wide { width: 85% !important; max-width: 85% !important; }

        .fs-12 { font-size: 0.6rem; }
        .fs-11 { font-size: 0.75rem; }
        .fs-10 { font-size: 0.85rem; }
        .fs-9 { font-size: 0.95rem; }
        .letter-spacing-1 { letter-spacing: 1px; }
        .letter-spacing-2 { letter-spacing: 2px; }
        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; position: relative; }
        .pulse-dot.green { background-color: #22c55e; box-shadow: 0 0 0 rgba(34, 197, 94, 0.4); animation: pulse-green 2s infinite; }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0px rgba(34, 197, 94, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0px rgba(34, 197, 94, 0); } }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        
        /* Mobile Responsiveness for Cards */
        @media (max-width: 576px) {
          .premium-figma-card {
            padding: 1rem !important;
          }
          .fs-10 { font-size: 0.7rem !important; }
          .fs-11 { font-size: 0.6rem !important; }
          .fs-12 { font-size: 0.5rem !important; }
          .preview-badge-premium {
            padding: 2px 6px !important;
          }
          .scada-data-box {
            margin-top: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
        }
        .text-danger-custom { color: #ef4444; }
        .text-warning-custom { color: #f59e0b; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
        .fade-in { animation: ug-fadeIn 0.5s ease-out; }
        .scale-in { animation: ug-scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes ug-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ug-scaleIn { from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }

        @media (max-width: 1200px) {
            .scada-schematic-wrapper { padding: 10px !important; }
            .station-label-header { padding: 10px !important; }
            .fs-4 { font-size: 1.2rem !important; }
        }

        @media (max-width: 768px) {
            .page-header h2 { font-size: 1.2rem; }
            .scada-schematic-wrapper { min-height: 350px !important; padding: 5px !important; }
            .station-label-header { flex-direction: column; align-items: flex-start !important; gap: 10px; }
            .station-label-header .d-flex { gap: 20px !important; width: 100%; justify-content: space-between; }
            .letter-spacing-2 { letter-spacing: 1px !important; font-size: 0.6rem !important; }
        }
      `}} />
    </div>
  );
};

export default UgTank;
