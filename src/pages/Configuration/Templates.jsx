import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Row, Col, Card, Form, Button, Badge, Modal } from 'react-bootstrap';
import { Save, Settings, Database, Activity, Zap, Droplets, LayoutGrid, CheckCircle2, ChevronRight, Layers, History, Eye, Info, X, Home, ArrowDownCircle, ArrowUpCircle, MapPin, AlertTriangle, Wind, Thermometer } from 'lucide-react';
import { loginToSochiot, getSochiotUserMe, getSochiotLocationData, getSochiotDeviceDetails, getSochiotZoneData } from '../../services/authService';

const ConfigTemplates = () => {
  const [selectedCategory, setSelectedCategory] = useState('Water Management');
  const [selectedModule, setSelectedModule] = useState('AG Tank');
  const [savedTemplates, setSavedTemplates] = useState(() => {
    const saved = localStorage.getItem('scada_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [viewMode, setViewMode] = useState('FORM'); // 'FORM' or 'LIST'
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [globalLocation, setGlobalLocation] = useState(() => {
    const saved = localStorage.getItem('global_hierarchy_selection');
    return saved ? JSON.parse(saved) : { organization: '', client: '', zone: '', subZone: '', building: '' };
  });

  // Persist Global Location to localStorage
  useEffect(() => {
    localStorage.setItem('global_hierarchy_selection', JSON.stringify(globalLocation));
  }, [globalLocation]);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showRuleEngineModal, setShowRuleEngineModal] = useState(false);
  const initialRuleState = {
    moduleId: '',
    condition: {
      isScheduleEnabled: false,
      timeDate: '',
      repeatDays: [],
      type: 'MODBUS',
      modbus: '',
      comparisonType: 'LESS_THAN',
      comparisonValue: ''
    },
    consequence: {
      type: 'OUTPUT_2',
      modbus: '',
      value: ''
    }
  };
  const [agRule1Config, setAgRule1Config] = useState(initialRuleState);
  const [agRule2Config, setAgRule2Config] = useState(initialRuleState);
  const [ugRule1Config, setUgRule1Config] = useState(initialRuleState);
  const [ugRule2Config, setUgRule2Config] = useState(initialRuleState);
  const [currentRuleTarget, setCurrentRuleTarget] = useState('RULE1'); // 'RULE1' or 'RULE2'
  const [ruleEngineConfig, setRuleEngineConfig] = useState(initialRuleState);
  const [templateName, setTemplateName] = useState('');
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [gatewayUuidInput, setGatewayUuidInput] = useState('');
  const [filterModule, setFilterModule] = useState('ALL');
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [hierarchyData, setHierarchyData] = useState([]);
  const [isSendingRules, setIsSendingRules] = useState(false);

  const handleSendRule = async (config) => {
    if (!config || !config.moduleId) {
      setToastMessage({ type: 'error', text: "Module ID not detected for Rule Engine. Please configure mapping first." });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsSendingRules(true);
    try {
      const apiURL = '/api/rule-engine/apply';
      const payload = {
        moduleId: config.moduleId,
        settingFields: [
          { fieldName: "condition_date_time", currentValue: config.condition.timeDate || "" },
          { fieldName: "condition_date_time_repeat_days", currentValue: config.condition.repeatDays.join(',') },
          { fieldName: "consequence_value", currentValue: config.consequence.value || "" },
          { fieldName: "condition_type", currentValue: config.condition.type || "" },
          { fieldName: "condition_modbus", currentValue: config.condition.modbus || "" },
          { fieldName: "comparison_type", currentValue: config.condition.comparisonType || "" },
          { fieldName: "comparison_value", currentValue: config.condition.comparisonValue || "" },
          { fieldName: "consequence_type", currentValue: config.consequence.type || "" },
          { fieldName: "consequence_modbus", currentValue: config.consequence.modbus || "" }
        ]
      };

      const token = localStorage.getItem('sochiot_token');
      const response = await fetch(apiURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send rules');

      setToastMessage({ type: 'success', text: "Rules Applied Successfully!" });
      setTimeout(() => setToastMessage(null), 3000);
      return true;
    } catch (error) {
      console.error('Error sending rules:', error);
      setToastMessage({ type: 'error', text: "Failed to send rules. Please check connection." });
      setTimeout(() => setToastMessage(null), 3000);
      return false;
    } finally {
      setIsSendingRules(false);
    }
  };

  const handleApplyRules = async () => {
    // Save to target rule config based on current module
    if (selectedModule === 'AG Tank') {
      if (currentRuleTarget === 'RULE1') setAgRule1Config(ruleEngineConfig);
      else setAgRule2Config(ruleEngineConfig);
    } else if (selectedModule === 'UG Pump') {
      if (currentRuleTarget === 'RULE1') setUgRule1Config(ruleEngineConfig);
      else setUgRule2Config(ruleEngineConfig);
    }

    const success = await handleSendRule(ruleEngineConfig);
    if (success) {
      setShowRuleEngineModal(false);
    }
  };

  // Default config object for initialization and resets
  const createDefaultConfig = (withMode = false) => {
    const base = {
      organization: '',
      client: '',
      zone: '',
      subZone: '',
      building: '',
      device: '',
      module: '',
      field: '',
      operator: '=',
      value: '10',
      enabled: true
    };
    return withMode ? { ...base, mode: 'read' } : base;
  };

  // States for Mapping Fields
  const [agLowerConfig, setAgLowerConfig] = useState(createDefaultConfig(true));
  const [agUpperConfig, setAgUpperConfig] = useState(createDefaultConfig(true));
  const [agAutoConfig, setAgAutoConfig] = useState(createDefaultConfig());
  const [agManualConfig, setAgManualConfig] = useState(createDefaultConfig());
  const [agBypassConfig, setAgBypassConfig] = useState(createDefaultConfig());
  const [agLevelConfig, setAgLevelConfig] = useState(createDefaultConfig());
  const [agOpenConfig, setAgOpenConfig] = useState(createDefaultConfig());
  const [agCloseConfig, setAgCloseConfig] = useState(createDefaultConfig());
  const [agStatusStartConfig, setAgStatusStartConfig] = useState(createDefaultConfig());
  const [agStatusStopConfig, setAgStatusStopConfig] = useState(createDefaultConfig());
  const [agAmpsConfig, setAgAmpsConfig] = useState(createDefaultConfig());
  const [agTankRange, setAgTankRange] = useState({ domStart: '', domEnd: '', flushStart: '', flushEnd: '' });
  const [agTankType, setAgTankType] = useState('DOMESTIC'); // 'DOMESTIC' or 'FLUSHING'
  const [agMasterEnabled, setAgMasterEnabled] = useState(true);
  const [ugLowerConfig, setUgLowerConfig] = useState(createDefaultConfig(true));
  const [ugUpperConfig, setUgUpperConfig] = useState(createDefaultConfig(true));
  const [ugAutoConfig, setUgAutoConfig] = useState(createDefaultConfig());
  const [ugManualConfig, setUgManualConfig] = useState(createDefaultConfig());
  const [ugStartCmdConfig, setUgStartCmdConfig] = useState(createDefaultConfig());
  const [ugStopCmdConfig, setUgStopCmdConfig] = useState(createDefaultConfig());
  const [ugStartPressConfig, setUgStartPressConfig] = useState(createDefaultConfig());
  const [ugStopPressConfig, setUgStopPressConfig] = useState(createDefaultConfig());
  const [ugLocalModeConfig, setUgLocalModeConfig] = useState(createDefaultConfig());
  const [ugRemoteModeConfig, setUgRemoteModeConfig] = useState(createDefaultConfig());
  const [ugStatusStartConfig, setUgStatusStartConfig] = useState(createDefaultConfig());
  const [ugStatusStopConfig, setUgStatusStopConfig] = useState(createDefaultConfig());
  const [ugPumpRange, setUgPumpRange] = useState({ name: '', id: '' });
  const [ugTankLevelConfig, setUgTankLevelConfig] = useState(createDefaultConfig());
  const [ugTankRange, setUgTankRange] = useState({ name: '', id: '' });
  const [ugAmpsConfig, setUgAmpsConfig] = useState(createDefaultConfig());
  const [pressureConfig, setPressureConfig] = useState(createDefaultConfig());
  const [elecVoltageConfig, setElecVoltageConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ry: '', yb: '', br: '', enabled: true });
  const [elecCurrentConfig, setElecCurrentConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', r: '', y: '', b: '', enabled: true });
  const [elecSystemConfig, setElecSystemConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', load: '', enabled: true });
  const [elecConsumptionConfig, setElecConsumptionConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', kva: '', kwh: '', kvah: '', enabled: true });

  const [dgEngineConfig, setDgEngineConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', coolant: '', oilPress: '', speed: '', runtime: '', battery: '', freq: '', enabled: true });
  const [dgPowerConfig, setDgPowerConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vL1L2: '', iL1: '', iL2: '', iL3: '', loadKW: '', appKVA: '', pf: '', kwh: '', enabled: true });
  const [dgFuelConfig, setDgFuelConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', level: '', enabled: true });
  const [dgFaultConfig, setDgFaultConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', emergencyStop: '', emergencyStop_warn: '', emergencyStop_alarm: '', emergencyStop_healthy: '', masterTrip: '', masterTrip_warn: '', masterTrip_alarm: '', masterTrip_healthy: '', overVoltage: '', overVoltage_warn: '', overVoltage_alarm: '', overVoltage_healthy: '', underVoltage: '', underVoltage_warn: '', underVoltage_alarm: '', underVoltage_healthy: '', overFrequency: '', overFrequency_warn: '', overFrequency_alarm: '', overFrequency_healthy: '', underFrequency: '', underFrequency_warn: '', underFrequency_alarm: '', underFrequency_healthy: '', lowOilLevel: '', lowOilLevel_warn: '', lowOilLevel_alarm: '', lowOilLevel_healthy: '', overTemp: '', overTemp_warn: '', overTemp_alarm: '', overTemp_healthy: '', enabled: true });

  const [emVoltageConfig, setEmVoltageConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vR: '', vY: '', vB: '', enabled: true });
  const [emCurrentConfig, setEmCurrentConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', iR: '', iY: '', iB: '', enabled: true });
  const [emPowerConfig, setEmPowerConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', activePower: '', reactivePower: '', apparentPower: '', enabled: true });
  const [emSystemConfig, setEmSystemConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', commStatus: '', enabled: true });
  const [emConsumptionConfig, setEmConsumptionConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', cumulativekWh: '', enabled: true });
  const [emChangeConfig, setEmChangeConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ebKvah: '', ebKwh: '', balance: '', totalKw: '', vR: '', vY: '', vB: '', iR: '', iY: '', iB: '', pf: '', totalKva: '', dgKwh: '', vLLAvg: '', vLNAvg: '', iAvg: '', kvaAvg: '', kvarAvg: '', pfAvg: '', vRY: '', vYB: '', vBR: '', pfR: '', pfY: '', pfB: '', loadHrs: '', loadMin: '', noLoadHrs: '', noLoadMin: '', loadPct: '', enabled: true });
  const [emWarningConfig, setEmWarningConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', lowBalanceCut: '', overloadTrip: '', overloadLimitReached: '', connectedStatus: '', forceOff: '', enabled: true });
  const [emReadConfig, setEmReadConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', meterSrno: '', noOfOverloadCheck: '', ebDgStatus: '', ebTariff: '', dgTariff: '', ebRLoadSet: '', ebYLoadSet: '', ebBLoadSet: '', dgRLoadSet: '', dgYLoadSet: '', dgBLoadSet: '', enabled: true });
  const [emLimitsConfig, setEmLimitsConfig] = useState({
    vR: { low: '', normalMin: '', normalMax: '', high: '' },
    vY: { low: '', normalMin: '', normalMax: '', high: '' },
    vB: { low: '', normalMin: '', normalMax: '', high: '' },
    iR: { low: '', normalMin: '', normalMax: '', high: '' },
    iY: { low: '', normalMin: '', normalMax: '', high: '' },
    iB: { low: '', normalMin: '', normalMax: '', high: '' },
    totalKw: { low: '', normalMin: '', normalMax: '', high: '' },
    totalKva: { low: '', normalMin: '', normalMax: '', high: '' }
  });
  const [energyMeteringTarget, setEnergyMeteringTarget] = useState('');
  const [subMeterCategory, setSubMeterCategory] = useState('');
  const [vrvConfig, setVrvConfig] = useState({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vrvZone: '', temperature: '', humidity: '', co2: '', tvoc: '', aqi: '', targetTemp: '', enabled: true });

  const [selectedUgPumpNo, setSelectedUgPumpNo] = useState(1);
  const [pressureTarget, setPressureTarget] = useState('');
  const [electricalTarget, setElectricalTarget] = useState('');
  const [ugConfig, setUgConfig] = useState({
    integration: {
      'LEVEL MONITORING': true,
      'PUMP STATUS': true,
      'AUTO LOGIC': true,
      'MANUAL CONTROL': true,
      'START COMMAND': true,
      'STOP COMMAND': true,
      'PRESSURE SENSOR': true
    },
    electrical: {
      'PHASE VOLTAGE': true,
      'PHASE CURRENT': true,
      'POWER FACTOR': true,
      'FREQUENCY': true,
      'KW LOAD': true,
      'KVAH UNIT': true
    },
    stationMode: 'REMOTE'
  });

  // Individual Tank data (24 Domestic, 24 Flushing) with TOWER naming
  const domesticTowers = Array.from({ length: 24 }, (_, i) => ({
    name: `TOWER-D-${i + 1}`,
    id: `D-${String(i + 1).padStart(2, '0')}`
  }));

  const flushingTowers = Array.from({ length: 24 }, (_, i) => ({
    name: `TOWER-F-${i + 1}`,
    id: `F-${String(i + 1).padStart(2, '0')}`
  }));

  const ugPumpsList = [
    { name: 'FIRE RESERVOIR', id: 'UG-FIRE-01' },
    { name: 'DOMESTIC SUMP', id: 'UG-DOM-01' },
    { name: 'PROCESS TANK', id: 'UG-PROC-01' }
  ];

  const pressureSensorsList = [
    { name: 'INLET PRESSURE', id: 'PT-01' },
    { name: 'OUTLET PRESSURE', id: 'PT-02' },
    { name: 'PUMP 01 PRESSURE', id: 'PT-P1' },
    { name: 'PUMP 02 PRESSURE', id: 'PT-P2' }
  ];

  const electricalMetersList = [
    { name: 'MAIN PANEL METER', id: 'EM-01' },
    { name: 'PUMP 01 METER', id: 'EM-P1' },
    { name: 'PUMP 02 METER', id: 'EM-P2' }
  ];

  const energyMetersList = [
    { name: 'MAIN GRID INCOMER METER', id: 'EM-MAIN' },
    { name: 'COMMERCIAL WING A INCOMER', id: 'SM-WING-A-01' },
    { name: 'DATA CENTER MAIN UPS INPUT', id: 'SM-SERVER-02' },
    { name: 'WATER PLANT & UTILITY MOTORS ROOM', id: 'SM-UTILITY-03' },
    { name: 'VRV CHILLER MAIN FEEDER', id: 'SM-VRV-04' },
    { name: 'OUTDOOR STREET & PARKING LIGHTS', id: 'SM-LIGHT-05' }
  ];

  const isHierarchyUnlocked = useMemo(() => {
    return !!(globalLocation.organization || globalLocation.client || globalLocation.zone || globalLocation.subZone || globalLocation.building);
  }, [globalLocation]);

  const usedModules = useMemo(() => {
    if (selectedModule === 'AG Tank') {
      return [
        agLowerConfig.module, agUpperConfig.module, agAutoConfig.module,
        agManualConfig.module, agBypassConfig.module, agLevelConfig.module,
        agOpenConfig.module, agCloseConfig.module
      ].filter(m => m);
    }
    if (selectedModule === 'UG Pump') {
      return [
        ugLowerConfig.module, ugUpperConfig.module, ugAutoConfig.module,
        ugManualConfig.module, ugStartCmdConfig.module, ugStopCmdConfig.module,
        ugStartPressConfig.module, ugStopPressConfig.module,
        ugLocalModeConfig.module, ugRemoteModeConfig.module
      ].filter(m => m);
    }
    if (selectedModule === 'UG Tank') {
      return [ugTankLevelConfig.module].filter(m => m);
    }
    if (selectedModule === 'Pressure') {
      return [pressureConfig.module].filter(m => m);
    }
    if (selectedModule && selectedModule.startsWith('DG Set')) {
      return [dgEngineConfig.module, dgPowerConfig.module, dgFuelConfig.module, dgFaultConfig.module].filter(m => m);
    }
    if (selectedCategory === 'Energy Metering' || selectedModule === 'Main Meter' || selectedModule === 'Sub Meters') {
      return [
        emVoltageConfig.module, emCurrentConfig.module, emPowerConfig.module, emSystemConfig.module, emConsumptionConfig.module,
        emChangeConfig.module, emWarningConfig.module, emReadConfig.module
      ].filter(m => m);
    }
    return [];
  }, [
    selectedModule,
    selectedCategory,
    agLowerConfig.module, agUpperConfig.module, agAutoConfig.module,
    agManualConfig.module, agBypassConfig.module, agLevelConfig.module,
    agOpenConfig.module, agCloseConfig.module,
    ugLowerConfig.module, ugUpperConfig.module, ugAutoConfig.module,
    ugManualConfig.module, ugStartCmdConfig.module, ugStopCmdConfig.module,
    ugStartPressConfig.module, ugStopPressConfig.module,
    ugLocalModeConfig.module, ugRemoteModeConfig.module,
    ugTankLevelConfig.module, pressureConfig.module,
    dgEngineConfig.module, dgPowerConfig.module, dgFuelConfig.module, dgFaultConfig.module,
    emVoltageConfig.module, emCurrentConfig.module, emPowerConfig.module, emSystemConfig.module, emConsumptionConfig.module,
    emChangeConfig.module, emWarningConfig.module, emReadConfig.module
  ]);

  const handleUgPumpNoChange = (no) => {
    setSelectedUgPumpNo(no);
    setTemplateName('');

    // Find if a template already exists for this specific pump number
    const existing = savedTemplates.find(t =>
      t.module === 'UG Pump' &&
      t.mapping.ugPumpRange &&
      t.mapping.ugPumpRange.pumpNo === no
    );

    if (existing) {
      setUgLowerConfig(existing.mapping.ugLowerConfig || createDefaultConfig(true));
      setUgUpperConfig(existing.mapping.ugUpperConfig || createDefaultConfig(true));
      setUgAutoConfig(existing.mapping.ugAutoConfig || createDefaultConfig());
      setUgManualConfig(existing.mapping.ugManualConfig || createDefaultConfig());
      setUgStartCmdConfig(existing.mapping.ugStartCmdConfig || createDefaultConfig());
      setUgStopCmdConfig(existing.mapping.ugStopCmdConfig || createDefaultConfig());
      setUgStartPressConfig(existing.mapping.ugStartPressConfig || createDefaultConfig());
      setUgStopPressConfig(existing.mapping.ugStopPressConfig || createDefaultConfig());
      setUgLocalModeConfig(existing.mapping.ugLocalModeConfig || createDefaultConfig());
      setUgRemoteModeConfig(existing.mapping.ugRemoteModeConfig || createDefaultConfig());
      setUgStatusStartConfig(existing.mapping.ugStatusStartConfig || createDefaultConfig());
      setUgStatusStopConfig(existing.mapping.ugStatusStopConfig || createDefaultConfig());
      setUgAmpsConfig(existing.mapping.ugAmpsConfig || createDefaultConfig());
      setUgRule1Config(existing.mapping.rule1Config || existing.mapping.ruleEngineConfig || initialRuleState);
      setUgRule2Config(existing.mapping.rule2Config || existing.mapping.ruleEngineConfig || initialRuleState);

      // Restore Hierarchy
      const restoredLoc = existing.mapping.globalHierarchy || (existing.mapping.ugLowerConfig?.building ? {
        organization: existing.mapping.ugLowerConfig.organization || '',
        client: existing.mapping.ugLowerConfig.client || '',
        zone: existing.mapping.ugLowerConfig.zone || '',
        subZone: existing.mapping.ugLowerConfig.subZone || '',
        building: existing.mapping.ugLowerConfig.building || ''
      } : null);

      if (restoredLoc) setGlobalLocation(restoredLoc);
    } else {
      // Clear for a new pump if no template exists
      setUgLowerConfig(createDefaultConfig(true));
      setUgUpperConfig(createDefaultConfig(true));
      setUgAutoConfig(createDefaultConfig());
      setUgManualConfig(createDefaultConfig());
      setUgStartCmdConfig(createDefaultConfig());
      setUgStopCmdConfig(createDefaultConfig());
      setUgStartPressConfig(createDefaultConfig());
      setUgStopPressConfig(createDefaultConfig());
      setUgLocalModeConfig(createDefaultConfig());
      setUgRemoteModeConfig(createDefaultConfig());
      setUgStatusStartConfig(createDefaultConfig());
      setUgStatusStopConfig(createDefaultConfig());
      setUgAmpsConfig(createDefaultConfig());
      setUgRule1Config(initialRuleState);
      setUgRule2Config(initialRuleState);
    }
  };

  const handlePressureTargetChange = (name) => {
    setPressureTarget(name);
    setTemplateName('');

    const existing = savedTemplates.find(t =>
      t.module === 'Pressure' &&
      t.mapping.pressureTarget === name
    );

    if (existing) {
      setPressureConfig(existing.mapping.pressureConfig || createDefaultConfig());
      const restoredLoc = existing.mapping.globalHierarchy || (existing.mapping.pressureConfig?.building ? {
        organization: existing.mapping.pressureConfig.organization || '',
        client: existing.mapping.pressureConfig.client || '',
        zone: existing.mapping.pressureConfig.zone || '',
        subZone: existing.mapping.pressureConfig.subZone || '',
        building: existing.mapping.pressureConfig.building || ''
      } : null);
      if (restoredLoc) setGlobalLocation(restoredLoc);
    } else {
      setPressureConfig(createDefaultConfig());
    }
  };

  const handleElectricalTargetChange = (name) => {
    setElectricalTarget(name);
    setTemplateName('');

    const existing = savedTemplates.find(t =>
      t.module === 'Electrical Parameter' &&
      t.mapping.electricalTarget === name
    );

    if (existing) {
      setElecVoltageConfig(existing.mapping.elecVoltageConfig || createDefaultConfig());
      setElecCurrentConfig(existing.mapping.elecCurrentConfig || createDefaultConfig());
      setElecSystemConfig(existing.mapping.elecSystemConfig || createDefaultConfig());
      setElecConsumptionConfig(existing.mapping.elecConsumptionConfig || createDefaultConfig());

      const restoredLoc = existing.mapping.globalHierarchy || (existing.mapping.elecVoltageConfig?.building ? {
        organization: existing.mapping.elecVoltageConfig.organization || '',
        client: existing.mapping.elecVoltageConfig.client || '',
        zone: existing.mapping.elecVoltageConfig.zone || '',
        subZone: existing.mapping.elecVoltageConfig.subZone || '',
        building: existing.mapping.elecVoltageConfig.building || ''
      } : null);
      if (restoredLoc) setGlobalLocation(restoredLoc);
    } else {
      setElecVoltageConfig(createDefaultConfig());
      setElecCurrentConfig(createDefaultConfig());
      setElecSystemConfig(createDefaultConfig());
      setElecConsumptionConfig(createDefaultConfig());
    }
  };

  const handleUgPumpChange = (name) => {
    setTemplateName('');
    const tank = ugPumpsList.find(t => t.name === name);
    if (tank) {
      setUgPumpRange({ name: tank.name, id: tank.id });
    } else {
      setUgPumpRange({ name: '', id: '' });
    }
  };

  const handleUgTankChange = (name) => {
    setTemplateName('');
    const tank = ugPumpsList.find(t => t.name === name);
    if (tank) {
      const existing = savedTemplates.find(t =>
        t.module === 'UG Tank' &&
        t.mapping.ugTankRange &&
        t.mapping.ugTankRange.name === name
      );

      if (existing) {
        setUgTankLevelConfig(existing.mapping.ugTankLevelConfig || createDefaultConfig());
        const restoredLoc = existing.mapping.globalHierarchy || (existing.mapping.ugTankLevelConfig?.building ? {
          organization: existing.mapping.ugTankLevelConfig.organization || '',
          client: existing.mapping.ugTankLevelConfig.client || '',
          zone: existing.mapping.ugTankLevelConfig.zone || '',
          subZone: existing.mapping.ugTankLevelConfig.subZone || '',
          building: existing.mapping.ugTankLevelConfig.building || ''
        } : null);
        if (restoredLoc) setGlobalLocation(restoredLoc);
      } else {
        setUgTankLevelConfig(createDefaultConfig());
      }
      setUgTankRange({ name: tank.name, id: tank.id });
    } else {
      setUgTankRange({ name: '', id: '' });
    }
  };

  const [locationIdMap, setLocationIdMap] = useState({});
  const [zoneIdMap, setZoneIdMap] = useState({});
  const [locationDetails, setLocationDetails] = useState({}); // { locationName: { deviceList: [{label, id}] } }
  const [deviceDetails, setDeviceDetails] = useState({}); // { deviceId: { modules: { name: [fields] } } }
  const [dynamicOptions, setDynamicOptions] = useState({
    locations: ['Basement 1', 'Basement 2', 'Rooftop Sector A', 'Rooftop Sector B'],
    devices: ['Gateway-01', 'Gateway-02', 'PLC-Main', 'Controller-X'],
    modules: ['Modbus-RTU-1', 'BACnet-IP-1', 'Digital-IO'],
    fields: ['Valve_Status', 'Level_Sensor', 'Pump_State', 'Pressure_Reading', 'Motor_Current']
  });

  // Fetch Dynamic Data from Sochiot API
  useEffect(() => {
    const initDynamicData = async () => {
      try {
        // Try to get user data (if token exists)
        let userData = await getSochiotUserMe();

        // If no data/token, perform dummy login as requested
        if (!userData) {
          await loginToSochiot("sa@ismartaccess.com", "I0t3ch");
          userData = await getSochiotUserMe();
        }

        if (userData) {
          const companies = [];
          const clients = [];
          const zones = [];
          const locations = [];

          const lMap = {};
          const zMap = {};

          if (userData.userZoneLocationVO?.companyList) {
            const rawData = userData.userZoneLocationVO.companyList;

            const normalize = (list) => {
              return (list || []).map(org => ({
                name: org.name,
                id: org.id,
                clients: (org.consumers || org.customerVOS || org.clients || []).map(client => ({
                  name: client.name,
                  id: client.id,
                  zones: (client.zoneVOS || client.zones || []).map(zone => ({
                    name: zone.name,
                    id: zone.id,
                    subZones: (zone.subZoneVOS || zone.subZoneVos || zone.subZones || []).map(sz => ({
                      name: sz.name,
                      id: sz.id,
                      locations: (sz.locationVOS || sz.locationVos || sz.locations || []).map(loc => ({
                        name: loc.name,
                        id: loc.id,
                        type: loc.locationType
                      }))
                    })),
                    locations: (zone.locationVOS || zone.locationVos || zone.locations || []).map(loc => ({
                      name: loc.name,
                      id: loc.id,
                      type: loc.locationType
                    }))
                  }))
                }))
              }));
            };

            const normalized = normalize(rawData);
            setHierarchyData(normalized);

            normalized.forEach(comp => {
              companies.push(comp.name);
              (comp.clients || []).forEach(client => {
                clients.push(client.name);
                (client.zones || []).forEach(zone => {
                  const traverse = (z) => {
                    zones.push(z.name);
                    zMap[z.name] = z.id;
                    (z.locations || []).forEach(l => {
                      locations.push(l.name);
                      lMap[l.name] = l.id;
                    });
                    (z.subZones || []).forEach(traverse);
                  };
                  traverse(zone);
                });
              });
            });
          }

          setLocationIdMap(lMap);
          setZoneIdMap(zMap);
          setDynamicOptions({
            locations: locations.length > 0 ? [...new Set(locations)] : dynamicOptions.locations,
            devices: zones.length > 0 ? [...new Set(zones)] : dynamicOptions.devices,
            modules: clients.length > 0 ? [...new Set(clients)] : dynamicOptions.modules,
            fields: companies.length > 0 ? [...new Set(companies)] : dynamicOptions.fields
          });
        }
      } catch (error) {
        console.error('Failed to load dynamic Sochiot data:', error);
      }
    };

    initDynamicData();
  }, []);

  // Effect to auto-fetch details for restored hierarchy path
  useEffect(() => {
    if (hierarchyData.length > 0 && Object.keys(locationIdMap).length > 0) {
      const restoreHierarchyDetails = async () => {
        const { zone, subZone, building } = globalLocation;

        // 1. If zone is set, fetch its details
        if (zone && zoneIdMap[zone] && !hierarchyData.some(org => org.clients.some(c => c.zones.some(z => z.id === zoneIdMap[zone] && z.locations.length > 0)))) {
          await fetchZoneDetails(zone, zoneIdMap[zone]);
        }

        // 2. If building is set, fetch its details
        if (building && !locationDetails[building]) {
          await fetchLocationDetails(building);
        }

        // 3. If subZone is set (it might be a location too), fetch its details
        if (subZone && !locationDetails[subZone]) {
          await fetchLocationDetails(subZone);
        }
      };

      restoreHierarchyDetails();
    }
  }, [hierarchyData, locationIdMap, zoneIdMap]);

  // Rule Engine Auto-Popup Logic
  // Auto-open rule engine modal removed to allow manual configuration via shortcuts

  const fetchZoneDetails = async (zoneName, zoneId) => {
    if (!zoneId) return;
    try {
      const data = await getSochiotZoneData(zoneId);
      if (data?.locationVOS) {
        setHierarchyData(prev => {
          const next = JSON.parse(JSON.stringify(prev)); // Deep clone to ensure reactivity
          next.forEach(org => {
            (org.clients || []).forEach(client => {
              (client.zones || []).forEach(zone => {
                const updateNode = (node) => {
                  if (String(node.id) === String(zoneId) || node.name === zoneName) {
                    node.locations = data.locationVOS.map(loc => ({
                      name: loc.name,
                      id: loc.id,
                      type: loc.locationType
                    }));
                    if (data.locationVOS.length > 0) {
                      // Update global locations list for dynamic options
                      setDynamicOptions(prev => ({
                        ...prev,
                        locations: [...new Set([...prev.locations, ...data.locationVOS.map(l => l.name)])]
                      }));
                      // Update ID map
                      data.locationVOS.forEach(l => {
                        setLocationIdMap(prevMap => ({ ...prevMap, [l.name]: l.id }));
                      });
                    }
                  }
                  (node.subZones || []).forEach(updateNode);
                };
                updateNode(zone);
              });
            });
          });
          return next;
        });
      }
    } catch (e) {
      console.error("Failed to fetch zone details:", e);
    }
  };

  const fetchLocationDetails = async (locationName, providedId = null) => {
    if (locationDetails[locationName]) return;

    const locId = providedId || locationIdMap[locationName];
    if (!locId) return;

    try {
      const data = await getSochiotLocationData(locId);
      if (data?.locationVOS?.[0]) {
        const gateways = data.locationVOS[0].gatewayVOList || [];
        const deviceList = [];
        const gatewayList = gateways.map(g => ({ label: g.name, id: g.id }));

        gateways.forEach(g => {
          if (g.deviceEntityVOS) {
            g.deviceEntityVOS.forEach(d => {
              deviceList.push({
                label: `${g.name} / ${d.name}`,
                id: d.id,
                uuid: d.uuid,
                gatewayId: g.id
              });
            });
          }
        });

        setLocationDetails(prev => ({
          ...prev,
          [locationName]: { deviceList, gatewayList }
        }));
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
    }
  };

  // Effect to ensure details are fetched for all active configurations (especially during Edit/Autofill)
  useEffect(() => {
    const configsToWatch = [
      agLowerConfig, agUpperConfig, agAutoConfig, agManualConfig, agBypassConfig,
      agLevelConfig, agOpenConfig, agCloseConfig, agStatusStartConfig, agStatusStopConfig,
      ugLowerConfig, ugUpperConfig, ugAutoConfig, ugManualConfig,
      ugStartCmdConfig, ugStopCmdConfig, ugStatusStartConfig, ugStatusStopConfig,
      ugStartPressConfig, ugStopPressConfig, ugLocalModeConfig, ugRemoteModeConfig,
      ugTankLevelConfig, pressureConfig,
      elecVoltageConfig, elecCurrentConfig, elecSystemConfig, elecConsumptionConfig,
      dgEngineConfig, dgPowerConfig, dgFuelConfig, dgFaultConfig,
      emVoltageConfig, emCurrentConfig, emPowerConfig, emSystemConfig, emConsumptionConfig,
      emChangeConfig, emWarningConfig, emReadConfig
    ];

    configsToWatch.forEach(config => {
      if (config.building && !locationDetails[config.building]) {
        const locId = locationIdMap[config.building];
        if (locId) fetchLocationDetails(config.building, locId);
      }
      if (config.device && !deviceDetails[config.device]) {
        fetchDeviceDetails(config.device);
      }
    });
  }, [
    agLowerConfig, agUpperConfig, agAutoConfig, agManualConfig, agBypassConfig,
    agLevelConfig, agOpenConfig, agCloseConfig, agStatusStartConfig, agStatusStopConfig,
    ugLowerConfig, ugUpperConfig, ugAutoConfig, ugManualConfig,
    ugStartCmdConfig, ugStopCmdConfig, ugStatusStartConfig, ugStatusStopConfig,
    ugStartPressConfig, ugStopPressConfig, ugLocalModeConfig, ugRemoteModeConfig,
    ugTankLevelConfig, pressureConfig,
    elecVoltageConfig, elecCurrentConfig, elecSystemConfig, elecConsumptionConfig,
    locationIdMap, locationDetails, deviceDetails,
    emVoltageConfig, emCurrentConfig, emPowerConfig, emSystemConfig, emConsumptionConfig,
    emChangeConfig, emWarningConfig, emReadConfig,
    dgEngineConfig, dgPowerConfig, dgFuelConfig, dgFaultConfig
  ]);

  const PARAMETER_SYNONYMS = {
    ebKwh: ['3,151', '3,152', '4,91F', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
    ebKvah: ['3,152', '3,157', '4,93F', 'EB KVAH', 'EB_KVAH', 'APPARENT ENERGY'],
    balance: ['3,162', '3,168', 'BALANCE', 'PREPAID BALANCE', 'AMT', 'AMOUNT', 'CREDIT', 'PREPAID_BALANCE'],
    totalKw: ['3,190', '3,151', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER'],
    totalKva: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER'],
    vR: ['3,168', '3,163', 'VOLTAGE R', 'VOLTAGE_R', 'VR', 'V_R', 'UA', 'U1', 'LINE VOLTS (R)', 'VOLTAGE R-PHASE'],
    vY: ['3,169', '3,164', 'VOLTAGE Y', 'VOLTAGE_Y', 'VY', 'V_Y', 'UB', 'U2', 'LINE VOLTS (Y)', 'VOLTAGE Y-PHASE'],
    vB: ['3,170', '3,165', 'VOLTAGE B', 'VOLTAGE_B', 'VB', 'V_B', 'UC', 'U3', 'LINE VOLTS (B)', 'VOLTAGE B-PHASE'],
    iR: ['3,171', '3,166', 'CURRENT R', 'CURRENT_R', 'IR', 'I_R', 'IA', 'A1', 'LINE AMPS (R)', 'R-CURRENT'],
    iY: ['3,172', '3,167', 'CURRENT Y', 'CURRENT_Y', 'IY', 'I_Y', 'IB', 'A2', 'LINE AMPS (Y)', 'Y-CURRENT'],
    iB: ['3,173', '3,168', 'CURRENT B', 'CURRENT_B', 'IB', 'I_B', 'IC', 'A3', 'LINE AMPS (B)', 'B-CURRENT'],
    pf: ['3,174', 'POWER FACTOR', 'PF', 'SYSTEM PF', 'POWER_FACTOR'],
    dgKwh: ['3,180', '3,181', 'DG KWH', 'DG_KWH', 'DG ACTIVE', 'DG ENERGY', 'GENERATOR ENERGY'],
    lowBalanceCut: ['3,164', 'LOW BALANCE', 'BALANCE CUT', 'LOW_BAL', 'LOW_BALANCE_CUT'],
    overloadTrip: ['3,165', 'OVERLOAD TRIP', 'OL TRIP', 'OVERLOAD_TRIP', 'OVERLOAD TRIP STATUS'],
    overloadLimitReached: ['3,166', 'OVERLOAD LIMIT', 'OL LIMIT', 'OVERLOAD_WARN', 'OVERLOAD LIMIT REACHED'],
    connectedStatus: ['3,167', 'CONNECTED STATUS', 'RELAY STATUS', 'BREAKER STATUS', 'CONNECTED', 'CONNECTED_STATUS'],
    forceOff: ['3,168', 'FORCE OFF', 'REMOTE TRIP', 'FORCE_OFF', 'FORCE_OFF_STATUS'],
    meterSrno: ['3,150', 'METER SERIAL', 'SERIAL NUMBER', 'SR NO', 'METER SR', 'METER_NO', 'METERSRNO'],
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
    activePower: ['3,190', '3,151', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER'],
    reactivePower: ['3,192', 'REACTIVE POWER', 'REACTIVE_POWER'],
    apparentPower: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER'],
    cumulativekWh: ['3,151', '3,152', '4,91F', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
    freq: ['3,153', 'FREQUENCY', 'FREQ', '50HZ', 'F', 'HZ'],
    speed: ['SPEED', 'RPM', 'ENGINE SPEED', 'SPEED (RPM)', 'SPEED_RPM'],
    coolant: ['COOLANT', 'COOLANT TEMP', 'COOLANT TEMPERATURE', 'COOLANT_TEMP', 'WT'],
    oilPress: ['OIL PRESSURE', 'OIL PRESS', 'OP', 'OIL_PRESS', 'LOP'],
    battery: ['BATTERY', 'BATTERY V', 'BATTERY VOLTAGE', 'BATTERY_V', 'BATTERY_VOLTAGE', 'BAT_V'],
    runtime: ['RUN TIME', 'RUNTIME', 'RUN TIME (Hrs)', 'RUN_TIME', 'HRS', 'HOURS'],
    vL1L2: ['L1-L2 VOLTS', 'L1-L2 VOLTAGE', 'VOLTS L1-L2', 'V_L1_L2', 'VL1L2'],
    iL1: ['L1 AMPS', 'L1 CURRENT', 'AMPS L1', 'I_L1', 'IL1'],
    iL2: ['L2 AMPS', 'L2 CURRENT', 'AMPS L2', 'I_L2', 'IL2'],
    iL3: ['L3 AMPS', 'L3 CURRENT', 'AMPS L3', 'I_L3', 'IL3'],
    loadKW: ['LOAD (KW)', 'LOAD KW', 'ACTIVE POWER', 'DG KW', 'LOAD_KW'],
    appKVA: ['APP (KVA)', 'APP KVA', 'APPARENT POWER', 'DG KVA', 'LOAD_KVA'],
    level: ['FUEL LEVEL (%)', 'FUEL LEVEL', 'DIESEL LEVEL', 'FUEL_LEVEL', 'LEVEL', 'DIESEL_LEVEL'],
    emergencyStop: ['EMERGENCY STOP', 'ESTOP', 'EMERGENCY_STOP'],
    failToStart: ['FAIL TO START', 'FAIL_TO_START']
  };

  const lastAutofilledDevice = useRef('');
  const lastAutofilledElec = useRef('');
  const lastAutofilledDg = useRef('');

  // Auto-populate modules and all parameters fields when deviceDetails or selected device changes
  useEffect(() => {
    // 1. ENERGY METERING AUTO-FILL
    const activeDevice = emChangeConfig.device || emWarningConfig.device || emReadConfig.device || emVoltageConfig.device;
    if (activeDevice) {
      const devInfo = deviceDetails[activeDevice];
      if (devInfo && devInfo.modules) {
        const isNewDevice = lastAutofilledDevice.current !== activeDevice;
        const modulesList = Object.values(devInfo.modules);
        let changeModule = modulesList.find(m => m.name && m.name.toUpperCase().includes('CHANGE'));
        let warningModule = modulesList.find(m => m.name && m.name.toUpperCase().includes('WARNING'));
        let readModule = modulesList.find(m => m.name && m.name.toUpperCase().includes('READ'));

        // Fallback: If the device doesn't have specifically named modules, use the first available module
        if (!changeModule && modulesList.length > 0) changeModule = modulesList[0];
        if (!warningModule && modulesList.length > 0) warningModule = modulesList[0];
        if (!readModule && modulesList.length > 0) readModule = modulesList[0];

        const findMatchingField = (moduleObj, paramKey) => {
          if (!moduleObj || !moduleObj.fields || moduleObj.fields.length === 0) return null;

          const PARAM_LABELS = {
            ebKvah: 'EB KVAH (KVAH)',
            ebKwh: 'EB KWH (KWH)',
            balance: 'BALANCE (Rs)',
            totalKw: 'TOTAL KW (KW)',
            vR: 'VOLTAGE R-PHASE (V)',
            vY: 'VOLTAGE Y-PHASE (V)',
            vB: 'VOLTAGE B-PHASE (V)',
            iR: 'R-CURRENT (A)',
            iY: 'Y-CURRENT (A)',
            iB: 'B-CURRENT (A)',
            pf: 'POWER FACTOR (PF)',
            totalKva: 'TOTAL KVA (KVA)',
            dgKwh: 'DG KWH (KWH)',
            lowBalanceCut: 'LOW BALANCE CUT',
            overloadTrip: 'OVERLOAD TRIP',
            overloadLimitReached: 'OVERLOAD LIMIT REACHED',
            connectedStatus: 'CONNECTED STATUS',
            forceOff: 'FORCE OFF',
            meterSrno: 'METER SRNO',
            noOfOverloadCheck: 'NO OF OVERLOAD CHECK',
            ebDgStatus: 'EB/DG STATUS',
            ebTariff: 'EB TARIFF (Rs)',
            dgTariff: 'DG TARIFF (Rs)',
            ebRLoadSet: 'EB R LOAD SET (KW)',
            ebYLoadSet: 'EB Y LOAD SET (KW)',
            ebBLoadSet: 'EB B LOAD SET (KW)',
            dgRLoadSet: 'DG R LOAD SET (KW)',
            dgYLoadSet: 'DG Y LOAD SET (KW)',
            dgBLoadSet: 'DG B LOAD SET (KW)',
            activePower: 'ACTIVE POWER',
            reactivePower: 'REACTIVE POWER',
            apparentPower: 'APPARENT POWER',
            cumulativekWh: 'CUMULATIVE ENERGY',
            freq: 'FREQUENCY'
          };

          const fieldLabel = PARAM_LABELS[paramKey] || paramKey;
          const scored = getFilteredFieldList(null, paramKey, fieldLabel, moduleObj.fields);
          if (scored && scored.length > 0 && scored[0].score >= 10) {
            return scored[0].id;
          }

          const synonyms = PARAMETER_SYNONYMS[paramKey] || [];
          const searchTerms = [paramKey, ...synonyms].map(s => s.toUpperCase());

          for (const term of searchTerms) {
            let found = moduleObj.fields.find(f => f.id.toUpperCase() === term);
            if (found) return found.id;

            const normTerm = term.replace(/[^A-Z0-9]/g, '');
            if (normTerm) {
              found = moduleObj.fields.find(f => f.id.toUpperCase().replace(/[^A-Z0-9]/g, '') === normTerm);
              if (found) return found.id;
            }

            found = moduleObj.fields.find(f => f.label.toUpperCase().includes(term));
            if (found) return found.id;
          }
          return null;
        };

        // 1. Auto-fill CHANGE parameters
        if (changeModule) {
          setEmChangeConfig(prev => {
            const updated = { ...prev, module: changeModule.id };
            const keys = [
              'ebKvah', 'ebKwh', 'balance', 'totalKw', 'vR', 'vY', 'vB',
              'iR', 'iY', 'iB', 'pf', 'totalKva', 'dgKwh'
            ];
            keys.forEach(k => {
              if (isNewDevice || !prev[k]) {
                const match = findMatchingField(changeModule, k);
                if (match) updated[k] = `${changeModule.id}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });
        }

        // 2. Auto-fill WARNING parameters
        if (warningModule) {
          setEmWarningConfig(prev => {
            const updated = { ...prev, module: warningModule.id };
            const keys = [
              'lowBalanceCut', 'overloadTrip', 'overloadLimitReached', 'connectedStatus', 'forceOff'
            ];
            keys.forEach(k => {
              if (isNewDevice || !prev[k]) {
                const match = findMatchingField(warningModule, k);
                if (match) updated[k] = `${warningModule.id}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });
        }

        // 3. Auto-fill READ parameters
        if (readModule) {
          setEmReadConfig(prev => {
            const updated = { ...prev, module: readModule.id };
            const keys = [
              'meterSrno', 'noOfOverloadCheck', 'ebDgStatus', 'ebTariff', 'dgTariff',
              'ebRLoadSet', 'ebYLoadSet', 'ebBLoadSet', 'dgRLoadSet', 'dgYLoadSet', 'dgBLoadSet'
            ];
            keys.forEach(k => {
              if (isNewDevice || !prev[k]) {
                const match = findMatchingField(readModule, k);
                if (match) updated[k] = `${readModule.id}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });
        }

        // 4. Auto-fill legacy EM Voltage parameters
        if (changeModule) {
          setEmVoltageConfig(prev => {
            const updated = { ...prev, module: changeModule.id };
            const keys = ['vR', 'vY', 'vB'];
            keys.forEach(k => {
              if (isNewDevice || !prev[k]) {
                const match = findMatchingField(changeModule, k);
                if (match) updated[k] = `${changeModule.id}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });
        }

        // 5. Auto-fill legacy EM Current parameters
        if (changeModule) {
          setEmCurrentConfig(prev => {
            const updated = { ...prev, module: changeModule.id };
            const keys = ['iR', 'iY', 'iB'];
            keys.forEach(k => {
              if (isNewDevice || !prev[k]) {
                const match = findMatchingField(changeModule, k);
                if (match) updated[k] = `${changeModule.id}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });
        }

        // 6. Auto-fill legacy EM Power parameters
        if (changeModule) {
          setEmPowerConfig(prev => {
            const updated = { ...prev, module: changeModule.id };
            const keys = ['activePower', 'reactivePower', 'apparentPower'];
            keys.forEach(k => {
              if (isNewDevice || !prev[k]) {
                const match = findMatchingField(changeModule, k);
                if (match) updated[k] = `${changeModule.id}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });
        }

        // 7. Auto-fill legacy EM System parameters
        if (changeModule) {
          setEmSystemConfig(prev => {
            const updated = { ...prev, module: changeModule.id };
            const keys = ['pf', 'freq', 'commStatus'];
            keys.forEach(k => {
              if (isNewDevice || !prev[k]) {
                const match = findMatchingField(changeModule, k);
                if (match) updated[k] = `${changeModule.id}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });
        }

        // 8. Auto-fill legacy EM Consumption parameters
        if (changeModule) {
          setEmConsumptionConfig(prev => {
            const updated = { ...prev, module: changeModule.id };
            const keys = ['cumulativekWh'];
            keys.forEach(k => {
              if (isNewDevice || !prev[k]) {
                const match = findMatchingField(changeModule, k);
                if (match) updated[k] = `${changeModule.id}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });
        }

        if (isNewDevice) {
          lastAutofilledDevice.current = activeDevice;
        }
      }
    }

    // 2. SUB METERS (ELECTRICITY) AUTO-FILL
    const activeElecDevice = elecVoltageConfig.device;
    const activeElecModule = elecVoltageConfig.module;
    if (activeElecDevice && activeElecModule) {
      const devInfo = deviceDetails[activeElecDevice];
      if (devInfo && devInfo.modules) {
        const isNewElec = lastAutofilledElec.current !== `${activeElecDevice}::${activeElecModule}`;
        const selectedModule = devInfo.modules[activeElecModule] || Object.values(devInfo.modules)[0];

        if (selectedModule) {
          const findMatchingFieldSub = (moduleObj, paramKey) => {
            if (!moduleObj || !moduleObj.fields || moduleObj.fields.length === 0) return null;

            const PARAM_LABELS = {
              ry: 'VOLTAGE RY',
              yb: 'VOLTAGE YB',
              br: 'VOLTAGE BR',
              r: 'CURRENT R',
              y: 'CURRENT Y',
              b: 'CURRENT B',
              pf: 'POWER FACTOR (PF)',
              freq: 'FREQUENCY',
              load: 'LOAD',
              kva: 'KVA',
              kwh: 'KWH',
              kvah: 'KVAH'
            };

            const fieldLabel = PARAM_LABELS[paramKey] || paramKey;
            const scored = getFilteredFieldList(null, paramKey, fieldLabel, moduleObj.fields);
            if (scored && scored.length > 0 && scored[0].score >= 10) {
              return scored[0].id;
            }
            return null;
          };

          // Auto-fill Elec Voltage Config
          setElecVoltageConfig(prev => {
            const updated = { ...prev, module: activeElecModule };
            const keys = ['ry', 'yb', 'br'];
            keys.forEach(k => {
              if (isNewElec || !prev[k]) {
                const match = findMatchingFieldSub(selectedModule, k);
                if (match) updated[k] = `${activeElecModule}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });

          // Auto-fill Elec Current Config
          setElecCurrentConfig(prev => {
            const updated = { ...prev, module: activeElecModule };
            const keys = ['r', 'y', 'b'];
            keys.forEach(k => {
              if (isNewElec || !prev[k]) {
                const match = findMatchingFieldSub(selectedModule, k);
                if (match) updated[k] = `${activeElecModule}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });

          // Auto-fill Elec System Config
          setElecSystemConfig(prev => {
            const updated = { ...prev, module: activeElecModule };
            const keys = ['pf', 'freq', 'load'];
            keys.forEach(k => {
              if (isNewElec || !prev[k]) {
                const match = findMatchingFieldSub(selectedModule, k);
                if (match) updated[k] = `${activeElecModule}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });

          // Auto-fill Elec Consumption Config
          setElecConsumptionConfig(prev => {
            const updated = { ...prev, module: activeElecModule };
            const keys = ['kva', 'kwh', 'kvah'];
            keys.forEach(k => {
              if (isNewElec || !prev[k]) {
                const match = findMatchingFieldSub(selectedModule, k);
                if (match) updated[k] = `${activeElecModule}::${match}`;
                else updated[k] = '';
              }
            });
            return updated;
          });

          if (isNewElec) {
            lastAutofilledElec.current = `${activeElecDevice}::${activeElecModule}`;
          }
        }
      }
    }

    // 3. DG SET AUTO-FILL
    const activeDgDevice = dgPowerConfig.device;
    if (activeDgDevice) {
      const devInfo = deviceDetails[activeDgDevice];
      if (devInfo && devInfo.modules) {
        const isNewDg = lastAutofilledDg.current !== activeDgDevice;

        // Map across all fields of all modules
        const dgAllFields = [];
        Object.values(devInfo.modules).forEach(m => {
          (m.fields || []).forEach(f => {
            dgAllFields.push({ ...f, id: `${m.id}::${f.id}` });
          });
        });

        const virtualDgModule = { fields: dgAllFields };

        const findMatchingFieldDg = (moduleObj, paramKey) => {
          if (!moduleObj || !moduleObj.fields || moduleObj.fields.length === 0) return null;

          const PARAM_LABELS = {
            speed: 'SPEED (RPM)',
            coolant: 'COOLANT TEMP',
            oilPress: 'OIL PRESSURE',
            battery: 'BATTERY V',
            freq: 'FREQUENCY',
            runtime: 'RUN TIME (Hrs)',
            vL1L2: 'L1-L2 VOLTS',
            iL1: 'L1 AMPS',
            iL2: 'L2 AMPS',
            iL3: 'L3 AMPS',
            loadKW: 'LOAD (KW)',
            appKVA: 'APP (KVA)',
            pf: 'POWER FACTOR',
            kwh: 'KWH TOTAL',
            level: 'FUEL LEVEL (%)',
            emergencyStop: 'EMERGENCY STOP',
            failToStart: 'FAIL TO START'
          };

          const fieldLabel = PARAM_LABELS[paramKey] || paramKey;
          const scored = getFilteredFieldList(null, paramKey, fieldLabel, moduleObj.fields);
          if (scored && scored.length > 0 && scored[0].score >= 10) {
            return scored[0].id;
          }
          return null;
        };

        // Auto-fill DG Engine Config
        setDgEngineConfig(prev => {
          const updated = { ...prev, module: 'ALL' };
          const keys = ['speed', 'coolant', 'oilPress', 'battery', 'freq', 'runtime'];
          keys.forEach(k => {
            if (isNewDg || !prev[k]) {
              const match = findMatchingFieldDg(virtualDgModule, k);
              if (match) updated[k] = match;
              else updated[k] = '';
            }
          });
          return updated;
        });

        // Auto-fill DG Power Config
        setDgPowerConfig(prev => {
          const updated = { ...prev, module: 'ALL' };
          const keys = ['vL1L2', 'iL1', 'iL2', 'iL3', 'loadKW', 'appKVA', 'pf', 'kwh'];
          keys.forEach(k => {
            if (isNewDg || !prev[k]) {
              const match = findMatchingFieldDg(virtualDgModule, k);
              if (match) updated[k] = match;
              else updated[k] = '';
            }
          });
          return updated;
        });

        // Auto-fill DG Fuel Config
        setDgFuelConfig(prev => {
          const updated = { ...prev, module: 'ALL' };
          const keys = ['level'];
          keys.forEach(k => {
            if (isNewDg || !prev[k]) {
              const match = findMatchingFieldDg(virtualDgModule, k);
              if (match) updated[k] = match;
              else updated[k] = '';
            }
          });
          return updated;
        });

        // Auto-fill DG Fault Config
        setDgFaultConfig(prev => {
          const updated = { ...prev, module: 'ALL' };
          const keys = ['emergencyStop', 'failToStart'];
          keys.forEach(k => {
            if (isNewDg || !prev[k]) {
              const match = findMatchingFieldDg(virtualDgModule, k);
              if (match) updated[k] = match;
              else updated[k] = '';
            }
          });
          return updated;
        });

        if (isNewDg) {
          lastAutofilledDg.current = activeDgDevice;
        }
      }
    }
  }, [
    deviceDetails,
    emChangeConfig.device, emWarningConfig.device, emReadConfig.device, emVoltageConfig.device,
    elecVoltageConfig.device, elecVoltageConfig.module,
    dgPowerConfig.device, dgEngineConfig.device, dgFuelConfig.device, dgFaultConfig.device
  ]);

  const getParameterSuggestion = (fieldName, displayName) => {
    if (!fieldName && !displayName) return null;
    const nameLower = (displayName || '').toLowerCase();
    const keyLower = (fieldName || '').toLowerCase();

    // DG Set parameters suggestions (higher priority to prevent wrong phase overrides)
    if (nameLower.includes('engine speed') || nameLower.includes('rpm') || keyLower.includes('speed') || keyLower.includes('rpm')) return 'SPEED (RPM)';
    if (nameLower.includes('coolant') || (nameLower.includes('temp') && (nameLower.includes('cool') || keyLower.includes('cool')))) return 'COOLANT TEMP';
    if (nameLower.includes('oil pressure') || keyLower.includes('oilp') || nameLower.includes('oil p') || keyLower.includes('oil_press')) return 'OIL PRESSURE';
    if (nameLower.includes('battery') || keyLower.includes('bat') || keyLower.includes('battery')) return 'BATTERY V';
    if (nameLower.includes('frequency') || nameLower.includes('freq') || keyLower.includes('freq') || keyLower === 'f') {
      if (nameLower.includes('generator') || nameLower.includes('dg') || nameLower.includes('engine') || keyLower.includes('dg') || keyLower.includes('gen')) {
        return 'FREQUENCY';
      }
    }
    if (nameLower.includes('run time') || nameLower.includes('runtime') || keyLower.includes('runtime') || keyLower.includes('run_time')) return 'RUN TIME (Hrs)';
    if (nameLower.includes('voltage l1') || nameLower.includes('v l1-l2') || keyLower.includes('vl1l2') || keyLower.includes('vl1_l2') || keyLower.includes('v_l1_l2')) return 'L1-L2 VOLTS';
    if (nameLower.includes('current l1') || nameLower.includes('amp l1') || keyLower === 'il1' || keyLower === 'i_l1' || keyLower === 'al1') return 'L1 AMPS';
    if (nameLower.includes('current l2') || nameLower.includes('amp l2') || keyLower === 'il2' || keyLower === 'i_l2' || keyLower === 'al2') return 'L2 AMPS';
    if (nameLower.includes('current l3') || nameLower.includes('amp l3') || keyLower === 'il3' || keyLower === 'i_l3' || keyLower === 'al3') return 'L3 AMPS';
    if (nameLower.includes('dg load') || (nameLower.includes('load') && (nameLower.includes('dg') || nameLower.includes('generator')))) return 'LOAD (KW)';
    if (nameLower.includes('dg app') || (nameLower.includes('apparent') && (nameLower.includes('dg') || nameLower.includes('generator')))) return 'APP (KVA)';
    if (nameLower.includes('fuel level') || nameLower.includes('diesel level') || keyLower.includes('fuel') || keyLower.includes('diesel')) return 'FUEL LEVEL (%)';
    if (nameLower.includes('emergency stop') || keyLower.includes('emergencystop') || keyLower.includes('estop')) return 'EMERGENCY STOP';
    if (nameLower.includes('master trip') || keyLower.includes('mastertrip')) return 'MASTER TRIP';
    if (nameLower.includes('over voltage') || keyLower.includes('overvoltage') || nameLower.includes('high voltage') || keyLower.includes('highvoltage')) return 'OVER VOLTAGE';
    if (nameLower.includes('under voltage') || keyLower.includes('undervoltage') || nameLower.includes('low voltage') || keyLower.includes('lowvoltage')) return 'UNDER VOLTAGE';
    if (nameLower.includes('over frequency') || keyLower.includes('overfrequency') || nameLower.includes('high frequency') || keyLower.includes('highfrequency') || nameLower.includes('over speed')) return 'OVER FREQUENCY';
    if (nameLower.includes('under frequency') || keyLower.includes('underfrequency') || nameLower.includes('low frequency') || keyLower.includes('lowfrequency') || nameLower.includes('under speed')) return 'UNDER FREQUENCY';
    if (nameLower.includes('low oil level') || keyLower.includes('lowoillevel') || nameLower.includes('low oil pressure')) return 'LOW OIL LEVEL';
    if (nameLower.includes('over temp') || keyLower.includes('overtemp') || nameLower.includes('high coolant temperature') || nameLower.includes('high coolant')) return 'OVER TEMP';
    if (nameLower.includes('fail to start') || keyLower.includes('failtostart')) return 'FAIL TO START';

    // Check mapping categories
    if (nameLower.includes('kvah') || keyLower.includes('kvah')) return 'EB KVAH (KVAH)';
    if (nameLower.includes('kwh') || keyLower.includes('kwh')) {
      if (nameLower.includes('dg') || keyLower.includes('dg')) return 'DG KWH (KWH)';
      return 'EB KWH (KWH)';
    }
    if (nameLower.includes('balance') || keyLower.includes('balance') || nameLower.includes('prepaid') || keyLower.includes('prepaid')) return 'BALANCE (Rs)';
    if (nameLower.includes('pf') || nameLower.includes('power factor') || keyLower.includes('pf')) return 'POWER FACTOR (PF)';

    // Voltages
    if (nameLower.includes('voltage') || nameLower.includes('volt') || keyLower.startsWith('v')) {
      if (nameLower.match(/\br(-phase)?\b/) || keyLower.match(/\b(v_?r|u1|r)\b/)) return 'VOLTAGE R-PHASE (V)';
      if (nameLower.match(/\by(-phase)?\b/) || keyLower.match(/\b(v_?y|u2|y)\b/)) return 'VOLTAGE Y-PHASE (V)';
      if (nameLower.match(/\bb(-phase)?\b/) || keyLower.match(/\b(v_?b|u3|b)\b/)) return 'VOLTAGE B-PHASE (V)';
    }

    // Currents
    if (nameLower.includes('current') || nameLower.includes('amp') || keyLower.startsWith('i') || keyLower.startsWith('a')) {
      if (nameLower.match(/\br(-phase)?\b/) || keyLower.match(/\b(i_?r|a_?r|i1|a1|r)\b/)) return 'R-CURRENT (A)';
      if (nameLower.match(/\by(-phase)?\b/) || keyLower.match(/\b(i_?y|a_?y|i2|a2|y)\b/)) return 'Y-CURRENT (A)';
      if (nameLower.match(/\bb(-phase)?\b/) || keyLower.match(/\b(i_?b|a_?b|i3|a3|b)\b/)) return 'B-CURRENT (A)';
    }

    if (nameLower.includes('active power') || nameLower.includes('total kw') || nameLower.includes('load kw') || keyLower.includes('kw')) return 'TOTAL KW (KW)';
    if (nameLower.includes('apparent power') || nameLower.includes('total kva') || nameLower.includes('load kva') || keyLower.includes('kva')) return 'TOTAL KVA (KVA)';
    if (nameLower.includes('fixed charge') || keyLower.includes('fixed')) return 'FIXED CHARGE (Rs)';

    return null;
  };

  const fetchDeviceDetails = async (deviceId) => {
    console.log('Fetching details for device:', deviceId);
    if (!deviceId) return null;
    if (deviceDetails[deviceId]) return deviceDetails[deviceId].modules;
    try {
      const data = await getSochiotDeviceDetails(deviceId);
      if (data) {
        // Sochiot API can have modules in root 'modules' or 'deviceTemplateVO.moduleTemplates'
        const moduleSource = data.modules || data.deviceTemplateVO?.moduleTemplates || [];
        const moduleMap = {};

        moduleSource.forEach(m => {
          // Event fields can be in root or inside moduleTypeVO
          const fieldsSource = m.eventFieldVOS || m.moduleTypeVO?.eventFieldVOS || [];
          const fields = fieldsSource.map(f => {
            const suggestion = getParameterSuggestion(f.fieldName, f.displayName);
            const rawLabel = `${f.displayName} (${f.fieldName})`;
            return {
              label: suggestion ? `${suggestion} | ${rawLabel}` : rawLabel,
              id: f.fieldName
            };
          });

          moduleMap[m.id] = {
            id: m.id,
            name: m.name,
            fields: fields
          };
        });

        setDeviceDetails(prev => ({
          ...prev,
          [deviceId]: { modules: moduleMap }
        }));
        return moduleMap;
      }
    } catch (error) {
      console.error('Error fetching device details:', error);
    }
    return null;
  };

  const handleConfigChange = async (config, setter, key, value) => {
    console.log(`Config Change: ${key} = ${value}`);

    if (key === 'device' && value) {
      let foundDevice = null;
      Object.values(locationDetails).forEach(loc => {
        if (loc.deviceList) {
          const dev = loc.deviceList.find(d => String(d.id) === String(value));
          if (dev) foundDevice = dev;
        }
      });
      if (foundDevice) {
        if (foundDevice.uuid) setDeviceIdInput(foundDevice.uuid);
        if (foundDevice.gatewayId) setGatewayUuidInput(String(foundDevice.gatewayId));
      }
    }

    const updated = { ...config, [key]: value };

    const emSetters = [
      setEmVoltageConfig,
      setEmCurrentConfig,
      setEmPowerConfig,
      setEmSystemConfig,
      setEmConsumptionConfig,
      setEmChangeConfig,
      setEmWarningConfig,
      setEmReadConfig
    ];

    const isEMConfig = emSetters.includes(setter);

    if (isEMConfig && ['organization', 'client', 'zone', 'subZone', 'building', 'device', 'location_hierarchical'].includes(key)) {
      const updateObject = (prevConfig) => {
        const nextConfig = { ...prevConfig, [key]: value };
        if (key === 'location_hierarchical') {
          if (value === '__BACK__') {
            if (nextConfig.building) nextConfig.building = '';
            else if (nextConfig.subZone) nextConfig.subZone = '';
            else if (nextConfig.zone) nextConfig.zone = '';
            else if (nextConfig.client) nextConfig.client = '';
            else if (nextConfig.organization) nextConfig.organization = '';
          } else if (value === '__RESET__') {
            nextConfig.organization = ''; nextConfig.client = ''; nextConfig.zone = ''; nextConfig.subZone = ''; nextConfig.building = '';
            nextConfig.device = ''; nextConfig.module = ''; nextConfig.field = '';
          } else {
            if (!nextConfig.organization) nextConfig.organization = value;
            else if (!nextConfig.client) nextConfig.client = value;
            else if (!nextConfig.zone) nextConfig.zone = value;
            else if (!nextConfig.subZone) {
              nextConfig.subZone = value;
            }
            else if (!nextConfig.building) {
              nextConfig.building = value;
            }
          }
          nextConfig.location_hierarchical = '';
        } else if (key === 'building') {
          nextConfig.device = ''; nextConfig.module = ''; nextConfig.field = '';
        } else if (key === 'device') {
          nextConfig.module = ''; nextConfig.field = '';
        }
        return nextConfig;
      };

      setEmVoltageConfig(prev => updateObject(prev));
      setEmCurrentConfig(prev => updateObject(prev));
      setEmPowerConfig(prev => updateObject(prev));
      setEmSystemConfig(prev => updateObject(prev));
      setEmConsumptionConfig(prev => updateObject(prev));
      setEmChangeConfig(prev => updateObject(prev));
      setEmWarningConfig(prev => updateObject(prev));
      setEmReadConfig(prev => updateObject(prev));

      // Trigger side-effects
      if (key === 'location_hierarchical') {
        const temp = { ...config, [key]: value };
        if (value !== '__BACK__' && value !== '__RESET__') {
          if (temp.organization && temp.client && temp.zone) {
            if (!temp.subZone) {
              const szOptions = getFieldList('subZone', { ...temp, subZone: value });
              const b = szOptions.find(o => o.id === value);
              if (b && b.type === 'location' && b.rawId) {
                fetchLocationDetails(value, b.rawId);
              }
            } else if (!temp.building) {
              const buildingOptions = getFieldList('building', { ...temp, building: value });
              const selectedBuilding = buildingOptions.find(o => o.id === value);
              if (selectedBuilding && selectedBuilding.rawId) {
                fetchLocationDetails(value, selectedBuilding.rawId);
              }
            }
          }
        }
      } else if (key === 'building') {
        if (value) {
          const temp = { ...config, building: value };
          const buildingOptions = getFieldList('building', temp);
          const selectedBuilding = buildingOptions.find(o => o.id === value);
          if (selectedBuilding && selectedBuilding.rawId) {
            fetchLocationDetails(value, selectedBuilding.rawId);
          }
        }
      } else if (key === 'device') {
        if (value) {
          fetchDeviceDetails(value).then(modules => {
            if (modules) {
              const allFields = [];
              Object.values(modules).forEach(m => {
                (m.fields || []).forEach(f => {
                  allFields.push({ ...f, id: `${m.id}::${f.id}` });
                });
              });

              const usedFields = new Set();
              const findField = (...suggestionKeys) => {
                for (const suggestionKey of suggestionKeys) {
                  // Escape special regex characters in suggestionKey except when we want them to act as literals
                  const escapedKey = suggestionKey.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const regex = new RegExp(`\\b${escapedKey}\\b`);
                  const found = allFields.find(f => !usedFields.has(f.id) && regex.test(f.label.toUpperCase()));
                  if (found) {
                    usedFields.add(found.id);
                    return found.id;
                  }
                }
                return '';
              };

              setEmVoltageConfig(prev => ({
                ...prev,
                vR: findField('VOLTAGE R-PHASE', 'VOLTAGE R', 'VR', 'U1'),
                vY: findField('VOLTAGE Y-PHASE', 'VOLTAGE Y', 'VY', 'U2'),
                vB: findField('VOLTAGE B-PHASE', 'VOLTAGE B', 'VB', 'U3')
              }));

              setEmCurrentConfig(prev => ({
                ...prev,
                iR: findField('R-CURRENT', 'CURRENT R', 'L1 AMPS', 'IR', 'A1'),
                iY: findField('Y-CURRENT', 'CURRENT Y', 'L2 AMPS', 'IY', 'A2'),
                iB: findField('B-CURRENT', 'CURRENT B', 'L3 AMPS', 'IB', 'A3')
              }));

              setEmPowerConfig(prev => ({
                ...prev,
                activePower: findField('TOTAL KW', 'ACTIVE POWER'),
                reactivePower: findField('REACTIVE POWER'),
                apparentPower: findField('TOTAL KVA', 'APPARENT POWER')
              }));

              setEmSystemConfig(prev => ({
                ...prev,
                pf: findField('POWER FACTOR', 'PF', 'AVG PF'),
                freq: findField('FREQUENCY', 'HZ'),
                commStatus: findField('COMM STATUS', 'COMMUNICATION')
              }));

              setEmConsumptionConfig(prev => ({
                ...prev,
                cumulativekWh: findField('CUMULATIVE KWH', 'EB KWH', 'ACTIVE ENERGY')
              }));

              setEmWarningConfig(prev => ({
                ...prev,
                lowBalanceCut: findField('LOW BALANCE', 'BALANCE CUT'),
                overloadTrip: findField('OVERLOAD TRIP'),
                overloadLimitReached: findField('OVERLOAD LIMIT'),
                connectedStatus: findField('CONNECTED STATUS', 'RELAY STATUS'),
                forceOff: findField('FORCE OFF')
              }));

              setEmReadConfig(prev => ({
                ...prev,
                meterSrno: findField('METER SERIAL', 'METER SR', 'SERIAL NUMBER'),
                noOfOverloadCheck: findField('OVERLOAD CHECK'),
                ebDgStatus: findField('EB DG STATUS', 'SOURCE STATUS'),
                ebTariff: findField('EB TARIFF'),
                dgTariff: findField('DG TARIFF'),
                ebRLoadSet: findField('EB R LOAD'),
                ebYLoadSet: findField('EB Y LOAD'),
                ebBLoadSet: findField('EB B LOAD'),
                dgRLoadSet: findField('DG R LOAD'),
                dgYLoadSet: findField('DG Y LOAD'),
                dgBLoadSet: findField('DG B LOAD')
              }));

              setEmChangeConfig(prev => ({
                ...prev,
                ebKvah: findField('EB KVAH', 'KVAH', '3,152', '3,157'),
                ebKwh: findField('EB KWH', 'KWH', '3,151'),
                balance: findField('BALANCE', 'AMT'),
                totalKw: findField('TOTAL KW', 'ACTIVE POWER'),
                vR: findField('VOLTAGE R-PHASE', 'VOLTAGE R', 'VR', 'U1'),
                vY: findField('VOLTAGE Y-PHASE', 'VOLTAGE Y', 'VY', 'U2'),
                vB: findField('VOLTAGE B-PHASE', 'VOLTAGE B', 'VB', 'U3'),
                iR: findField('R-CURRENT', 'CURRENT R', 'L1 AMPS', 'IR', 'A1'),
                iY: findField('Y-CURRENT', 'CURRENT Y', 'L2 AMPS', 'IY', 'A2'),
                iB: findField('B-CURRENT', 'CURRENT B', 'L3 AMPS', 'IB', 'A3'),
                pf: findField('POWER FACTOR', 'PF', 'AVG PF'),
                totalKva: findField('TOTAL KVA', 'POWER KVA'),
                dgKwh: findField('DG KWH', 'DG ENERGY'),
                vLLAvg: findField('AVG VOLTAGE L-L', 'VLL AVG', 'AVG VLL'),
                vLNAvg: findField('AVG VOLTAGE L-N', 'VLN AVG', 'AVG VLN'),
                iAvg: findField('AVG CURRENT', 'I AVG', 'IAVG'),
                kvaAvg: findField('POWER KVA (AVG)', 'KVA AVG', 'AVG KVA'),
                kvarAvg: findField('POWER KVAR (AVG)', 'KVAR AVG', 'AVG KVAR'),
                pfAvg: findField('AVG PF', 'PF AVG', 'PFAVG'),
                vRY: findField('VOLTAGE R-Y', 'VRY', 'V RY'),
                vYB: findField('VOLTAGE Y-B', 'VYB', 'V YB'),
                vBR: findField('VOLTAGE B-R', 'VBR', 'V BR'),
                pfR: findField('PF-R', 'PF R', 'PFR'),
                pfY: findField('PF-Y', 'PF Y', 'PFY'),
                pfB: findField('PF-B', 'PF B', 'PFB'),
                loadHrs: findField('LOAD HRS', 'LOAD HOURS'),
                loadMin: findField('LOAD MIN'),
                noLoadHrs: findField('NO LOAD HRS', 'NO LOAD HOURS'),
                noLoadMin: findField('NO LOAD MIN'),
                loadPct: findField('LOAD %', 'LOAD PCT', 'LOAD PERCENT')
              }));
            }
          });
        }
      }
      return;
    }

    const dgSetters = [
      setDgEngineConfig,
      setDgPowerConfig,
      setDgFuelConfig,
      setDgFaultConfig
    ];

    const isDGConfig = dgSetters.includes(setter);

    if (isDGConfig && ['building', 'device'].includes(key)) {
      if (key === 'building') {
        setDgEngineConfig(prev => ({
          ...prev,
          building: value,
          device: '',
          speed: '', coolant: '', oilPress: '', battery: '', freq: '', runtime: ''
        }));
        setDgPowerConfig(prev => ({
          ...prev,
          building: value,
          device: '',
          vL1L2: '', iL1: '', iL2: '', iL3: '', loadKW: '', appKVA: '', pf: '', kwh: ''
        }));
        setDgFuelConfig(prev => ({
          ...prev,
          building: value,
          device: '',
          level: ''
        }));
        setDgFaultConfig(prev => ({
          ...prev,
          building: value,
          device: '',
          emergencyStop: '', masterTrip: '', overVoltage: '', underVoltage: '', overFrequency: '', underFrequency: '', lowOilLevel: '', overTemp: ''
        }));
      } else if (key === 'device') {
        setDgEngineConfig(prev => ({ ...prev, device: value }));
        setDgPowerConfig(prev => ({ ...prev, device: value }));
        setDgFuelConfig(prev => ({ ...prev, device: value }));
        setDgFaultConfig(prev => ({ ...prev, device: value }));
      }

      // Trigger side-effects
      if (key === 'building') {
        if (value) {
          const temp = { ...config, building: value };
          const buildingOptions = getFieldList('building', temp);
          const selectedBuilding = buildingOptions.find(o => o.id === value);
          if (selectedBuilding && selectedBuilding.rawId) {
            fetchLocationDetails(value, selectedBuilding.rawId);
          }
        }
      } else if (key === 'device') {
        if (value) {
          fetchDeviceDetails(value).then(modules => {
            if (modules && [setDgEngineConfig, setDgPowerConfig, setDgFuelConfig, setDgFaultConfig].includes(setter) && !isEMConfig) {
              const allFields = [];
              Object.values(modules).forEach(m => {
                (m.fields || []).forEach(f => {
                  allFields.push({ ...f, id: `${m.id}::${f.id}` });
                });
              });

              const findField = (suggestionKey) => {
                return allFields.find(f => f.label.includes(suggestionKey))?.id || '';
              };

              setDgFaultConfig(prev => ({
                ...prev,
                emergencyStop: prev.emergencyStop || findField('EMERGENCY STOP'),
                emergencyStop_alarm: prev.emergencyStop_alarm || '0',
                emergencyStop_healthy: prev.emergencyStop_healthy || '1',
                masterTrip: prev.masterTrip || findField('MASTER TRIP'),
                masterTrip_alarm: prev.masterTrip_alarm || '0',
                masterTrip_healthy: prev.masterTrip_healthy || '1',
                overVoltage: prev.overVoltage || findField('OVER VOLTAGE'),
                overVoltage_alarm: prev.overVoltage_alarm || '0',
                overVoltage_healthy: prev.overVoltage_healthy || '1',
                underVoltage: prev.underVoltage || findField('UNDER VOLTAGE'),
                underVoltage_alarm: prev.underVoltage_alarm || '0',
                underVoltage_healthy: prev.underVoltage_healthy || '1',
                overFrequency: prev.overFrequency || findField('OVER FREQUENCY'),
                overFrequency_alarm: prev.overFrequency_alarm || '0',
                overFrequency_healthy: prev.overFrequency_healthy || '1',
                underFrequency: prev.underFrequency || findField('UNDER FREQUENCY'),
                underFrequency_alarm: prev.underFrequency_alarm || '0',
                underFrequency_healthy: prev.underFrequency_healthy || '1',
                lowOilLevel: prev.lowOilLevel || findField('LOW OIL LEVEL'),
                lowOilLevel_alarm: prev.lowOilLevel_alarm || '0',
                lowOilLevel_healthy: prev.lowOilLevel_healthy || '1',
                overTemp: prev.overTemp || findField('OVER TEMP'),
                overTemp_alarm: prev.overTemp_alarm || '0',
                overTemp_healthy: prev.overTemp_healthy || '1'
              }));
            }
          });
        }
      }
      return;
    }

    // Hierarchical Location Logic (Single Dropdown)
    if (key === 'location_hierarchical') {
      if (value === '__BACK__') {
        if (updated.building) updated.building = '';
        else if (updated.subZone) updated.subZone = '';
        else if (updated.zone) updated.zone = '';
        else if (updated.client) updated.client = '';
        else if (updated.organization) updated.organization = '';
      } else if (value === '__RESET__') {
        updated.organization = ''; updated.client = ''; updated.zone = ''; updated.subZone = ''; updated.building = '';
        updated.device = ''; updated.module = ''; updated.field = '';
      } else {
        if (!updated.organization) updated.organization = value;
        else if (!updated.client) updated.client = value;
        else if (!updated.zone) updated.zone = value;
        else if (!updated.subZone) {
          updated.subZone = value;
          const szOptions = getFieldList('subZone', updated);
          const b = szOptions.find(o => o.id === value);
          if (b && b.type === 'location' && b.rawId) {
            fetchLocationDetails(value, b.rawId);
          }
        }
        else if (!updated.building) {
          updated.building = value;
          const buildingOptions = getFieldList('building', updated);
          const selectedBuilding = buildingOptions.find(o => o.id === value);
          if (selectedBuilding && selectedBuilding.rawId) {
            fetchLocationDetails(value, selectedBuilding.rawId);
          }
        }
      }
      updated.location_hierarchical = ''; // Reset the select value so placeholder shows the path
    } else if (key === 'building') {
      updated.device = ''; updated.module = ''; updated.field = '';
      if (value) {
        const buildingOptions = getFieldList('building', updated);
        const selectedBuilding = buildingOptions.find(o => o.id === value);
        if (selectedBuilding && selectedBuilding.rawId) {
          fetchLocationDetails(value, selectedBuilding.rawId);
        }
      }
    } else if (key === 'device') {
      updated.module = '';
      updated.field = '';
      if (value) fetchDeviceDetails(value);
    } else if (key === 'module') {
      updated.field = '';
    }

    setter(updated);
  };

  const handleGlobalHierarchyChange = (key, value) => {
    const updated = { ...globalLocation };
    updated[key] = value;

    // Reset lower levels
    const levels = ['organization', 'client', 'zone', 'subZone', 'building'];
    const startIdx = levels.indexOf(key);
    for (let i = startIdx + 1; i < levels.length; i++) {
      updated[levels[i]] = '';
    }

    setGlobalLocation(updated);

    if (key === 'zone' && value) {
      const zoneId = zoneIdMap[value];
      if (zoneId) fetchZoneDetails(value, zoneId);
    }

    if (key === 'subZone' && value) {
      const org = hierarchyData.find(o => o.name === updated.organization);
      const client = org?.clients?.find(c => c.name === updated.client);
      const zone = client?.zones?.find(z => z.name === updated.zone);

      // Check if the selected "subZone" is actually a location at the zone level
      const loc = zone?.locations?.find(l => l.name === value);
      if (loc && loc.id) {
        fetchLocationDetails(value, loc.id);
      }
    }

    if (key === 'building' && value) {
      const org = hierarchyData.find(o => o.name === updated.organization);
      const client = org?.clients?.find(c => c.name === updated.client);
      const zone = client?.zones?.find(z => z.name === updated.zone);

      const targetZone = (zone?.subZones || []).find(sz => sz.name === updated.subZone) || zone;
      const loc = targetZone?.locations?.find(l => l.name === value);

      if (loc && loc.id) fetchLocationDetails(value, loc.id);
    }
  };

  const handleGlobalLocationChange = (value) => {
    // Legacy support or fallback
    if (value === '__RESET__') {
      setGlobalLocation({ organization: '', client: '', zone: '', subZone: '', building: '' });
      return;
    }
    handleGlobalHierarchyChange('organization', value);
  };

  const getLocationPlaceholder = (state) => {
    if (state.building) return state.building.toUpperCase();
    return "SELECT ORGANIZATION";
  };

  const findHierarchyFromBuilding = (buildingName) => {
    if (!hierarchyData || !buildingName) return null;

    const isId = !isNaN(buildingName) || (typeof buildingName === 'string' && buildingName.length > 10);

    try {
      for (const comp of hierarchyData) {
        if (comp.consumers) {
          for (const client of comp.consumers) {
            if (client.zoneVOS) {
              for (const zone of client.zoneVOS) {
                // Check direct locations in zone
                const loc = zone.locations?.find(l => l.name === buildingName || String(l.id) === String(buildingName));
                if (loc) {
                  return { organization: comp.name, client: client.name, zone: zone.name, subZone: '', building: loc.name };
                }
                // Check sub-zones
                if (zone.subZones) {
                  for (const sub of zone.subZones) {
                    const subLoc = sub.locations?.find(l => l.name === buildingName || String(l.id) === String(buildingName));
                    if (subLoc) {
                      return { organization: comp.name, client: client.name, zone: zone.name, subZone: sub.name, building: subLoc.name };
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Hierarchy search failed:", e);
    }
    return null;
  };

  const getRawFieldList = (key, rowState = {}) => {
    if (!hierarchyData || hierarchyData.length === 0) return [];

    const getSafeVal = (k) => rowState[k] || globalLocation[k];

    const orgName = getSafeVal('organization');
    const clientName = getSafeVal('client');
    const zoneName = getSafeVal('zone');
    const subZoneName = getSafeVal('subZone');
    const buildingName = getSafeVal('building');

    if (key === 'organization') {
      return hierarchyData.map(org => ({ label: org.name, id: org.name }));
    }

    if (key === 'client') {
      const org = hierarchyData.find(o => o.name === orgName);
      if (!org) return [];
      return (org.clients || []).map(c => ({ label: c.name, id: c.name }));
    }

    if (key === 'zone') {
      const org = hierarchyData.find(o => o.name === orgName);
      if (!org) return [];
      let clients = org.clients || [];
      if (clientName) clients = clients.filter(c => c.name === clientName);

      const zones = [];
      clients.forEach(c => {
        if (c.zones) zones.push(...c.zones);
      });
      return zones.map(z => ({ label: z.name, id: z.name }));
    }

    if (key === 'subZone') {
      const org = hierarchyData.find(o => o.name === orgName);
      if (!org) return [];
      let clients = org.clients || [];
      if (clientName) clients = clients.filter(c => c.name === clientName);

      const zones = [];
      clients.forEach(c => {
        if (c.zones) zones.push(...c.zones);
      });

      let filteredZones = zones;
      if (zoneName) filteredZones = zones.filter(z => z.name === zoneName);

      const results = [];
      filteredZones.forEach(z => {
        const collect = (node) => {
          if (node.subZones) {
            results.push(...node.subZones.map(sz => ({ label: sz.name, id: sz.name, type: 'subZone' })));
          }
          if (node.locations) {
            results.push(...node.locations.map(l => ({ label: l.name, id: l.name, rawId: l.id, type: 'location' })));
          }
          // Only recurse if no subzone is selected yet, or to find nested subzones?
          // For the dropdown, we usually only show immediate children of the selected Zone.
        };
        collect(z);
      });
      return results;
    }

    if (key === 'building') {
      // DUAL MODE: If Sub-Zone level is actually a Location, show Gateways. 
      // Otherwise show Buildings in that Sub-Zone.
      const szOptions = getFieldList('subZone', rowState);
      const selectedSZ = szOptions.find(o => o.id === subZoneName);

      if (selectedSZ && selectedSZ.type === 'location') {
        const locInfo = locationDetails[subZoneName];
        return (locInfo?.gatewayList || []).map(g => ({ label: g.label, id: g.label, rawId: g.id }));
      }

      const org = hierarchyData.find(o => o.name === orgName);
      if (!org) return [];
      let clients = org.clients || [];
      if (clientName) clients = clients.filter(c => c.name === clientName);

      const zones = [];
      clients.forEach(c => {
        if (c.zones) zones.push(...c.zones);
      });

      let filteredZones = zones;
      if (zoneName) filteredZones = zones.filter(z => z.name === zoneName);

      const buildings = [];
      filteredZones.forEach(z => {
        const collect = (node) => {
          if (node.locations) buildings.push(...node.locations);
          if (node.subZones) {
            let szToSearch = node.subZones;
            if (subZoneName && node.name === zoneName) {
              const target = node.subZones.find(sz => sz.name === subZoneName);
              if (target) szToSearch = [target];
              else {
                // If not found at top level, maybe it's deeper. 
                // But for now, if it's selected but not found in immediate subzones, 
                // we skip filtering to show everything.
              }
            }
            szToSearch.forEach(collect);
          }
        };
        collect(z);
      });

      return buildings.map(l => ({ label: l.name, id: l.name, rawId: l.id }));
    }

    if (key === 'device') {
      let locName = buildingName;
      const szOptions = getFieldList('subZone', rowState);
      const selectedSZ = szOptions.find(o => o.id === subZoneName);
      if (selectedSZ && selectedSZ.type === 'location') {
        locName = subZoneName;
      }

      const locInfo = locationDetails[locName];
      if (!locInfo) return [];

      // If buildingName (Level 5) is a specific Gateway, filter devices
      if (buildingName && buildingName !== locName) {
        // Check if buildingName is a gateway label
        return (locInfo.deviceList || []).filter(d => d.label.startsWith(buildingName) || d.gatewayId === buildingName);
      }

      return (locInfo.deviceList || []).map(d => ({ label: d.label, id: d.id, rawId: d.id }));
    }

    const deviceId = getSafeVal('device');

    // Module & Field Levels
    const devInfo = deviceDetails[deviceId];
    if (!devInfo) return [];

    if (key === 'module') {
      return Object.values(devInfo.modules).map(m => ({ label: `${m.id} - ${m.name}`, id: m.id }));
    }

    const selectedModuleId = rowState?.module;
    const isDGConfig = rowState?.speed !== undefined || rowState?.vL1L2 !== undefined || rowState?.level !== undefined || rowState?.emergencyStop !== undefined;
    const isEnergyMeteringConfig =
      rowState?.vR !== undefined ||
      rowState?.iR !== undefined ||
      rowState?.activePower !== undefined ||
      rowState?.cumulativekWh !== undefined ||
      rowState?.ebKwh !== undefined ||
      rowState?.lowBalanceCut !== undefined ||
      rowState?.meterSrno !== undefined;
    const isVRVConfig = rowState?.temperature !== undefined || rowState?.humidity !== undefined || rowState?.co2 !== undefined || rowState?.tvoc !== undefined || rowState?.aqi !== undefined;

    if (key === 'field') {
      if (selectedModuleId === 'ALL' || isDGConfig || isEnergyMeteringConfig || isVRVConfig) {
        const allFields = [];
        Object.values(devInfo.modules).forEach(m => {
          (m.fields || []).forEach(f => {
            const labelStr = m.name.toLowerCase() === 'sensor' ? f.label : `[${m.name}] ${f.label}`;
            allFields.push({ label: labelStr, id: `${m.id}::${f.id}` });
          });
        });
        return allFields;
      }
      const moduleData = devInfo.modules[selectedModuleId];
      return (moduleData?.fields || []).map(f => ({ label: f.label, id: f.id }));
    }

    return [];
  };

  const getFieldList = (key, rowState = {}) => {
    const list = getRawFieldList(key, rowState) || [];
    const currentVal = rowState[key] || globalLocation[key];
    if (currentVal && !list.some(opt => String(opt.id) === String(currentVal))) {
      return [{ label: currentVal, id: currentVal, rawId: currentVal }, ...list];
    }
    return list;
  };

  function getFilteredFieldList(sectionKey, fieldKey, fieldLabel, allFields) {
    if (!allFields || allFields.length === 0) return [];
    const searchStr = (fieldLabel || '').toLowerCase();
    const fk = (fieldKey || '').toLowerCase();

    const isPhaseParam = searchStr.includes('phase') ||
      searchStr.includes('l1') ||
      searchStr.includes('l2') ||
      searchStr.includes('l3') ||
      ['vr', 'vy', 'vb', 'ir', 'iy', 'ib', 'ry', 'yb', 'br', 'r', 'y', 'b', 'vl1l2', 'il1', 'il2', 'il3'].includes(fk) ||
      fk.includes('loadset') ||
      fk.includes('load_set') ||
      searchStr.includes('current r') || searchStr.includes('current y') || searchStr.includes('current b') ||
      searchStr.includes('voltage r') || searchStr.includes('voltage y') || searchStr.includes('voltage b') ||
      searchStr.includes('amps') || searchStr.includes('volts');

    const isR = isPhaseParam && (searchStr.match(/\br\b/i) || searchStr.includes('r-phase') || searchStr.includes('r_phase') || fk.match(/\br\b/i) || fk === 'l1' || fk.includes('l1') || fk.includes('vr') || fk.includes('ir'));
    const isY = isPhaseParam && (searchStr.match(/\by\b/i) || searchStr.includes('y-phase') || searchStr.includes('y_phase') || fk.match(/\by\b/i) || fk === 'l2' || fk.includes('l2') || fk.includes('vy') || fk.includes('iy'));
    const isB = isPhaseParam && (searchStr.match(/\bb\b/i) || searchStr.includes('b-phase') || searchStr.includes('b_phase') || fk.match(/\bb\b/i) || fk === 'l3' || fk.includes('l3') || fk.includes('vb') || fk.includes('ib'));

    const isCurrent = searchStr.includes('current') || searchStr.includes('amp') || fk.includes('current') || fk.startsWith('i');
    const isVoltage = searchStr.includes('voltage') || searchStr.includes('volt') || fk.includes('voltage') || fk.startsWith('v');
    const isKwh = searchStr.includes('kwh');
    const isKvah = searchStr.includes('kvah');
    const isKw = searchStr.includes('kw') && !isKwh;
    const isKva = searchStr.includes('kva') && !isKvah;
    const isPf = searchStr.includes('pf') || searchStr.includes('power factor');
    const isFreq = searchStr.includes('freq') || searchStr.includes('frequency') || searchStr.includes('hz');
    const isBalance = searchStr.includes('balance');
    const isTariff = searchStr.includes('tariff');
    const isLoad = searchStr.includes('load set') || searchStr.includes('limit') || fk.toLowerCase().includes('load');
    const isStatus = searchStr.includes('status');
    const isDg = searchStr.includes('dg') || fk.includes('dg');
    const isEb = searchStr.includes('eb') || fk.includes('eb');

    const scoredFields = allFields.map(f => {
      const lbl = f.label.toLowerCase();
      let score = 0;

      // Keyword matching
      if (isCurrent && (lbl.includes('current') || lbl.includes(' amp') || lbl.includes(' a '))) score += 15;
      if (isVoltage && (lbl.includes('voltage') || lbl.includes('volt') || lbl.includes(' v '))) score += 15;
      if (isKwh && lbl.includes('kwh')) score += 15;
      if (isKvah && lbl.includes('kvah')) score += 15;
      if (isKw && lbl.includes('kw') && !lbl.includes('kwh')) score += 15;
      if (isKva && lbl.includes('kva') && !lbl.includes('kvah')) score += 15;
      if (isPf && (lbl.includes('pf') || lbl.includes('power factor') || lbl.includes('factor'))) score += 15;
      if (isFreq && (lbl.includes('freq') || lbl.includes('hz'))) score += 15;
      if (isBalance && lbl.includes('balance')) score += 15;
      if (isTariff && lbl.includes('tariff')) score += 15;
      if (isLoad && (lbl.includes('load') || lbl.includes('limit') || lbl.includes('set'))) score += 15;
      if (isStatus && lbl.includes('status')) score += 15;

      // Source matching (EB vs DG)
      if (isDg && lbl.includes('dg')) score += 15;
      if (!isDg && lbl.includes('dg')) score -= 20;
      if (isDg && !lbl.includes('dg') && lbl.includes('eb')) score -= 20;
      if (isEb && lbl.includes('eb')) score += 10;
      if (isEb && !lbl.includes('eb') && lbl.includes('dg')) score -= 20;

      // Phase matching
      if (isR && (lbl.match(/\b(r|l1)\b/i) || lbl.match(/-r\b/i) || lbl.includes('r-phase') || lbl.includes('r_phase') || lbl.includes('vr') || lbl.includes('ir'))) score += 15;
      if (isY && (lbl.match(/\b(y|l2)\b/i) || lbl.match(/-y\b/i) || lbl.includes('y-phase') || lbl.includes('y_phase') || lbl.includes('vy') || lbl.includes('iy'))) score += 15;
      if (isB && (lbl.match(/\b(b|l3)\b/i) || lbl.match(/-b\b/i) || lbl.includes('b-phase') || lbl.includes('b_phase') || lbl.includes('vb') || lbl.includes('ib'))) score += 15;

      // Token matches
      const words = searchStr.replace(/[()]/g, '').split(/\s+/);
      words.forEach(w => {
        if (w.length > 1 && lbl.includes(w)) {
          score += 5;
        }
      });

      return { ...f, score };
    });

    return scoredFields.sort((a, b) => b.score - a.score);
  }

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('scada_templates', JSON.stringify(savedTemplates));
  }, [savedTemplates]);

  // Cleanup function for corrupted database entries
  const cleanCorruptedMapping = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      let newKey = key;
      // Fix 'Water Level' corruption in internal keys by removing the suffix
      if (key.includes('Water Level') && key !== 'agLevelConfig' && key !== 'ugTankLevelConfig' && key !== 'Water Level' && key !== 'agLevel' && key !== 'waterLevel') {
        newKey = key.replace('Water Level', '').trim();
      }

      let value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        value = cleanCorruptedMapping(value);
      } else if (typeof value === 'string' && value.includes('Water Level')) {
        // Fix string values (titles/labels) by restoring correct terminology
        if (value.includes('STARTWater Level')) value = value.replace('STARTWater Level', 'START COMMAND');
        else if (value.includes('STOPWater Level')) value = value.replace('STOPWater Level', 'STOP COMMAND');
        else if (value.includes('Water Level')) {
          // For other titles, determine if it should be COMMAND or MODE
          const upper = value.toUpperCase();
          const replacement = (upper.includes('START') || upper.includes('STOP') || upper.includes('OPEN') || upper.includes('CLOSE') || upper.includes('COMMAND')) ? 'COMMAND' : 'MODE';
          value = value.replace('Water Level', replacement);
        }
      }

      cleaned[newKey] = value;
    });
    return cleaned;
  };

  // Fetch from backend on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const tenantId = userData?.tenantId;
        const url = tenantId ? `/api/templates?tenantId=${tenantId}` : '/api/templates';

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          // Map backend data to frontend format if necessary
          const mappedData = data.map(t => {
            const hasDefaultValues = t.defaultValues && typeof t.defaultValues === 'object' && Object.keys(t.defaultValues).length > 0;
            const defValues = hasDefaultValues ? t.defaultValues : null;
            const mappingSource = defValues || t.settings[0]?.meta || {};
            return {
              id: t.id,
              name: t.name,
              category: (defValues && defValues.category) || t.category || 'Water Management',
              module: (defValues && defValues.module) || t.settings[0]?.eventKey || 'AG Tank',
              mapping: cleanCorruptedMapping(mappingSource),
              timestamp: new Date(t.createdAt).toLocaleString()
            };
          });
          if (mappedData.length > 0) {
            setSavedTemplates(mappedData);
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };
    fetchTemplates();
  }, []);


  // Identify disabled towers for UI feedback in dropdowns
  const disabledTowerNames = useMemo(() => {
    return savedTemplates
      .filter(t => t.module === 'AG Tank' && t.mapping.agMasterEnabled === false)
      .map(t => t.mapping.agTankRange.domStart || t.mapping.agTankRange.flushStart)
      .filter(Boolean);
  }, [savedTemplates]);

  // Hierarchical Data Structure exactly matching the Sidebar
  const categories = {
    'Dashboard': ['Overview'],
    'Water Management': ['Overview', 'AG Tank', 'UG Pump', 'UG Tank', 'Pressure', 'Electrical Parameter'],
    'Motors': ['Overview', 'Pump Room 1', 'Pump Room 2', 'VFD Status'],
    'DG Set': ['Overview', 'DG Set-1', 'DG Set-2', 'DG Set-3'],
    'Alarm System': ['Overview', 'Active Alarms', 'Alarm History'],
    'LT Panel': ['Overview', 'LT Room-1', 'Incoming/Outgoing', 'Breaker Status'],
    'Transformer': ['Overview', 'Transformer-1', 'Transformer-2', 'Load/Temp'],
    'Fire': ['Overview', 'Pump Status', 'Header Pressure', 'Jockey / Main'],
    'Ticketing': ['Index'],
    'Maintenance': ['Scheduled', 'Pending Tasks'],
    'Service History': ['Records'],
    'Daily DPR': ['Data Aggregation', 'Daily Logs'],
    'Energy Metering': ['Overview', 'Main Meter', 'Sub Meters'],
    'VRV': ['Overview', 'Control Panel', 'Schedule', 'Human Sensor'],
    'AQI Sensor': ['Overview', 'Temp & Humidity'],
    'HVAC': ['Chiller', 'AHU', 'Cooling Tower']
  };

  const locations = dynamicOptions.locations;
  const devices = dynamicOptions.devices;
  const modules = dynamicOptions.modules;
  const fields = dynamicOptions.fields;

  // Theme-consistent background colors based on Slate-900 (#0f172a)
  const themeBg = "rgba(15, 23, 42, 0.95)";
  const themeOverlay = "rgba(15, 23, 42, 0.6)";
  const themeCardBg = "rgba(30, 41, 59, 0.4)"; // Slate-800 with opacity for cards inside cards

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    setSelectedModule(categories[cat][0]);
  };

  const handleDomesticTowerChange = (name) => {
    setTemplateName('');
    const tower = domesticTowers.find(t => t.name === name);
    if (tower) {
      // Find if a template for this specific tower already exists
      const existing = savedTemplates.find(t =>
        t.module === 'AG Tank' &&
        t.mapping.agTankRange &&
        t.mapping.agTankRange.domStart === name
      );

      if (existing) {
        // Load the saved state for this specific tower
        setAgMasterEnabled(existing.mapping.agMasterEnabled !== undefined ? existing.mapping.agMasterEnabled : true);
        setAgLowerConfig(existing.mapping.agLowerConfig || createDefaultConfig(true));
        setAgUpperConfig(existing.mapping.agUpperConfig || createDefaultConfig(true));
        setAgAutoConfig(existing.mapping.agAutoConfig || createDefaultConfig());
        setAgManualConfig(existing.mapping.agManualConfig || createDefaultConfig());
        setAgBypassConfig(existing.mapping.agBypassConfig || createDefaultConfig());
        setAgLevelConfig(existing.mapping.agLevelConfig || createDefaultConfig());
        setAgOpenConfig(existing.mapping.agOpenConfig || createDefaultConfig());
        setAgCloseConfig(existing.mapping.agCloseConfig || createDefaultConfig());
        setAgStatusStartConfig(existing.mapping.agStatusStartConfig || existing.mapping.agStatusConfig || createDefaultConfig());
        setAgStatusStopConfig(existing.mapping.agStatusStopConfig || createDefaultConfig());
        setAgAmpsConfig(existing.mapping.agAmpsConfig || createDefaultConfig());
        setAgRule1Config(existing.mapping.rule1Config || existing.mapping.ruleEngineConfig || initialRuleState);
        setAgRule2Config(existing.mapping.rule2Config || existing.mapping.ruleEngineConfig || initialRuleState);

        // Restore Global Location from this existing template ONLY if it has a valid building
        const restoredLoc = existing.mapping.globalHierarchy || (existing.mapping.agLowerConfig?.building ? {
          organization: existing.mapping.agLowerConfig.organization || '',
          client: existing.mapping.agLowerConfig.client || '',
          zone: existing.mapping.agLowerConfig.zone || '',
          subZone: existing.mapping.agLowerConfig.subZone || '',
          building: existing.mapping.agLowerConfig.building || ''
        } : null);

        if (restoredLoc) {
          setGlobalLocation(restoredLoc);
        }

      } else {
        // Default for new selection
        setAgMasterEnabled(true);
        setAgRule1Config(initialRuleState);
        setAgRule2Config(initialRuleState);
      }
      setAgTankRange({ ...agTankRange, domStart: tower.name, domEnd: tower.id });
    } else {
      setAgTankRange({ ...agTankRange, domStart: name, domEnd: '' });
      setAgMasterEnabled(true);
    }
  };

  const autoSaveMasterStatus = (enabledValue) => {
    if (!agTankRange.domStart && !agTankRange.flushStart) return;

    const rawMapping = {
      agLowerConfig, agUpperConfig, agTankRange,
      agAutoConfig, agManualConfig, agBypassConfig,
      agLevelConfig, agOpenConfig, agCloseConfig,
      agStatusStartConfig, agStatusStopConfig, agAmpsConfig,
      agTankType, agMasterEnabled: enabledValue
    };

    const cleanedMapping = {};
    Object.keys(rawMapping).forEach(key => {
      const val = rawMapping[key];
      if (val && typeof val === 'object' && !Array.isArray(val) && ('building' in val || 'location' in val)) {
        if (!val.building && !val.location) return;
      }
      cleanedMapping[key] = val;
    });

    const templateData = {
      category: selectedCategory,
      module: selectedModule,
      timestamp: new Date().toLocaleString(),
      mapping: {
        ...cleanedMapping,
        globalHierarchy: globalLocation
      }
    };

    const existingTowerIdx = savedTemplates.findIndex(t =>
      t.module === 'AG Tank' &&
      ((agTankType === 'DOMESTIC' && t.mapping.agTankRange.domStart === agTankRange.domStart) ||
        (agTankType === 'FLUSHING' && t.mapping.agTankRange.flushStart === agTankRange.flushStart))
    );

    if (existingTowerIdx !== -1) {
      const updated = [...savedTemplates];
      updated[existingTowerIdx] = { ...updated[existingTowerIdx], ...templateData, id: updated[existingTowerIdx].id };
      setSavedTemplates(updated);
    } else {
      setSavedTemplates([...savedTemplates, { id: Date.now(), ...templateData }]);
    }
  };

  const handleFlushingTowerChange = (name) => {
    setTemplateName('');
    const tower = flushingTowers.find(t => t.name === name);
    if (tower) {
      const existing = savedTemplates.find(t =>
        t.module === 'AG Tank' &&
        t.mapping.agTankRange &&
        t.mapping.agTankRange.flushStart === name
      );

      if (existing) {
        setAgMasterEnabled(existing.mapping.agMasterEnabled !== undefined ? existing.mapping.agMasterEnabled : true);
        setAgLowerConfig(existing.mapping.agLowerConfig || createDefaultConfig(true));
        setAgUpperConfig(existing.mapping.agUpperConfig || createDefaultConfig(true));
        setAgAutoConfig(existing.mapping.agAutoConfig || createDefaultConfig());
        setAgManualConfig(existing.mapping.agManualConfig || createDefaultConfig());
        setAgBypassConfig(existing.mapping.agBypassConfig || createDefaultConfig());
        setAgLevelConfig(existing.mapping.agLevelConfig || createDefaultConfig());
        setAgOpenConfig(existing.mapping.agOpenConfig || createDefaultConfig());
        setAgCloseConfig(existing.mapping.agCloseConfig || createDefaultConfig());
        setAgStatusStartConfig(existing.mapping.agStatusStartConfig || existing.mapping.agStatusConfig || createDefaultConfig());
        setAgStatusStopConfig(existing.mapping.agStatusStopConfig || createDefaultConfig());
        setAgAmpsConfig(existing.mapping.agAmpsConfig || createDefaultConfig());
        setAgRule1Config(existing.mapping.rule1Config || existing.mapping.ruleEngineConfig || initialRuleState);
        setAgRule2Config(existing.mapping.rule2Config || existing.mapping.ruleEngineConfig || initialRuleState);

        // Restore Global Location from this existing template ONLY if it has a valid building
        const restoredLoc = existing.mapping.globalHierarchy || (existing.mapping.agLowerConfig?.building ? {
          organization: existing.mapping.agLowerConfig.organization || '',
          client: existing.mapping.agLowerConfig.client || '',
          zone: existing.mapping.agLowerConfig.zone || '',
          subZone: existing.mapping.agLowerConfig.subZone || '',
          building: existing.mapping.agLowerConfig.building || ''
        } : null);

        if (restoredLoc) {
          setGlobalLocation(restoredLoc);
        }

      } else {
        setAgMasterEnabled(true);
        setAgRule1Config(initialRuleState);
        setAgRule2Config(initialRuleState);
      }
      setAgTankRange({ ...agTankRange, flushStart: tower.name, flushEnd: tower.id });
    } else {
      setAgTankRange({ ...agTankRange, flushStart: name, flushEnd: '' });
      setAgMasterEnabled(true);
    }
  };

  // Auto-fill Building, Device ID and parameter fields for AQI Sensor Mapping
  useEffect(() => {
    if (globalLocation.subZone && selectedCategory === 'AQI Sensor' && selectedModule === 'Temp & Humidity') {
      let updatedVrv = { ...vrvConfig };
      let changed = false;

      const bOpts = getFieldList('building', { ...globalLocation, ...updatedVrv });
      if (bOpts.length > 0 && !updatedVrv.building) {
        updatedVrv.building = bOpts[0].id;
        changed = true;
      }
      
      const currentBuilding = updatedVrv.building;
      if (currentBuilding) {
        const dOpts = getFieldList('device', { ...globalLocation, ...updatedVrv, building: currentBuilding });
        if (dOpts.length > 0 && !updatedVrv.device) {
          updatedVrv.device = dOpts[0].id;
          changed = true;
        }
      }

      if (updatedVrv.device) {
        const fieldOpts = getFieldList('field', { ...globalLocation, ...updatedVrv, building: updatedVrv.building });
        const fieldsToAutoFill = [
          { key: 'temperature', search: 'temperature' },
          { key: 'humidity', search: 'humidity' },
          { key: 'co2', search: 'co2' },
          { key: 'tvoc', search: 'tvoc' },
          { key: 'aqi', search: 'aqi' },
          { key: 'targetTemp', search: 'target temp' }
        ];

        fieldsToAutoFill.forEach(({ key, search }) => {
          if (!updatedVrv[key]) {
            const match = fieldOpts.find(opt => opt.label.toLowerCase().includes(search));
            if (match) {
              updatedVrv[key] = match.id;
              changed = true;
            }
          }
        });
      }

      if (changed) {
        setVrvConfig(updatedVrv);
      }
    }
  }, [globalLocation, vrvConfig, selectedCategory, selectedModule]);

  const handleSave = async () => {
    let mapping = {};
    if (selectedModule === 'AG Tank') {
      mapping = {
        agLowerConfig, agUpperConfig, agTankRange,
        agAutoConfig, agManualConfig, agBypassConfig,
        agLevelConfig, agOpenConfig, agCloseConfig,
        agStatusStartConfig, agStatusStopConfig, agAmpsConfig,
        agTankType, agMasterEnabled, rule1Config: agRule1Config, rule2Config: agRule2Config, ruleEngineConfig
      };
    } else if (selectedModule === 'UG Pump') {
      mapping = {
        ugLowerConfig, ugUpperConfig, ugAutoConfig, ugManualConfig,
        ugStartCmdConfig, ugStopCmdConfig, ugStartPressConfig, ugStopPressConfig,
        ugLocalModeConfig, ugRemoteModeConfig,
        ugStatusStartConfig, ugStatusStopConfig, ugAmpsConfig,
        ugPumpRange: { ...ugPumpRange, pumpNo: selectedUgPumpNo },
        ugConfig, rule1Config: ugRule1Config, rule2Config: ugRule2Config
      };
    } else if (selectedModule === 'UG Tank') {
      mapping = {
        ugTankLevelConfig, ugTankRange
      };
    } else if (selectedModule === 'Pressure') {
      mapping = {
        pressureConfig, pressureTarget
      };
    } else if (selectedModule === 'Electrical Parameter') {
      mapping = {
        elecVoltageConfig, elecCurrentConfig, elecSystemConfig, elecConsumptionConfig, electricalTarget
      };
    } else if (selectedModule && selectedModule.startsWith('DG Set')) {
      mapping = {
        dgEngineConfig, dgPowerConfig, dgFuelConfig, dgFaultConfig
      };
    } else if (selectedCategory === 'Energy Metering' || selectedModule === 'Main Meter' || selectedModule === 'Sub Meters') {
      mapping = {
        emVoltageConfig, emCurrentConfig, emPowerConfig, emSystemConfig, emConsumptionConfig,
        emChangeConfig, emWarningConfig, emReadConfig, emLimitsConfig, energyMeteringTarget, subMeterCategory
      };
    } else if (selectedCategory === 'VRV' || selectedCategory === 'AQI Sensor') {
      mapping = { vrvConfig };
    } else {
      // Fallback
      mapping = {
        agLowerConfig, agUpperConfig, agTankRange,
        agAutoConfig, agManualConfig, agBypassConfig,
        agLevelConfig, agOpenConfig, agCloseConfig,
        ugLowerConfig, ugUpperConfig, ugAutoConfig, ugManualConfig,
        ugStartCmdConfig, ugStopCmdConfig, ugStartPressConfig, ugStopPressConfig,
        ugLocalModeConfig, ugRemoteModeConfig,
        ugPumpRange: { ...ugPumpRange, pumpNo: selectedUgPumpNo },
        ugConfig,
        pressureConfig, pressureTarget,
        elecVoltageConfig, elecCurrentConfig, elecSystemConfig, elecConsumptionConfig, electricalTarget,
        agTankType, agMasterEnabled,
        ugTankLevelConfig, ugTankRange
      };
    }

    const rawMapping = mapping;
    const cleanedMapping = {};
    Object.keys(rawMapping).forEach(key => {
      const val = rawMapping[key];

      // Special check for rules: Only save if moduleId is present
      if ((key === 'rule1Config' || key === 'rule2Config' || key === 'ruleEngineConfig') && val && !val.moduleId) {
        return;
      }

      // Only include sections that have a valid mapping
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        // Add unique mapping ID for database tracking if it doesn't have one
        if (!val.mappingId) {
          val.mappingId = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
      }
      cleanedMapping[key] = val;
    });

    const hasValidConfig = Object.values(cleanedMapping).some(val =>
      val && typeof val === 'object' && (val.field || val.ry || val.r || val.pf || val.kva || val.domStart || val.name || val.pumpNo || val.vR || val.iR || val.activePower || val.cumulativekWh || val.energyMeteringTarget || val.temperature || val.humidity || val.co2 || val.tvoc || val.aqi)
    );

    if (!hasValidConfig) {
      setToastMessage({ type: 'error', text: "Please map at least one field to a device module before saving." });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    const templateData = {
      category: selectedCategory,
      module: selectedModule,
      timestamp: new Date().toLocaleString(),
      mapping: {
        ...cleanedMapping,
        globalHierarchy: globalLocation,
        deviceId: deviceIdInput,
        gatewayUuid: gatewayUuidInput
      }
    };

    let autoName = '';
    if (selectedModule === 'UG Pump') {
      autoName = `PUMP ${selectedUgPumpNo} - UG SYSTEM`;
    } else if (selectedModule === 'UG Tank' && ugTankRange.name) {
      autoName = `${ugTankRange.name} - UG LEVEL`;
    } else if (selectedModule === 'AG Tank') {
      autoName = agTankRange.domStart || agTankRange.flushStart || 'AG TANK';
    } else {
      autoName = energyMeteringTarget || pressureTarget || electricalTarget || selectedModule;
    }
    const uniqueName = templateName || `${autoName} (#${String(savedTemplates.length + 1).padStart(2, '0')})`;

    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const tenantId = userData?.tenantId;

      const response = await fetch('/api/templates/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingTemplateId,
          name: uniqueName.toUpperCase(),
          category: selectedCategory,
          module: selectedModule,
          mapping: templateData.mapping,
          tenantId: tenantId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save to backend');
      }

      const result = await response.json();
      console.log('Saved to backend:', result);

      if (editingTemplateId) {
        setSavedTemplates(savedTemplates.map(t => t.id === editingTemplateId ? { ...t, ...templateData, name: uniqueName.toUpperCase() } : t));
        setEditingTemplateId(null);
      } else {
        setSavedTemplates([...savedTemplates, { id: result.templateId || Date.now(), ...templateData, name: uniqueName.toUpperCase() }]);
      }

      setToastMessage({ type: 'success', text: `${selectedModule} Configuration Saved Successfully.` });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error) {
      console.error('Error saving to backend:', error);
      // Fallback to local storage if backend fails
      if (editingTemplateId) {
        setSavedTemplates(savedTemplates.map(t => t.id === editingTemplateId ? { ...t, ...templateData, name: uniqueName.toUpperCase() } : t));
        setEditingTemplateId(null);
      } else {
        setSavedTemplates([...savedTemplates, { id: Date.now(), ...templateData, name: uniqueName.toUpperCase() }]);
      }

      setToastMessage({ type: 'success', text: `${selectedModule} Configuration Saved Locally.` });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }

    setDeviceIdInput('');
    setGatewayUuidInput('');

    // Reset only if NOT AG Tank (to let user see their save)
    if (selectedModule !== 'AG Tank') {
      setAgLowerConfig(createDefaultConfig(true));
      setAgUpperConfig(createDefaultConfig(true));
      setAgAutoConfig(createDefaultConfig());
      setAgManualConfig(createDefaultConfig());
      setAgBypassConfig(createDefaultConfig());
      setAgLevelConfig(createDefaultConfig());
      setAgOpenConfig(createDefaultConfig());
      setAgCloseConfig(createDefaultConfig());
      setAgAmpsConfig(createDefaultConfig());
      setAgTankRange({ domStart: '', domEnd: '', flushStart: '', flushEnd: '' });
      setAgMasterEnabled(true);
    }
    setUgLowerConfig(createDefaultConfig(true));
    setUgUpperConfig(createDefaultConfig(true));
    setUgAutoConfig(createDefaultConfig());
    setUgManualConfig(createDefaultConfig());
    setUgStartCmdConfig(createDefaultConfig());
    setUgStopCmdConfig(createDefaultConfig());
    setUgStartPressConfig(createDefaultConfig());
    setUgStopPressConfig(createDefaultConfig());
    setUgLocalModeConfig(createDefaultConfig());
    setUgRemoteModeConfig(createDefaultConfig());
    setUgAmpsConfig(createDefaultConfig());
    setPressureConfig(createDefaultConfig());
    setElecVoltageConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ry: '', yb: '', br: '', enabled: true });
    setElecCurrentConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', r: '', y: '', b: '', enabled: true });
    setElecSystemConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', load: '', enabled: true });
    setElecConsumptionConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', kva: '', kwh: '', kvah: '', enabled: true });
    setDgEngineConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', coolant: '', oilPress: '', speed: '', runtime: '', battery: '', freq: '', enabled: true });
    setDgPowerConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', vL1L2: '', iL1: '', iL2: '', iL3: '', loadKW: '', appKVA: '', pf: '', kwh: '', enabled: true });
    setDgFuelConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', level: '', enabled: true });
    setDgFaultConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', emergencyStop: '', failToStart: '', enabled: true });
    setEmVoltageConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vR: '', vY: '', vB: '', enabled: true });
    setEmCurrentConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', iR: '', iY: '', iB: '', enabled: true });
    setEmPowerConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', activePower: '', reactivePower: '', apparentPower: '', enabled: true });
    setEmSystemConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', commStatus: '', enabled: true });
    setEmConsumptionConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', cumulativekWh: '', enabled: true });
    setEmChangeConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ebKvah: '', ebKwh: '', balance: '', totalKw: '', vR: '', vY: '', vB: '', iR: '', iY: '', iB: '', pf: '', totalKva: '', dgKwh: '', enabled: true });
    setEmWarningConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', lowBalanceCut: '', overloadTrip: '', overloadLimitReached: '', connectedStatus: '', forceOff: '', enabled: true });
    setEmReadConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', meterSrno: '', noOfOverloadCheck: '', ebDgStatus: '', ebTariff: '', dgTariff: '', ebRLoadSet: '', ebYLoadSet: '', ebBLoadSet: '', dgRLoadSet: '', dgYLoadSet: '', dgBLoadSet: '', enabled: true });
    setEmLimitsConfig({
      vR: { low: '', normalMin: '', normalMax: '', high: '' },
      vY: { low: '', normalMin: '', normalMax: '', high: '' },
      vB: { low: '', normalMin: '', normalMax: '', high: '' },
      iR: { low: '', normalMin: '', normalMax: '', high: '' },
      iY: { low: '', normalMin: '', normalMax: '', high: '' },
      iB: { low: '', normalMin: '', normalMax: '', high: '' },
      totalKw: { low: '', normalMin: '', normalMax: '', high: '' },
      totalKva: { low: '', normalMin: '', normalMax: '', high: '' }
    });
    setEnergyMeteringTarget('');
    setSubMeterCategory('');
    setVrvConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', temperature: '', humidity: '', co2: '', tvoc: '', aqi: '', targetTemp: '', enabled: true });
    setUgTankLevelConfig(createDefaultConfig());
    setUgTankRange({ name: '', id: '' });
    setTemplateName('');
    setAgRule1Config(initialRuleState);
    setAgRule2Config(initialRuleState);
    setUgRule1Config(initialRuleState);
    setUgRule2Config(initialRuleState);
    setRuleEngineConfig(initialRuleState);
    setUgConfig({
      integration: { 'LEVEL MONITORING': true, 'PUMP STATUS': true, 'AUTO LOGIC': true, 'MANUAL CONTROL': true, 'STARTWater Level': true, 'STOPWater Level': true, 'PRESSURE SENSOR': true },
      electrical: { 'PHASE VOLTAGE': true, 'PHASE CURRENT': true, 'POWER FACTOR': true, 'FREQUENCY': true, 'KW LOAD': true, 'KVAH UNIT': true },
      stationMode: 'REMOTE'
    });
    setViewMode('LIST');
  };


  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to remove this mapping?')) {
      try {
        const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          throw new Error('Failed to delete from backend');
        }
      } catch (error) {
        console.error('Error deleting from backend:', error);
      }
      setSavedTemplates(savedTemplates.filter(t => t.id !== id));
    }
  };

  const toggleSelectTemplate = (id) => {
    setSelectedTemplates(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkRemove = async () => {
    if (window.confirm(`Are you sure you want to remove ${selectedTemplates.length} selected mappings?`)) {
      try {
        await Promise.all(selectedTemplates.map(id => fetch(`http://localhost:5000/api/templates/${id}`, { method: 'DELETE' })));
      } catch (error) {
        console.error('Error deleting multiple from backend:', error);
      }
      setSavedTemplates(savedTemplates.filter(t => !selectedTemplates.includes(t.id)));
      setSelectedTemplates([]);
    }
  };

  const handleEdit = (template) => {
    setSelectedCategory(template.category);
    setSelectedModule(template.module);
    if (template.mapping) {
      setDeviceIdInput(template.mapping.deviceId || '');
      setGatewayUuidInput(template.mapping.gatewayUuid || '');
      setAgLowerConfig(template.mapping.agLowerConfig || createDefaultConfig(true));
      setAgUpperConfig(template.mapping.agUpperConfig || createDefaultConfig(true));
      setAgAutoConfig(template.mapping.agAutoConfig || createDefaultConfig());
      setAgManualConfig(template.mapping.agManualConfig || createDefaultConfig());
      setAgBypassConfig(template.mapping.agBypassConfig || createDefaultConfig());
      setAgLevelConfig(template.mapping.agLevelConfig || createDefaultConfig());
      setAgOpenConfig(template.mapping.agOpenConfig || createDefaultConfig());
      setAgCloseConfig(template.mapping.agCloseConfig || createDefaultConfig());
      setAgStatusStartConfig(template.mapping.agStatusStartConfig || template.mapping.agStatusConfig || createDefaultConfig());
      setAgStatusStopConfig(template.mapping.agStatusStopConfig || createDefaultConfig());
      setAgTankRange(template.mapping.agTankRange || { domStart: '', domEnd: '', flushStart: '', flushEnd: '' });
      setAgTankType(template.mapping.agTankType || 'DOMESTIC');
      setAgMasterEnabled(template.mapping.agMasterEnabled !== undefined ? template.mapping.agMasterEnabled : true);
      setUgLowerConfig(template.mapping.ugLowerConfig || createDefaultConfig(true));
      setUgUpperConfig(template.mapping.ugUpperConfig || createDefaultConfig(true));
      setUgAutoConfig(template.mapping.ugAutoConfig || createDefaultConfig());
      setUgManualConfig(template.mapping.ugManualConfig || createDefaultConfig());
      setUgStartCmdConfig(template.mapping.ugStartCmdConfig || createDefaultConfig());
      setUgStopCmdConfig(template.mapping.ugStopCmdConfig || createDefaultConfig());
      setUgStartPressConfig(template.mapping.ugStartPressConfig || createDefaultConfig());
      setUgStopPressConfig(template.mapping.ugStopPressConfig || createDefaultConfig());
      setUgLocalModeConfig(template.mapping.ugLocalModeConfig || createDefaultConfig());
      setUgRemoteModeConfig(template.mapping.ugRemoteModeConfig || createDefaultConfig());
      setUgStatusStartConfig(template.mapping.ugStatusStartConfig || createDefaultConfig());
      setUgStatusStopConfig(template.mapping.ugStatusStopConfig || createDefaultConfig());
      setPressureConfig(template.mapping.pressureConfig || createDefaultConfig());
      setElecVoltageConfig(template.mapping.elecVoltageConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ry: '', yb: '', br: '', enabled: true });
      setElecCurrentConfig(template.mapping.elecCurrentConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', r: '', y: '', b: '', enabled: true });
      setElecSystemConfig(template.mapping.elecSystemConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', load: '', enabled: true });
      setElecConsumptionConfig(template.mapping.elecConsumptionConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', kva: '', kwh: '', kvah: '', enabled: true });
      setDgEngineConfig({ ...template.mapping.dgEngineConfig, module: 'ALL' } || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', coolant: '', oilPress: '', speed: '', runtime: '', battery: '', freq: '', enabled: true });
      setDgPowerConfig({ ...template.mapping.dgPowerConfig, module: 'ALL' } || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', vL1L2: '', iL1: '', iL2: '', iL3: '', loadKW: '', appKVA: '', pf: '', kwh: '', enabled: true });
      setDgFuelConfig({ ...template.mapping.dgFuelConfig, module: 'ALL' } || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', level: '', enabled: true });
      setDgFaultConfig({ ...template.mapping.dgFaultConfig, module: 'ALL' } || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', emergencyStop: '', masterTrip: '', overVoltage: '', underVoltage: '', overFrequency: '', underFrequency: '', lowOilLevel: '', overTemp: '', enabled: true });
      setEmVoltageConfig(template.mapping.emVoltageConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vR: '', vY: '', vB: '', enabled: true });
      setEmCurrentConfig(template.mapping.emCurrentConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', iR: '', iY: '', iB: '', enabled: true });
      setEmPowerConfig(template.mapping.emPowerConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', activePower: '', reactivePower: '', apparentPower: '', enabled: true });
      setEmSystemConfig(template.mapping.emSystemConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', commStatus: '', enabled: true });
      setEmConsumptionConfig(template.mapping.emConsumptionConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', cumulativekWh: '', enabled: true });
      setEmChangeConfig(template.mapping.emChangeConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ebKvah: '', ebKwh: '', balance: '', totalKw: '', vR: '', vY: '', vB: '', iR: '', iY: '', iB: '', pf: '', totalKva: '', dgKwh: '', enabled: true });
      setEmWarningConfig(template.mapping.emWarningConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', lowBalanceCut: '', overloadTrip: '', overloadLimitReached: '', connectedStatus: '', forceOff: '', enabled: true });
      setEmReadConfig(template.mapping.emReadConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', meterSrno: '', noOfOverloadCheck: '', ebDgStatus: '', ebTariff: '', dgTariff: '', ebRLoadSet: '', ebYLoadSet: '', ebBLoadSet: '', dgRLoadSet: '', dgYLoadSet: '', dgBLoadSet: '', enabled: true });
      setEmLimitsConfig(template.mapping.emLimitsConfig || {
        vR: { low: '', normalMin: '', normalMax: '', high: '' },
        vY: { low: '', normalMin: '', normalMax: '', high: '' },
        vB: { low: '', normalMin: '', normalMax: '', high: '' },
        iR: { low: '', normalMin: '', normalMax: '', high: '' },
        iY: { low: '', normalMin: '', normalMax: '', high: '' },
        iB: { low: '', normalMin: '', normalMax: '', high: '' },
        totalKw: { low: '', normalMin: '', normalMax: '', high: '' },
        totalKva: { low: '', normalMin: '', normalMax: '', high: '' }
      });
      setEnergyMeteringTarget(template.mapping.energyMeteringTarget || '');
      setSubMeterCategory(template.mapping.subMeterCategory || '');
      setVrvConfig(template.mapping.vrvConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vrvZone: '', temperature: '', humidity: '', co2: '', tvoc: '', aqi: '', targetTemp: '', enabled: true });
      setUgConfig(template.mapping.ugConfig || {
        integration: { 'LEVEL MONITORING': true, 'PUMP STATUS': true, 'AUTO LOGIC': true, 'MANUAL CONTROL': true, 'START COMMAND': true, 'STOP COMMAND': true, 'PRESSURE SENSOR': true },
        electrical: { 'PHASE VOLTAGE': true, 'PHASE CURRENT': true, 'POWER FACTOR': true, 'FREQUENCY': true, 'KW LOAD': true, 'KVAH UNIT': true },
        stationMode: 'REMOTE'
      });
      setUgPumpRange(template.mapping.ugPumpRange || { name: '', id: '' });
      setPressureTarget(template.mapping.pressureTarget || '');
      setElectricalTarget(template.mapping.electricalTarget || '');
      setUgTankLevelConfig(template.mapping.ugTankLevelConfig || createDefaultConfig());
      setUgTankRange(template.mapping.ugTankRange || { name: '', id: '' });
      setTemplateName(template.name || '');
      // 0. Restore Rules (Cross-Module)
      const r1 = template.mapping.rule1Config || template.mapping.ruleEngineConfig || initialRuleState;
      const r2 = template.mapping.rule2Config || template.mapping.ruleEngineConfig || initialRuleState;

      if (template.module === 'AG Tank') {
        setAgRule1Config(r1);
        setAgRule2Config(r2);
      } else if (template.module === 'UG Pump') {
        setUgRule1Config(r1);
        setUgRule2Config(r2);
      }
      setRuleEngineConfig(template.mapping.ruleEngineConfig || r1);

      // 1. Restore Global Location
      let restoredHierarchy = null;

      if (template.mapping.globalHierarchy) {
        restoredHierarchy = template.mapping.globalHierarchy;
      } else {
        // Fallback for legacy data: Search within mapping sections
        const firstSectionWithHierarchy = Object.values(template.mapping).find(
          s => s && typeof s === 'object' && (s.organization || s.building || s.location)
        );

        if (firstSectionWithHierarchy) {
          restoredHierarchy = {
            organization: firstSectionWithHierarchy.organization || '',
            client: firstSectionWithHierarchy.client || '',
            zone: firstSectionWithHierarchy.zone || '',
            subZone: firstSectionWithHierarchy.subZone || '',
            building: firstSectionWithHierarchy.building || firstSectionWithHierarchy.location || ''
          };
        } else {
          // Secondary fallback: Try to derive from AG/UG targets (very useful for old templates with no mapped fields)
          const bName = template.mapping.agTankRange?.domStart ||
            template.mapping.agTankRange?.flushStart ||
            template.mapping.ugTankRange?.name;

          if (bName) {
            restoredHierarchy = findHierarchyFromBuilding(bName);
          }
        }
      }

      if (restoredHierarchy) {
        // Final normalization to ensure we use NAMES (labels) for dropdown matching
        const normalized = findHierarchyFromBuilding(restoredHierarchy.building);
        const finalHierarchy = normalized || restoredHierarchy;

        setGlobalLocation(finalHierarchy);
        if (finalHierarchy.building) {
          fetchLocationDetails(finalHierarchy.building);
        }
      }

      // 2. Restore Module Specific States
      if (template.mapping.ugPumpRange?.pumpNo) {
        setSelectedUgPumpNo(template.mapping.ugPumpRange.pumpNo);
      }

      // 3. Pre-fetch dynamic data for all mapped devices
      Object.values(template.mapping).forEach(config => {
        if (config && typeof config === 'object') {
          // Check for building/location and device
          const locName = config.building || config.location;
          if (locName) fetchLocationDetails(locName);
          if (config.device) fetchDeviceDetails(config.device);
        }
      });

      // 4. Update autofill reference trackers to avoid overwriting loaded settings
      if (template.mapping.dgPowerConfig?.device) {
        lastAutofilledDg.current = template.mapping.dgPowerConfig.device;
      }
      if (template.mapping.emChangeConfig?.device || template.mapping.emVoltageConfig?.device) {
        const activeDev = template.mapping.emChangeConfig?.device || template.mapping.emVoltageConfig?.device;
        lastAutofilledDevice.current = activeDev;
      }
      if (template.mapping.elecVoltageConfig?.device && template.mapping.elecVoltageConfig?.module) {
        lastAutofilledElec.current = `${template.mapping.elecVoltageConfig.device}::${template.mapping.elecVoltageConfig.module}`;
      }
    }
    setEditingTemplateId(template.id);
    setViewMode('FORM');
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  return (
    <div className="fade-in p-4 scada-config-page">
      <div className="page-header d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-4 mb-4 p-4 bg-dark bg-opacity-40 rounded-4 border border-white border-opacity-10 shadow-lg">
        <div className="d-flex align-items-center gap-4">
          <div className="p-3 rounded-4 bg-info bg-opacity-10 text-info border border-info border-opacity-20 shadow-glow">
            <Layers size={32} />
          </div>
          <div>
            <h2 className="mb-0 text-white fw-black tracking-tighter">
              {viewMode === 'FORM' ? 'MAPPING' : 'SAVED'} <span className="text-info">{viewMode === 'FORM' ? 'TEMPLATES' : 'SETTINGS'}</span>
            </h2>
            <p className="text-secondary fs-10 fw-bold opacity-75 mb-0 uppercase letter-spacing-2">
              {viewMode === 'FORM' ? 'Hierarchical Field & Device Configuration' : 'Active System Mappings & Protocols'}
            </p>
          </div>
        </div>

        {toastMessage && (
          <div className="position-fixed start-50 translate-middle-x fade-in" style={{ zIndex: 9999, bottom: '12%' }}>
            <div className={`px-4 py-3 rounded-pill shadow-lg d-flex align-items-center gap-3 border ${toastMessage.type === 'error' ? 'bg-danger bg-opacity-20 border-danger text-danger' : 'bg-success bg-opacity-20 border-success text-success'
              }`} style={{ backdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              {toastMessage.type === 'error' ? <Info size={20} /> : <CheckCircle2 size={20} />}
              <span className="fw-black tracking-widest fs-9">{toastMessage.text}</span>
            </div>
          </div>
        )}

        <div className="d-flex flex-column w-100 w-lg-auto gap-3">
          {viewMode === 'LIST' && (
            <div className="d-flex flex-column flex-sm-row gap-2 w-100">
              {selectedTemplates.length > 0 && (
                <Button variant="danger" className="fw-black px-4 rounded-3 shadow-glow-danger-box me-0 me-sm-2 w-100 text-nowrap" onClick={handleBulkRemove}>
                  <X size={18} className="me-2" /> DELETE SELECTED ({selectedTemplates.length})
                </Button>
              )}
              <Button variant="outline-info" className="fw-bold px-4 rounded-3" onClick={() => {
                setEditingTemplateId(null);
                // Reset AG Configs
                setAgLowerConfig(createDefaultConfig(true));
                setAgUpperConfig(createDefaultConfig(true));
                setAgAutoConfig(createDefaultConfig());
                setAgManualConfig(createDefaultConfig());
                setAgBypassConfig(createDefaultConfig());
                setAgLevelConfig(createDefaultConfig());
                setAgOpenConfig(createDefaultConfig());
                setAgCloseConfig(createDefaultConfig());
                setAgAmpsConfig(createDefaultConfig());
                setAgTankRange({ domStart: '', domEnd: '', flushStart: '', flushEnd: '' });

                // Reset UG Configs
                setUgLowerConfig(createDefaultConfig(true));
                setUgUpperConfig(createDefaultConfig(true));
                setUgAutoConfig(createDefaultConfig());
                setUgManualConfig(createDefaultConfig());
                setUgStartCmdConfig(createDefaultConfig());
                setUgStopCmdConfig(createDefaultConfig());
                setUgStartPressConfig(createDefaultConfig());
                setUgStopPressConfig(createDefaultConfig());
                setUgLocalModeConfig(createDefaultConfig());
                setUgRemoteModeConfig(createDefaultConfig());
                setUgAmpsConfig(createDefaultConfig());
                setUgPumpRange({ name: '', id: '' });

                // Reset Others
                setPressureConfig(createDefaultConfig());
                setElecVoltageConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ry: '', yb: '', br: '', enabled: true });
                setElecCurrentConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', r: '', y: '', b: '', enabled: true });
                setElecSystemConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', load: '', enabled: true });
                setElecConsumptionConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', kva: '', kwh: '', kvah: '', enabled: true });

                // Reset DG & Energy Metering
                setDgEngineConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', coolant: '', oilPress: '', speed: '', runtime: '', battery: '', freq: '', enabled: true });
                setDgPowerConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', vL1L2: '', iL1: '', iL2: '', iL3: '', loadKW: '', appKVA: '', pf: '', kwh: '', enabled: true });
                setDgFuelConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', level: '', enabled: true });
                setDgFaultConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', emergencyStop: '', failToStart: '', enabled: true });
                setEmVoltageConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vR: '', vY: '', vB: '', enabled: true });
                setEmCurrentConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', iR: '', iY: '', iB: '', enabled: true });
                setEmPowerConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', activePower: '', reactivePower: '', apparentPower: '', enabled: true });
                setEmSystemConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', commStatus: '', enabled: true });
                setEmConsumptionConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', cumulativekWh: '', enabled: true });
                setEmChangeConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ebKvah: '', ebKwh: '', balance: '', totalKw: '', vR: '', vY: '', vB: '', iR: '', iY: '', iB: '', pf: '', totalKva: '', dgKwh: '', enabled: true });
                setEmWarningConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', lowBalanceCut: '', overloadTrip: '', overloadLimitReached: '', connectedStatus: '', forceOff: '', enabled: true });
                setEmReadConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', meterSrno: '', noOfOverloadCheck: '', ebDgStatus: '', ebTariff: '', dgTariff: '', ebRLoadSet: '', ebYLoadSet: '', ebBLoadSet: '', dgRLoadSet: '', dgYLoadSet: '', dgBLoadSet: '', enabled: true });
                setEmLimitsConfig({
                  vR: { low: '', normalMin: '', normalMax: '', high: '' },
                  vY: { low: '', normalMin: '', normalMax: '', high: '' },
                  vB: { low: '', normalMin: '', normalMax: '', high: '' },
                  iR: { low: '', normalMin: '', normalMax: '', high: '' },
                  iY: { low: '', normalMin: '', normalMax: '', high: '' },
                  iB: { low: '', normalMin: '', normalMax: '', high: '' },
                  totalKw: { low: '', normalMin: '', normalMax: '', high: '' },
                  totalKva: { low: '', normalMin: '', normalMax: '', high: '' }
                });
                setEnergyMeteringTarget('');
                setTemplateName('');

                setViewMode('FORM');
              }}>
                <Settings size={18} className="me-2" /> MAPPING CONFIGURATION
              </Button>
              <Button variant="info" className="fw-bold px-4 rounded-3 shadow-glow" onClick={() => {
                setEditingTemplateId(null);

                // Reset AG Configs
                setAgLowerConfig(createDefaultConfig(true));
                setAgUpperConfig(createDefaultConfig(true));
                setAgAutoConfig(createDefaultConfig());
                setAgManualConfig(createDefaultConfig());
                setAgBypassConfig(createDefaultConfig());
                setAgLevelConfig(createDefaultConfig());
                setAgOpenConfig(createDefaultConfig());
                setAgCloseConfig(createDefaultConfig());
                setAgAmpsConfig(createDefaultConfig());
                setAgTankRange({ domStart: '', domEnd: '', flushStart: '', flushEnd: '' });

                // Reset UG Configs
                setUgLowerConfig(createDefaultConfig(true));
                setUgUpperConfig(createDefaultConfig(true));
                setUgAutoConfig(createDefaultConfig());
                setUgManualConfig(createDefaultConfig());
                setUgStartCmdConfig(createDefaultConfig());
                setUgStopCmdConfig(createDefaultConfig());
                setUgStartPressConfig(createDefaultConfig());
                setUgStopPressConfig(createDefaultConfig());
                setUgLocalModeConfig(createDefaultConfig());
                setUgRemoteModeConfig(createDefaultConfig());
                setUgAmpsConfig(createDefaultConfig());
                setUgPumpRange({ name: '', id: '' });

                // Reset Others
                setPressureConfig(createDefaultConfig());
                setElecVoltageConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ry: '', yb: '', br: '', enabled: true });
                setElecCurrentConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', r: '', y: '', b: '', enabled: true });
                setElecSystemConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', load: '', enabled: true });
                setElecConsumptionConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', kva: '', kwh: '', kvah: '', enabled: true });

                // Reset DG & Energy Metering
                setDgEngineConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', coolant: '', oilPress: '', speed: '', runtime: '', battery: '', freq: '', enabled: true });
                setDgPowerConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', vL1L2: '', iL1: '', iL2: '', iL3: '', loadKW: '', appKVA: '', pf: '', kwh: '', enabled: true });
                setDgFuelConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', level: '', enabled: true });
                setDgFaultConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: 'ALL', emergencyStop: '', failToStart: '', enabled: true });
                setEmVoltageConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vR: '', vY: '', vB: '', enabled: true });
                setEmCurrentConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', iR: '', iY: '', iB: '', enabled: true });
                setEmPowerConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', activePower: '', reactivePower: '', apparentPower: '', enabled: true });
                setEmSystemConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', commStatus: '', enabled: true });
                setEmConsumptionConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', cumulativekWh: '', enabled: true });
                setEmChangeConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ebKvah: '', ebKwh: '', balance: '', totalKw: '', vR: '', vY: '', vB: '', iR: '', iY: '', iB: '', pf: '', totalKva: '', dgKwh: '', enabled: true });
                setEmWarningConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', lowBalanceCut: '', overloadTrip: '', overloadLimitReached: '', connectedStatus: '', forceOff: '', enabled: true });
                setEmReadConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', meterSrno: '', noOfOverloadCheck: '', ebDgStatus: '', ebTariff: '', dgTariff: '', ebRLoadSet: '', ebYLoadSet: '', ebBLoadSet: '', dgRLoadSet: '', dgYLoadSet: '', dgBLoadSet: '', enabled: true });
                setEmLimitsConfig({
                  vR: { low: '', normalMin: '', normalMax: '', high: '' },
                  vY: { low: '', normalMin: '', normalMax: '', high: '' },
                  vB: { low: '', normalMin: '', normalMax: '', high: '' },
                  iR: { low: '', normalMin: '', normalMax: '', high: '' },
                  iY: { low: '', normalMin: '', normalMax: '', high: '' },
                  iB: { low: '', normalMin: '', normalMax: '', high: '' },
                  totalKw: { low: '', normalMin: '', normalMax: '', high: '' },
                  totalKva: { low: '', normalMin: '', normalMax: '', high: '' }
                });
                setEnergyMeteringTarget('');
                setTemplateName('');
                setVrvConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', temperature: '', humidity: '', co2: '', tvoc: '', aqi: '', targetTemp: '', enabled: true });

                setViewMode('FORM');
              }}>
                <Zap size={18} className="me-2" /> ADD NEW MAPPING
              </Button>
            </div>
          )}
          {viewMode === 'FORM' && (
            <div className="d-flex flex-column flex-xl-row align-items-start align-items-xl-center gap-3 w-100 justify-content-xl-end">
              <div className="d-flex flex-column w-100" style={{ maxWidth: '400px' }}>
                <span className="fs-10 text-secondary fw-black uppercase opacity-50 tracking-widest mb-1">Config Label</span>

                <Form.Control
                  type="text"
                  placeholder="E.g. Primary Mapping V1"
                  className="premium-input bg-dark bg-opacity-40 border-info border-opacity-20 text-info fw-black fs-11 px-3 py-2 rounded-3 w-100"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div className="d-flex flex-column flex-sm-row gap-2 align-self-start align-self-xl-end w-100 w-xl-auto">
                <Button variant="outline-warning" className="fw-bold px-4 rounded-3 border-opacity-25 w-100 text-nowrap" onClick={() => setViewMode('LIST')}>
                  <History size={18} className="me-2" /> PREVIOUS SETTING
                </Button>
                <Button variant="info" className={`fw-bold px-4 rounded-3 shadow-glow transition-all w-100 text-nowrap ${isSaving ? 'opacity-50' : ''}`} onClick={handleSave} disabled={isSaving}>
                  <Save size={18} className="me-2" /> {isSaving ? 'SAVING...' : 'SAVE TEMPLATE'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'FORM' ? (
        <>
          <div className="configuration-form-wrapper p-4 premium-figma-card rounded-4 position-relative overflow-hidden" style={{ marginBottom: '300px' }}>
            <div className="card-inner-glow"></div>
            <div className="position-relative z-1">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <h4 className="text-white fw-black tracking-tighter mb-1 uppercase">MODULE <span className="text-info">CONFIGURATOR</span></h4>
                  <p className="text-secondary fs-12 fw-bold uppercase tracking-widest opacity-50 mb-0">Define hardware parameters and system mapping</p>
                </div>
                <Button variant="outline-danger" className="fw-black px-4 py-2 fs-11 uppercase tracking-widest border-opacity-20 hover-glow-text" onClick={() => setViewMode('LIST')}>
                  Discard
                </Button>
              </div>

              {/* GLOBAL LOCATION SELECTOR - 5 LEVEL HIERARCHY */}
              <div className="mb-5 p-4 rounded-4 border border-info border-opacity-10 bg-dark bg-opacity-20 shadow-inner">
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="p-2 rounded-3 bg-info bg-opacity-10 text-info border border-info border-opacity-10 shadow-glow-blue">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h5 className="text-white fw-black uppercase tracking-tighter mb-0">HIERARCHY <span className="text-info">SPECIFICATION</span></h5>
                    <small className="text-secondary opacity-50 uppercase fs-12 fw-bold tracking-widest">Select target location for mapping</small>
                  </div>
                </div>

                <Row className="g-3">
                  {[
                    { label: 'Organization (Company)', key: 'organization', placeholder: 'SELECT COMPANY' },
                    { label: 'Client (Consumer)', key: 'client', placeholder: 'SELECT CLIENT' },
                    { label: 'Zone', key: 'zone', placeholder: 'SELECT ZONE' },
                    { label: 'Sub Zone / Building', key: 'subZone', placeholder: 'SELECT OPTION' },
                    { label: 'Building / Gateway', key: 'building', placeholder: 'SELECT LOCATION' }
                  ].map((level, idx, arr) => (
                    <Col md={idx === 4 ? 2.4 : 2.4} xl={idx === 4 ? 2.4 : 2.4} key={level.key} style={{ width: '20%' }}>
                      <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block truncate">{level.label}</Form.Label>
                      <Form.Select
                        className={`premium-input p-2 fs-11 fw-bold border-info transition-all ${globalLocation[level.key] ? 'border-opacity-40 text-info' : 'border-opacity-10'}`}
                        value={globalLocation[level.key]}
                        onChange={(e) => handleGlobalHierarchyChange(level.key, e.target.value)}
                        disabled={idx > 0 && !globalLocation[arr[idx - 1].key]}
                        style={{ height: '40px' }}
                      >
                        <option value="">{level.placeholder}</option>
                        {getFieldList(level.key, globalLocation).map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </Form.Select>
                    </Col>
                  ))}
                </Row>

                {/* BREADCRUMB SUMMARY BOX */}
                {globalLocation.organization && (
                  <div className="mt-4 p-3 rounded-3 bg-dark bg-opacity-40 border border-info border-opacity-10 d-flex align-items-center gap-2 flex-wrap">
                    <span className="fs-11 text-secondary fw-black uppercase opacity-40 me-2 letter-spacing-1">Active Path:</span>
                    {['organization', 'client', 'zone', 'subZone', 'building'].map((key, idx, arr) => {
                      const value = globalLocation[key];
                      if (!value) return null;

                      // Find label for breadcrumb if value is an ID
                      const options = getFieldList(key, globalLocation);
                      const opt = options.find(o => o.id === value);
                      const displayLabel = opt ? opt.label : value;

                      return (
                        <React.Fragment key={key}>
                          <div className="px-3 py-1 rounded-pill bg-info bg-opacity-10 text-info fw-black fs-12 uppercase border border-info border-opacity-20 shadow-glow-blue">
                            {displayLabel}
                          </div>
                          {idx < arr.length - 1 && globalLocation[arr[idx + 1].key] && (
                            <ChevronRight size={14} className="text-info opacity-30" />
                          )}
                        </React.Fragment>
                      );
                    })}
                    <Button variant="link" className="ms-auto text-danger fs-11 fw-black text-decoration-none p-0 uppercase opacity-50 hover-opacity-100" onClick={() => setGlobalLocation({ organization: '', client: '', zone: '', subZone: '', building: '' })}>
                      ↺ Reset All
                    </Button>
                  </div>
                )}
              </div>

              <Row className="g-3 mb-4">
                <Col md={6}>
                  <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 scada-data-box">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className="icon-box-premium info" style={{ width: '24px', height: '24px' }}>
                        <Layers size={14} />
                      </div>
                      <small className="text-info d-block fw-black uppercase tracking-widest opacity-80 mb-0" style={{ fontSize: '0.65rem' }}>Step 1: Primary Module Group</small>
                    </div>
                    <Form.Select className="premium-input p-2 fs-11" value={selectedCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
                      {Object.keys(categories).map(cat => (
                        <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                      ))}
                    </Form.Select>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 scada-data-box">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className="icon-box-premium warning" style={{ width: '24px', height: '24px' }}>
                        <Settings size={14} />
                      </div>
                      <small className="text-warning d-block fw-black uppercase tracking-widest opacity-80 mb-0" style={{ fontSize: '0.65rem' }}>Step 2: Operational Sub-Module</small>
                    </div>
                    <Form.Select className="premium-input p-2 fs-11" value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
                      {categories[selectedCategory].map(mod => (
                        <option key={mod} value={mod}>{mod.toUpperCase()}</option>
                      ))}
                    </Form.Select>
                  </div>
                </Col>
              </Row>

              {/* Step 3: Sochiot Status Checks Configuration */}
              <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 mb-4 scada-data-box scale-in" style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(8px)' }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="icon-box-premium info" style={{ width: '24px', height: '24px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                    <Activity size={14} className="text-info animate-pulse" />
                  </div>
                  <div>
                    <small className="text-info d-block fw-black uppercase tracking-widest opacity-80 mb-0" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>Step 3: TRUEiSENSE Status Checks (Auto-filled / Fully Editable)</small>
                    <span className="text-secondary opacity-60" style={{ fontSize: '0.72rem' }}>Specify the TRUEiSENSE Device UUID and Gateway Cluster ID to track real-time online/offline status.</span>
                  </div>
                </div>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fs-10 fw-black uppercase tracking-widest opacity-80 text-info" style={{ letterSpacing: '0.05em' }}>Device UUID (TRUEiSENSE Device ID)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter or select device to auto-fill"
                        className="premium-input p-3 fs-11"
                        value={deviceIdInput}
                        onChange={(e) => setDeviceIdInput(e.target.value)}
                        style={{ height: '42px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#fff' }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fs-10 fw-black uppercase tracking-widest opacity-80 text-warning" style={{ letterSpacing: '0.05em' }}>Gateway UUID / Cluster ID</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter or select device to auto-fill"
                        className="premium-input p-3 fs-11"
                        value={gatewayUuidInput}
                        onChange={(e) => setGatewayUuidInput(e.target.value)}
                        style={{ height: '42px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#fff' }}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              {selectedModule === 'AG Tank' ? (
                <div className="config-form-container scale-in">
                  <div className="p-0 rounded-4 bg-dark bg-opacity-20 border border-white border-opacity-5 mb-4 overflow-hidden position-relative">
                    <div className="p-3 border-bottom border-white border-opacity-5 bg-dark bg-opacity-40 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <LayoutGrid className="text-primary shadow-glow-blue" size={18} />
                        <h6 className="mb-0 text-white fw-black uppercase tracking-widest fs-11">Tank Asset Mapping</h6>
                      </div>
                      <div className="d-flex gap-4 bg-dark bg-opacity-40 px-4 py-2 rounded-pill border border-white border-opacity-10">
                        <Form.Check
                          type="radio"
                          label="DOMESTIC TANK"
                          name="tankType"
                          id="radio-domestic"
                          className="scada-radio text-info fw-black fs-11 uppercase"
                          checked={agTankType === 'DOMESTIC'}
                          onChange={() => setAgTankType('DOMESTIC')}
                        />
                        <Form.Check
                          type="radio"
                          label="UG PUMP"
                          name="ugPumpType"
                          id="radio-flushing"
                          className="scada-radio text-primary fw-black fs-11 uppercase"
                          checked={agTankType === 'FLUSHING'}
                          onChange={() => setAgTankType('FLUSHING')}
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-dark bg-opacity-20">
                      <Row className="g-4 justify-content-center">
                        {agTankType === 'DOMESTIC' ? (
                          <Col md={8}>
                            <div className="p-4 rounded-4 bg-dark bg-opacity-40 border border-info border-opacity-10 premium-figma-card position-relative overflow-hidden transition-all hover-glow-blue">
                              <div className="card-inner-glow bg-info opacity-20"></div>
                              <div className="mb-4 d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div className="icon-box-premium info p-2 shadow-glow-blue"><Home size={20} /></div>
                                  <div>
                                    <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-9">Domestic Tank Configuration</h6>
                                    <small className="text-info opacity-50 uppercase fs-12 fw-bold">Primary Supply Mapping</small>
                                  </div>
                                </div>
                                <Home size={32} className="text-info opacity-5" />
                              </div>
                              <Row className="g-3 align-items-end position-relative z-1">
                                <Col xs={5}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">Source Tower</Form.Label>
                                  <Form.Select className="premium-input p-2 fs-9 fw-bold border-info border-opacity-10"
                                    value={agTankRange.domStart} onChange={(e) => handleDomesticTowerChange(e.target.value)}>
                                    <option value="">SELECT TOWER</option>
                                    {domesticTowers.map(t => {
                                      const isSaved = savedTemplates.some(tmpl => tmpl.module === 'AG Tank' && tmpl.mapping?.agTankRange?.domStart === t.name);
                                      const isDisabled = disabledTowerNames.includes(t.name) || isSaved;
                                      return (
                                        <option key={t.name} value={t.name} disabled={isDisabled}>
                                          {t.name}{disabledTowerNames.includes(t.name) ? ' (DISABLED)' : ''}{isSaved ? ' (ALREADY SAVED)' : ''}
                                        </option>
                                      );
                                    })}
                                  </Form.Select>
                                </Col>
                                <Col xs={3}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">Asset ID</Form.Label>
                                  <div className="p-2 rounded bg-dark bg-opacity-40 border border-info border-opacity-10 text-info fw-black fs-9 text-center" style={{ height: '38px', lineHeight: '22px' }}>
                                    {agTankRange.domEnd || 'D-XX'}
                                  </div>
                                </Col>
                                <Col xs={4}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">Master Control</Form.Label>
                                  <div className="p-1 rounded bg-dark bg-opacity-40 border border-info border-opacity-10 d-flex align-items-center justify-content-between px-3" style={{ height: '38px' }}>
                                    <div className={`p-1 rounded-circle ${agMasterEnabled ? 'bg-info shadow-glow-blue' : 'bg-secondary'} transition-all`} style={{ width: '6px', height: '6px' }}></div>
                                    <Form.Check
                                      type="switch"
                                      className="scada-switch success sm m-0"
                                      checked={agMasterEnabled}
                                      onChange={(e) => {
                                        const val = e.target.checked;
                                        setAgMasterEnabled(val);
                                        autoSaveMasterStatus(val);
                                      }}
                                    />
                                  </div>
                                </Col>
                              </Row>
                            </div>
                          </Col>
                        ) : (
                          <Col md={8}>
                            <div className="p-4 rounded-4 bg-dark bg-opacity-40 border border-primary border-opacity-10 premium-figma-card position-relative overflow-hidden transition-all hover-glow-blue">
                              <div className="card-inner-glow bg-primary opacity-20"></div>
                              <div className="mb-4 d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div className="icon-box-premium primary p-2 shadow-glow-blue"><Droplets size={20} /></div>
                                  <div>
                                    <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-9">Flushing Tank Configuration</h6>
                                    <small className="text-primary opacity-50 uppercase fs-12 fw-bold">Secondary Supply Mapping</small>
                                  </div>
                                </div>
                                <Droplets size={32} className="text-primary opacity-5" />
                              </div>
                              <Row className="g-3 align-items-end position-relative z-1">
                                <Col xs={5}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">Source Tower</Form.Label>
                                  <Form.Select className="premium-input p-2 fs-9 fw-bold border-primary border-opacity-10"
                                    value={agTankRange.flushStart} onChange={(e) => handleFlushingTowerChange(e.target.value)}>
                                    <option value="">SELECT TOWER</option>
                                    {flushingTowers.map(t => {
                                      const isSaved = savedTemplates.some(tmpl => tmpl.module === 'AG Tank' && tmpl.mapping?.agTankRange?.flushStart === t.name);
                                      const isDisabled = disabledTowerNames.includes(t.name) || isSaved;
                                      return (
                                        <option key={t.name} value={t.name} disabled={isDisabled}>
                                          {t.name}{disabledTowerNames.includes(t.name) ? ' (DISABLED)' : ''}{isSaved ? ' (ALREADY SAVED)' : ''}
                                        </option>
                                      );
                                    })}
                                  </Form.Select>
                                </Col>
                                <Col xs={3}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">Asset ID</Form.Label>
                                  <div className="p-2 rounded bg-dark bg-opacity-40 border border-primary border-opacity-10 text-primary fw-black fs-9 text-center" style={{ height: '38px', lineHeight: '22px' }}>
                                    {agTankRange.flushEnd || 'F-XX'}
                                  </div>
                                </Col>
                                <Col xs={4}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">Master Control</Form.Label>
                                  <div className="p-1 rounded bg-dark bg-opacity-40 border border-primary border-opacity-10 d-flex align-items-center justify-content-between px-3" style={{ height: '38px' }}>
                                    <div className={`p-1 rounded-circle ${agMasterEnabled ? 'bg-primary shadow-glow-blue' : 'bg-secondary'} transition-all`} style={{ width: '6px', height: '6px' }}></div>
                                    <Form.Check
                                      type="switch"
                                      className="scada-switch success sm m-0"
                                      checked={agMasterEnabled}
                                      onChange={(e) => {
                                        const val = e.target.checked;
                                        setAgMasterEnabled(val);
                                        autoSaveMasterStatus(val);
                                      }}
                                    />
                                  </div>
                                </Col>
                              </Row>
                            </div>
                          </Col>
                        )}
                      </Row>
                    </div>
                  </div>

                  <div className="mb-5">
                    <Row className="g-4">
                      {[
                        { title: 'Lower Limits', state: agLowerConfig, setter: setAgLowerConfig, icon: <ArrowDownCircle size={18} />, color: 'info' },
                        { title: 'Upper Limits', state: agUpperConfig, setter: setAgUpperConfig, icon: <ArrowUpCircle size={18} />, color: 'primary' },
                        { title: 'Auto Mode', state: agAutoConfig, setter: setAgAutoConfig, icon: <Activity size={18} />, color: 'success' },
                        { title: 'Manual Mode', state: agManualConfig, setter: setAgManualConfig, icon: <Settings size={18} />, color: 'warning' },
                        { title: 'Bypass Mode', state: agBypassConfig, setter: setAgBypassConfig, icon: <Zap size={18} />, color: 'danger' },
                        { title: 'Water Level', state: agLevelConfig, setter: setAgLevelConfig, icon: <Layers size={18} />, color: 'info' },
                        { title: 'Open Valve', state: agOpenConfig, setter: setAgOpenConfig, icon: <Droplets size={18} />, color: 'primary' },
                        { title: 'Close Valve', state: agCloseConfig, setter: setAgCloseConfig, icon: <X size={18} />, color: 'danger' },
                        { title: 'Valve Status  Start', state: agStatusStartConfig, setter: setAgStatusStartConfig, icon: <Activity size={18} />, color: 'success' },
                        { title: 'Valve Status  Stop', state: agStatusStopConfig, setter: setAgStatusStopConfig, icon: <Activity size={18} />, color: 'warning' },
                        { title: 'Current Monitor', state: agAmpsConfig, setter: setAgAmpsConfig, icon: <Zap size={18} />, color: 'info' },
                      ].map((section, idx) => (
                        <Col md={6} key={idx}>
                          <div className={`p-4 rounded-4 bg-dark bg-opacity-40 border border-${section.color} border-opacity-10 premium-figma-card h-100 position-relative overflow-hidden transition-all ${agMasterEnabled ? `hover-glow-${section.color}` : 'opacity-25 grayscale'}`} style={{ pointerEvents: agMasterEnabled ? 'auto' : 'none' }}>
                            <div className={`card-inner-glow bg-${section.color} opacity-5`}></div>

                            {/* HEADER */}
                            <div className="mb-4 d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center gap-3">
                                <div className={`icon-box-premium ${section.color} p-2 shadow-glow-${section.color}`}>
                                  {section.icon}
                                </div>
                                <div>
                                  <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-10">
                                    {section.title} {
                                      (section.title.toUpperCase().includes('COMMAND') || section.title.toUpperCase().includes('CMD') || section.title.includes('Limits'))
                                        ? <span className="ms-2 text-info opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(WRITE)</span>
                                        : <span className="ms-2 text-warning opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(READ ONLY)</span>
                                    }
                                  </h6>
                                  <small className={`text-${section.color} opacity-50 uppercase fs-12 fw-bold tracking-widest`}>Sensor Mapping</small>
                                </div>
                              </div>
                              {(section.title === 'Lower Limits' || section.title === 'Upper Limits') && (
                                <Button
                                  variant={`outline-${section.color}`}
                                  size="sm"
                                  className="ms-auto fw-black fs-11 px-3 py-1 rounded-pill d-flex align-items-center gap-1 shadow-glow me-2"
                                  onClick={() => {
                                    const config = section.title === 'Lower Limits' ? agRule1Config : agRule2Config;
                                    handleSendRule({ ...config, moduleId: section.state.module });
                                  }}
                                >
                                  <Zap size={12} /> SEND
                                </Button>
                              )}
                              {!section.isAction && (
                                <Form.Check
                                  type="switch"
                                  className={`scada-switch ${section.color}`}
                                  checked={section.state.enabled}
                                  onChange={(e) => section.setter({ ...section.state, enabled: e.target.checked })}
                                />
                              )}
                              {section.isAction && (
                                <Button variant={`outline-${section.color}`} size="sm" className="fw-black fs-11 px-3 py-1 rounded-pill" onClick={section.setter}>
                                  CONFIGURE
                                </Button>
                              )}
                            </div>

                            {/* MAPPING BOXES */}
                            {!section.isAction && (
                              <div className={`transition-all ${!section.state.enabled ? 'opacity-25 grayscale' : ''}`}>
                                <Row className="g-3 position-relative z-1">
                                  {!isHierarchyUnlocked ? (
                                    <Col md={12}>
                                      <div className="p-3 rounded bg-dark bg-opacity-40 border border-warning border-opacity-20 text-center shadow-glow-warning-box">
                                        <small className="text-warning fw-black uppercase tracking-widest fs-12">
                                          <Info size={14} className="me-2" /> Select any hierarchy level in MODULE CONFIGURATOR to unlock mapping
                                        </small>
                                      </div>
                                    </Col>
                                  ) : (
                                    <>
                                      {/* PRIMARY MAPPING ROW */}
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-flex align-items-center gap-2">
                                          <Home size={12} /> BUILDING
                                        </Form.Label>
                                        <Form.Select
                                          className={`premium-input p-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px', background: 'rgba(15, 23, 42, 0.4)' }}
                                          value={section.state.building || globalLocation.building}
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'building', e.target.value)}
                                        >
                                          <option value="">SELECT OPTION</option>
                                          {getFieldList('building', { ...globalLocation, ...section.state }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-flex align-items-center gap-2">
                                          <Zap size={12} /> DEVICE_ID
                                        </Form.Label>
                                        <Form.Select
                                          className={`premium-input p-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px', background: 'rgba(15, 23, 42, 0.4)' }}
                                          value={section.state.device}
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'device', e.target.value)}
                                        >
                                          <option value="">SELECT DEVICE</option>
                                          {getFieldList('device', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-flex align-items-center gap-2">
                                          <Layers size={12} /> MODULE_ID
                                        </Form.Label>
                                        <Form.Select
                                          className={`premium-input p-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px', background: 'rgba(15, 23, 42, 0.4)' }}
                                          value={section.state.module}
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'module', e.target.value)}
                                        >
                                          <option value="">SELECT MODULE</option>
                                          {getFieldList('module', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => {
                                            const isRuleEngine = section.title === 'Lower Limits' || section.title === 'Upper Limits';
                                            const isUsed = isRuleEngine && usedModules.some(m => String(m).trim() === String(opt.id).trim()) && opt.id !== section.state.module;
                                            return (
                                              <option key={opt.id} value={opt.id} disabled={isUsed} style={isUsed ? { color: '#64748b', fontStyle: 'italic' } : {}}>
                                                {opt.label} {isUsed ? ' (USED)' : ''}
                                              </option>
                                            );
                                          })}
                                        </Form.Select>
                                      </Col>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-flex align-items-center gap-2">
                                          <Activity size={12} /> EVENT_FIELD
                                        </Form.Label>
                                        <Form.Control
                                          as="input"
                                          list={`datalist-ag-${section.title.replace(/\s+/g, '-')}-${idx}`}
                                          className={`premium-input p-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px', background: 'rgba(15, 23, 42, 0.4)' }}
                                          value={section.state.field}
                                          placeholder="TYPE FIELD"
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'field', e.target.value)}
                                        />
                                        <datalist id={`datalist-ag-${section.title.replace(/\s+/g, '-')}-${idx}`}>
                                          {getFieldList('field', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </datalist>
                                      </Col>

                                      {/* LOGIC CONDITION ROW FOR STATUS */}
                                      {section.title.includes('Status') && (
                                        <Col md={12} className="mt-3">
                                          <div className="p-3 rounded-4 border border-white border-opacity-5" style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(4px)' }}>
                                            <div className="d-flex align-items-center gap-4">
                                              <div className="flex-shrink-0">
                                                <small className={`text-${section.color} fw-black uppercase tracking-widest fs-10 opacity-75 d-block mb-1`}>Logic Condition</small>
                                                <div className="fs-11 text-secondary fw-bold opacity-40 uppercase tracking-tighter">Threshold Logic</div>
                                              </div>

                                              <div className="flex-grow-1 d-flex gap-3">
                                                <div style={{ width: '120px' }}>
                                                  <Form.Label className="fs-10 text-secondary fw-black uppercase tracking-widest opacity-40 mb-1 d-block">Operator</Form.Label>
                                                  <Form.Select
                                                    className={`premium-input py-2 px-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                                    style={{ height: '38px', background: 'rgba(15, 23, 42, 0.6)' }}
                                                    value={section.state.operator}
                                                    onChange={(e) => handleConfigChange(section.state, section.setter, 'operator', e.target.value)}
                                                  >
                                                    <option value="=">EQUAL (=)</option>
                                                    <option value=">">GREATER (&gt;)</option>
                                                    <option value="<">LESS (&lt;)</option>
                                                  </Form.Select>
                                                </div>

                                                <div style={{ width: '120px' }}>
                                                  <Form.Label className="fs-10 text-secondary fw-black uppercase tracking-widest opacity-40 mb-1 d-block">Value</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    className={`premium-input py-2 px-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner text-white`}
                                                    style={{ height: '38px', background: 'rgba(15, 23, 42, 0.6)' }}
                                                    value={section.state.value}
                                                    placeholder="ENTER VALUE"
                                                    onChange={(e) => {
                                                      handleConfigChange(section.state, section.setter, 'value', e.target.value);
                                                    }}
                                                  />
                                                </div>
                                              </div>

                                              <div className="ms-auto text-end opacity-20">
                                                <Settings size={24} className={`text-${section.color}`} />
                                              </div>
                                            </div>
                                          </div>
                                        </Col>
                                      )}
                                    </>
                                  )}
                                </Row>
                              </div>
                            )}

                            {/* RULE ENGINE SHORTCUT FOR LIMITS */}
                            {(section.title === 'Lower Limits' || section.title === 'Upper Limits') && (
                              <div className="mt-4 pt-3 border-top border-white border-opacity-5 d-flex justify-content-end">
                                {(!section.state.enabled || !section.state.module) ? (
                                  <div className={`text-${section.color} fs-11 fw-black uppercase tracking-widest d-flex align-items-center gap-2 opacity-50`}>
                                    <Zap size={14} />
                                    RULE ENGINE NOT MAPPED
                                  </div>
                                ) : (
                                  <Button
                                    variant="link"
                                    className={`p-0 text-${section.color} text-decoration-none fs-11 fw-black uppercase tracking-widest d-flex align-items-center gap-2 transition-all hover-opacity-100 opacity-70`}
                                    onClick={() => {
                                      const target = section.title === 'Lower Limits' ? 'RULE1' : 'RULE2';
                                      const config = target === 'RULE1' ? agRule1Config : agRule2Config;
                                      setCurrentRuleTarget(target);
                                      setRuleEngineConfig({ ...config, moduleId: section.state.module });
                                      setShowRuleEngineModal(true);
                                    }}
                                  >
                                    <Zap size={14} className="shadow-glow-blue" />
                                    Rule Engine Configuration
                                    <ChevronRight size={14} />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </div>
              ) : selectedModule === 'UG Pump' ? (
                <div className="config-form-container scale-in">
                  <div className="p-0 rounded-4 bg-dark bg-opacity-20 border border-white border-opacity-5 mb-5 overflow-hidden position-relative">
                    <div className="p-3 border-bottom border-white border-opacity-5 bg-dark bg-opacity-40 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <Database className="text-success shadow-glow-green" size={18} />
                        <h6 className="mb-0 text-white fw-black uppercase tracking-widest fs-11">UG Pump Network Integration</h6>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <Form.Select
                          className="premium-input p-2 fs-10 fw-bold border-success border-opacity-20"
                          style={{ width: '150px' }}
                          value={selectedUgPumpNo || ''}
                          onChange={(e) => handleUgPumpNoChange(Number(e.target.value))}
                        >
                          <option value="">SELECT UNIT</option>
                          {[1, 2, 3].map(no => {
                            const isSaved = savedTemplates.some(t => t.module === 'UG Pump' && t.mapping?.ugPumpRange?.pumpNo === no);
                            return (
                              <option key={no} value={no} disabled={isSaved}>
                                PUMP {no} {isSaved ? '(ALREADY SAVED)' : ''}
                              </option>
                            );
                          })}
                        </Form.Select>
                      </div>
                    </div>

                    <div className={`p-4 bg-dark bg-opacity-20 position-relative ${!selectedUgPumpNo ? 'opacity-25 grayscale' : ''}`} style={{ pointerEvents: selectedUgPumpNo ? 'auto' : 'none' }}>
                      <Row className="g-4">
                        {[
                          { title: 'Lower Limits', state: ugLowerConfig, setter: setUgLowerConfig, icon: <ArrowDownCircle size={18} />, color: 'info' },
                          { title: 'Upper Limits', state: ugUpperConfig, setter: setUgUpperConfig, icon: <ArrowUpCircle size={18} />, color: 'primary' },
                          { title: 'Auto Setting', state: ugAutoConfig, setter: setUgAutoConfig, icon: <Activity size={18} />, color: 'success' },
                          { title: 'Manual Setting', state: ugManualConfig, setter: setUgManualConfig, icon: <Settings size={18} />, color: 'warning' },
                          { title: 'Start Command', state: ugStartCmdConfig, setter: setUgStartCmdConfig, icon: <Zap size={18} />, color: 'info' },
                          { title: 'Stop Command', state: ugStopCmdConfig, setter: setUgStopCmdConfig, icon: <X size={18} />, color: 'danger' },
                          { title: 'Valve Status Start', state: ugStatusStartConfig, setter: setUgStatusStartConfig, icon: <Activity size={18} />, color: 'success' },
                          { title: 'Valve Status Stop', state: ugStatusStopConfig, setter: setUgStatusStopConfig, icon: <Activity size={18} />, color: 'danger' },
                          { title: 'Start Pressure', state: ugStartPressConfig, setter: setUgStartPressConfig, icon: <Activity size={18} />, color: 'primary' },
                          { title: 'Stop Pressure', state: ugStopPressConfig, setter: setUgStopPressConfig, icon: <Zap size={18} />, color: 'warning' },
                          { title: 'Local Mode', state: ugLocalModeConfig, setter: setUgLocalModeConfig, icon: <Home size={18} />, color: 'info' },
                          { title: 'Remote Mode', state: ugRemoteModeConfig, setter: setUgRemoteModeConfig, icon: <Activity size={18} />, color: 'primary' },
                          { title: 'Current Monitor', state: ugAmpsConfig, setter: setUgAmpsConfig, icon: <Zap size={18} />, color: 'warning' },
                        ].map((section, idx) => (
                          <Col md={6} key={idx}>
                            <div className={`p-4 rounded-4 bg-dark bg-opacity-40 border border-${section.color} border-opacity-10 premium-figma-card h-100 position-relative overflow-hidden transition-all hover-glow-${section.color}`}>
                              <div className={`card-inner-glow bg-${section.color} opacity-5`}></div>

                              {/* HEADER */}
                              <div className="mb-4 d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div className={`icon-box-premium ${section.color} p-2 shadow-glow-${section.color}`}>
                                    {section.icon}
                                  </div>
                                  <div>
                                    <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-10">
                                      {section.title} {
                                        (section.title.toUpperCase().includes('COMMAND') || section.title.toUpperCase().includes('CMD') || section.title.includes('Limits'))
                                          ? <span className="ms-2 text-info opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(WRITE)</span>
                                          : <span className="ms-2 text-warning opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(READ ONLY)</span>
                                      }
                                    </h6>
                                    <small className={`text-${section.color} opacity-50 uppercase fs-12 fw-bold tracking-widest`}>UG Pump Mapping</small>
                                  </div>
                                </div>
                                {(section.title === 'Lower Limits' || section.title === 'Upper Limits') && (
                                  <Button
                                    variant={`outline-${section.color}`}
                                    size="sm"
                                    className="ms-auto fw-black fs-11 px-3 py-1 rounded-pill d-flex align-items-center gap-1 shadow-glow me-2"
                                    onClick={() => {
                                      const config = section.title === 'Lower Limits' ? ugRule1Config : ugRule2Config;
                                      handleSendRule({ ...config, moduleId: section.state.module });
                                    }}
                                  >
                                    <Zap size={12} /> SEND
                                  </Button>
                                )}
                                <Form.Check
                                  type="switch"
                                  className={`scada-switch ${section.color}`}
                                  checked={section.state.enabled}
                                  onChange={(e) => section.setter({ ...section.state, enabled: e.target.checked })}
                                />
                              </div>

                              {/* MAPPING BOXES */}
                              <div className={`transition-all ${!section.state.enabled ? 'opacity-25 grayscale' : ''}`}>
                                <Row className="g-3 position-relative z-1">
                                  {!isHierarchyUnlocked ? (
                                    <Col md={12}>
                                      <div className="p-3 rounded bg-dark bg-opacity-40 border border-warning border-opacity-20 text-center shadow-glow-warning-box">
                                        <small className="text-warning fw-black uppercase tracking-widest fs-12">
                                          <Info size={14} className="me-2" /> Select any hierarchy level in MODULE CONFIGURATOR to unlock mapping
                                        </small>
                                      </div>
                                    </Col>
                                  ) : (
                                    <>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block truncate">BUILDING / GATEWAY</Form.Label>
                                        <Form.Select
                                          className={`premium-input p-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px' }}
                                          value={section.state.building || globalLocation.building}
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'building', e.target.value)}
                                        >
                                          <option value="">SELECT OPTION</option>
                                          {getFieldList('building', { ...globalLocation, ...section.state }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">DEVICE_ID</Form.Label>
                                        <Form.Select
                                          className={`premium-input p-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px' }}
                                          value={section.state.device}
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'device', e.target.value)}
                                        >
                                          <option value="">SELECT DEVICE_ID</option>
                                          {getFieldList('device', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">MODULE_ID</Form.Label>
                                        <Form.Select
                                          className={`premium-input p-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px' }}
                                          value={section.state.module}
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'module', e.target.value)}
                                        >
                                          <option value="">SELECT MODULE_ID</option>
                                          {getFieldList('module', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => {
                                            const isRuleEngine = section.title === 'Lower Limits' || section.title === 'Upper Limits';
                                            const isUsed = isRuleEngine && usedModules.some(m => String(m).trim() === String(opt.id).trim()) && opt.id !== section.state.module;
                                            return (
                                              <option key={opt.id} value={opt.id} disabled={isUsed} style={isUsed ? { color: '#64748b', fontStyle: 'italic' } : {}}>
                                                {opt.label} {isUsed ? ' (ALREADY SELECTED)' : ''}
                                              </option>
                                            );
                                          })}
                                        </Form.Select>
                                      </Col>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">EVENT_ FIELD</Form.Label>
                                        <Form.Control
                                          as="input"
                                          list={`datalist-ugp-${section.title.replace(/\s+/g, '-')}-${idx}`}
                                          className={`premium-input p-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px' }}
                                          value={section.state.field}
                                          placeholder="SELECT OR TYPE"
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'field', e.target.value)}
                                        />
                                        <datalist id={`datalist-ugp-${section.title.replace(/\s+/g, '-')}-${idx}`}>
                                          {getFieldList('field', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </datalist>
                                      </Col>

                                      {/* LOGIC CONDITION ROW FOR STATUS */}
                                      {section.title.includes('Status') && (
                                        <Col md={12} className="mt-3">
                                          <div className="p-3 rounded-4 border border-white border-opacity-5" style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(4px)' }}>
                                            <div className="d-flex align-items-center gap-4">
                                              <div className="flex-shrink-0">
                                                <small className={`text-${section.color} fw-black uppercase tracking-widest fs-10 opacity-75 d-block mb-1`}>Logic Condition</small>
                                                <div className="fs-11 text-secondary fw-bold opacity-40 uppercase tracking-tighter">Threshold Logic</div>
                                              </div>

                                              <div className="flex-grow-1 d-flex gap-3">
                                                <div style={{ width: '120px' }}>
                                                  <Form.Label className="fs-10 text-secondary fw-black uppercase tracking-widest opacity-40 mb-1 d-block">Operator</Form.Label>
                                                  <Form.Select
                                                    className={`premium-input py-2 px-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                                    style={{ height: '38px', background: 'rgba(15, 23, 42, 0.6)' }}
                                                    value={section.state.operator}
                                                    onChange={(e) => handleConfigChange(section.state, section.setter, 'operator', e.target.value)}
                                                  >
                                                    <option value="=">EQUAL (=)</option>
                                                    <option value=">">GREATER (&gt;)</option>
                                                    <option value="<">LESS (&lt;)</option>
                                                  </Form.Select>
                                                </div>

                                                <div style={{ width: '120px' }}>
                                                  <Form.Label className="fs-10 text-secondary fw-black uppercase tracking-widest opacity-40 mb-1 d-block">Value</Form.Label>
                                                  <Form.Control
                                                    type="text"
                                                    className={`premium-input py-2 px-3 fs-12 fw-bold border-${section.color} border-opacity-10 shadow-inner text-white`}
                                                    style={{ height: '38px', background: 'rgba(15, 23, 42, 0.6)' }}
                                                    value={section.state.value}
                                                    placeholder="ENTER VALUE"
                                                    onChange={(e) => {
                                                      handleConfigChange(section.state, section.setter, 'value', e.target.value);
                                                    }}
                                                  />
                                                </div>
                                              </div>

                                              <div className="ms-auto text-end opacity-20">
                                                <Settings size={24} className={`text-${section.color}`} />
                                              </div>
                                            </div>
                                          </div>
                                        </Col>
                                      )}
                                    </>
                                  )}
                                </Row>
                              </div>

                              {/* RULE ENGINE SHORTCUT FOR LIMITS */}
                              {(section.title === 'Lower Limits' || section.title === 'Upper Limits') && (
                                <div className="mt-4 pt-3 border-top border-white border-opacity-5 d-flex justify-content-end">
                                  {(!section.state.enabled || !section.state.module) ? (
                                    <div className={`text-${section.color} fs-11 fw-black uppercase tracking-widest d-flex align-items-center gap-2 opacity-50`}>
                                      <Zap size={14} />
                                      RULE ENGINE NOT MAPPED
                                    </div>
                                  ) : (
                                    <Button
                                      variant="link"
                                      className={`p-0 text-${section.color} text-decoration-none fs-11 fw-black uppercase tracking-widest d-flex align-items-center gap-2 transition-all hover-opacity-100 opacity-70`}
                                      onClick={() => {
                                        const target = section.title === 'Lower Limits' ? 'RULE1' : 'RULE2';
                                        const config = target === 'RULE1' ? ugRule1Config : ugRule2Config;
                                        setCurrentRuleTarget(target);
                                        setRuleEngineConfig({ ...config, moduleId: section.state.module });
                                        setShowRuleEngineModal(true);
                                      }}
                                    >
                                      <Zap size={14} className="shadow-glow-blue" />
                                      Rule Engine Configuration
                                      <ChevronRight size={14} />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </div>
                </div>
              ) : selectedModule === 'UG Tank' ? (
                <div className="config-form-container scale-in">
                  <div className="p-0 rounded-4 bg-dark bg-opacity-20 border border-white border-opacity-5 mb-5 overflow-hidden position-relative">
                    <div className="p-3 border-bottom border-white border-opacity-5 bg-dark bg-opacity-40 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <Droplets className="text-info shadow-glow-blue" size={18} />
                        <h6 className="mb-0 text-white fw-black uppercase tracking-widest fs-11">UG Tank Level Integration <span className="opacity-40">(Hydrostatic / Ultrasonic)</span></h6>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <Form.Label className="mb-0 text-secondary fs-10 fw-black uppercase tracking-widest opacity-50">Target Asset:</Form.Label>
                        <Form.Select
                          className="premium-input p-2 fs-10 fw-bold border-info border-opacity-20"
                          style={{ width: '220px' }}
                          value={ugTankRange.name}
                          onChange={(e) => handleUgTankChange(e.target.value)}
                        >
                          <option value="">SELECT TANK UNIT</option>
                          {ugPumpsList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </Form.Select>
                      </div>
                    </div>

                    <div className="p-4 bg-dark bg-opacity-20">
                      <Row className="g-4 justify-content-center">
                        <Col md={8}>
                          <div className="p-4 rounded-4 bg-dark bg-opacity-40 border border-info border-opacity-10 premium-figma-card h-100 position-relative overflow-hidden transition-all hover-glow-blue">
                            <div className="card-inner-glow bg-info opacity-5"></div>

                            {/* HEADER */}
                            <div className="mb-4 d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center gap-3">
                                <div className="icon-box-premium info p-2 shadow-glow-blue">
                                  <Layers size={20} />
                                </div>
                                <div>
                                  <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-10">Water Level Mapping</h6>
                                  <small className="text-info opacity-50 uppercase fs-12 fw-bold tracking-widest">Tank Depth Analytics</small>
                                </div>
                              </div>
                              <Form.Check
                                type="switch"
                                className="scada-switch success"
                                checked={ugTankLevelConfig.enabled}
                                onChange={(e) => setUgTankLevelConfig({ ...ugTankLevelConfig, enabled: e.target.checked })}
                              />
                            </div>

                            {/* MAPPING GRID */}
                            <div className={`transition-all ${!ugTankLevelConfig.enabled ? 'opacity-25 grayscale' : ''}`}>
                              <Row className="g-3 position-relative z-1">
                                {!isHierarchyUnlocked ? (
                                  <Col md={12}>
                                    <div className="p-3 rounded bg-dark bg-opacity-40 border border-warning border-opacity-20 text-center shadow-glow-warning-box">
                                      <small className="text-warning fw-black uppercase tracking-widest fs-12">
                                        <Info size={14} className="me-2" /> Select any hierarchy level in MODULE CONFIGURATOR to unlock mapping
                                      </small>
                                    </div>
                                  </Col>
                                ) : (
                                  <>
                                    <Col md={3}>
                                      <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block truncate">BUILDING / GATEWAY</Form.Label>
                                      <Form.Select
                                        className="premium-input p-3 fs-12 fw-bold border-info border-opacity-10 shadow-inner"
                                        style={{ height: '45px' }}
                                        value={ugTankLevelConfig.building || globalLocation.building}
                                        onChange={(e) => handleConfigChange(ugTankLevelConfig, setUgTankLevelConfig, 'building', e.target.value)}
                                      >
                                        <option value="">SELECT OPTION</option>
                                        {getFieldList('building', { ...globalLocation, ...ugTankLevelConfig }).map(opt => (
                                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                      </Form.Select>
                                    </Col>
                                    <Col md={3}>
                                      <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">DEVICE_ID</Form.Label>
                                      <Form.Select
                                        className="premium-input p-3 fs-12 fw-bold border-info border-opacity-10 shadow-inner"
                                        style={{ height: '45px' }}
                                        value={ugTankLevelConfig.device}
                                        onChange={(e) => handleConfigChange(ugTankLevelConfig, setUgTankLevelConfig, 'device', e.target.value)}
                                      >
                                        <option value="">SELECT DEVICE_ID</option>
                                        {getFieldList('device', { ...globalLocation, ...ugTankLevelConfig, building: ugTankLevelConfig.building || globalLocation.building }).map(opt => (
                                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                      </Form.Select>
                                    </Col>
                                    <Col md={3}>
                                      <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">MODULE_ID</Form.Label>
                                      <Form.Select
                                        className="premium-input p-3 fs-12 fw-bold border-info border-opacity-10 shadow-inner"
                                        style={{ height: '45px' }}
                                        value={ugTankLevelConfig.module}
                                        onChange={(e) => handleConfigChange(ugTankLevelConfig, setUgTankLevelConfig, 'module', e.target.value)}
                                      >
                                        <option value="">SELECT MODULE_ID</option>
                                        {getFieldList('module', { ...globalLocation, ...ugTankLevelConfig, building: ugTankLevelConfig.building || globalLocation.building }).map(opt => {
                                          const isRuleEngine = false; // UG Tank Level is usually not a rule engine card directly here
                                          const isUsed = isRuleEngine && usedModules.some(m => String(m).trim() === String(opt.id).trim()) && opt.id !== ugTankLevelConfig.module;
                                          return (
                                            <option key={opt.id} value={opt.id} disabled={isUsed} style={isUsed ? { color: '#64748b', fontStyle: 'italic' } : {}}>
                                              {opt.label} {isUsed ? ' (ALREADY SELECTED)' : ''}
                                            </option>
                                          );
                                        })}
                                      </Form.Select>
                                    </Col>
                                    <Col md={3}>
                                      <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">EVENT_ FIELD</Form.Label>
                                      <Form.Control
                                        as="input"
                                        list="datalist-ugt-level"
                                        className="premium-input p-3 fs-12 fw-bold border-info border-opacity-10 shadow-inner"
                                        style={{ height: '45px' }}
                                        value={ugTankLevelConfig.field}
                                        placeholder="SELECT OR TYPE"
                                        onChange={(e) => handleConfigChange(ugTankLevelConfig, setUgTankLevelConfig, 'field', e.target.value)}
                                      />
                                      <datalist id="datalist-ugt-level">
                                        {getFieldList('field', { ...globalLocation, ...ugTankLevelConfig, building: ugTankLevelConfig.building || globalLocation.building }).map(opt => (
                                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                      </datalist>
                                    </Col>
                                  </>
                                )}
                              </Row>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </div>
              ) : selectedModule === 'Pressure' ? (
                <div className="config-form-container scale-in">
                  <div className="p-0 rounded-4 bg-dark bg-opacity-20 border border-white border-opacity-5 mb-5 overflow-hidden position-relative">
                    <div className="p-3 border-bottom border-white border-opacity-5 bg-dark bg-opacity-40 d-flex align-items-center gap-2">
                      <Activity className="text-info shadow-glow-blue" size={18} />
                      <h6 className="mb-0 text-white fw-black uppercase tracking-widest fs-11">Pressure Transmitter Mapping <span className="opacity-40">(Analog / Digital)</span></h6>
                    </div>
                    <div className="p-4 bg-dark bg-opacity-20">
                      <Row className="g-4">
                        <Col md={12}>
                          <div className="p-4 rounded-4 bg-dark bg-opacity-40 border border-info border-opacity-10 premium-figma-card position-relative overflow-hidden transition-all hover-glow-blue">
                            <div className="card-inner-glow bg-info opacity-5"></div>

                            {/* HEADER */}
                            <div className="mb-4 d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center gap-3">
                                <div className="icon-box-premium info p-2 shadow-glow-blue">
                                  <Zap size={20} />
                                </div>
                                <div>
                                  <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-10">Pressure_Settings</h6>
                                  <small className="text-info opacity-50 uppercase fs-12 fw-bold tracking-widest">Feedback Analytics</small>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                <div className="d-flex align-items-center gap-3 bg-dark bg-opacity-30 p-1 px-3 rounded-pill border border-info border-opacity-10">
                                  <Form.Label className="mb-0 text-secondary fs-11 fw-black uppercase tracking-widest opacity-50">Sensor Unit:</Form.Label>
                                  <Form.Select
                                    className="premium-input p-1 fs-11 fw-bold border-0 bg-transparent text-info"
                                    style={{ width: '180px', height: '30px' }}
                                    value={pressureTarget}
                                    onChange={(e) => handlePressureTargetChange(e.target.value)}
                                  >
                                    <option value="">SELECT SENSOR</option>
                                    {pressureSensorsList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                  </Form.Select>
                                </div>
                                <Form.Check
                                  type="switch"
                                  className="scada-switch success"
                                  checked={pressureConfig.enabled}
                                  onChange={(e) => setPressureConfig({ ...pressureConfig, enabled: e.target.checked })}
                                />
                              </div>
                            </div>
                            {/* HEADER END */}

                            <div className={`transition-all ${!pressureTarget ? 'opacity-25 grayscale' : ''}`} style={{ pointerEvents: pressureTarget ? 'auto' : 'none' }}>
                              {!pressureTarget && (
                                <div className="text-center py-2">
                                  <small className="text-info fw-black uppercase tracking-widest opacity-50 fs-12"><Info size={14} className="me-2" /> Select a Pressure Sensor to Begin Mapping</small>
                                </div>
                              )}
                              <Row className="g-3 position-relative z-1">
                                {/* 1. LOCATION */}
                                <Col md={6}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block truncate">BUILDING / GATEWAY</Form.Label>
                                  <Form.Select className="premium-input p-3 fs-12 fw-bold border-info border-opacity-10" style={{ height: '45px' }}
                                    value={pressureConfig.building || globalLocation.building}
                                    onChange={(e) => handleConfigChange(pressureConfig, setPressureConfig, 'building', e.target.value)}
                                  >
                                    <option value="">SELECT OPTION</option>
                                    {getFieldList('building', { ...globalLocation, ...pressureConfig }).map(opt => (
                                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                  </Form.Select>
                                </Col>

                                {/* 2. DEVICE_ID */}
                                <Col md={6}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">DEVICE_ID</Form.Label>
                                  <Form.Select className="premium-input p-3 fs-12 fw-bold border-info border-opacity-10" style={{ height: '45px' }}
                                    value={pressureConfig.device}
                                    onChange={(e) => handleConfigChange(pressureConfig, setPressureConfig, 'device', e.target.value)}
                                  >
                                    <option value="">SELECT DEVICE_ID</option>
                                    {getFieldList('device', { ...globalLocation, ...pressureConfig, building: pressureConfig.building || globalLocation.building }).map(opt => (
                                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                  </Form.Select>
                                </Col>

                                {/* 3. MODULE_ID */}
                                <Col md={6}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">MODULE_ID</Form.Label>
                                  <Form.Select className="premium-input p-3 fs-12 fw-bold border-info border-opacity-10" style={{ height: '45px' }}
                                    value={pressureConfig.module}
                                    onChange={(e) => handleConfigChange(pressureConfig, setPressureConfig, 'module', e.target.value)}
                                  >
                                    <option value="">SELECT MODULE_ID</option>
                                    {getFieldList('module', { ...globalLocation, ...pressureConfig, building: pressureConfig.building || globalLocation.building }).map(opt => {
                                      const isRuleEngine = false;
                                      const isUsed = isRuleEngine && usedModules.some(m => String(m).trim() === String(opt.id).trim()) && opt.id !== pressureConfig.module;
                                      return (
                                        <option key={opt.id} value={opt.id} disabled={isUsed} style={isUsed ? { color: '#64748b', fontStyle: 'italic' } : {}}>
                                          {opt.label} {isUsed ? ' (ALREADY SELECTED)' : ''}
                                        </option>
                                      );
                                    })}
                                  </Form.Select>
                                </Col>

                                {/* 4. EVENT_FIELD */}
                                <Col md={6}>
                                  <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">EVENT_ FIELD</Form.Label>
                                  <Form.Control
                                    as="input"
                                    list="datalist-pressure-field"
                                    className="premium-input p-3 fs-12 fw-bold border-info border-opacity-10 shadow-inner"
                                    style={{ height: '45px' }}
                                    value={pressureConfig.field}
                                    placeholder="SELECT OR TYPE"
                                    onChange={(e) => handleConfigChange(pressureConfig, setPressureConfig, 'field', e.target.value)}
                                  />
                                  <datalist id="datalist-pressure-field">
                                    {getFieldList('field', { ...globalLocation, ...pressureConfig, building: pressureConfig.building || globalLocation.building }).map(opt => (
                                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                  </datalist>
                                </Col>
                              </Row>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </div>
              ) : selectedModule === 'Electrical Parameter' ? (
                <div className="config-form-container scale-in">
                  <div className="p-0 rounded-4 bg-dark bg-opacity-20 border border-white border-opacity-5 mb-5 overflow-hidden position-relative">
                    <div className="p-3 border-bottom border-white border-opacity-5 bg-dark bg-opacity-40 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <Zap className="text-warning shadow-glow" size={18} />
                        <h6 className="mb-0 text-white fw-black uppercase tracking-widest fs-11">Power Meter Integration <span className="opacity-40">(RS-485 / Modbus)</span></h6>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <Form.Label className="mb-0 text-secondary fs-10 fw-black uppercase tracking-widest opacity-50">Select Meter Unit:</Form.Label>
                        <Form.Select
                          className="premium-input p-2 fs-10 fw-bold border-warning border-opacity-20"
                          style={{ width: '220px' }}
                          value={electricalTarget}
                          onChange={(e) => handleElectricalTargetChange(e.target.value)}
                        >
                          <option value="">SELECT METER</option>
                          {electricalMetersList.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </Form.Select>
                      </div>
                    </div>

                    <div className={`p-4 bg-dark bg-opacity-20 ${!electricalTarget ? 'opacity-25 grayscale' : ''}`} style={{ pointerEvents: electricalTarget ? 'auto' : 'none' }}>
                      {!electricalTarget && (
                        <div className="position-absolute top-50 start-50 translate-middle z-3 text-center w-100">
                          <div className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-20 px-4 py-2 rounded-pill fs-11 fw-black tracking-widest">
                            <Info size={14} className="me-2" /> SELECT AN ELECTRICAL METER TO BEGIN MAPPING
                          </div>
                        </div>
                      )}
                      <Row className="g-4">
                        {[
                          { title: 'Avg Voltage (L-L)', state: elecVoltageConfig, setter: setElecVoltageConfig, icon: <Zap size={18} />, color: 'warning', fields: [{ label: 'RY', key: 'ry' }, { label: 'YB', key: 'yb' }, { label: 'BR', key: 'br' }] },
                          { title: 'Current per Phase', state: elecCurrentConfig, setter: setElecCurrentConfig, icon: <Activity size={18} />, color: 'info', fields: [{ label: 'R', key: 'r' }, { label: 'Y', key: 'y' }, { label: 'B', key: 'b' }] },
                          { title: 'System Metrics', state: elecSystemConfig, setter: setElecSystemConfig, icon: <Database size={18} />, color: 'success', fields: [{ label: 'PF', key: 'pf' }, { label: 'FREQ', key: 'freq' }, { label: 'LOAD', key: 'load' }] },
                          { title: 'Power Consumption', state: elecConsumptionConfig, setter: setElecConsumptionConfig, icon: <Zap size={18} />, color: 'primary', fields: [{ label: 'KVA', key: 'kva' }, { label: 'KWH', key: 'kwh' }, { label: 'KVAH', key: 'kvah' }] }
                        ].map((section, idx) => (
                          <Col md={6} key={idx}>
                            <div className={`p-4 rounded-4 bg-dark bg-opacity-40 border border-${section.color} border-opacity-10 premium-figma-card h-100 position-relative overflow-hidden transition-all hover-glow-${section.color}`}>
                              <div className={`card-inner-glow bg-${section.color} opacity-5`}></div>

                              {/* HEADER */}
                              <div className="mb-4 d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div className={`icon-box-premium ${section.color} p-2 shadow-glow-${section.color}`}>
                                    {section.icon}
                                  </div>
                                  <div>
                                    <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-10">
                                      {section.title} {
                                        (section.title.toUpperCase().includes('COMMAND') || section.title.toUpperCase().includes('CMD') || section.title.includes('Limits'))
                                          ? <span className="ms-2 text-info opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(WRITEWater Level)</span>
                                          : <span className="ms-2 text-warning opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(READ ONLY)</span>
                                      }
                                    </h6>
                                    <small className={`text-${section.color} opacity-50 uppercase fs-12 fw-bold tracking-widest`}>Power Meter Mapping</small>
                                  </div>
                                </div>
                                <Form.Check type="switch" className={`scada-switch ${section.color}`} checked={section.state.enabled} onChange={(e) => section.setter({ ...section.state, enabled: e.target.checked })} />
                              </div>

                              {/* MAPPING GRID */}
                              <div className={`transition-all ${!section.state.enabled ? 'opacity-25 grayscale' : ''}`}>
                                <Row className="g-3 position-relative z-1">
                                  {!isHierarchyUnlocked ? (
                                    <Col md={12}>
                                      <div className="p-3 rounded bg-dark bg-opacity-40 border border-warning border-opacity-20 text-center shadow-glow-warning-box">
                                        <small className="text-warning fw-black uppercase tracking-widest fs-12">
                                          <Info size={14} className="me-2" /> Select any hierarchy level in MODULE CONFIGURATOR to unlock mapping
                                        </small>
                                      </div>
                                    </Col>
                                  ) : (
                                    <>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block truncate">BUILDING / GATEWAY</Form.Label>
                                        <Form.Select
                                          className={`premium-input p-3 fs-11 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px' }}
                                          value={section.state.building || globalLocation.building}
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'building', e.target.value)}
                                        >
                                          <option value="">SELECT OPTION</option>
                                          {getFieldList('building', { ...globalLocation, ...section.state }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">DEVICE_ID</Form.Label>
                                        <Form.Select
                                          className={`premium-input p-3 fs-11 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px' }}
                                          value={section.state.device}
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'device', e.target.value)}
                                        >
                                          <option value="">SELECT DEVICE</option>
                                          {getFieldList('device', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={3}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">MODULE_ID</Form.Label>
                                        <Form.Select
                                          className={`premium-input p-3 fs-11 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                          style={{ height: '45px' }}
                                          value={section.state.module}
                                          onChange={(e) => handleConfigChange(section.state, section.setter, 'module', e.target.value)}
                                        >
                                          <option value="">SELECT MODULE</option>
                                          {getFieldList('module', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={3}>
                                        <div className="d-flex flex-column gap-2">
                                          {section.fields.map((f, fIdx) => {
                                            const rawFields = getFieldList('field', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building });
                                            const sortedOptions = getFilteredFieldList(section.title, f.key, f.label, rawFields);
                                            return (
                                              <div key={fIdx} className="mb-2">
                                                <Form.Label className="fs-10 text-secondary fw-black uppercase tracking-widest opacity-50 mb-1 d-block">{f.label}</Form.Label>
                                                <Form.Select
                                                  className={`premium-input p-2 fs-10 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                                  style={{ height: '35px', lineHeight: '1.2' }}
                                                  value={section.state[f.key] || ''}
                                                  onChange={(e) => handleConfigChange(section.state, section.setter, f.key, e.target.value)}
                                                >
                                                  <option value="">SELECT PARAMETER</option>
                                                  {section.state[f.key] && !sortedOptions.some(opt => String(opt.id) === String(section.state[f.key])) && (
                                                    <option value={section.state[f.key]}>{section.state[f.key]}</option>
                                                  )}
                                                  {sortedOptions.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                  ))}
                                                </Form.Select>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </Col>
                                    </>
                                  )}
                                </Row>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </div>
                </div>
              ) : selectedModule === 'Main Meter' || selectedModule === 'Sub Meters' ? (
                <div className="config-form-container scale-in">
                  <div className="p-0 rounded-4 bg-dark bg-opacity-20 border border-white border-opacity-5 mb-5 overflow-hidden position-relative">
                    <div className="p-3 border-bottom border-white border-opacity-5 bg-dark bg-opacity-40 d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-2">
                        <Zap className="text-info shadow-glow-blue" size={18} />
                        <h6 className="mb-0 text-white fw-black uppercase tracking-widest fs-11">
                          Energy Meter Parameters Mapping <span className="opacity-40">({selectedModule.toUpperCase()})</span>
                        </h6>
                      </div>

                      {/* Energy Meter Target & Category Selector */}
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex align-items-center gap-2" style={{ minWidth: '220px' }}>
                          <span className="text-secondary fs-12 uppercase fw-black opacity-60 text-nowrap">Target Unit:</span>
                          <Form.Select
                            className="premium-input px-3 py-1 fs-11 fw-bold border-info border-opacity-20 shadow-inner"
                            style={{ height: '35px' }}
                            value={energyMeteringTarget}
                            onChange={(e) => {
                              setEnergyMeteringTarget(e.target.value);
                              setTemplateName('');
                              const existing = savedTemplates.find(t =>
                                t.module === selectedModule &&
                                t.mapping.energyMeteringTarget === e.target.value
                              );
                              if (existing) {
                                setEmVoltageConfig(existing.mapping.emVoltageConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vR: '', vY: '', vB: '', enabled: true });
                                setEmCurrentConfig(existing.mapping.emCurrentConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', iR: '', iY: '', iB: '', enabled: true });
                                setEmPowerConfig(existing.mapping.emPowerConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', activePower: '', reactivePower: '', apparentPower: '', enabled: true });
                                setEmSystemConfig(existing.mapping.emSystemConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', commStatus: '', enabled: true });
                                setEmConsumptionConfig(existing.mapping.emConsumptionConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', cumulativekWh: '', enabled: true });
                                setEmChangeConfig(existing.mapping.emChangeConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ebKvah: '', ebKwh: '', balance: '', totalKw: '', vR: '', vY: '', vB: '', iR: '', iY: '', iB: '', pf: '', totalKva: '', dgKwh: '', vLLAvg: '', vLNAvg: '', iAvg: '', kvaAvg: '', kvarAvg: '', pfAvg: '', vRY: '', vYB: '', vBR: '', pfR: '', pfY: '', pfB: '', loadHrs: '', loadMin: '', noLoadHrs: '', noLoadMin: '', loadPct: '', enabled: true });
                                setEmWarningConfig(existing.mapping.emWarningConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', lowBalanceCut: '', overloadTrip: '', overloadLimitReached: '', connectedStatus: '', forceOff: '', enabled: true });
                                setEmReadConfig(existing.mapping.emReadConfig || { organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', meterSrno: '', noOfOverloadCheck: '', ebDgStatus: '', ebTariff: '', dgTariff: '', ebRLoadSet: '', ebYLoadSet: '', ebBLoadSet: '', dgRLoadSet: '', dgYLoadSet: '', dgBLoadSet: '', enabled: true });
                                setEmLimitsConfig(existing.mapping.emLimitsConfig || {
                                  vR: { low: '', normalMin: '', normalMax: '', high: '' },
                                  vY: { low: '', normalMin: '', normalMax: '', high: '' },
                                  vB: { low: '', normalMin: '', normalMax: '', high: '' },
                                  iR: { low: '', normalMin: '', normalMax: '', high: '' },
                                  iY: { low: '', normalMin: '', normalMax: '', high: '' },
                                  iB: { low: '', normalMin: '', normalMax: '', high: '' },
                                  totalKw: { low: '', normalMin: '', normalMax: '', high: '' },
                                  totalKva: { low: '', normalMin: '', normalMax: '', high: '' }
                                });
                                setSubMeterCategory(existing.mapping.subMeterCategory || '');
                                if (existing.mapping.globalHierarchy) setGlobalLocation(existing.mapping.globalHierarchy);
                              } else {
                                setEmVoltageConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', vR: '', vY: '', vB: '', enabled: true });
                                setEmCurrentConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', iR: '', iY: '', iB: '', enabled: true });
                                setEmPowerConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', activePower: '', reactivePower: '', apparentPower: '', enabled: true });
                                setEmSystemConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', pf: '', freq: '', commStatus: '', enabled: true });
                                setEmConsumptionConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', cumulativekWh: '', enabled: true });
                                setEmChangeConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', ebKvah: '', ebKwh: '', balance: '', totalKw: '', vR: '', vY: '', vB: '', iR: '', iY: '', iB: '', pf: '', totalKva: '', dgKwh: '', vLLAvg: '', vLNAvg: '', iAvg: '', kvaAvg: '', kvarAvg: '', pfAvg: '', vRY: '', vYB: '', vBR: '', pfR: '', pfY: '', pfB: '', loadHrs: '', loadMin: '', noLoadHrs: '', noLoadMin: '', loadPct: '', enabled: true });
                                setEmWarningConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', lowBalanceCut: '', overloadTrip: '', overloadLimitReached: '', connectedStatus: '', forceOff: '', enabled: true });
                                setEmReadConfig({ organization: '', client: '', zone: '', subZone: '', building: '', device: '', module: '', meterSrno: '', noOfOverloadCheck: '', ebDgStatus: '', ebTariff: '', dgTariff: '', ebRLoadSet: '', ebYLoadSet: '', ebBLoadSet: '', dgRLoadSet: '', dgYLoadSet: '', dgBLoadSet: '', enabled: true });
                                setEmLimitsConfig({
                                  vR: { low: '', normalMin: '', normalMax: '', high: '' },
                                  vY: { low: '', normalMin: '', normalMax: '', high: '' },
                                  vB: { low: '', normalMin: '', normalMax: '', high: '' },
                                  iR: { low: '', normalMin: '', normalMax: '', high: '' },
                                  iY: { low: '', normalMin: '', normalMax: '', high: '' },
                                  iB: { low: '', normalMin: '', normalMax: '', high: '' },
                                  totalKw: { low: '', normalMin: '', normalMax: '', high: '' },
                                  totalKva: { low: '', normalMin: '', normalMax: '', high: '' }
                                });
                                setSubMeterCategory('');
                              }
                            }}
                          >
                            <option value="">SELECT TARGET METER</option>
                            {energyMetersList
                              .filter(m => selectedModule === 'Main Meter' ? m.id === 'EM-MAIN' : m.id !== 'EM-MAIN')
                              .map(m => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))
                            }
                          </Form.Select>
                        </div>

                        {selectedModule === 'Sub Meters' && (
                          <div className="d-flex align-items-center gap-2" style={{ minWidth: '220px' }}>
                            <span className="text-secondary fs-12 uppercase fw-black opacity-60 text-nowrap">Group / Category:</span>
                            <Form.Control
                              type="text"
                              className="premium-input px-3 py-1 fs-11 fw-bold border-info border-opacity-20 shadow-inner text-white"
                              style={{ height: '35px', background: 'rgba(255, 255, 255, 0.05)' }}
                              placeholder="e.g. VRV, Commercial, etc."
                              value={subMeterCategory}
                              onChange={(e) => setSubMeterCategory(e.target.value)}
                              list="submeter-categories"
                            />
                            <datalist id="submeter-categories">
                              <option value="Commercial" />
                              <option value="Data Center" />
                              <option value="Water Management" />
                              <option value="VRV" />
                              <option value="Lighting" />
                            </datalist>
                          </div>
                        )}
                      </div>
                    </div>

                    {energyMeteringTarget ? (
                      <div className="p-4 bg-dark bg-opacity-20">
                        <Row className="g-4">
                          {[
                            {
                              title: 'CHANGE Parameters',
                              state: emChangeConfig,
                              setter: setEmChangeConfig,
                              icon: <Activity size={18} />,
                              color: 'info',
                              fields: [
                                { label: 'EB KVAH (KVAH)', key: 'ebKvah' },
                                { label: 'EB KWH (KWH)', key: 'ebKwh' },
                                { label: 'BALANCE (Rs)', key: 'balance' },
                                { label: 'TOTAL KW (KW)', key: 'totalKw' },
                                { label: 'VOLTAGE R-PHASE (V)', key: 'vR' },
                                { label: 'VOLTAGE Y-PHASE (V)', key: 'vY' },
                                { label: 'VOLTAGE B-PHASE (V)', key: 'vB' },
                                { label: 'R-CURRENT (A)', key: 'iR' },
                                { label: 'Y-CURRENT (A)', key: 'iY' },
                                { label: 'B-CURRENT (A)', key: 'iB' },
                                { label: 'POWER FACTOR (PF)', key: 'pf' },
                                { label: 'TOTAL KVA (KVA)', key: 'totalKva' },
                                { label: 'DG KWH (KWH)', key: 'dgKwh' },
                                { label: 'AVG VOLTAGE L-L', key: 'vLLAvg' },
                                { label: 'AVG VOLTAGE L-N', key: 'vLNAvg' },
                                { label: 'AVG CURRENT', key: 'iAvg' },
                                { label: 'POWER KVA (AVG)', key: 'kvaAvg' },
                                { label: 'POWER KVAR (AVG)', key: 'kvarAvg' },
                                { label: 'AVG PF', key: 'pfAvg' },
                                { label: 'VOLTAGE R-Y', key: 'vRY' },
                                { label: 'VOLTAGE Y-B', key: 'vYB' },
                                { label: 'VOLTAGE B-R', key: 'vBR' },
                                { label: 'PF-R', key: 'pfR' },
                                { label: 'PF-Y', key: 'pfY' },
                                { label: 'PF-B', key: 'pfB' },
                                { label: 'LOAD HRS', key: 'loadHrs' },
                                { label: 'LOAD MIN', key: 'loadMin' },
                                { label: 'NO LOAD HRS', key: 'noLoadHrs' },
                                { label: 'NO LOAD MIN', key: 'noLoadMin' },
                                { label: 'LOAD %', key: 'loadPct' }
                              ]
                            },
                            {
                              title: 'WARNING Parameters',
                              state: emWarningConfig,
                              setter: setEmWarningConfig,
                              icon: <AlertTriangle size={18} />,
                              color: 'warning',
                              fields: [
                                { label: 'LOW BALANCE CUT', key: 'lowBalanceCut' },
                                { label: 'OVERLOAD TRIP', key: 'overloadTrip' },
                                { label: 'OVERLOAD LIMIT REACHED', key: 'overloadLimitReached' },
                                { label: 'CONNECTED STATUS', key: 'connectedStatus' },
                                { label: 'FORCE OFF', key: 'forceOff' }
                              ]
                            },
                            {
                              title: 'READ Parameters',
                              state: emReadConfig,
                              setter: setEmReadConfig,
                              icon: <Layers size={18} />,
                              color: 'success',
                              fields: [
                                { label: 'METER SRNO', key: 'meterSrno' },
                                { label: 'NO OF OVERLOAD CHECK', key: 'noOfOverloadCheck' },
                                { label: 'EB/DG STATUS', key: 'ebDgStatus' },
                                { label: 'EB TARIFF (Rs)', key: 'ebTariff' },
                                { label: 'DG TARIFF (Rs)', key: 'dgTariff' },
                                { label: 'EB R LOAD SET (KW)', key: 'ebRLoadSet' },
                                { label: 'EB Y LOAD SET (KW)', key: 'ebYLoadSet' },
                                { label: 'EB B LOAD SET (KW)', key: 'ebBLoadSet' },
                                { label: 'DG R LOAD SET (KW)', key: 'dgRLoadSet' },
                                { label: 'DG Y LOAD SET (KW)', key: 'dgYLoadSet' },
                                { label: 'DG B LOAD SET (KW)', key: 'dgBLoadSet' }
                              ]
                            }
                          ].map((section, idx) => (
                            <Col md={12} key={idx} className="mb-4">
                              <div className={`p-4 rounded-4 bg-dark bg-opacity-40 border border-${section.color} border-opacity-10 premium-figma-card h-100 position-relative overflow-hidden transition-all hover-glow-${section.color}`}>
                                <div className={`card-inner-glow bg-${section.color} opacity-5`}></div>
                                <div className="mb-4 d-flex align-items-center justify-content-between">
                                  <div className="d-flex align-items-center gap-3">
                                    <div className={`icon-box-premium ${section.color} p-2 shadow-glow-${section.color}`}>
                                      {section.icon}
                                    </div>
                                    <div>
                                      <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-10">{section.title}</h6>
                                      <small className={`text-${section.color} opacity-50 uppercase fs-12 fw-bold tracking-widest`}>Metering Mapping</small>
                                    </div>
                                  </div>
                                  <Form.Check type="switch" className={`scada-switch ${section.color}`} checked={section.state.enabled} onChange={(e) => section.setter({ ...section.state, enabled: e.target.checked })} />
                                </div>
                                <div className={`transition-all ${!section.state.enabled ? 'opacity-25 grayscale' : ''}`}>
                                  <Row className="g-3 position-relative z-1">
                                    {!isHierarchyUnlocked ? (
                                      <Col md={12}>
                                        <div className={`p-3 rounded bg-dark bg-opacity-40 border border-${section.color} border-opacity-20 text-center shadow-glow-${section.color}-box`}>
                                          <small className={`text-${section.color} fw-black uppercase tracking-widest fs-12`}>
                                            <Info size={14} className="me-2" /> Select hierarchy level to unlock
                                          </small>
                                        </div>
                                      </Col>
                                    ) : (
                                      <>
                                        <Col md={6}>
                                          <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block truncate">BUILDING / GATEWAY</Form.Label>
                                          <Form.Select className={`premium-input p-3 fs-11 fw-bold border-${section.color} border-opacity-10 shadow-inner`} style={{ height: '45px' }} value={section.state.building || globalLocation.building} onChange={(e) => handleConfigChange(section.state, section.setter, 'building', e.target.value)}>
                                            <option value="">SELECT OPTION</option>
                                            {getFieldList('building', { ...globalLocation, ...section.state }).map(opt => (
                                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                                            ))}
                                          </Form.Select>
                                        </Col>
                                        <Col md={6}>
                                          <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">DEVICE_ID</Form.Label>
                                          <Form.Select className={`premium-input p-3 fs-11 fw-bold border-${section.color} border-opacity-10 shadow-inner`} style={{ height: '45px' }} value={section.state.device} onChange={(e) => handleConfigChange(section.state, section.setter, 'device', e.target.value)}>
                                            <option value="">SELECT DEVICE</option>
                                            {getFieldList('device', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => (
                                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                                            ))}
                                          </Form.Select>
                                        </Col>

                                        <Col md={12}>
                                          <hr className={`border-${section.color} opacity-20 my-3`} />
                                          <Form.Label className={`fs-10 text-${section.color} fw-black uppercase tracking-widest opacity-70 mb-3 d-block`}>Parameters Register Mapping</Form.Label>
                                          <Row className="g-3">
                                            {section.fields.map((f, fIdx) => {
                                              const rawFields = getFieldList('field', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building });
                                              const sortedOptions = getFilteredFieldList(section.title, f.key, f.label, rawFields);
                                              return (
                                                <Col md={4} key={fIdx}>
                                                  <div className="premium-field-wrapper p-2 rounded bg-dark bg-opacity-20 border border-white border-opacity-5">
                                                    <Form.Label className="fs-10 text-secondary fw-black uppercase tracking-widest opacity-50 mb-1 d-block">{f.label}</Form.Label>
                                                    <Form.Select
                                                      className={`premium-input p-2 fs-10 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                                      style={{ height: '35px', lineHeight: '1.2' }}
                                                      value={section.state[f.key] || ''}
                                                      onChange={(e) => handleConfigChange(section.state, section.setter, f.key, e.target.value)}
                                                    >
                                                      <option value="">SELECT PARAMETER</option>
                                                      {section.state[f.key] && !sortedOptions.some(opt => String(opt.id) === String(section.state[f.key])) && (
                                                        <option value={section.state[f.key]}>{section.state[f.key]}</option>
                                                      )}
                                                      {sortedOptions.map(opt => (
                                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                      ))}
                                                    </Form.Select>
                                                  </div>
                                                </Col>
                                              );
                                            })}
                                          </Row>
                                        </Col>
                                      </>
                                    )}
                                  </Row>
                                </div>
                              </div>
                            </Col>
                          ))}
                        </Row>

                        <div className="mt-4 p-4 rounded-4 bg-dark bg-opacity-40 border border-info border-opacity-10 premium-figma-card position-relative overflow-hidden transition-all hover-glow-info">
                          <div className="card-inner-glow bg-info opacity-5"></div>
                          <div className="mb-4 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                              <div className="icon-box-premium info p-2 shadow-glow-info">
                                <Settings size={18} />
                              </div>
                              <div>
                                <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-10">Threshold Limits Configuration</h6>
                                <small className="text-info opacity-50 uppercase fs-12 fw-bold tracking-widest">Alarm & Warning Ranges</small>
                              </div>
                            </div>
                          </div>

                          <div className="position-relative z-1">
                            <Row className="g-3">
                              {[
                                { label: 'R-PHASE VOLTAGE (V)', key: 'vR' },
                                { label: 'Y-PHASE VOLTAGE (V)', key: 'vY' },
                                { label: 'B-PHASE VOLTAGE (V)', key: 'vB' },
                                { label: 'R-CURRENT (A)', key: 'iR' },
                                { label: 'Y-CURRENT (A)', key: 'iY' },
                                { label: 'B-CURRENT (A)', key: 'iB' },
                                { label: 'ACTIVE POWER (kW)', key: 'totalKw' },
                                { label: 'APPARENT POWER (kVA)', key: 'totalKva' }
                              ].map((param, pIdx) => (
                                <Col md={12} key={pIdx} className="mb-3 p-3 rounded bg-dark bg-opacity-20 border border-white border-opacity-5">
                                  <Row className="align-items-center">
                                    <Col lg={4} md={12} className="mb-2 mb-lg-0">
                                      <span className="text-white fw-black uppercase tracking-widest fs-10">{param.label}</span>
                                    </Col>
                                    <Col lg={8} md={12}>
                                      <Row className="g-2">
                                        <Col xs={3}>
                                          <Form.Label className="fs-9 text-secondary fw-black uppercase tracking-widest opacity-50 mb-1 d-block">below</Form.Label>
                                          <input
                                            type="number"
                                            placeholder="Low"
                                            className="premium-input p-2 fs-10 fw-bold border-info border-opacity-20 shadow-inner text-white w-100"
                                            style={{ height: '35px', background: 'rgba(255, 255, 255, 0.03)' }}
                                            value={emLimitsConfig[param.key]?.low || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setEmLimitsConfig(prev => ({
                                                ...prev,
                                                [param.key]: { ...prev[param.key], low: val }
                                              }));
                                            }}
                                          />
                                        </Col>
                                        <Col xs={3}>
                                          <Form.Label className="fs-9 text-secondary fw-black uppercase tracking-widest opacity-50 mb-1 d-block">Normal Min</Form.Label>
                                          <input
                                            type="number"
                                            placeholder="Min"
                                            className="premium-input p-2 fs-10 fw-bold border-info border-opacity-20 shadow-inner text-white w-100"
                                            style={{ height: '35px', background: 'rgba(255, 255, 255, 0.03)' }}
                                            value={emLimitsConfig[param.key]?.normalMin || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setEmLimitsConfig(prev => ({
                                                ...prev,
                                                [param.key]: { ...prev[param.key], normalMin: val }
                                              }));
                                            }}
                                          />
                                        </Col>
                                        <Col xs={3}>
                                          <Form.Label className="fs-9 text-secondary fw-black uppercase tracking-widest opacity-50 mb-1 d-block">Normal Max</Form.Label>
                                          <input
                                            type="number"
                                            placeholder="Max"
                                            className="premium-input p-2 fs-10 fw-bold border-info border-opacity-20 shadow-inner text-white w-100"
                                            style={{ height: '35px', background: 'rgba(255, 255, 255, 0.03)' }}
                                            value={emLimitsConfig[param.key]?.normalMax || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setEmLimitsConfig(prev => ({
                                                ...prev,
                                                [param.key]: { ...prev[param.key], normalMax: val }
                                              }));
                                            }}
                                          />
                                        </Col>
                                        <Col xs={3}>
                                          <Form.Label className="fs-9 text-secondary fw-black uppercase tracking-widest opacity-50 mb-1 d-block">above</Form.Label>
                                          <input
                                            type="number"
                                            placeholder="High"
                                            className="premium-input p-2 fs-10 fw-bold border-info border-opacity-20 shadow-inner text-white w-100"
                                            style={{ height: '35px', background: 'rgba(255, 255, 255, 0.03)' }}
                                            value={emLimitsConfig[param.key]?.high || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setEmLimitsConfig(prev => ({
                                                ...prev,
                                                [param.key]: { ...prev[param.key], high: val }
                                              }));
                                            }}
                                          />
                                        </Col>
                                      </Row>
                                    </Col>
                                  </Row>
                                </Col>
                              ))}
                            </Row>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <Card className="bg-dark bg-opacity-20 border border-white border-opacity-5 rounded-4 p-5 text-center">
                        <LayoutGrid size={48} className="text-secondary mb-3 mx-auto opacity-50" />
                        <h5 className="text-white fw-bold mb-2">Target Meter Unselected</h5>
                        <p className="text-secondary fs-9">Please select an Energy Meter from the Target Unit dropdown to begin mapping configuration registers.</p>
                      </Card>
                    )}
                  </div>
                </div>
              ) : selectedCategory === 'AQI Sensor' && selectedModule === 'Temp & Humidity' ? (
                <div className="config-form-container scale-in">
                  <div className="p-0 rounded-4 bg-dark bg-opacity-20 border border-white border-opacity-5 mb-5 overflow-hidden position-relative">
                    <div className="p-3 border-bottom border-white border-opacity-5 bg-dark bg-opacity-40 d-flex align-items-center gap-2">
                      <Wind className="text-info shadow-glow-blue" size={18} />
                      <h6 className="mb-0 text-white fw-black uppercase tracking-widest fs-11">AQI Sensor Environment Mapping</h6>
                    </div>
                    <div className="p-4 bg-dark bg-opacity-20">
                      <Row className="g-4">
                        {[
                          { title: 'Environment Metrics', state: vrvConfig, setter: setVrvConfig, icon: <Thermometer size={18} />, color: 'info', fields: [{ label: 'TEMPERATURE (C)', key: 'temperature' }, { label: 'HUMIDITY (%)', key: 'humidity' }, { label: 'CO2 (PPM)', key: 'co2' }, { label: 'TVOC (PPM)', key: 'tvoc' }, { label: 'AQI', key: 'aqi' }, { label: 'TARGET TEMP (C)', key: 'targetTemp' }] }
                        ].map((section, idx) => (
                          <Col md={12} key={idx}>
                            <div className={`p-4 rounded-4 bg-dark bg-opacity-40 border border-${section.color} border-opacity-10 premium-figma-card h-100 position-relative overflow-hidden transition-all hover-glow-${section.color}`}>
                              <div className={`card-inner-glow bg-${section.color} opacity-5`}></div>
                              <div className="mb-4 d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div className={`icon-box-premium ${section.color} p-2 shadow-glow-${section.color}`}>
                                    {section.icon}
                                  </div>
                                  <div>
                                    <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-10">{section.title}</h6>
                                    <small className={`text-${section.color} opacity-50 uppercase fs-12 fw-bold tracking-widest`}>AQI Sensor Mapping</small>
                                  </div>
                                </div>
                                <Form.Check type="switch" className={`scada-switch ${section.color}`} checked={section.state.enabled} onChange={(e) => section.setter({ ...section.state, enabled: e.target.checked })} />
                              </div>
                              <div className={`transition-all ${!section.state.enabled ? 'opacity-25 grayscale' : ''}`}>
                                <Row className="g-3 position-relative z-1">
                                  {!isHierarchyUnlocked ? (
                                    <Col md={12}>
                                      <div className={`p-3 rounded bg-dark bg-opacity-40 border border-${section.color} border-opacity-20 text-center shadow-glow-${section.color}-box`}>
                                        <small className={`text-${section.color} fw-black uppercase tracking-widest fs-12`}>
                                          <Info size={14} className="me-2" /> Select hierarchy level to unlock
                                        </small>
                                      </div>
                                    </Col>
                                  ) : (
                                    <>
                                      <Col md={6}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block truncate">BUILDING / GATEWAY</Form.Label>
                                        <Form.Select className={`premium-input p-3 fs-11 fw-bold border-${section.color} border-opacity-10 shadow-inner`} style={{ height: '45px' }} value={section.state.building || globalLocation.building} onChange={(e) => handleConfigChange(section.state, section.setter, 'building', e.target.value)}>
                                          <option value="">SELECT OPTION</option>
                                          {getFieldList('building', { ...globalLocation, ...section.state }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={6}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">DEVICE_ID</Form.Label>
                                        <Form.Select className={`premium-input p-3 fs-11 fw-bold border-${section.color} border-opacity-10 shadow-inner`} style={{ height: '45px' }} value={section.state.device} onChange={(e) => handleConfigChange(section.state, section.setter, 'device', e.target.value)}>
                                          <option value="">SELECT DEVICE</option>
                                          {getFieldList('device', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={12}>
                                        <hr className={`border-${section.color} opacity-20 my-3`} />
                                        <Form.Label className={`fs-10 text-${section.color} fw-black uppercase tracking-widest opacity-70 mb-3 d-block`}>Parameters Register Mapping</Form.Label>
                                        <Row className="g-3">
                                          {section.fields.map((f, fIdx) => {
                                            const rawFields = getFieldList('field', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building });
                                            const sortedOptions = getFilteredFieldList(section.title, f.key, f.label, rawFields);
                                            return (
                                              <Col md={4} key={fIdx}>
                                                <div className="premium-field-wrapper p-2 rounded bg-dark bg-opacity-20 border border-white border-opacity-5">
                                                  <Form.Label className="fs-10 text-secondary fw-black uppercase tracking-widest opacity-50 mb-1 d-block">{f.label}</Form.Label>
                                                  <Form.Select
                                                    className={`premium-input p-2 fs-10 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                                    style={{ height: '35px', lineHeight: '1.2' }}
                                                    value={section.state[f.key] || ''}
                                                    onChange={(e) => handleConfigChange(section.state, section.setter, f.key, e.target.value)}
                                                  >
                                                    <option value="">SELECT PARAMETER</option>
                                                    {section.state[f.key] && !sortedOptions.some(opt => String(opt.id) === String(section.state[f.key])) && (
                                                      <option value={section.state[f.key]}>{section.state[f.key]}</option>
                                                    )}
                                                    {sortedOptions.map(opt => (
                                                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                    ))}
                                                  </Form.Select>
                                                </div>
                                              </Col>
                                            );
                                          })}
                                        </Row>
                                      </Col>
                                    </>
                                  )}
                                </Row>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </div>
                </div>
              ) : selectedModule && selectedModule.startsWith('DG Set') ? (
                <div className="config-form-container scale-in">
                  <div className="p-0 rounded-4 bg-dark bg-opacity-20 border border-white border-opacity-5 mb-5 overflow-hidden position-relative">
                    <div className="p-3 border-bottom border-white border-opacity-5 bg-dark bg-opacity-40 d-flex align-items-center gap-2">
                      <Zap className="text-info shadow-glow-blue" size={18} />
                      <h6 className="mb-0 text-white fw-black uppercase tracking-widest fs-11">DG Set Parameters Mapping <span className="opacity-40">(Generator Telemetry)</span></h6>
                    </div>
                    <div className="p-4 bg-dark bg-opacity-20">
                      <Row className="g-4">
                        {[
                          { title: 'Engine Health', state: dgEngineConfig, setter: setDgEngineConfig, icon: <Activity size={18} />, color: 'info', fields: [{ label: 'SPEED (RPM)', key: 'speed' }, { label: 'COOLANT TEMP', key: 'coolant' }, { label: 'OIL PRESSURE', key: 'oilPress' }, { label: 'BATTERY V', key: 'battery' }, { label: 'FREQ (Hz)', key: 'freq' }, { label: 'RUN TIME (Hrs)', key: 'runtime' }] },
                          { title: 'Power Matrix', state: dgPowerConfig, setter: setDgPowerConfig, icon: <Zap size={18} />, color: 'warning', fields: [{ label: 'L1-L2 VOLTS', key: 'vL1L2' }, { label: 'L1 AMPS', key: 'iL1' }, { label: 'L2 AMPS', key: 'iL2' }, { label: 'L3 AMPS', key: 'iL3' }, { label: 'LOAD (KW)', key: 'loadKW' }, { label: 'APP (KVA)', key: 'appKVA' }, { label: 'POWER FACTOR', key: 'pf' }, { label: 'KWH TOTAL', key: 'kwh' }] },
                          { title: 'Fuel Management', state: dgFuelConfig, setter: setDgFuelConfig, icon: <Droplets size={18} />, color: 'success', fields: [{ label: 'FUEL LEVEL (%)', key: 'level' }] },
                          { title: 'Fault & Status', state: dgFaultConfig, setter: setDgFaultConfig, icon: <AlertTriangle size={18} />, color: 'danger', fields: [{ label: 'EMERGENCY STOP', key: 'emergencyStop' }, { label: 'MASTER TRIP / OVERLOAD', key: 'masterTrip' }, { label: 'OVER VOLTAGE (HIGH)', key: 'overVoltage' }, { label: 'UNDER VOLTAGE (LOW)', key: 'underVoltage' }, { label: 'OVER FREQ (OVER SPEED)', key: 'overFrequency' }, { label: 'UNDER FREQ (UNDER SPEED)', key: 'underFrequency' }, { label: 'LOW OIL LEVEL / PRESS', key: 'lowOilLevel' }, { label: 'OVER TEMP (HIGH COOLANT)', key: 'overTemp' }] }
                        ].map((section, idx) => (
                          <Col md={6} key={idx}>
                            <div className={`p-4 rounded-4 bg-dark bg-opacity-40 border border-${section.color} border-opacity-10 premium-figma-card h-100 position-relative overflow-hidden transition-all hover-glow-${section.color}`}>
                              <div className={`card-inner-glow bg-${section.color} opacity-5`}></div>
                              <div className="mb-4 d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                  <div className={`icon-box-premium ${section.color} p-2 shadow-glow-${section.color}`}>
                                    {section.icon}
                                  </div>
                                  <div>
                                    <h6 className="text-white fw-black uppercase tracking-widest mb-0 fs-10">{section.title}</h6>
                                    <small className={`text-${section.color} opacity-50 uppercase fs-12 fw-bold tracking-widest`}>DG Mapping</small>
                                  </div>
                                </div>
                                <Form.Check type="switch" className={`scada-switch ${section.color}`} checked={section.state.enabled} onChange={(e) => section.setter({ ...section.state, enabled: e.target.checked })} />
                              </div>
                              <div className={`transition-all ${!section.state.enabled ? 'opacity-25 grayscale' : ''}`}>
                                <Row className="g-3 position-relative z-1">
                                  {!isHierarchyUnlocked ? (
                                    <Col md={12}>
                                      <div className={`p-3 rounded bg-dark bg-opacity-40 border border-${section.color} border-opacity-20 text-center shadow-glow-${section.color}-box`}>
                                        <small className={`text-${section.color} fw-black uppercase tracking-widest fs-12`}>
                                          <Info size={14} className="me-2" /> Select hierarchy level to unlock
                                        </small>
                                      </div>
                                    </Col>
                                  ) : (
                                    <>
                                      <Col md={6}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block truncate">BUILDING / GATEWAY</Form.Label>
                                        <Form.Select className={`premium-input p-3 fs-11 fw-bold border-${section.color} border-opacity-10 shadow-inner`} style={{ height: '45px' }} value={section.state.building || globalLocation.building} onChange={(e) => handleConfigChange(section.state, section.setter, 'building', e.target.value)}>
                                          <option value="">SELECT OPTION</option>
                                          {getFieldList('building', { ...globalLocation, ...section.state }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={6}>
                                        <Form.Label className="fs-11 text-secondary fw-black uppercase tracking-widest opacity-50 mb-2 d-block">DEVICE_ID</Form.Label>
                                        <Form.Select className={`premium-input p-3 fs-11 fw-bold border-${section.color} border-opacity-10 shadow-inner`} style={{ height: '45px' }} value={section.state.device} onChange={(e) => handleConfigChange(section.state, section.setter, 'device', e.target.value)}>
                                          <option value="">SELECT DEVICE</option>
                                          {getFieldList('device', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building }).map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                          ))}
                                        </Form.Select>
                                      </Col>
                                      <Col md={12} className="d-none">
                                        <Form.Select value="ALL" onChange={() => { }} />
                                      </Col>
                                      <Col md={12}>
                                        <div className="d-flex flex-column gap-2 mt-2">
                                          {section.fields.map((f, fIdx) => {
                                            const rawFields = getFieldList('field', { ...globalLocation, ...section.state, building: section.state.building || globalLocation.building });
                                            const sortedOptions = getFilteredFieldList(section.title, f.key, f.label, rawFields);
                                            return (
                                              <div key={fIdx} className="mb-2">
                                                <Form.Label className="fs-10 text-secondary fw-black uppercase tracking-widest opacity-50 mb-1 d-block">{f.label}</Form.Label>
                                                <Form.Select
                                                  className={`premium-input p-2 fs-10 fw-bold border-${section.color} border-opacity-10 shadow-inner`}
                                                  style={{ height: '35px', lineHeight: '1.2' }}
                                                  value={section.state[f.key] || ''}
                                                  onChange={(e) => handleConfigChange(section.state, section.setter, f.key, e.target.value)}
                                                >
                                                  <option value="">SELECT PARAMETER</option>
                                                  {section.state[f.key] && !sortedOptions.some(opt => String(opt.id) === String(section.state[f.key])) && (
                                                    <option value={section.state[f.key]}>{section.state[f.key]}</option>
                                                  )}
                                                  {sortedOptions.map(opt => (
                                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                  ))}
                                                </Form.Select>
                                                {section.title === 'Fault & Status' && (
                                                  <div className="d-flex gap-2 mt-2">
                                                    <div className="flex-fill">
                                                      <Form.Control size="sm" placeholder="Warn (e.g. 1)" className="premium-input bg-dark border-warning border-opacity-50 text-warning fs-10" value={section.state[`${f.key}_warn`] || ''} onChange={(e) => section.setter(prev => ({ ...prev, [`${f.key}_warn`]: e.target.value }))} title="Warning State Value (Orange)" />
                                                    </div>
                                                    <div className="flex-fill">
                                                      <Form.Control size="sm" placeholder="Alarm (e.g. 0)" className="premium-input bg-dark border-danger border-opacity-50 text-danger fs-10" value={section.state[`${f.key}_alarm`] || ''} onChange={(e) => section.setter(prev => ({ ...prev, [`${f.key}_alarm`]: e.target.value }))} title="Alarm State Value (Red)" />
                                                    </div>
                                                    <div className="flex-fill">
                                                      <Form.Control size="sm" placeholder="Healthy (e.g. 1)" className="premium-input bg-dark border-success border-opacity-50 text-success fs-10" value={section.state[`${f.key}_healthy`] || ''} onChange={(e) => section.setter(prev => ({ ...prev, [`${f.key}_healthy`]: e.target.value }))} title="Healthy State Value (Green)" />
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </Col>
                                    </>
                                  )}
                                </Row>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </div>
                </div>
              ) : (
                <Card className="bg-dark bg-opacity-20 border border-white border-opacity-5 rounded-4 p-5 text-center">
                  <LayoutGrid size={48} className="text-secondary mb-3 mx-auto opacity-50" />
                  <h5 className="text-white fw-bold mb-2">Module Setup Pending</h5>
                  <p className="text-secondary fs-9">The configuration template for {selectedModule} is currently being mapped to technical feasibility protocols.</p>
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="list-mode-view scale-in">
          <div className="d-flex align-items-center justify-content-between mb-4 p-3 bg-dark bg-opacity-20 rounded-4 border border-white border-opacity-5">
            <div className="d-flex align-items-center gap-3">
              <span className="fs-11 text-secondary fw-black uppercase letter-spacing-1 ms-2">Filter By:</span>
              <div className="d-flex gap-2 flex-wrap">
                {['ALL', ...Array.from(new Set(savedTemplates.map(t => t.module))).sort()].map(mod => (
                  <Button
                    key={mod}
                    variant={filterModule === mod ? "info" : "outline-secondary"}
                    className={`fs-11 fw-black px-3 py-2 rounded-3 transition-all ${filterModule === mod ? 'shadow-glow' : 'border-opacity-20 opacity-75'}`}
                    onClick={() => setFilterModule(mod)}
                  >
                    {mod.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <Form.Check
                type="checkbox"
                className="scada-checkbox info"
                label={<span className="text-secondary fs-12 fw-bold uppercase tracking-widest">Select All</span>}
                checked={selectedTemplates.length === savedTemplates.length && savedTemplates.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setSelectedTemplates(savedTemplates.map(t => t.id));
                  else setSelectedTemplates([]);
                }}
              />
            </div>
          </div>

          <Row className="g-4">
            {savedTemplates.filter(t => filterModule === 'ALL' || t.module === filterModule).length === 0 ? (
              <Col md={12}>
                <Card className="bg-dark bg-opacity-20 border border-white border-opacity-5 rounded-4 p-5 text-center">
                  <LayoutGrid size={48} className="text-secondary mb-3 mx-auto opacity-50" />
                  <h5 className="text-white fw-bold">{filterModule === 'ALL' ? 'No Settings Saved' : `No ${filterModule} Mappings Found`}</h5>
                  <p className="text-secondary">{filterModule === 'ALL' ? "Click 'Add New Mapping' to start configuring your SCADA modules." : "Try clearing the filter or adding a new mapping for this module."}</p>
                  {filterModule !== 'ALL' && (
                    <Button variant="outline-info" className="mt-3 fs-11 fw-black px-4" onClick={() => setFilterModule('ALL')}>SHOW ALL MAPPINGS</Button>
                  )}
                </Card>
              </Col>
            ) : (
              savedTemplates
                .filter(t => filterModule === 'ALL' || t.module === filterModule)
                .map((template) => (
                  <Col xl={3} lg={4} md={6} key={template.id}>
                    <Card className={`premium-figma-card border-0 rounded-4 overflow-hidden h-100 d-flex flex-column transition-all ${selectedTemplates.includes(template.id) ? 'selected-premium-card' : ''}`}>
                      <div className="card-inner-glow"></div>
                      <div className="p-3 position-relative z-1 flex-grow-1">
                        <div className="mb-4 position-relative">
                          {/* TOP ROW: Checkbox & Preview */}
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <Form.Check
                                type="checkbox"
                                className="scada-checkbox info m-0"
                                checked={selectedTemplates.includes(template.id)}
                                onChange={() => toggleSelectTemplate(template.id)}
                              />
                              <div className="status-indicator-pulse"></div>
                            </div>

                            <div
                              className="preview-badge-premium d-flex align-items-center gap-2 cursor-pointer transition-all hover-glow-blue"
                              style={{
                                padding: '4px 12px',
                                borderRadius: '8px',
                                background: 'rgba(56, 189, 248, 0.12)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                zIndex: 10
                              }}
                              onClick={(e) => { e.stopPropagation(); handlePreview(template); }}
                            >
                              <Eye size={12} className="text-info shadow-glow-blue" />
                              <span className="fw-black text-info uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>Preview</span>
                            </div>
                          </div>

                          {/* TEXT SECTION: Moved Lower */}
                          <div className="mt-3 pt-1">
                            <h6 className="text-info fw-black mb-0 tracking-widest uppercase text-truncate" style={{ fontSize: '0.7rem', textShadow: '0 0 12px rgba(56, 189, 248, 0.4)' }}>
                              {template.name || template.module}
                            </h6>
                            <div className="text-secondary fs-12 uppercase fw-bold opacity-40 letter-spacing-1 text-truncate mt-1" style={{ fontSize: '0.55rem' }}>
                              {template.module} • {template.category}
                            </div>
                          </div>
                        </div>

                        {template.module === 'AG Tank' && template.mapping && template.mapping.agTankRange && (template.mapping.agTankRange.domStart || template.mapping.agTankRange.flushStart) && (
                          <div className="mt-3 mb-3 p-2 rounded-3 bg-dark bg-opacity-40 border border-white border-opacity-5 scada-data-box">
                            <div className="d-flex flex-column gap-2">
                              {template.mapping.agTankRange.domStart && (
                                <div className="d-flex justify-content-between align-items-center px-1">
                                  <span className="fs-12 text-secondary uppercase fw-black opacity-60">Domestic</span>
                                  <span className="fs-11 text-primary fw-black tracking-widest">{template.mapping.agTankRange.domStart}</span>
                                </div>
                              )}
                              {template.mapping.agTankRange.flushStart && (
                                <div className="d-flex justify-content-between align-items-center px-1">
                                  <span className="fs-12 text-secondary uppercase fw-black opacity-60">Flushing</span>
                                  <span className="fs-11 text-info fw-black tracking-widest">{template.mapping.agTankRange.flushStart}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {template.module === 'UG Pump' && template.mapping && template.mapping.ugConfig && (
                          <div className="mt-3 mb-3 p-2 rounded-3 bg-dark bg-opacity-40 border border-white border-opacity-5 scada-data-box">
                            <div className="d-flex justify-content-between align-items-center px-1">
                              <span className="fs-12 text-secondary uppercase fw-black opacity-60">Mode</span>
                              <span className={`fs-11 fw-black tracking-widest ${template.mapping.ugConfig.stationMode === 'REMOTE' ? 'text-info' : 'text-warning'}`}>
                                {template.mapping.ugConfig.stationMode || 'REMOTE'}
                              </span>
                            </div>
                          </div>
                        )}

                        {template.module === 'UG Tank' && template.mapping && template.mapping.ugTankRange && (
                          <div className="mt-3 mb-3 p-2 rounded-3 bg-dark bg-opacity-40 border border-white border-opacity-5 scada-data-box">
                            <div className="d-flex justify-content-between align-items-center px-1">
                              <span className="fs-12 text-secondary uppercase fw-black opacity-60">Level Tank</span>
                              <span className="fs-11 text-info fw-black tracking-widest">{template.mapping.ugTankRange.name || 'UG TANK'}</span>
                            </div>
                          </div>
                        )}

                        {(template.module === 'Main Meter' || template.module === 'Sub Meters') && template.mapping && template.mapping.energyMeteringTarget && (
                          <div className="mt-3 mb-3 p-2 rounded-3 bg-dark bg-opacity-40 border border-white border-opacity-5 scada-data-box">
                            <div className="d-flex justify-content-between align-items-center px-1">
                              <span className="fs-12 text-secondary uppercase fw-black opacity-60">Target Meter</span>
                              <span className="fs-11 text-info fw-black tracking-widest">{template.mapping.energyMeteringTarget}</span>
                            </div>
                          </div>
                        )}
                        <div className="pt-2 mt-auto border-top border-white border-opacity-5">
                          <div className="d-flex justify-content-between text-secondary fs-12 fw-bold mb-1">
                            <span className="opacity-40 uppercase tracking-tighter" style={{ fontSize: '0.65rem' }}>Site Status</span>
                            <span className="text-success fs-13 fw-black tracking-widest shadow-glow-green">ACTIVE</span>
                          </div>
                          <div className="d-flex justify-content-between text-secondary fs-12 fw-bold">
                            <span className="opacity-40 uppercase tracking-tighter" style={{ fontSize: '0.65rem' }}>Synchronized</span>
                            <span className="fs-13 opacity-75 fw-black tracking-tighter text-nowrap">{template.timestamp}</span>
                          </div>
                        </div>
                      </div>
                      <div className="card-action-bar-premium p-2 d-flex justify-content-between align-items-center mt-auto position-relative z-1">
                        <Button variant="link" className="text-info fs-11 fw-black text-decoration-none p-2 uppercase tracking-widest hover-glow-text cursor-pointer" onClick={() => handleEdit(template)}>EDIT CONFIG</Button>
                        <Button variant="link" className="text-danger fs-11 fw-black text-decoration-none p-2 uppercase tracking-widest hover-glow-text cursor-pointer" onClick={() => handleRemove(template.id)}>REMOVE</Button>
                      </div>
                    </Card>
                  </Col>
                ))
            )}
          </Row>
        </div>
      )}

      {/* BEAUTIFULLY INFORMATION MODAL (PREVIEW) */}
      <Modal
        show={showPreviewModal}
        onHide={() => setShowPreviewModal(false)}
        centered
        size="lg"
        className="scada-modal premium-modal"
      >
        <Modal.Body className="bg-dark rounded-4 border-0 overflow-hidden shadow-2xl p-0 premium-figma-card">
          <div className="card-inner-glow"></div>
          {previewTemplate && (
            <div className="preview-container h-100 position-relative z-1">
              <div className="p-3 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center bg-dark bg-opacity-20">
                <div className="d-flex align-items-center gap-3">
                  <div className="p-2 rounded-3 bg-info bg-opacity-10 text-info border border-info border-opacity-10">
                    <Info size={20} />
                  </div>
                  <div>
                    <h6 className="mb-0 text-white fw-black uppercase tracking-tighter fs-10">Module Configuration <span className="text-info">Preview</span></h6>
                    <p className="mb-0 text-secondary fs-12 fw-bold opacity-50 uppercase letter-spacing-1">
                      {previewTemplate.category} / {previewTemplate.module} #{String(savedTemplates.filter(t => t.module === previewTemplate.module).findIndex(t => t.id === previewTemplate.id) + 1).padStart(2, '0')}
                    </p>
                  </div>
                </div>
                <Button variant="link" className="text-secondary p-0 hover-text-white transition-all" onClick={() => setShowPreviewModal(false)}>
                  <X size={20} />
                </Button>
              </div>

              <div className="p-3">
                <Row className="g-3">
                  {/* UG TANK LEVEL SECTION */}
                  {previewTemplate.module === 'UG Tank' && previewTemplate.mapping && previewTemplate.mapping.ugTankLevelConfig && (
                    <Col md={12}>
                      <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 mb-0 scada-data-box">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="text-info fw-black uppercase letter-spacing-1 m-0 d-flex align-items-center gap-2 fs-11">
                            <Droplets size={16} /> UG Tank Level Configuration
                          </h6>
                          <div className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-20 px-3 py-1 rounded-pill fs-11 fw-black tracking-widest">
                            {previewTemplate.mapping.ugTankRange?.name || 'UG TANK'}
                          </div>
                        </div>
                        <Row className="g-3">
                          <Col md={12}>
                            <div className="p-3 rounded bg-dark bg-opacity-40 border border-info border-opacity-10">
                              <div className="d-flex justify-content-between align-items-center mb-2 border-bottom border-white border-opacity-5 pb-2">
                                <span className="fs-12 text-info fw-black uppercase">Level Mapping Status</span>
                                <Badge bg={previewTemplate.mapping.ugTankLevelConfig.enabled ? "success" : "secondary"} className="bg-opacity-10 text-success border border-success border-opacity-25">
                                  {previewTemplate.mapping.ugTankLevelConfig.enabled ? "ACTIVE" : "DISABLED"}
                                </Badge>
                              </div>
                              <Row className="g-2">
                                {[
                                  { label: 'Location', key: 'location' },
                                  { label: 'Device ID', key: 'device' },
                                  { label: 'Module ID', key: 'module' },
                                  { label: 'Event Field', key: 'field' }
                                ].map((f) => (
                                  <Col xs={3} key={f.key}>
                                    <span className="fs-13 text-secondary uppercase fw-bold opacity-40 d-block">{f.label}</span>
                                    <span className="fs-13 text-white fw-bold d-block truncate">{previewTemplate.mapping.ugTankLevelConfig[f.key] || '---'}</span>
                                  </Col>
                                ))}
                              </Row>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </Col>
                  )}
                  {/* UG PUMP SPECIFIC SECTION */}
                  {previewTemplate.module === 'UG Pump' && previewTemplate.mapping && previewTemplate.mapping.ugConfig && (
                    <Col md={12}>
                      <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 mb-0 scada-data-box">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="text-success fw-black uppercase letter-spacing-1 m-0 d-flex align-items-center gap-2 fs-11">
                            <Database size={16} /> UG System Parameters
                          </h6>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fs-12 text-secondary uppercase fw-black opacity-50">Mode:</span>
                            <Badge bg={previewTemplate.mapping.ugConfig.stationMode === 'REMOTE' ? 'info' : 'warning'} className="fs-11 py-1 px-3 rounded-pill bg-opacity-10 border border-opacity-25">
                              {previewTemplate.mapping.ugConfig.stationMode || 'REMOTE'}
                            </Badge>
                          </div>
                        </div>
                        <Row className="g-2">
                          <Col md={12}>
                            <div className="fs-11 text-secondary uppercase fw-black mb-2 opacity-50">Tank Unit Assignment</div>
                            <div className="p-2 rounded bg-dark bg-opacity-40 border border-success border-opacity-20 text-success fw-black fs-9 text-center shadow-inner">
                              {previewTemplate.mapping.ugPumpRange?.name || 'NOT ASSIGNED'}
                            </div>
                          </Col>
                          <Col md={12} className="mt-2">
                            <div className="fs-11 text-secondary uppercase fw-black mb-2 opacity-50">Network Integration</div>
                            <div className="d-flex flex-wrap gap-2">
                              {Object.entries(previewTemplate.mapping.ugConfig.integration).map(([key, val]) => (
                                <Badge key={key} bg={val ? "success" : "secondary"} className={`bg-opacity-10 ${val ? 'text-success' : 'text-secondary'} border ${val ? 'border-success' : 'border-secondary'} border-opacity-25 px-2 py-1 fs-12 uppercase`}>
                                  {key}: {val ? 'ON' : 'OFF'}
                                </Badge>
                              ))}
                            </div>
                          </Col>
                          <Col md={12} className="mt-3">
                            <div className="fs-11 text-secondary uppercase fw-black mb-2 opacity-50">Hardware Mapping Matrix</div>
                            <Row className="g-2">
                              {[
                                { title: 'Lower Limits', key: 'ugLowerConfig' },
                                { title: 'Upper Limits', key: 'ugUpperConfig' },
                                { title: 'Auto Setting', key: 'ugAutoConfig' },
                                { title: 'Manual Setting', key: 'ugManualConfig' },
                                { title: 'StartWater Level', key: 'ugStartCmdConfig' },
                                { title: 'StopWater Level', key: 'ugStopCmdConfig' },
                                { title: 'Start Press', key: 'ugStartPressConfig' },
                                { title: 'Stop Press', key: 'ugStopPressConfig' },
                                { title: 'Local Mode', key: 'ugLocalModeConfig' },
                                { title: 'Remote Mode', key: 'ugRemoteModeConfig' }
                              ].filter(section => previewTemplate.mapping[section.key]?.field).map((section, idx) => (
                                <Col md={4} key={idx}>
                                  <div className="p-2 rounded bg-dark bg-opacity-40 border border-white border-opacity-5">
                                    <span className="fs-13 text-success fw-black uppercase d-block mb-1 border-bottom border-white border-opacity-5">
                                      {section.title} {
                                        (section.title.toUpperCase().includes('COMMAND') || section.title.toUpperCase().includes('CMD') || section.title.includes('Limits'))
                                          ? <span className="ms-2 text-info opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(WRITEWater Level)</span>
                                          : <span className="ms-2 text-warning opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(READ ONLY)</span>
                                      }
                                    </span>
                                    {['location', 'device', 'module', 'field'].map(f => (
                                      <div key={f} className="d-flex justify-content-between">
                                        <span className="fs-13 text-secondary uppercase fw-bold opacity-40">{f}</span>
                                        <span className="fs-13 text-white fw-bold">{previewTemplate.mapping[section.key]?.[f] || '---'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </Col>
                              ))}
                            </Row>
                          </Col>
                          <Col md={12} className="mt-4">
                            <div className="fs-11 text-secondary uppercase fw-black mb-2 opacity-50">Electrical Data Export</div>
                            <div className="d-flex flex-wrap gap-2">
                              {Object.entries(previewTemplate.mapping.ugConfig.electrical).map(([key, val]) => (
                                <Badge key={key} bg={val ? "info" : "secondary"} className={`bg-opacity-10 ${val ? 'text-info' : 'text-secondary'} border ${val ? 'border-info' : 'border-secondary'} border-opacity-25 px-2 py-1 fs-12 uppercase`}>
                                  {key}: {val ? 'ON' : 'OFF'}
                                </Badge>
                              ))}
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </Col>
                  )}

                  {/* TANK RANGE SECTION - ONLY FOR AG TANK */}
                  {previewTemplate.module === 'AG Tank' && previewTemplate.mapping && previewTemplate.mapping.agTankRange && (
                    <Col md={12}>
                      <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 scada-data-box">
                        <h6 className="text-info fw-black uppercase letter-spacing-1 mb-3 d-flex align-items-center gap-2 fs-11">
                          <LayoutGrid size={16} /> Tank Mapping Data
                        </h6>
                        <Row className="g-3">
                          <Col md={6}>
                            <div className="p-3 rounded-4 bg-dark bg-opacity-40 border border-white border-opacity-5 d-flex justify-content-between align-items-center shadow-inner hover-border-info transition-all cursor-default">
                              <div>
                                <small className="text-info uppercase fw-black fs-12 d-block opacity-80 mb-1 letter-spacing-1">Domestic Supply</small>
                                <h4 className="text-white fw-black mb-0 tracking-widest fs-4 text-glow-blue">{previewTemplate.mapping.agTankRange.domStart || '---'}</h4>
                              </div>
                              <div className="bg-primary px-3 py-1 rounded-pill shadow-glow-blue border border-primary border-opacity-20 d-flex align-items-center">
                                <span className="text-white fw-black uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Mapped</span>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="p-3 rounded-4 bg-dark bg-opacity-40 border border-white border-opacity-5 d-flex justify-content-between align-items-center shadow-inner hover-border-info transition-all cursor-default">
                              <div>
                                <small className="text-info uppercase fw-black fs-12 d-block opacity-80 mb-1 letter-spacing-1">Flushing Supply</small>
                                <h4 className="text-white fw-black mb-0 tracking-widest fs-4 text-glow-blue">{previewTemplate.mapping.agTankRange.flushStart || '---'}</h4>
                              </div>
                              <div className="bg-info px-3 py-1 rounded-pill shadow-glow-blue border border-info border-opacity-20 d-flex align-items-center">
                                <span className="text-white fw-black uppercase tracking-widest" style={{ fontSize: '0.6rem' }}>Mapped</span>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </Col>
                  )}

                  {/* PRESSURE MODULE PREVIEW */}
                  {previewTemplate.module === 'Pressure' && previewTemplate.mapping && previewTemplate.mapping.pressureConfig && (
                    <Col md={12}>
                      <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 scada-data-box">
                        <h6 className="text-info fw-black uppercase letter-spacing-1 mb-3 d-flex align-items-center gap-2 fs-11">
                          <Activity size={16} /> Pressure Sensor Protocol
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                          {Object.entries(previewTemplate.mapping.pressureConfig).map(([key, val]) => (
                            <div key={key} className="flex-grow-1 p-2 rounded bg-dark bg-opacity-40 border border-white border-opacity-5 text-center">
                              <small className="text-secondary uppercase fw-black fs-12 d-block opacity-50">{key}</small>
                              <span className="text-white fw-bold fs-11">{val || '---'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Col>
                  )}

                  {/* ELECTRICAL PARAMETER PREVIEW */}
                  {previewTemplate.module === 'Electrical Parameter' && previewTemplate.mapping && (
                    <Col md={12}>
                      <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 scada-data-box">
                        <h6 className="text-warning fw-black uppercase letter-spacing-1 mb-3 d-flex align-items-center gap-2 fs-11">
                          <Zap size={16} /> Electrical Analysis Matrix
                        </h6>
                        <Row className="g-3">
                          {[
                            { title: 'Line-To-Line Voltage', key: 'elecVoltageConfig', fields: ['ry', 'yb', 'br'] },
                            { title: 'Phase Current', key: 'elecCurrentConfig', fields: ['r', 'y', 'b'] },
                            { title: 'System Metrics', key: 'elecSystemConfig', fields: ['pf', 'freq', 'load'] },
                            { title: 'Energy Consumption', key: 'elecConsumptionConfig', fields: ['kva', 'kwh', 'kvah'] }
                          ].map((section, idx) => (
                            <Col md={6} key={idx}>
                              <div className="p-2 rounded bg-dark bg-opacity-40 border border-white border-opacity-5">
                                <span className="fs-13 text-warning fw-black uppercase d-block mb-1 border-bottom border-white border-opacity-5">
                                  {section.title} {
                                    (section.title.toUpperCase().includes('COMMAND') || section.title.toUpperCase().includes('CMD') || section.title.includes('Limits'))
                                      ? <span className="ms-2 text-info opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(WRITEWater Level)</span>
                                      : <span className="ms-2 text-warning opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(READ ONLY)</span>
                                  }
                                </span>
                                {['location', 'device', 'module', ...section.fields].map(f => (
                                  <div key={f} className="d-flex justify-content-between">
                                    <span className="fs-13 text-secondary uppercase fw-bold opacity-40">{f}</span>
                                    <span className="fs-13 text-white fw-bold">{previewTemplate.mapping[section.key]?.[f] || '---'}</span>
                                  </div>
                                ))}
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    </Col>
                  )}

                  {/* FIELD MAPPING SECTION - FOR AG TANKS (NEW SKETCH BASED) */}
                  {previewTemplate.module === 'AG Tank' && previewTemplate.mapping && (
                    <Col md={12}>
                      <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 scada-data-box">
                        <h6 className="text-white fw-black uppercase letter-spacing-1 mb-3 d-flex align-items-center gap-2 fs-11">
                          <LayoutGrid size={16} className="text-info" /> AG Hardware Field Matrix
                        </h6>
                        <Row className="g-3">
                          {[
                            { title: 'Lower Limits', key: 'agLowerConfig' },
                            { title: 'Upper Limits', key: 'agUpperConfig' },
                            { title: 'Auto Cmd', key: 'agAutoConfig' },
                            { title: 'Manual Cmd', key: 'agManualConfig' },
                            { title: 'Bypass Cmd', key: 'agBypassConfig' },
                            { title: 'Level Cmd', key: 'agLevelConfig' },
                            { title: 'Open Valve', key: 'agOpenConfig' },
                            { title: 'Close Valve', key: 'agCloseConfig' }
                          ].filter(section => previewTemplate.mapping[section.key]?.field).map((section, idx) => (
                            <Col md={4} key={idx}>
                              <div className="p-2 rounded bg-dark bg-opacity-40 border border-white border-opacity-5">
                                <div className="d-flex justify-content-between align-items-center mb-1 border-bottom border-white border-opacity-5 pb-1">
                                  <span className="fs-12 text-info fw-black uppercase">
                                    {section.title} {
                                      (section.title.toUpperCase().includes('COMMAND') || section.title.toUpperCase().includes('CMD') || section.title.includes('Limits'))
                                        ? <span className="ms-2 text-info opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(WRITE)</span>
                                        : <span className="ms-2 text-warning opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(READ ONLY)</span>
                                    }
                                  </span>
                                  {previewTemplate.mapping[section.key]?.enabled !== undefined && (
                                    <Badge bg={previewTemplate.mapping[section.key].enabled ? "success" : "secondary"} className="fs-13 py-0">
                                      {previewTemplate.mapping[section.key].enabled ? 'ON' : 'OFF'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="d-flex flex-column gap-1">
                                  {['location', 'device', 'module', 'field'].map(f => (
                                    <div key={f} className="d-flex justify-content-between">
                                      <span className="fs-13 text-secondary uppercase fw-bold opacity-40">{f}</span>
                                      <span className="fs-13 text-white fw-bold">{previewTemplate.mapping[section.key]?.[f] || '---'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    </Col>
                  )}

                  {/* DG SET PREVIEW */}
                  {previewTemplate.module && previewTemplate.module.startsWith('DG Set') && previewTemplate.mapping && (
                    <Col md={12}>
                      <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 scada-data-box">
                        <h6 className="text-info fw-black uppercase letter-spacing-1 mb-3 d-flex align-items-center gap-2 fs-11">
                          <Zap size={16} /> Generator Telemetry Analysis
                        </h6>
                        <Row className="g-3">
                          {[
                            { title: 'Engine Health', key: 'dgEngineConfig', fields: ['speed', 'coolant', 'oilPress', 'battery', 'freq', 'runtime'] },
                            { title: 'Power Matrix', key: 'dgPowerConfig', fields: ['vL1L2', 'iL1', 'iL2', 'iL3', 'loadKW', 'appKVA', 'pf', 'kwh'] },
                            { title: 'Fuel Management', key: 'dgFuelConfig', fields: ['level'] },
                            { title: 'Fault & Status', key: 'dgFaultConfig', fields: ['emergencyStop', 'failToStart'] }
                          ].filter(section => previewTemplate.mapping[section.key]?.enabled).map((section, idx) => (
                            <Col md={6} key={idx}>
                              <div className="p-2 rounded bg-dark bg-opacity-40 border border-white border-opacity-5">
                                <span className="fs-13 text-info fw-black uppercase d-block mb-1 border-bottom border-white border-opacity-5">
                                  {section.title} <span className="ms-2 text-warning opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(READ ONLY)</span>
                                </span>
                                {['location', 'device', 'module', ...section.fields].map(f => (
                                  <div key={f} className="d-flex justify-content-between">
                                    <span className="fs-13 text-secondary uppercase fw-bold opacity-40">{f}</span>
                                    <span className="fs-13 text-white fw-bold">{previewTemplate.mapping[section.key]?.[f] || '---'}</span>
                                  </div>
                                ))}
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    </Col>
                  )}

                  {/* ENERGY METERING PREVIEW */}
                  {(previewTemplate.module === 'Main Meter' || previewTemplate.module === 'Sub Meters') && previewTemplate.mapping && (
                    <Col md={12}>
                      <div className="p-3 rounded-4 bg-dark bg-opacity-30 border border-white border-opacity-5 scada-data-box">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="text-info fw-black uppercase letter-spacing-1 mb-0 d-flex align-items-center gap-2 fs-11">
                            <Zap size={16} /> Energy Meter Analysis Matrix
                          </h6>
                          <div className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-20 px-3 py-1 rounded-pill fs-11 fw-black tracking-widest">
                            {previewTemplate.mapping.energyMeteringTarget}
                          </div>
                        </div>
                        <Row className="g-3">
                          {[
                            { title: 'Voltage Metrics', key: 'emVoltageConfig', fields: ['vR', 'vY', 'vB'] },
                            { title: 'Current Metrics', key: 'emCurrentConfig', fields: ['iR', 'iY', 'iB'] },
                            { title: 'Power Matrix', key: 'emPowerConfig', fields: ['activePower', 'reactivePower', 'apparentPower'] },
                            { title: 'System Metrics', key: 'emSystemConfig', fields: ['pf', 'freq', 'commStatus'] },
                            { title: 'Energy Consumption', key: 'emConsumptionConfig', fields: ['cumulativekWh'] }
                          ].filter(section => previewTemplate.mapping[section.key]?.enabled).map((section, idx) => (
                            <Col md={6} key={idx}>
                              <div className="p-2 rounded bg-dark bg-opacity-40 border border-white border-opacity-5">
                                <span className="fs-13 text-info fw-black uppercase d-block mb-1 border-bottom border-white border-opacity-5">
                                  {section.title} <span className="ms-2 text-warning opacity-75" style={{ fontSize: '8px', letterSpacing: '0.5px' }}>(READ ONLY)</span>
                                </span>
                                {['location', 'device', 'module', ...section.fields].map(f => (
                                  <div key={f} className="d-flex justify-content-between">
                                    <span className="fs-13 text-secondary uppercase fw-bold opacity-40">{f}</span>
                                    <span className="fs-13 text-white fw-bold">{previewTemplate.mapping[section.key]?.[f] || '---'}</span>
                                  </div>
                                ))}
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    </Col>
                  )}

                </Row>

                <div className="mt-3 p-2 rounded-3 bg-success bg-opacity-20 border border-success border-opacity-20 d-flex justify-content-between align-items-center shadow-inner">
                  <div className="d-flex align-items-center gap-2 text-white fw-bold fs-12 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-success shadow-glow-green" /> Protocols Verified
                  </div>
                  <span className="text-white opacity-40 fs-12 fw-black tracking-widest">TID: {previewTemplate.id}</span>
                </div>
              </div>

              <div className="p-2 border-top border-white border-opacity-5 bg-dark bg-opacity-40 d-flex justify-content-end gap-2">
                <Button variant="outline-secondary" className="fs-12 fw-black uppercase tracking-widest py-1 px-3 border-opacity-20 hover-text-white cursor-pointer" onClick={() => setShowPreviewModal(false)}>
                  Dismiss
                </Button>
                <Button variant="dark" className="fs-12 fw-black uppercase tracking-widest py-1 px-3 shadow-glow border border-info border-opacity-20 cursor-pointer text-info" onClick={() => { setShowPreviewModal(false); handleEdit(previewTemplate); }}>
                  Modify Setting
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* RULE ENGINE SETTINGS MODAL */}
      <Modal
        show={showRuleEngineModal}
        onHide={() => setShowRuleEngineModal(false)}
        centered
        size="xl"
        className="scada-modal premium-modal"
      >
        <Modal.Body className="bg-dark rounded-4 border-0 overflow-hidden shadow-2xl p-0 premium-figma-card">
          <div className="card-inner-glow bg-warning opacity-20"></div>
          <div className="p-4 position-relative z-1">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center gap-3">
                <div className="p-2 rounded-3 bg-warning bg-opacity-10 text-warning border border-warning border-opacity-10 shadow-glow-warning">
                  <Zap size={24} />
                </div>
                <div>
                  <h4 className="text-white fw-black uppercase tracking-tighter mb-0">RULE ENGINE <span className="text-warning">CONFIGURATION</span></h4>
                  <div className="d-flex align-items-center gap-2">
                    <p className="text-secondary fs-12 fw-bold uppercase tracking-widest opacity-50 mb-0">Target Module:</p>
                    <Badge bg="warning" className="bg-opacity-10 text-warning border border-warning border-opacity-25 fs-10 px-2 py-1">
                      {ruleEngineConfig.moduleId || 'NOT DETECTED'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Row className="g-5">
              {/* CONDITION SECTION */}
              <Col lg={7}>
                <div className="p-4 rounded-4 bg-dark bg-opacity-30 border border-info border-opacity-10 h-100 position-relative">
                  <div className="position-absolute top-0 end-0 p-3 opacity-10">
                  </div>

                  <h6 className="text-info fw-black uppercase tracking-widest mb-4 fs-10 d-flex align-items-center gap-2 position-relative z-1">
                    <Activity size={16} /> 1. CONDITION
                  </h6>

                  <div className="p-4 rounded-4 bg-dark bg-opacity-40 border border-info border-opacity-10 shadow-inner position-relative z-1">
                    <div className="mb-4 d-flex align-items-center justify-content-between border-bottom border-info border-opacity-10 pb-2">
                      <div className="d-flex align-items-center gap-2">
                        <Database size={16} className="text-info" />
                        <span className="text-info fw-black fs-12 uppercase tracking-widest">CONFIGURATION PARAMETERS</span>
                      </div>
                      <Form.Check
                        type="switch"
                        id="schedule-toggle"
                        label={ruleEngineConfig.condition.isScheduleEnabled ? "SCHEDULE ENABLED" : "SCHEDULE DISABLED"}
                        className="scada-switch premium-switch fs-9 fw-black text-info mb-0"
                        checked={ruleEngineConfig.condition.isScheduleEnabled}
                        onChange={(e) => setRuleEngineConfig({
                          ...ruleEngineConfig,
                          condition: { ...ruleEngineConfig.condition, isScheduleEnabled: e.target.checked }
                        })}
                      />
                    </div>

                    <Row className="g-4">
                      {/* SCHEDULE PART */}
                      <Col md={6} style={{ opacity: ruleEngineConfig.condition.isScheduleEnabled ? 1 : 0.4, pointerEvents: ruleEngineConfig.condition.isScheduleEnabled ? 'all' : 'none' }}>
                        <Form.Label className="fs-11 text-white fw-bold mb-2">CONDITION DATE & TIME</Form.Label>
                        <Form.Control
                          type="datetime-local"
                          disabled={!ruleEngineConfig.condition.isScheduleEnabled}
                          className="premium-input bg-dark bg-opacity-40 border-info border-opacity-20 text-info fw-bold fs-12 p-3"
                          value={ruleEngineConfig.condition.timeDate}
                          onChange={(e) => setRuleEngineConfig({
                            ...ruleEngineConfig,
                            condition: { ...ruleEngineConfig.condition, timeDate: e.target.value }
                          })}
                        />
                      </Col>
                      <Col md={6} style={{ opacity: ruleEngineConfig.condition.isScheduleEnabled ? 1 : 0.4, pointerEvents: ruleEngineConfig.condition.isScheduleEnabled ? 'all' : 'none' }}>
                        <Form.Label className="fs-11 text-white fw-bold mb-2">REPEAT DAYS</Form.Label>
                        <div className="d-flex flex-wrap gap-2">
                          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                            <div
                              key={day}
                              onClick={() => {
                                if (!ruleEngineConfig.condition.isScheduleEnabled) return;
                                const current = ruleEngineConfig.condition.repeatDays;
                                const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
                                setRuleEngineConfig({ ...ruleEngineConfig, condition: { ...ruleEngineConfig.condition, repeatDays: next } });
                              }}
                              className={`px-3 py-2 rounded-3 fs-10 fw-black cursor-pointer transition-all border ${ruleEngineConfig.condition.repeatDays.includes(day) ? 'bg-info text-dark border-info shadow-glow-blue' : 'bg-dark bg-opacity-50 text-secondary border-white border-opacity-5 hover-border-info'}`}
                            >
                              {day}
                            </div>
                          ))}
                        </div>
                      </Col>

                      <Col md={12} className="border-top border-white border-opacity-5 pt-4">
                        <div className="d-flex align-items-center gap-2 mb-3">
                          <Activity size={14} className="text-info opacity-50" />
                          <span className="fs-10 text-secondary fw-black uppercase tracking-widest opacity-50">Logic Source & Comparison</span>
                        </div>
                      </Col>

                      <Col md={6}>
                        <Form.Label className="fs-11 text-white fw-bold mb-2">CONDITION TYPE</Form.Label>
                        <Form.Select
                          className="premium-input bg-dark bg-opacity-40 border-info border-opacity-20 text-info fw-bold fs-12 p-3"
                          value={ruleEngineConfig.condition.type}
                          onChange={(e) => setRuleEngineConfig({
                            ...ruleEngineConfig,
                            condition: { ...ruleEngineConfig.condition, type: e.target.value }
                          })}
                        >
                          <option value="NA">NA</option>
                          <option value="INPUT_1">INPUT_1</option>
                          <option value="INPUT_2">INPUT_2</option>
                          <option value="ANALOG_1">ANALOG_1</option>
                          <option value="ANALOG_2">ANALOG_2</option>
                          <option value="DATE_TIME_ONCE">DATE_TIME_ONCE</option>
                          <option value="DATE_TIME_REPEAT">DATE_TIME_REPEAT</option>
                          <option value="MODBUS">MODBUS</option>
                        </Form.Select>
                      </Col>
                      <Col md={6}>
                        <Form.Label className="fs-11 text-white fw-bold mb-2">CONDITION MODBUS</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="(DeviceID),Address"
                          className="premium-input bg-dark bg-opacity-40 border-info border-opacity-20 text-info fw-bold fs-12 p-3"
                          value={ruleEngineConfig.condition.modbus}
                          onChange={(e) => setRuleEngineConfig({
                            ...ruleEngineConfig,
                            condition: { ...ruleEngineConfig.condition, modbus: e.target.value }
                          })}
                        />
                      </Col>
                      <Col md={6}>
                        <Form.Label className="fs-11 text-white fw-bold mb-2">COMPARISON TYPE</Form.Label>
                        <Form.Select
                          className="premium-input bg-dark bg-opacity-40 border-info border-opacity-20 text-info fw-bold fs-12 p-3"
                          value={ruleEngineConfig.condition.comparisonType}
                          onChange={(e) => setRuleEngineConfig({
                            ...ruleEngineConfig,
                            condition: { ...ruleEngineConfig.condition, comparisonType: e.target.value }
                          })}
                        >
                          <option value="LESS_THAN">LESS_THAN</option>
                          <option value="EQUAL">EQUAL</option>
                          <option value="MORE_THAN">MORE_THAN</option>
                        </Form.Select>
                      </Col>
                      <Col md={6}>
                        <Form.Label className="fs-11 text-white fw-bold mb-2">COMPARISON VALUE</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="500"
                          className="premium-input bg-dark bg-opacity-40 border-info border-opacity-20 text-info fw-bold fs-12 p-3"
                          value={ruleEngineConfig.condition.comparisonValue}
                          onChange={(e) => setRuleEngineConfig({
                            ...ruleEngineConfig,
                            condition: { ...ruleEngineConfig.condition, comparisonValue: e.target.value }
                          })}
                        />
                      </Col>
                    </Row>
                  </div>
                </div>
              </Col>

              {/* CONSEQUENCE SECTION */}
              <Col lg={5}>
                <div className="p-4 rounded-4 bg-dark bg-opacity-30 border border-success border-opacity-10 h-100 position-relative">
                  <div className="position-absolute top-0 end-0 p-3 opacity-10">
                  </div>

                  <h6 className="text-success fw-black uppercase tracking-widest mb-4 fs-10 d-flex align-items-center gap-2 position-relative z-1">
                    <Zap size={16} /> CONSEQUENCE ACTIONS
                  </h6>

                  <div className="p-4 rounded-4 bg-dark bg-opacity-40 border border-success border-opacity-10 mb-4 shadow-inner position-relative z-1">
                    <div className="mb-4 d-flex align-items-center gap-2 border-bottom border-success border-opacity-10 pb-2">
                      <Settings size={16} className="text-success" />
                      <span className="text-success fw-black fs-12 uppercase tracking-widest">3. AUTOMATED RESPONSE</span>
                    </div>

                    <Row className="g-4">
                      <Col md={12}>
                        <Form.Label className="fs-11 text-white fw-bold mb-2">CONSEQUENCE TYPE</Form.Label>
                        <Form.Select
                          className="premium-input bg-dark bg-opacity-40 border-success border-opacity-20 text-success fw-bold fs-12 p-3"
                          value={ruleEngineConfig.consequence.type}
                          onChange={(e) => setRuleEngineConfig({
                            ...ruleEngineConfig,
                            consequence: { ...ruleEngineConfig.consequence, type: e.target.value }
                          })}
                        >
                          <option value="OUTPUT_1">OUTPUT_1</option>
                          <option value="OUTPUT_2">OUTPUT_2</option>
                          <option value="MODBUS">MODBUS</option>
                        </Form.Select>
                        <small className="text-success opacity-70 fs-10 fw-bold mt-2 d-block italic">➔ Target channel for output</small>
                      </Col>
                      <Col md={12}>
                        <Form.Label className="fs-11 text-white fw-bold mb-2">CONSEQUENCE MODBUS</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="(DeviceID),Address"
                          className="premium-input bg-dark bg-opacity-40 border-success border-opacity-20 text-success fw-bold fs-12 p-3"
                          value={ruleEngineConfig.consequence.modbus}
                          onChange={(e) => setRuleEngineConfig({
                            ...ruleEngineConfig,
                            consequence: { ...ruleEngineConfig.consequence, modbus: e.target.value }
                          })}
                        />
                        <small className="text-success opacity-70 fs-10 fw-bold mt-2 d-block italic">➔ Format: (247),40001</small>
                      </Col>
                      <Col md={12}>
                        <Form.Label className="fs-11 text-white fw-bold mb-2">CONSEQUENCE VALUE</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="0"
                          className="premium-input bg-dark bg-opacity-40 border-success border-opacity-20 text-success fw-bold fs-12 p-3"
                          value={ruleEngineConfig.consequence.value}
                          onChange={(e) => setRuleEngineConfig({
                            ...ruleEngineConfig,
                            consequence: { ...ruleEngineConfig.consequence, value: e.target.value }
                          })}
                        />
                        <small className="text-success opacity-70 fs-10 fw-bold mt-2 d-block italic">➔ Value written to the Modbus register</small>
                      </Col>
                    </Row>
                  </div>

                </div>
              </Col>
            </Row>

            <div className="mt-4 pt-4 border-top border-white border-opacity-5 d-flex justify-content-end gap-3">
              <Button
                variant="outline-secondary"
                className="fw-black px-4 py-2 fs-11 uppercase tracking-widest border-opacity-20"
                onClick={() => setShowRuleEngineModal(false)}
              >
                Discard
              </Button>
              <Button
                className="btn-info fw-black px-4 py-2 fs-11 uppercase tracking-widest shadow-glow border-0 d-flex align-items-center gap-2"
                onClick={handleApplyRules}
                disabled={isSendingRules}
              >
                {isSendingRules ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Apply Rules
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <style dangerouslySetInnerHTML={{
        __html: `
        .scada-select {
          background-color: rgba(15, 23, 42, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
          border-radius: 6px !important;
          box-shadow: none !important;
          appearance: auto !important;
          cursor: pointer;
          font-size: 0.75rem !important;
          padding: 6px 10px !important;
          height: 34px !important;
        }
        .scada-select:focus {
          border-color: var(--bs-info) !important;
        }
        .scada-select option {
          background-color: #111827;
          color: white;
          padding: 4px;
          font-size: 0.75rem;
        }
        .scada-switch .form-check-input {
          background-color: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          width: 2.4em;
          height: 1.2em;
          cursor: pointer;
        }
        .scada-switch .form-check-input:checked {
          background-color: var(--bs-info);
          border-color: var(--bs-info);
        }
        .scada-switch.success .form-check-input:checked {
          background-color: var(--bs-success);
          border-color: var(--bs-success);
        }
        .shadow-glow { box-shadow: 0 0 20px rgba(56, 189, 248, 0.15); }
        .min-w-200 { min-width: 200px; }
        .hover-bg-white-5:hover { background: rgba(255, 255, 255, 0.05); }
        .fw-black { font-weight: 900 !important; }
        .letter-spacing-1 { letter-spacing: 1px; }
        .letter-spacing-2 { letter-spacing: 2.5px; }
        .fs-12 { font-size: 0.6rem; }
        .fs-11 { font-size: 0.65rem; }
        .fs-10 { font-size: 0.75rem; }
        .fs-9 { font-size: 0.85rem; }
        .fs-8 { font-size: 0.95rem; }
        .scada-modal .modal-content {
          background: transparent !important;
          border: none !important;
        }
        .hover-text-white:hover { color: white !important; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        
        /* Mobile Responsiveness for Cards */
        @media (max-width: 576px) {
          .premium-figma-card {
            padding: 0.75rem !important;
          }
          .fs-10 { font-size: 0.65rem !important; }
          .fs-11 { font-size: 0.55rem !important; }
          .fs-12 { font-size: 0.45rem !important; }
          .fs-13 { font-size: 0.6rem !important; }
          .preview-badge-premium {
            padding: 1px 4px !important;
            gap: 1px !important;
          }
          .preview-badge-premium span { font-size: 0.5rem !important; }
          .scada-data-box {
            margin-top: 0.25rem !important;
            margin-bottom: 0.25rem !important;
            padding: 0.4rem !important;
          }
        }
        
        .premium-figma-card {
          background: linear-gradient(145deg, rgba(23, 33, 50, 0.7) 0%, rgba(8, 12, 21, 0.9) 100%);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
          position: relative;
          transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .card-inner-glow {
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.4), transparent);
          z-index: 2;
        }

        .premium-figma-card:hover {
          transform: translateY(-5px);
          border-color: rgba(56, 189, 248, 0.3) !important;
          box-shadow: 0 15px 40px -10px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.1);
        }

        .preview-badge-premium {
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.15);
          padding: 4px 10px;
          border-radius: 100px;
          color: #38bdf8;
          font-size: 0.65rem;
          transition: all 0.3s ease;
        }

        .preview-badge-premium:hover {
          background: rgba(56, 189, 248, 0.2);
          border-color: #38bdf8;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
        }

        .scada-data-box {
          background: rgba(0, 0, 0, 0.4) !important;
          border: 1px solid rgba(255, 255, 255, 0.03) !important;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }

        .status-indicator-pulse {
          width: 6px; height: 6px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 8px #22c55e;
          animation: status-pulse 2s infinite;
        }

        .icon-box-premium {
          background: rgba(0, 0, 0, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .icon-box-premium.info { border-color: rgba(56, 189, 248, 0.3) !important; box-shadow: 0 0 12px rgba(56, 189, 248, 0.1); color: #38bdf8; }
        .icon-box-premium.primary { border-color: rgba(13, 110, 253, 0.3) !important; box-shadow: 0 0 12px rgba(13, 110, 253, 0.1); color: #0d6efd; }
        .icon-box-premium.success { border-color: rgba(34, 197, 94, 0.3) !important; box-shadow: 0 0 12px rgba(34, 197, 94, 0.1); color: #22c55e; }
        .icon-box-premium.warning { border-color: rgba(234, 179, 8, 0.3) !important; box-shadow: 0 0 12px rgba(234, 179, 8, 0.1); color: #eab308; }
        .icon-box-premium.danger { border-color: rgba(239, 68, 68, 0.3) !important; box-shadow: 0 0 12px rgba(239, 68, 68, 0.1); color: #ef4444; }

        .scada-radio .form-check-input {
          background-color: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
        }
        .scada-radio .form-check-input:checked {
          background-color: var(--bs-info);
          border-color: var(--bs-info);
        }
        .grayscale { filter: grayscale(1); }
        .scada-switch.lg .form-check-input {
          width: 3.2em;
          height: 1.6em;
        }

        @keyframes status-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }

        .card-action-bar-premium {
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .hover-glow-text:hover {
          text-shadow: 0 0 8px currentColor;
          opacity: 1 !important;
        }

        .shadow-glow-green { text-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
        .shadow-glow-blue { box-shadow: 0 0 15px rgba(56, 189, 248, 0.25); }
        .shadow-glow-green-box { box-shadow: 0 0 15px rgba(34, 197, 94, 0.25); }
        .shadow-glow-warning-box { box-shadow: 0 0 15px rgba(234, 179, 8, 0.25); }
        .shadow-glow-danger-box { box-shadow: 0 0 15px rgba(239, 68, 68, 0.25); }
        
        .selected-premium-card {
          background: linear-gradient(145deg, rgba(56, 189, 248, 0.1) 0%, rgba(12, 18, 30, 0.95) 100%) !important;
          border-color: rgba(56, 189, 248, 0.6) !important;
          box-shadow: 0 0 40px rgba(56, 189, 248, 0.2), inset 0 0 20px rgba(56, 189, 248, 0.05) !important;
        }

        .selected-premium-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.15), transparent 70%);
          pointer-events: none;
        }

        .scada-checkbox .form-check-input {
          width: 1.1rem;
          height: 1.1rem;
          background-color: rgba(0, 0, 0, 0.4) !important;
          border: 1px solid rgba(56, 189, 248, 0.4) !important;
          cursor: pointer;
          border-radius: 4px !important;
          transition: all 0.3s ease;
        }
        
        .scada-checkbox .form-check-input:checked {
          background-color: #38bdf8 !important;
          border-color: #38bdf8 !important;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M6 10l3 3l6-6'/%3e%3c/svg%3e") !important;
        }

        .scada-checkbox.lg .form-check-input {
          width: 1.4rem;
          height: 1.4rem;
        }

        .text-glow-blue { text-shadow: 0 0 15px rgba(56, 189, 248, 0.4); }
        .text-glow-white { text-shadow: 0 0 10px rgba(255, 255, 255, 0.2); }
        .hover-border-info:hover { border-color: #38bdf8 !important; }
        .hover-border-primary:hover { border-color: #0d6efd !important; }
        .hover-border-success:hover { border-color: #198754 !important; }
        .hover-border-danger:hover { border-color: #dc3545 !important; }
        .hover-bg-white-opacity:hover { background: rgba(255, 255, 255, 0.03); }
        .premium-figma-card {
          background: linear-gradient(145deg, rgba(12, 18, 30, 0.8) 0%, rgba(30, 41, 59, 0.9) 100%);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(56, 189, 248, 0.15) !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.05);
          position: relative;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .card-inner-glow {
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.5), transparent);
          z-index: 2;
        }

        .configuration-form-wrapper {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(12, 18, 30, 1) 100%);
          border: 1px solid rgba(56, 189, 248, 0.1) !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }

        .scada-data-box {
          background: rgba(15, 23, 42, 0.6) !important;
          border: 1px solid rgba(56, 189, 248, 0.1) !important;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        }

        .premium-input {
          background: rgba(15, 23, 42, 0.8) !important;
          border: 1px solid rgba(56, 189, 248, 0.2) !important;
          color: #e2e8f0 !important;
          border-radius: 8px !important;
          transition: all 0.3s ease;
          padding: 8px 12px !important;
          height: 38px !important;
          font-size: 0.85rem !important;
        }
        
        /* Dark Theme Options */
        .premium-input option {
          background-color: #0f172a !important;
          color: white !important;
          padding: 10px !important;
          font-size: 0.85rem !important;
        }

        .premium-input:focus {
           background: rgba(15, 23, 42, 1) !important;
           border-color: #38bdf8 !important;
           box-shadow: 0 0 20px rgba(56, 189, 248, 0.2) !important;
        }

        .fs-9 { font-size: 0.95rem !important; font-weight: 800; color: #f8fafc; }
        .fs-12 { font-size: 0.65rem !important; color: #94a3b8; }
        .fs-11 { font-size: 0.75rem !important; color: #cbd5e1; }
        .hover-glow-blue:hover {
           box-shadow: 0 0 30px rgba(56, 189, 248, 0.1) !important;
           border-color: rgba(56, 189, 248, 0.4) !important;
           transform: translateY(-2px);
        }
        .scada-config-page { max-width: 1600px; margin: 0 auto; }
        
        /* Typography System */
        .fw-black { font-weight: 900 !important; }
        .letter-spacing-2 { letter-spacing: 2px; }
        .tracking-widest { letter-spacing: 0.1em; }
        .tracking-tighter { letter-spacing: -0.05em; }
        .uppercase { text-transform: uppercase; }
        
        .fs-7 { font-size: 1.1rem; }
        .fs-9 { font-size: 0.8rem; }
        .fs-10 { font-size: 0.7rem; }
        .fs-11 { font-size: 0.65rem; }
        .fs-12 { font-size: 0.6rem; }
        .fs-13 { font-size: 0.55rem; }

        /* Responsive Global Scaling */
        @media (max-width: 768px) {
            .page-header h2 { font-size: 1.3rem !important; }
            .page-header p { font-size: 0.6rem !important; }
            .page-header .btn { font-size: 0.75rem !important; padding: 0.6rem 1rem !important; width: 100%; justify-content: center; }
            .premium-input { font-size: 0.75rem !important; padding: 0.6rem !important; width: 100% !important; }
            .scada-config-page { padding: 0.5rem !important; }
            .page-header { padding: 1rem !important; margin-bottom: 1rem !important; }
            .page-header .lucide { width: 18px; height: 18px; }
            .configuration-form-wrapper { padding: 1rem !important; }
            .premium-figma-card { padding: 1rem !important; }
            h4 { font-size: 1.1rem !important; }
            h5 { font-size: 0.9rem !important; }
            h6 { font-size: 0.8rem !important; }
            .form-switch .form-check-input { width: 2em; height: 1em; }
        } 
        
        .z-1 { z-index: 1; }
        .shadow-glow-blue { text-shadow: 0 0 15px rgba(56, 189, 248, 0.6); }
      `}} />
    </div>
  );
};

export default ConfigTemplates;
