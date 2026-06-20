import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSochiotGatewayStatus, getSochiotDeviceStatus, getSochiotDeviceDetails } from './authService';

const DeviceStatusContext = createContext();

export const DeviceStatusProvider = ({ children }) => {
  const [deviceStatuses, setDeviceStatuses] = useState({});
  const [gatewayStatuses, setGatewayStatuses] = useState({});
  const lastSeenOnlineRef = useRef({});
  const lastSeenGatewayOnlineRef = useRef({});

  const checkDeviceStatus = useCallback(async (deviceId) => {
    if (!deviceId) return false;
    try {
      let res;
      const isNumeric = /^\d+$/.test(String(deviceId));
      if (isNumeric) {
        res = await getSochiotDeviceDetails(deviceId);
      } else {
        try {
          res = await getSochiotDeviceStatus(deviceId);
          const isOnline = res && (
            res.status === 'ONLINE' || 
            res.status === 'online' ||
            res.mode?.name === 'ONLINE' ||
            res.we?.mode?.name === 'ONLINE' ||
            res.online === true ||
            res.active === true
          );
          if (isOnline) {
            lastSeenOnlineRef.current[deviceId] = Date.now();
            setDeviceStatuses(prev => ({
              ...prev,
              [deviceId]: true
            }));
            return true;
          }
        } catch (statusErr) {
          console.warn(`getSochiotDeviceStatus failed for ${deviceId}, falling back to getSochiotDeviceDetails:`, statusErr);
        }
        
        // Fallback: try details endpoint
        try {
          res = await getSochiotDeviceDetails(deviceId);
        } catch (detailsErr) {
          console.error(`Fallback getSochiotDeviceDetails also failed for ${deviceId}:`, detailsErr);
        }
      }
      const isOnline = res && (
        res.status === 'ONLINE' || 
        res.status === 'online' ||
        res.mode?.name === 'ONLINE' ||
        res.we?.mode?.name === 'ONLINE' ||
        res.online === true ||
        res.active === true
      );
      if (isOnline) {
        lastSeenOnlineRef.current[deviceId] = Date.now();
      }
      
      // Latch/Damp status: keep it online if it was seen online in the last 90 seconds
      const finalStatus = isOnline || (lastSeenOnlineRef.current[deviceId] && (Date.now() - lastSeenOnlineRef.current[deviceId] < 90000));
      
      setDeviceStatuses(prev => ({
        ...prev,
        [deviceId]: !!finalStatus
      }));
      return !!finalStatus;
    } catch (e) {
      console.error(`Error checking device status for ${deviceId}:`, e);
      const finalStatus = lastSeenOnlineRef.current[deviceId] && (Date.now() - lastSeenOnlineRef.current[deviceId] < 90000);
      setDeviceStatuses(prev => ({
        ...prev,
        [deviceId]: !!finalStatus
      }));
      return !!finalStatus;
    }
  }, []);

  const checkGatewayStatus = useCallback(async (clusterId) => {
    if (!clusterId) return false;
    
    // If gateway/cluster ID is numeric, treat it as online (true) as a legacy fallback
    const isNumeric = /^\d+$/.test(String(clusterId));
    if (isNumeric) {
      setGatewayStatuses(prev => ({
        ...prev,
        [clusterId]: true
      }));
      return true;
    }

    try {
      const res = await getSochiotGatewayStatus(clusterId);
      const isOnline = res && (
        res.status === 'ONLINE' || 
        res.status === 'online' ||
        res.mode?.name === 'ONLINE' ||
        res.we?.mode?.name === 'ONLINE' ||
        res.online === true ||
        res.active === true
      );
      if (isOnline) {
        lastSeenGatewayOnlineRef.current[clusterId] = Date.now();
      }
      
      // Latch/Damp status: keep it online if it was seen online in the last 90 seconds
      const finalStatus = isOnline || (lastSeenGatewayOnlineRef.current[clusterId] && (Date.now() - lastSeenGatewayOnlineRef.current[clusterId] < 90000));
      
      setGatewayStatuses(prev => ({
        ...prev,
        [clusterId]: !!finalStatus
      }));
      return !!finalStatus;
    } catch (e) {
      console.error(`Error checking gateway status for ${clusterId}:`, e);
      const finalStatus = lastSeenGatewayOnlineRef.current[clusterId] && (Date.now() - lastSeenGatewayOnlineRef.current[clusterId] < 90000);
      setGatewayStatuses(prev => ({
        ...prev,
        [clusterId]: !!finalStatus
      }));
      return !!finalStatus;
    }
  }, []);

  // Method to poll statuses for all devices/gateways found in savedTemplates
  const pollAllStatuses = useCallback(async () => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) return;

    try {
      const saved = localStorage.getItem('scada_templates');
      if (!saved) return;
      const templates = JSON.parse(saved);

      const deviceIds = new Set();
      const gatewayUuids = new Set();

      if (Array.isArray(templates)) {
        templates.forEach(t => {
          if (t.mapping) {
            // Check if mapping has global deviceId/gatewayUuid
            if (t.mapping.deviceId) deviceIds.add(t.mapping.deviceId);
            if (t.mapping.gatewayUuid) gatewayUuids.add(t.mapping.gatewayUuid);

            // Fallback check: look through any section mappings for device fields
            Object.values(t.mapping).forEach(sec => {
              if (sec && typeof sec === 'object') {
                if (sec.device) deviceIds.add(sec.device);
              }
            });
          }
        });
      }

      // Poll devices
      await Promise.all(Array.from(deviceIds).map(id => checkDeviceStatus(id)));
      // Poll gateways
      await Promise.all(Array.from(gatewayUuids).map(uuid => checkGatewayStatus(uuid)));
    } catch (e) {
      console.error('Error polling statuses:', e);
    }
  }, [checkDeviceStatus, checkGatewayStatus]);

  // Set up periodic polling with authentication-awareness
  useEffect(() => {
    const handlePoll = () => {
      const authenticated = localStorage.getItem('isAuthenticated') === 'true';
      if (authenticated) {
        pollAllStatuses();
      }
    };

    handlePoll();

    const interval = setInterval(handlePoll, 20000); // Poll every 20 seconds

    window.addEventListener('storage-update', handlePoll);
    window.addEventListener('storage', handlePoll);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage-update', handlePoll);
      window.removeEventListener('storage', handlePoll);
    };
  }, [pollAllStatuses]);

  // Helper function to resolve overall status
  const getOverallStatus = useCallback((deviceId, gatewayUuid) => {
    const isDevOnline = deviceId ? (deviceStatuses[deviceId] ?? null) : null;
    const isGwyOnline = gatewayUuid ? (gatewayStatuses[gatewayUuid] ?? null) : null;

    // Resilient fallback: If device is explicitly online, bypass gateway check
    if (isDevOnline === true) return true;

    // If both are checked, both must be online. If only one is checked, that one must be online.
    if (isDevOnline !== null && isGwyOnline !== null) {
      return isDevOnline && isGwyOnline;
    }
    if (isDevOnline !== null) return isDevOnline;
    if (isGwyOnline !== null) return isGwyOnline;
    
    // Fallback: check deviceStatuses list for deviceId
    if (deviceId && deviceStatuses[deviceId] !== undefined) {
      return deviceStatuses[deviceId];
    }
    return false; // Default offline
  }, [deviceStatuses, gatewayStatuses]);

  return (
    <DeviceStatusContext.Provider value={{
      deviceStatuses,
      gatewayStatuses,
      checkDeviceStatus,
      checkGatewayStatus,
      getOverallStatus,
      refreshStatuses: pollAllStatuses
    }}>
      {children}
    </DeviceStatusContext.Provider>
  );
};

export const useDeviceStatus = () => {
  const context = useContext(DeviceStatusContext);
  if (!context) {
    throw new Error('useDeviceStatus must be used within a DeviceStatusProvider');
  }
  return context;
};
