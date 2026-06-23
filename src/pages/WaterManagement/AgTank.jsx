import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Row, Col, Card, Tooltip, OverlayTrigger, Form, Button, Modal, Badge, Spinner } from 'react-bootstrap';
import { Home, Waves, LayoutGrid, Settings, Save, AlertCircle, CheckCircle2, XCircle, Activity, X, Droplets, ToggleRight, ToggleLeft, Maximize, Minimize, ShieldCheck, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import PdfButton from '../../components/PdfButton';
import { getSochiotDeviceDetails } from '../../services/authService';
import { useDeviceStatus } from '../../services/DeviceStatusContext';
import { io } from 'socket.io-client';

const AgTank = () => {
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showConfig, setShowConfig] = useState(false);
  const [tempDomesticCount, setTempDomesticCount] = useState(24);
  const [domesticCount, setDomesticCount] = useState(24);
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

  const totalTanks = 48;

  const { getOverallStatus } = useDeviceStatus();

  // Sync global online/offline status into allTanks state dynamically
  useEffect(() => {
    const saved = localStorage.getItem('scada_templates');
    if (!saved) return;
    try {
      const templates = JSON.parse(saved);
      setAllTanks(prev => {
        let changed = false;
        const next = prev.map(tank => {
          const tankName = `${tank.type === 'DOMESTIC' ? 'TOWER-D' : 'TOWER-F'}-${tank.localId}`;
          const template = templates.find(t =>
            t.module === 'AG Tank' &&
            (t.mapping?.agTankRange?.domStart === tankName || t.mapping?.agTankRange?.flushStart === tankName)
          );
          if (template && template.mapping) {
            let deviceId = template.mapping.deviceId || template.mapping.agStatusStartConfig?.device || template.mapping.agStatusConfig?.device;
            if (!deviceId) {
              const anyConfig = Object.values(template.mapping).find(cfg => cfg && typeof cfg === 'object' && cfg.device);
              if (anyConfig) deviceId = anyConfig.device;
            }
            const gatewayUuid = template.mapping.gatewayUuid;
            const isOnline = getOverallStatus(deviceId, gatewayUuid);
            if (tank.isOnline !== isOnline || !tank.isMapped) {
              changed = true;
              return { ...tank, isOnline, isMapped: true };
            }
          } else {
            // No template found — reset to unmapped
            if (tank.isMapped || tank.isOnline) {
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

  // Initialize tanks with valve states
  const [allTanks, setAllTanks] = useState(() => {
    const initial = Array.from({ length: totalTanks }, (_, i) => ({
      globalId: i + 1,
      localId: i < 24 ? i + 1 : i - 23,
      type: i < 24 ? 'DOMESTIC' : 'FLUSHING',
      level: 0,
      status: 'Stopped',
      valveMode: 'AUTO',
      valveStatus: 'CLOSE',
      minLevel: 20,
      maxLevel: 90,
      isOnline: false,
      isMapped: false
    }));

    // Initial Sync from LocalStorage templates
    const saved = localStorage.getItem('scada_templates');
    if (saved) {
      try {
        const templates = JSON.parse(saved).map(t => ({
          ...t,
          mapping: cleanCorruptedMapping(t.mapping)
        }));
        return initial.map(tank => {
          const tankName = `${tank.type === 'DOMESTIC' ? 'TOWER-D' : 'TOWER-F'}-${tank.localId}`;
          const template = templates.find(t =>
            t.module === 'AG Tank' &&
            (t.mapping?.agTankRange?.domStart === tankName || t.mapping?.agTankRange?.flushStart === tankName)
          );
          if (template && template.mapping) {
            return {
              ...tank,
              isMapped: true,
              minLevel: template.mapping.rule1Config?.consequence?.value ? Number(template.mapping.rule1Config.consequence.value) : tank.minLevel,
              maxLevel: template.mapping.rule2Config?.consequence?.value ? Number(template.mapping.rule2Config.consequence.value) : tank.maxLevel
            };
          }
          return tank;
        });
      } catch (e) { console.error("Initial Tank Sync Error:", e); }
    }
    return initial;
  });

  const [isSendingRules, setIsSendingRules] = useState(false);
  const [isSendingCommand, setIsSendingCommand] = useState(false);

  const [controlMode, setControlMode] = useState('REMOTE');

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) pageRef.current.requestFullscreen();
    else document.exitFullscreen();
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

    if (!selectedTank) return;

    if (!selectedTank.minLevel || !selectedTank.maxLevel || Number(selectedTank.minLevel) === 0 || Number(selectedTank.maxLevel) === 0) {
      setActionFeedback("RULE IS NOT APPLIED");
      setTimeout(() => setActionFeedback(null), 2000);
      return;
    }

    // 1. Identify Tank Name
    const tankName = `${selectedTank.type === 'DOMESTIC' ? 'TOWER-D' : 'TOWER-F'}-${selectedTank.localId}`;

    // 2. Fetch Template
    const saved = localStorage.getItem('scada_templates');
    if (!saved) {
      setActionFeedback("ERROR: NO TEMPLATES FOUND");
      setTimeout(() => setActionFeedback(null), 2000);
      return;
    }

    const templates = JSON.parse(saved);
    const templateIndex = templates.findIndex(t =>
      t.module === 'AG Tank' &&
      (t.mapping?.agTankRange?.domStart === tankName || t.mapping?.agTankRange?.flushStart === tankName)
    );

    if (templateIndex === -1) {
      setActionFeedback("ERROR: TANK NOT MAPPED");
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
        // 3. Prepare Config
        const config = type === 'LOWER' ? template.mapping.rule1Config : template.mapping.rule2Config;
        const moduleId = type === 'LOWER' ? template.mapping.agLowerConfig?.module : template.mapping.agUpperConfig?.module;
        const isEnabled = type === 'LOWER' ? (template.mapping.agLowerConfig?.enabled !== false) : (template.mapping.agUpperConfig?.enabled !== false);

        if (!moduleId || !isEnabled) {
          console.warn(`Module ID missing or disabled for ${type} limit`);
          continue;
        }

        rulesProcessed++;

        // 4. Update Consequence Value to current UI limit
        const updatedValue = type === 'LOWER' ? selectedTank.minLevel : selectedTank.maxLevel;

        // 5. Send to API
        const payload = {
          moduleId: moduleId,
          settingFields: [
            { fieldName: "condition_date_time", currentValue: config?.condition?.timeDate || "" },
            { fieldName: "condition_date_time_repeat_days", currentValue: config?.condition?.repeatDays?.join(',') || "" },
            { fieldName: "consequence_value", currentValue: String(updatedValue) },
            { fieldName: "condition_type", currentValue: config?.condition?.type || "MODBUS" },
            { fieldName: "condition_modbus", currentValue: config?.condition?.modbus || "" },
            { fieldName: "comparison_type", currentValue: config?.condition?.comparisonType || "LESS_THAN" },
            { fieldName: "comparison_value", currentValue: config?.condition?.comparisonValue || "" },
            { fieldName: "consequence_type", currentValue: config?.consequence?.type || "OUTPUT_2" },
            { fieldName: "consequence_modbus", currentValue: config?.consequence?.modbus || "" }
          ]
        };

        const response = await fetch(apiURL, {
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

      // 6. Save updated templates to localStorage for persistence
      templates[templateIndex] = template;
      localStorage.setItem('scada_templates', JSON.stringify(templates));
      window.dispatchEvent(new Event('storage'));

      setActionFeedback("SETTINGS APPLIED SUCCESS");
      setTimeout(() => setActionFeedback(null), 2000);
    } catch (error) {
      console.error("Error sending rules:", error);
      setActionFeedback("FAILED TO UPDATE RULES");
      setTimeout(() => setActionFeedback(null), 2000);
    } finally {
      setIsSendingRules(false);
    }
  };

  const updateTankValve = async (globalId, updates) => {
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

    // Handle Manual Remote Control via API
    if (updates.valveStatus && selectedTank && selectedTank.valveMode === 'MANUAL') {
      if (!selectedTank.isOnline) {
        setActionFeedback("DEVICE OFFLINE");
        setTimeout(() => setActionFeedback(null), 2000);
        return;
      }
      const tankName = `${selectedTank.type === 'DOMESTIC' ? 'TOWER-D' : 'TOWER-F'}-${selectedTank.localId}`;
      const saved = localStorage.getItem('scada_templates');

      if (saved) {
        try {
          const templates = JSON.parse(saved);
          const template = templates.find(t =>
            t.module === 'AG Tank' &&
            (t.mapping?.agTankRange?.domStart === tankName || t.mapping?.agTankRange?.flushStart === tankName)
          );

          const config = updates.valveStatus === 'OPEN' ? template?.mapping?.agOpenConfig : template?.mapping?.agCloseConfig;

          if (config && config.module && config.field) {
            setIsSendingCommand(true);
            setActionFeedback("SYNCHRONIZING...");

            const payload = {
              argValue: 1,
              cmdArg: updates.valveStatus === 'OPEN' ? 1 : 0,
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

            if (!response.ok) throw new Error("Remote Control failed");

            setActionFeedback("COMMAND SUCCESS");
            setTimeout(() => setActionFeedback(null), 800);
          }
        } catch (error) {
          console.error("Manual Control error:", error);
          setActionFeedback("COMMAND FAILED");
          setTimeout(() => setActionFeedback(null), 2000);
          setIsSendingCommand(false);
          return; // Exit if failed
        } finally {
          setIsSendingCommand(false);
        }
      }
    }

    setAllTanks(prev => {
      const next = prev.map(t => {
        if (t.globalId === globalId) {
          let syncedUpdates = { ...updates };
          // Synchronize Valve and Status for "Same Value" logic
          if (updates.valveStatus === 'OPEN') syncedUpdates.status = 'Running';
          if (updates.valveStatus === 'CLOSE') syncedUpdates.status = 'Stopped';
          if (updates.status === 'Running') syncedUpdates.valveStatus = 'OPEN';
          if (updates.status === 'Stopped') syncedUpdates.valveStatus = 'CLOSE';

          return { ...t, ...syncedUpdates };
        }
        return t;
      });

      if (selectedTank && selectedTank.globalId === globalId) {
        const currentItem = next.find(t => t.globalId === globalId);
        setSelectedTank(currentItem);
      }
      return next;
    });

    if (updates.valveStatus) {
      if (!isSendingCommand) {
        setActionFeedback(`${updates.valveStatus === 'OPEN' ? 'STARTED' : 'STOPPED'} SUCCESSFULLY`);
        setTimeout(() => setActionFeedback(null), 800);
      }
      // Auto-hide modal after brief success visualization
      setTimeout(() => setShowValveModal(false), 500);
    }
  };

  // Re-allocate types when configuration changes
  useMemo(() => {
    setAllTanks(prev => prev.map((t, i) => ({
      ...t,
      type: i < domesticCount ? 'DOMESTIC' : 'FLUSHING',
      localId: i < domesticCount ? i + 1 : i - domesticCount + 1
    })));
  }, [domesticCount]);

  // Comprehensive Stats Calculation including Sector Counts
  const stats = useMemo(() => {
    const s = {
      total: { running: 0, fault: 0, warning: 0, healthy: 0, all: totalTanks },
      domestic: { running: 0, fault: 0, warning: 0, healthy: 0, count: domesticCount },
      flushing: { running: 0, fault: 0, warning: 0, healthy: 0, count: totalTanks - domesticCount }
    };

    allTanks.forEach(t => {
      const statusKey = t.status.toLowerCase();
      if (t.status === 'Running') {
        s.total.healthy++;
        if (t.type === 'DOMESTIC') s.domestic.healthy++;
        else s.flushing.healthy++;
      }
      s.total[statusKey]++;
      if (t.type === 'DOMESTIC') s.domestic[statusKey]++;
      else s.flushing[statusKey]++;
    });

    return s;
  }, [allTanks, domesticCount]);

  const filteredTanks = allTanks.filter(t => {
    const matchesSector = sectorFilter === 'ALL' || t.type === sectorFilter;
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'RUNNING' && t.status === 'Running') ||
      (statusFilter === 'FAULT' && t.status === 'Fault') ||
      (statusFilter === 'WARNING' && t.status === 'Warning') ||
      (statusFilter === 'ACTIVE' && (t.status === 'Running' || t.status === 'Warning'));
    return matchesSector && matchesStatus;
  });

  const getTankColor = (type, level, status) => {
    if (status === 'Fault') return '#ef4444';
    if (level < 20) return '#f59e0b';
    return '#38bdf8'; // Constant Blue inside
  };

  // Valve Control States
  const [selectedTank, setSelectedTank] = useState(null);
  const [showValveModal, setShowValveModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [disabledTanks, setDisabledTanks] = useState({});

  useEffect(() => {
    const syncDisabledTanks = () => {
      const saved = localStorage.getItem('scada_templates');
      if (saved) {
        const templates = JSON.parse(saved);
        const disabledMap = {};
        templates.forEach(t => {
          if (t.module === 'AG Tank' && t.mapping.agMasterEnabled === false) {
            const tankName = t.mapping.agTankRange.domStart || t.mapping.agTankRange.flushStart;
            if (tankName) {
              disabledMap[tankName] = true;
            }
          }
        });
        setDisabledTanks(disabledMap);
      }
    };

    syncDisabledTanks();
    window.addEventListener('storage', syncDisabledTanks);
    // Listen for custom events if navigation happens within same tab without storage event firing
    window.addEventListener('focus', syncDisabledTanks);

    return () => {
      window.removeEventListener('storage', syncDisabledTanks);
      window.removeEventListener('focus', syncDisabledTanks);
    };
  }, []);

  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('AgTank WebSocket Connected - Listening for Telemetry');
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

        setAllTanks(prev => {
          let updated = false;

          const agTemplates = templates.filter(t => t.module === 'AG Tank');

          const next = prev.map((tank, index) => {
            const tankName = `${tank.type === 'DOMESTIC' ? 'TOWER-D' : 'TOWER-F'}-${tank.localId}`;

            let template = agTemplates.find(t =>
              (tank.type === 'DOMESTIC' && t.mapping?.agTankRange?.domStart === tankName) ||
              (tank.type === 'FLUSHING' && t.mapping?.agTankRange?.flushStart === tankName)
            );

            let newTank = { ...tank };

            if (template && template.mapping) {
              // Sync Rules Limits for visualization (Grid markers)
              const isEditing = showValveModal && selectedTank?.globalId === tank.globalId;
              if (!isEditing) {
                if (template.mapping.rule1Config?.consequence?.value) {
                  const newMin = Number(template.mapping.rule1Config.consequence.value);
                  if (newTank.minLevel !== newMin) {
                    newTank.minLevel = newMin;
                    updated = true;
                  }
                }
                if (template.mapping.rule2Config?.consequence?.value) {
                  const newMax = Number(template.mapping.rule2Config.consequence.value);
                  if (newTank.maxLevel !== newMax) {
                    newTank.maxLevel = newMax;
                    updated = true;
                  }
                }
              }

              // Level Config
              if (template.mapping.agLevelConfig?.field && template.mapping.agLevelConfig?.module) {
                const config = template.mapping.agLevelConfig;
                const stat = stats.find(s => String(s.moduleId) === String(config.module) || String(s.meta?.module_id) === String(config.module));
                if (stat && stat.meta && stat.meta[config.field] !== undefined) {
                  updated = true;
                  newTank.level = Math.round(Number(stat.meta[config.field]));
                }
              }

              // Amps/Current Config
              if (template.mapping.agAmpsConfig?.field && template.mapping.agAmpsConfig?.module) {
                const config = template.mapping.agAmpsConfig;
                const stat = stats.find(s => String(s.moduleId) === String(config.module) || String(s.meta?.module_id) === String(config.module));
                if (stat && stat.meta && stat.meta[config.field] !== undefined) {
                  updated = true;
                  newTank.amps = Number(stat.meta[config.field]).toFixed(1);
                }
              }

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

              // Status Interpretation
              const startCfg = template.mapping.agStatusStartConfig || template.mapping.agStatusConfig;
              const stopCfg = template.mapping.agStatusStopConfig;

              let devId = template.mapping.deviceId || startCfg?.device;
              if (!devId && template.mapping) {
                const anyConfig = Object.values(template.mapping).find(cfg => cfg && typeof cfg === 'object' && cfg.device);
                if (anyConfig) devId = anyConfig.device;
              }
              const gwyUuid = template.mapping.gatewayUuid;
              let isOnline = getOverallStatus(devId, gwyUuid);

              if (!isOnline && template.mapping) {
                const activeModules = new Set();
                ['agLevelConfig', 'agAmpsConfig', 'agStatusConfig', 'agStatusStartConfig', 'agStatusStopConfig', 'agOpenConfig', 'agCloseConfig'].forEach(cfgKey => {
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

              if (newTank.isOnline !== isOnline || !newTank.isMapped) {
                newTank.isOnline = isOnline;
                newTank.isMapped = true;
                updated = true;
              }

              let conditionMet = false;

              // 1. Check for START condition (OPEN)
              if (startCfg?.field && startCfg?.module) {
                const stat = stats.find(s => String(s.moduleId) === String(startCfg.module) || String(s.meta?.module_id) === String(startCfg.module));
                if (stat && stat.meta) {
                  const currentVal = stat.meta[startCfg.field];
                  const isStartMet = evaluateCondition(currentVal, startCfg.operator || '=', startCfg.value || '10');

                  if (isStartMet) {
                    updated = true;
                    conditionMet = true;
                    newTank.valveStatus = 'OPEN';
                    newTank.status = 'Running';
                  }
                }
              }

              // 2. Check for STOP condition (CLOSE)
              if (!conditionMet && stopCfg?.field && stopCfg?.module) {
                const stat = stats.find(s => String(s.moduleId) === String(stopCfg.module) || String(s.meta?.module_id) === String(stopCfg.module));
                if (stat && stat.meta && stat.meta[stopCfg.field] !== undefined) {
                  const currentVal = stat.meta[stopCfg.field];
                  const isStopMet = evaluateCondition(currentVal, stopCfg.operator || '=', stopCfg.value || '10');

                  if (isStopMet) {
                    updated = true;
                    conditionMet = true;
                    newTank.valveStatus = 'CLOSE';
                    newTank.status = 'Stopped';
                  }
                }
              }

              // 3. Fallback
              if (!conditionMet && startCfg?.field && startCfg?.module) {
                updated = true;
                newTank.valveStatus = 'CLOSE';
                newTank.status = 'Stopped';
              }

              // Legacy Open Config
              if (!updated && template.mapping.agOpenConfig?.field && template.mapping.agOpenConfig?.module) {
                const config = template.mapping.agOpenConfig;
                const stat = stats.find(s => String(s.moduleId) === String(config.module) || String(s.meta?.module_id) === String(config.module));
                if (stat && stat.meta && stat.meta[config.field] !== undefined) {
                  updated = true;
                  const val = stat.meta[config.field];
                  if (val > 0) {
                    newTank.valveStatus = 'OPEN';
                    newTank.status = 'Running';
                  } else {
                    newTank.valveStatus = 'CLOSE';
                    newTank.status = 'Stopped';
                  }
                }
              }
            } else {
              // Explicitly unmapped if no template is found
              if (newTank.isMapped || newTank.isOnline) {
                newTank.isMapped = false;
                newTank.isOnline = false;
                newTank.level = 0;
                newTank.status = 'Stopped';
                updated = true;
              }
            }
            return newTank;
          });
          return updated ? next : prev;
        });
      } catch (error) {
        console.error('Error handling WebSocket dynamic ag level:', error);
      }
    };

    socket.on('telemetry_update', processTelemetry);

    // ── INSTANT DATA LOAD STRATEGY ────────────────────────────────────────────
    // Step 1: Show cached data from last session IMMEDIATELY (0ms wait)
    try {
      const cached = localStorage.getItem('scada_agtank_telemetry_cache');
      if (cached) processTelemetry(JSON.parse(cached));
    } catch (e) { /* ignore cache errors */ }

  const fetchStats = async () => {
  try {
    // Clear old telemetry cache to avoid stale data
    localStorage.removeItem('scada_agtank_telemetry_cache');
    localStorage.removeItem('scada_ugtank_telemetry_cache');
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
    const pollList = Array.from(modulesToPoll);
    const apiBase = (() => {
      if (typeof window !== 'undefined' && window.process?.env?.REACT_APP_BACKEND_URL) {
        return window.process.env.REACT_APP_BACKEND_URL.replace(/\/api$/, '');
      }
      return '';
    })();
    const url = pollList.length > 0 ? `${apiBase}/api/templates/stats?modules=${pollList.join(',')}` : `${apiBase}/api/templates/stats`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error('Failed to fetch stats', res.status, url);
    }
    if (res.ok) {
      const stats = await res.json();
      // Save to cache for next page visit — instant load next time
      try { localStorage.setItem('scada_agtank_telemetry_cache', JSON.stringify(stats)); } catch (e) {}
      processTelemetry(stats);
    }
  } catch (err) {
    console.error('Error fetching AgTank stats:', err);
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
  }, [selectedTank, showValveModal, getOverallStatus]);

  const isTankDisabled = (tank) => {
    const name = `${tank.type === 'DOMESTIC' ? 'TOWER-D' : 'TOWER-F'}-${tank.localId}`;
    return disabledTanks[name];
  };

  const handleTankClick = (tank) => {
    if (isTankDisabled(tank)) {
      setActionFeedback("PLEASE CONNECT ADMIN");
      setTimeout(() => setActionFeedback(null), 2000);
      return;
    }

    // Refresh limits from localStorage templates before opening
    const saved = localStorage.getItem('scada_templates');
    if (saved) {
      try {
        const templates = JSON.parse(saved);
        const tankName = `${tank.type === 'DOMESTIC' ? 'TOWER-D' : 'TOWER-F'}-${tank.localId}`;
        const template = templates.find(t =>
          t.module === 'AG Tank' &&
          (t.mapping?.agTankRange?.domStart === tankName || t.mapping?.agTankRange?.flushStart === tankName)
        );
        if (template && template.mapping) {
          const min = template.mapping.rule1Config?.consequence?.value ? Number(template.mapping.rule1Config.consequence.value) : tank.minLevel;
          const max = template.mapping.rule2Config?.consequence?.value ? Number(template.mapping.rule2Config.consequence.value) : tank.maxLevel;

          // Update local tank object for the modal
          const syncedTank = { ...tank, minLevel: min, maxLevel: max };

          // Update in master list to sync markers
          setAllTanks(prev => prev.map(t => t.globalId === tank.globalId ? syncedTank : t));
          setSelectedTank(syncedTank);
        } else {
          setSelectedTank(tank);
        }
      } catch (e) {
        console.error("Tank Click Sync Error:", e);
        setSelectedTank(tank);
      }
    } else {
      setSelectedTank(tank);
    }

    setShowValveModal(true);
  };

  return (
    <div className={`fade-in p-2 ${isFullscreen ? 'fullscreen-scada-page' : ''}`} ref={pageRef}>
      <div className="page-header d-flex justify-content-between align-items-center mb-4 p-3 bg-dark bg-opacity-20 rounded-4 border border-white border-opacity-5">
        <div className="d-flex align-items-center gap-4">
          <div>
            <h2 className="mb-0 text-white fw-black tracking-tighter">AG TANK <span className="text-info">SCADA</span></h2>
            <p className="text-secondary fs-10 fw-bold opacity-75 mb-0 uppercase letter-spacing-1">Unit Array: 01-48 | Active Sector: {domesticCount}D / {48 - domesticCount}F</p>
          </div>

          <div className="d-none d-xl-flex gap-4 border-start border-white border-opacity-10 ps-4">
            <div className="hud-stat-container">
              <div className="hud-label">Net Storage</div>
              <div className="hud-value">{Math.round(allTanks.reduce((acc, t) => acc + t.level, 0) / 48)}<span className="fs-10 text-info ms-1">%</span></div>
            </div>
            <div className="hud-stat-container">
              <div className="hud-label">Avg Temp</div>
              <div className="hud-value">24.2<span className="fs-10 text-muted ms-1">°C</span></div>
            </div>
            <div className="hud-stat-container border-info border-opacity-50">
              <div className="hud-label text-info">System Health</div>
              <div className="hud-value text-info">98.5<span className="fs-10 ms-1">%</span></div>
            </div>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button variant="info" size="sm" className="d-flex align-items-center fw-bold shadow-sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={16} className="me-2" /> : <Maximize size={16} className="me-2" />}
            {isFullscreen ? 'NORMAL VIEW' : 'EXPAND VIEW'}
          </Button>
          <Button variant="outline-info" size="sm" className="d-flex align-items-center" onClick={() => setShowConfig(true)}>
            <Settings size={16} className="me-2" /> Sector Config
          </Button>
          <PdfButton />
        </div>
      </div>

      {/* QUICK STATUS BAR (Numbers for Running, Fault, etc) */}
      <Row className="g-3 mb-4">
        {[
          { id: 'RUNNING', label: 'Healthy', value: stats.total.healthy, icon: <CheckCircle2 size={16} />, color: 'success' },
          { id: 'FAULT', label: 'Critical', value: stats.total.fault, icon: <XCircle size={16} />, color: 'danger' },
          { id: 'WARNING', label: 'Warnings', value: stats.total.warning, icon: <AlertCircle size={16} />, color: 'warning' },
          { id: 'ACTIVE', label: 'Active', value: stats.total.running + stats.total.warning, icon: <Activity size={16} />, color: 'info' }
        ].map((item) => (
          <Col md={3} key={item.id}>
            <div
              className={`status-filter-card p-2 bg-dark rounded border-bottom border-3 border-${item.color} ${statusFilter === item.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === item.id ? 'ALL' : item.id)}
              style={{ cursor: 'pointer' }}
            >
              <small className="text-muted d-flex align-items-center gap-2 mb-1">
                {item.icon} {item.label}
              </small>
              <h3 className={`mb-0 fw-bold text-${item.color}`}>{item.value}</h3>
            </div>
          </Col>
        ))}
      </Row>

      {/* SECTOR FILTERS WITH NUMBERS (Domestic, Flushing, All) */}
      <Row className="g-3 mb-4">
        {[
          { id: 'DOMESTIC', label: 'DOMESTIC', count: stats.domestic.count, icon: <Home size={16} />, color: 'info' },
          { id: 'FLUSHING', label: 'FLUSHING', count: stats.flushing.count, icon: <Waves size={16} />, color: 'success' },
          { id: 'ALL', label: 'SYSTEM TOTAL', count: stats.total.all, icon: <LayoutGrid size={16} />, color: 'secondary' }
        ].map(mode => (
          <Col md={4} key={mode.id}>
            <div className={`filter-tile ${sectorFilter === mode.id ? 'active ' + mode.id.toLowerCase() : ''}`}
              onClick={() => {
                setSectorFilter(mode.id);
                if (mode.id === 'ALL') setStatusFilter('ALL');
              }}
              style={{ cursor: 'pointer', transition: '0.3s' }}>
              <div className="d-flex align-items-center justify-content-between p-2 px-3">
                <div className="d-flex align-items-center">
                  <div className={`tile-icon me-3 bg-${mode.color} bg-opacity-10 text-${mode.color} p-2 rounded`}>
                    {mode.icon}
                  </div>
                  <h6 className="mb-0 fw-bold text-white uppercase">{mode.label}</h6>
                </div>
                <div className="text-end">
                  <span className="fs-5 fw-black text-white">{mode.count}</span>
                  <small className="text-muted d-block fs-10 fw-bold">UNITS</small>
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <div className={`scada-card ${isFullscreen ? 'p-5' : 'p-4'}`}>
        <Row className="g-4">
          {filteredTanks.map((tank) => (
            <Col key={tank.globalId} xs={6} sm={4} md={isFullscreen ? 4 : 3} lg={isFullscreen ? 2 : 2} className={isFullscreen ? 'col-fs-2' : ''}>
              <div
                className={`tank-unit-wrapper p-2 rounded text-center position-relative ${tank.status === 'Stopped' ? 'tank-stopped-outline' : ''} ${isFullscreen ? 'expanded-unit' : ''} ${isTankDisabled(tank) ? 'tank-disabled' : ''}`}
                onClick={() => handleTankClick(tank)}
                style={{ cursor: isTankDisabled(tank) ? 'not-allowed' : 'pointer' }}
              >
                {isTankDisabled(tank) && <div className="disabled-overlay-text">DISABLED</div>}
                <div className="tank-assembly-anchor mx-auto position-relative" style={{ width: isFullscreen ? '48px' : '44px' }}>
                  <div
                    className={`tank-vessel ${isFullscreen ? 'vessel-large' : ''}`}
                    style={{ borderColor: '#475569' }}
                  >
                    <div className="tank-fill" style={{ height: `${tank.level}%`, backgroundColor: getTankColor(tank.type, tank.level, tank.status) }}>
                      <div className="tank-water-wave"></div>
                    </div>
                    {/* Visual Threshold Markers */}
                    <div className="threshold-marker lower" style={{ bottom: `${tank.minLevel}%` }}></div>
                    <div className="threshold-marker upper" style={{ bottom: `${tank.maxLevel}%` }}></div>
                  </div>
                  <div className="valve-connector-pipe"></div>
                  <div className={`industrial-valve-node ${!tank.isMapped ? 'valve-unmapped' : (!tank.isOnline ? 'valve-offline' : (tank.valveStatus === 'OPEN' ? 'valve-open' : 'valve-closed'))}`}>
                    {/* Mode Indicator A/M */}
                    <div className={`valve-mode-pill mode-${tank.valveMode.toLowerCase()} ${(!tank.isMapped || !tank.isOnline) ? 'opacity-25' : ''}`}>
                      {tank.valveMode === 'AUTO' ? 'A' : tank.valveMode === 'MANUAL' ? 'M' : 'B'}
                    </div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M4 6L20 18V6L4 18V6Z"
                        fill={(!tank.isMapped || !tank.isOnline) ? '#334155' : (tank.valveStatus === 'OPEN' ? '#22c55e' : '#ef4444')}
                        stroke={(!tank.isMapped || !tank.isOnline) ? '#334155' : (tank.valveStatus === 'OPEN' ? '#22c55e' : '#ef4444')}
                        strokeWidth="2"
                        style={{ transition: 'all 0.3s ease', filter: (!tank.isMapped || !tank.isOnline) ? 'none' : (tank.valveStatus === 'OPEN' ? 'drop-shadow(0 0 5px #22c55e)' : 'drop-shadow(0 0 5px #ef4444)') }} />
                      <rect x="11" y="2" width="2" height="6" fill="#94a3b8" />
                      <rect x="9" y="2" width="6" height="1" fill="#94a3b8" />
                    </svg>
                  </div>
                  {/* Discharge Flow Animation - Reacts to both Valve and Operation Status */}
                  {tank.valveStatus === 'OPEN' && tank.status === 'Running' && (
                    <div className="discharge-manifold-system">

                    </div>
                  )}
                </div>
                <div className={`fw-bold mb-0 mt-1 ${isFullscreen ? 'fs-7' : 'fs-10'} ${!tank.isMapped ? 'text-secondary opacity-50' : (!tank.isOnline ? 'text-danger' : 'text-success')}`}>
                  {!tank.isMapped ? 'NOT MAPPED' : (tank.isOnline ? 'ONLINE' : 'OFFLINE')}
                </div>
                <div className={`fw-bold mb-0 ${isFullscreen ? 'fs-7' : 'fs-10'} text-muted`}>{tank.type === 'DOMESTIC' ? 'TOWER-D' : 'TOWER-F'}-{tank.localId}</div>
                <div className={`d-flex justify-content-center gap-2 opacity-75 ${isFullscreen ? 'fs-7' : 'fs-10'}`}>
                  <span style={{ color: !tank.isMapped ? '#334155' : (!tank.isOnline ? '#475569' : getTankColor(tank.type, tank.level, tank.status)) }}>{!tank.isMapped ? '--' : (!tank.isOnline ? '--' : tank.level)}%</span>
                  {tank.isOnline && tank.amps !== undefined && (
                    <span className="text-warning d-flex align-items-center gap-1 fw-bold fs-7">
                      <Zap size={12} className="pulse-icon" /> {tank.amps}A
                    </span>
                  )}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .fullscreen-scada-page { 
            background: #020617 !important; 
            background-image: 
                radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.03) 0%, transparent 100%),
                linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px);
            background-size: 100% 100%, 40px 40px, 40px 40px;
            min-height: 100vh !important; 
            width: 100% !important; 
            padding: 60px !important; 
            overflow-y: auto !important; 
            position: fixed; 
            top: 0; 
            left: 0; 
            z-index: 2000; 
        }
        .ag-tank-main-container {
            background-image: 
                radial-gradient(circle at 50% 10%, rgba(56, 189, 248, 0.05) 0%, transparent 50%),
                linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
            background-size: 100% 100%, 30px 30px, 30px 30px;
            min-height: 100vh;
        }

        .tank-unit-wrapper { 
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
            border: 1px solid transparent;
        }
        .tank-unit-wrapper:hover {
            background: rgba(255,255,255,0.03);
            border-color: rgba(56, 189, 248, 0.1);
            transform: translateY(-5px);
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        
        .tank-disabled {
            opacity: 0.3 !important;
            filter: grayscale(1) !important;
            pointer-events: auto !important; /* Keep click enabled for the admin message */
        }
        .tank-disabled:hover {
            transform: none !important;
            background: transparent !important;
            border-color: transparent !important;
            box-shadow: none !important;
        }
        .disabled-overlay-text {
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            background: #ef4444;
            color: white;
            padding: 2px 6px;
            font-size: 7px;
            font-weight: 900;
            border-radius: 3px;
            z-index: 100;
            letter-spacing: 1px;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
            pointer-events: none;
        }

        .tank-vessel { 
            width: 44px; 
            height: 60px; 
            border: 2px solid #475569; 
            border-radius: 4px 4px 8px 8px; 
            background: linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); 
            position: relative; 
            overflow: hidden; 
            transition: 0.4s; 
            box-shadow: 
                inset 0 0 10px rgba(0,0,0,0.5),
                0 4px 6px -1px rgba(0,0,0,0.2); 
        }
        
        /* 3D Glossy Highlight Overlay */
        .tank-vessel::after {
            content: '';
            position: absolute;
            top: 0;
            left: 5px;
            width: 8px;
            height: 100%;
            background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, transparent 100%);
            z-index: 5;
            pointer-events: none;
        }

        .tank-fill { 
            position: absolute; 
            bottom: 0; 
            left: 0; 
            width: 100%; 
            transition: height 1s cubic-bezier(0.4, 0, 0.2, 1); 
            background-image: linear-gradient(90deg, rgba(0,0,0,0.2) 0%, transparent 50%, rgba(0,0,0,0.2) 100%);
        }
        
        .tank-stopped-outline { border: 1px dashed rgba(255,255,255,0.1); }
        .vessel-stopped { opacity: 0.6; grayscale: 100%; filter: grayscale(1); }
        .expanded-unit { transform: scale(1.15); margin-bottom: 80px; margin-top: 40px; }
        .vessel-large { width: 48px !important; height: 68px !important; border-width: 3px !important; }
        .vessel-closed-state { background: #1e293b !important; border-color: #334155 !important; }

        .filter-tile { background-color: #0f172a; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; transition: 0.3s; }
        .filter-tile:hover { transform: translateY(-2px); border-color: rgba(56, 189, 248, 0.2); background: rgba(15, 23, 42, 0.8); }
        .filter-tile.active.domestic { border-bottom: 4px solid #38bdf8; background: rgba(56, 189, 248, 0.08); }
        .filter-tile.active.flushing { border-bottom: 4px solid #10b981; background: rgba(16, 185, 129, 0.08); }
        .filter-tile.active.all { border-bottom: 4px solid #94a3b8; background: rgba(148, 163, 184, 0.1); }
        
        .status-filter-card { transition: 0.3s; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(5px); will-change: transform; }
        .status-filter-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.02); }
        .status-filter-card.active { border-bottom-width: 4px !important; background: rgba(56, 189, 248, 0.05); }

        .scada-card { background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; backdrop-filter: blur(10px); }
        
        .hud-stat-container { border-left: 2px solid rgba(56, 189, 248, 0.2); padding-left: 15px; }
        .hud-label { font-size: 9px; color: #94a3b8; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; }
        .hud-value { font-size: 18px; color: #fff; font-weight: 900; }
        .tank-fill { position: absolute; bottom: 0; left: 0; width: 100%; transition: height 1s cubic-bezier(0.4, 0, 0.2, 1); will-change: height; }
        .tank-water-wave { position: absolute; top: -4px; width: calc(100% + 30px); height: 8px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 28'%3E%3Cpath d='M0 28h120V12C90 12 90 0 60 0S30 12 0 12z' fill='rgba(255,255,255,0.2)'/%3E%3C/svg%3E"); background-size: 30px 8px; background-repeat: repeat-x; animation: ag-wave 2s linear infinite; will-change: transform; transform: translateZ(0); }
        @keyframes ag-wave { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-30px, 0, 0); } }
        .industrial-valve-node { width: 24px; height: 16px; position: absolute; top: 45%; right: -24px; transform: translateY(-50%) rotate(90deg); display: flex; align-items: center; justify-content: center; z-index: 10; transition: 0.3s; }
        .vessel-large + .valve-connector-pipe { width: 20px !important; height: 8px !important; }
        .expanded-unit .industrial-valve-node { right: -32px; transform: translateY(-50%) rotate(90deg) scale(1.3); }
        .valve-connector-pipe { position: absolute; top: 45%; left: 100%; width: 14px; height: 6px; background: #475569; transform: translateY(-50%); z-index: 5; }
        .valve-handle-stem { width: 3px; height: 8px; background: #94a3b8; position: absolute; top: -3px; left: 10px; border-radius: 1px; }
        .valve-body-wing { width: 0; height: 0; border-top: 7px solid transparent; border-bottom: 7px solid transparent; }
        
        .discharge-manifold-system { position: absolute; top: 45%; left: calc(100% + 24px); width: 20px; height: 100%; transform: translateY(-50%); }
        
        .valve-mode-pill {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%) rotate(-90deg);
            background: #1e293b;
            color: #38bdf8;
            font-size: 7px;
            font-weight: 900;
            width: 10px;
            height: 10px;
            border-radius: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #334155;
            z-index: 20;
            transition: all 0.3s ease;
        }
        .valve-mode-pill.mode-auto { color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
        .valve-mode-pill.mode-manual { color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }
        .valve-mode-pill.mode-bypass { color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }

        .threshold-marker {
            position: absolute;
            left: 0;
            width: 100%;
            height: 1px;
            border-top: 1px dashed rgba(255, 255, 255, 0.4);
            z-index: 10;
        }
        .threshold-marker.lower { border-color: rgba(56, 189, 248, 0.6); }
        .threshold-marker.upper { border-color: rgba(239, 68, 68, 0.6); }

        .horizontal-stream { width: 30px; height: 6px; background: rgba(71, 85, 105, 0.5); position: relative; overflow: hidden; border-radius: 0 4px 4px 0; }
        .stream-pulse { position: absolute; top: 0; left: 0; height: 100%; width: 50%; background: linear-gradient(90deg, transparent, #38bdf8, transparent); animation: stream-flow 1s linear infinite; will-change: transform; }
        
        @keyframes stream-flow { from { transform: translate3d(-100%, 0, 0); } to { transform: translate3d(200%, 0, 0); } }

        .fw-black { font-weight: 900 !important; }
        .fs-10 { font-size: 0.65rem; }
        .fs-9 { font-size: 0.75rem; }
        .fs-7 { font-size: 1.1rem; }
        .w-40 { width: 40% !important; }
        .custom-modal-wide { width: 85% !important; max-width: 85% !important; }
        .text-glow { text-shadow: 0 0 10px currentColor; }
        .hover-glow:hover { border-color: rgba(56, 189, 248, 0.3) !important; box-shadow: 0 0 20px rgba(56, 189, 248, 0.1); }
        .transition-all { transition: all 0.3s ease; }
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
        .premium-action-btn .btn-subtext { font-size: 9px; font-weight: 600; opacity: 0.5; text-transform: uppercase; }
        
        .premium-action-btn.open.active { background: rgba(34, 197, 94, 0.15); border-color: #22c55e; color: #22c55e; box-shadow: 0 0 20px rgba(34, 197, 94, 0.1); }
        .premium-action-btn.open:hover:not(:disabled) { background: rgba(34, 197, 94, 0.1); border-color: #22c55e; color: #22c55e; }
        
        .premium-action-btn.close.active { background: rgba(239, 68, 68, 0.15); border-color: #ef4444; color: #ef4444; box-shadow: 0 0 20px rgba(239, 68, 68, 0.1); }
        .premium-action-btn.close:hover:not(:disabled) { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #ef4444; }

        .pulse-icon { animation: ag-pulse 2s infinite; }
        @keyframes ag-pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
        .fade-in { animation: ag-fadeIn 0.5s ease-out; }
        .scale-in { animation: ag-scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes ag-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ag-scaleIn { from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }

        /* Mobile Performance Optimizations */
        @media (max-width: 768px) {
            .scada-card, .status-filter-card { backdrop-filter: none !important; background: #0f172a !important; box-shadow: none !important; }
            .tank-water-wave { display: none !important; animation: none !important; }
            .tank-vessel { box-shadow: none !important; border-width: 1px !important; }
            .tank-vessel::after { display: none !important; }
            .tank-fill { transition: none !important; }
            .stream-pulse { display: none !important; }
            .filter-tile { box-shadow: none !important; }
            .tank-unit-wrapper { padding: 4px !important; }
            .industrial-valve-node { transform: translateY(-50%) rotate(90deg) scale(0.8); right: -20px; }
        }
      `}} />

      <Modal show={showValveModal} onHide={() => setShowValveModal(false)} centered size="lg" contentClassName="bg-transparent border-0 shadow-2xl custom-modal-wide">
        {selectedTank && (
          <Modal.Body className="p-0 text-white overflow-hidden rounded-5" style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Modal Header Bar */}
            <div className="p-4 text-center border-bottom border-white border-opacity-10" style={{ background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.05) 0%, transparent 100%)' }}>
              <Badge bg="info" className="bg-opacity-10 text-info px-3 py-1 mb-2 border border-info border-opacity-25 rounded-pill">
                <div className="d-flex align-items-center gap-2 fs-12 fw-black tracking-widest uppercase">
                  <Activity size={10} className="pulse-icon" /> Operational Control
                </div>
              </Badge>
              <h3 className="fw-black text-white mb-0 size-3 tracking-tighter" style={{ textShadow: '0 0 20px rgba(56, 189, 248, 0.3)' }}>
                {selectedTank.type === 'DOMESTIC' ? 'TOWER-D' : 'TOWER-F'}-{selectedTank.localId} <span className="text-info-scada">COMMAND</span>
              </h3>
            </div>
            <div className="p-4 px-5">
              {/* Mode Control Section */}
              <div className="d-flex justify-content-between align-items-center p-3 rounded-4 position-relative overflow-hidden mb-3"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="position-absolute top-0 start-0 h-100 w-1 bg-info bg-opacity-50"></div>
                <div>
                  <div className="fw-black fs-10 tracking-widest text-secondary uppercase">Control Strategy</div>
                  <div className="text-white fw-bold fs-6">AUTO / MANUAL OVERRIDE</div>
                </div>
                <div className="d-flex align-items-center gap-1 bg-dark bg-opacity-80 p-1 rounded-pill border border-white border-opacity-10 shadow-inner">
                  {['AUTO', 'MANUAL', 'BYPASS'].map(mode => (
                    <div
                      key={mode}
                      onClick={() => updateTankValve(selectedTank.globalId, { valveMode: mode })}
                      className={`px-4 py-2 rounded-pill fw-black tracking-widest transition-all cursor-pointer ${selectedTank.valveMode === mode
                          ? 'bg-info text-white shadow-lg scale-105'
                          : 'text-secondary opacity-40 hover-opacity-100 hover-white'
                        }`}
                      style={{ fontSize: '11px', letterSpacing: '1px', cursor: 'pointer' }}
                    >
                      {mode}
                    </div>
                  ))}
                </div>
              </div>

              {/* Thresholds Section - Only visible in AUTO */}
              {selectedTank.valveMode === 'AUTO' && (
                <Row className="g-3 mb-3">
                  <Col md={6}>
                    <div className="p-3 rounded-4 bg-black bg-opacity-40 border border-white border-opacity-5 hover-glow transition-all">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="p-1 px-2 rounded bg-info bg-opacity-10 text-info border border-info border-opacity-20"><ArrowDown size={12} /></div>
                        <Form.Label className="fs-11 text-secondary fw-black tracking-widest mb-0 uppercase">Lower Limit</Form.Label>
                      </div>
                      <div className="d-flex align-items-center gap-3 bg-dark border border-white border-opacity-10 rounded-3 p-1 px-3">
                        <Form.Control
                          type="number"
                          value={selectedTank.minLevel}
                          onChange={(e) => updateTankValve(selectedTank.globalId, { minLevel: parseInt(e.target.value) })}
                          className="bg-transparent border-0 text-white fw-black fs-4 p-0 shadow-none w-100"
                        />
                        <span className="text-info fw-black fs-5">%</span>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="p-3 rounded-4 bg-black bg-opacity-40 border border-white border-opacity-5 hover-glow transition-all">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <div className="p-1 px-2 rounded bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20"><ArrowUp size={12} /></div>
                        <Form.Label className="fs-11 text-secondary fw-black tracking-widest mb-0 uppercase">Upper Limit</Form.Label>
                      </div>
                      <div className="d-flex align-items-center gap-3 bg-dark border border-white border-opacity-10 rounded-3 p-1 px-3">
                        <Form.Control
                          type="number"
                          value={selectedTank.maxLevel}
                          onChange={(e) => updateTankValve(selectedTank.globalId, { maxLevel: parseInt(e.target.value) })}
                          className="bg-transparent border-0 text-white fw-black fs-4 p-0 shadow-none w-100"
                        />
                        <span className="text-danger fw-black fs-5">%</span>
                      </div>
                    </div>
                  </Col>
                </Row>
              )}

              {/* Action Section */}
              <div className="mb-2">
                {selectedTank.valveMode === 'AUTO' ? (
                  <>
                    <Form.Label className="fs-11 text-secondary fw-black tracking-widest mb-3 uppercase">Automation Settings Control</Form.Label>
                    <Button
                      variant="info"
                      className="w-100 py-3 rounded-4 fw-black tracking-widest d-flex align-items-center justify-content-center gap-3 shadow-lg border-0"
                      style={{ background: 'linear-gradient(45deg, #0ea5e9, #2563eb)', transition: 'all 0.3s ease' }}
                      onClick={() => handleSendRuleToEngine('BOTH')}
                      disabled={isSendingRules}
                    >
                      {isSendingRules ? (
                        <Spinner size="sm" animation="border" />
                      ) : (
                        <Zap size={18} className="pulse-icon" />
                      )}
                      {isSendingRules ? 'SYNCHRONIZING...' : 'APPLY LIMIT SETTINGS'}
                    </Button>
                  </>
                ) : selectedTank.valveMode === 'MANUAL' ? (
                  <>
                    <Form.Label className="fs-11 text-secondary fw-black tracking-widest mb-2 uppercase">Supply OverrideWater Levels</Form.Label>
                    <Row className="g-3">
                      <Col xs={6}>
                        <button
                          className="premium-action-btn open w-100"
                          style={{ padding: '12px' }}
                          disabled={isSendingCommand}
                          onClick={() => updateTankValve(selectedTank.globalId, { valveStatus: 'OPEN' })}>
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            {isSendingCommand && selectedTank.valveStatus !== 'OPEN' ? <Spinner size="sm" animation="border" /> : <Droplets size={16} />}
                            <div>
                              <div className="btn-label">{isSendingCommand && selectedTank.valveStatus !== 'OPEN' ? 'SENDING...' : 'OPEN SUPPLY'}</div>
                            </div>
                          </div>
                        </button>
                      </Col>
                      <Col xs={6}>
                        <button
                          className="premium-action-btn close w-100"
                          style={{ padding: '12px' }}
                          disabled={isSendingCommand}
                          onClick={() => updateTankValve(selectedTank.globalId, { valveStatus: 'CLOSE' })}>
                          <div className="d-flex align-items-center justify-content-center gap-2">
                            {isSendingCommand && selectedTank.valveStatus !== 'CLOSE' ? <Spinner size="sm" animation="border" /> : <X size={16} />}
                            <div>
                              <div className="btn-label">{isSendingCommand && selectedTank.valveStatus !== 'CLOSE' ? 'SENDING...' : 'CLOSE SUPPLY'}</div>
                            </div>
                          </div>
                        </button>
                      </Col>
                    </Row>
                  </>
                ) : (
                  <div className="text-center p-3 rounded-4 position-relative overflow-hidden"
                    style={{
                      background: 'rgba(251, 191, 36, 0.05)',
                      border: '1px solid rgba(251, 191, 36, 0.2)'
                    }}>
                    <div className="position-absolute top-0 start-0 w-100 h-1 bg-warning opacity-30"></div>
                    <div className="d-flex align-items-center justify-content-center gap-3">
                      <ShieldCheck size={24} className="text-warning opacity-80" />
                      <div className="text-start">
                        <h4 className="fw-black text-warning tracking-widest mb-0" style={{ textTransform: 'uppercase', fontSize: '13px' }}>
                          System Bypass Active
                        </h4>
                        <div className="text-secondary fs-10 fw-bold opacity-60 uppercase tracking-tighter">
                          Automation & Manual Controls Suspended
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-top border-white border-opacity-5 text-center bg-black bg-opacity-20 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2 text-muted fs-12 fw-bold tracking-widest">
                <ShieldCheck size={14} className="text-success" /> BMS VERIFIED LINK
              </div>
              <Button variant="link" className="text-secondary fs-12 fw-black text-decoration-none hover-white transition-all uppercase tracking-widest" onClick={() => setShowValveModal(false)}>
                Dismiss Panel
              </Button>
            </div>

            {actionFeedback && (
              <div className="action-success-overlay position-absolute top-50 start-50 translate-middle w-75 p-4 rounded-4 shadow-2xl text-center border-2 border-white d-flex flex-column align-items-center gap-2"
                style={{
                  backgroundColor: actionFeedback.includes('DENIED') || actionFeedback.includes('NOT APPLIED') || actionFeedback.includes('DEVICE OFFLINE') ? '#7f1d1d' : '#064e3b',
                  zIndex: 1000,
                  boxShadow: actionFeedback.includes('DENIED') || actionFeedback.includes('NOT APPLIED') || actionFeedback.includes('DEVICE OFFLINE') ? '0 0 40px rgba(239, 68, 68, 0.4)' : '0 0 40px rgba(6, 78, 59, 0.4)'
                }}>
                <div className="bg-white rounded-circle p-2 mb-2">
                  {actionFeedback.includes('DENIED') || actionFeedback.includes('NOT APPLIED') || actionFeedback.includes('DEVICE OFFLINE') ? <XCircle size={40} className="text-danger" /> : <ShieldCheck size={40} style={{ color: '#059669' }} />}
                </div>
                <h4 className="text-white fw-black mb-0 letter-spacing-2">{actionFeedback}</h4>
                <small className="text-white opacity-90 fw-bold">{actionFeedback.includes('DENIED') || actionFeedback.includes('NOT APPLIED') || actionFeedback.includes('DEVICE OFFLINE') ? 'SECURITY PROTOCOL ACTIVE' : 'VALVE OPERATION VERIFIED'}</small>
              </div>
            )}

            <div className="mt-4 pt-3 border-top border-secondary border-opacity-10 text-center">
              <Button variant="link" className="text-secondary fs-10 text-decoration-none" onClick={() => setShowValveModal(false)}>DISMISS CONTROLS</Button>
            </div>
          </Modal.Body>
        )}
      </Modal>

      <Modal show={showConfig} onHide={() => setShowConfig(false)} centered contentClassName="bg-dark border-secondary">
        <Modal.Header closeButton className="border-secondary text-white"><Modal.Title className="fs-6">Sector Calibration</Modal.Title></Modal.Header>
        <Modal.Body className="text-white p-3">
          <Form.Label className="fs-9 text-muted d-flex justify-content-between mb-3">DOMESTIC TANK COUNT <span>{tempDomesticCount} / 48</span></Form.Label>
          <Form.Range min={0} max={48} value={tempDomesticCount} onChange={(e) => setTempDomesticCount(parseInt(e.target.value))} />
          <Button variant="info" size="sm" className="w-100 mt-4 fw-bold" onClick={() => { setDomesticCount(tempDomesticCount); setShowConfig(false); }}>CALIBRATE SECTORS</Button>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AgTank;
