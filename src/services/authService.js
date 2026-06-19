const EXTERNAL_API_URL = '/sochiot-auth';

const fetchWithTimeout = async (url, options = {}, timeout = 20000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

let activeLoginPromise = null;

export const loginToSochiot = async (email, password) => {
  if (activeLoginPromise) {
    return activeLoginPromise;
  }

  activeLoginPromise = (async () => {
    try {
      const response = await fetch(`${EXTERNAL_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      if (data.token) {
        localStorage.setItem('sochiot_token', data.token);
        return data.token;
      }
      throw new Error('No token received');
    } catch (error) {
      console.error('Auth Error:', error);
      throw error;
    } finally {
      activeLoginPromise = null;
    }
  })();

  return activeLoginPromise;
};

export const getSochiotUserMe = async () => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetch(`${EXTERNAL_API_URL}/user/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('sochiot_token');
      }
      throw new Error('Failed to fetch user data');
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch Me Error:', error);
    throw error;
  }
};

const CONFIG_API_URL = '/sochiot-config';
const TRIGGERS_API_URL = '/sochiot-triggers';

export const getSochiotLocationData = async (locationId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetch(`${CONFIG_API_URL}/entity/LOCATION/${locationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch location data');
    return await response.json();
  } catch (error) {
    console.error('Fetch Location Error:', error);
    throw error;
  }
};

export const getSochiotZoneData = async (zoneId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetch(`${CONFIG_API_URL}/entity/ZONE/${zoneId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch zone data');
    return await response.json();
  } catch (error) {
    console.error('Fetch Zone Error:', error);
    throw error;
  }
};
export const getSochiotDeviceDetails = async (deviceId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/device/${deviceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 20000);
    
    if (!response.ok) throw new Error('Failed to fetch device details');
    return await response.json();
  } catch (error) {
    console.error('Fetch Device Details Error:', error);
    throw error;
  }
};
export const getSochiotGatewayStatus = async (clusterId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/gateway/status/uuid/${clusterId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 20000);

    if (!response.ok) throw new Error('Failed to fetch gateway status');
    return await response.json();
  } catch (error) {
    console.error('Fetch Gateway Status Error:', error);
    throw error;
  }
};

export const getSochiotDeviceStatus = async (deviceId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/device/status/uuid/${deviceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 20000);

    if (!response.ok) throw new Error('Failed to fetch device status');
    return await response.json();
  } catch (error) {
    console.error('Fetch Device Status Error:', error);
    throw error;
  }
};
export const getSochiotRules = async (nodeType, nodeId, page = 1) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/${nodeType}/${nodeId}?page=${page}&isPageable=true&sortBy=lastUpdated&sortOrder=DESC`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 10000); // 10 seconds timeout for rules

    if (!response.ok) throw new Error('Failed to fetch rules');
    return await response.json();
  } catch (error) {
    console.error('Fetch Rules Error:', error);
    throw error;
  }
};

export const getSochiotRuleById = async (ruleId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/${ruleId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 10000);

    if (!response.ok) throw new Error('Failed to fetch rule detail');
    return await response.json();
  } catch (error) {
    console.error('Fetch Rule By ID Error:', error);
    throw error;
  }
};

// Fetch event fields for a given moduleId (used in condition edit dropdown)
export const getSochiotEventFields = async (moduleId, moduleTypeId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return [];

  const headers = { 'Authorization': `Bearer ${token}` };

  // Try 1: triggers/fields endpoint with moduleId
  try {
    const r = await fetchWithTimeout(`${TRIGGERS_API_URL}/fields?moduleId=${moduleId}`, { headers }, 8000);
    if (r.ok) {
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.list || d.content || d.data || []);
      if (arr.length > 0) return arr;
    }
  } catch (e) {}

  // Try 2: config-engine event-fields by moduleTypeId
  if (moduleTypeId) {
    try {
      const r = await fetchWithTimeout(`${CONFIG_API_URL}/module-type/${moduleTypeId}/event-fields`, { headers }, 8000);
      if (r.ok) {
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.list || d.content || d.data || []);
        if (arr.length > 0) return arr;
      }
    } catch (e) {}
  }

  // Try 3: triggers event-fields by moduleTypeId
  if (moduleTypeId) {
    try {
      const r = await fetchWithTimeout(`${TRIGGERS_API_URL}/fields?moduleTypeId=${moduleTypeId}`, { headers }, 8000);
      if (r.ok) {
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.list || d.content || d.data || []);
        if (arr.length > 0) return arr;
      }
    } catch (e) {}
  }

  return [];
};

// Fetch modules for a device UUID (used in condition edit Module dropdown)
export const getSochiotDeviceModules = async (deviceUuid) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return [];

  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/device/${deviceUuid}/modules`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 8000);
    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : (data.list || data.content || []);
    }
  } catch (e) { console.error('Fetch Device Modules Error:', e); }
  return [];
};

// Fetch full device details by numeric ID → includes modules + event fields
// API: GET /config-engine/device/{numericId}
export const getSochiotDeviceByNumericId = async (deviceNumericId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`${CONFIG_API_URL}/device/${deviceNumericId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 10000);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) { console.error('Fetch Device By Numeric ID Error:', e); }
  return null;
};// Activate an existing rule
// API: PUT /triggers/rules/activate/{ruleId}
export const activateSochiotRule = async (ruleId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/activate/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 20000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Activate Rule API Error:', response.status, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Activate Rule Error:', error);
    throw error;
  }
};

// Deactivate an existing rule
// API: PUT /triggers/rules/de-activate/{ruleId}
export const deactivateSochiotRule = async (ruleId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/de-activate/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 20000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deactivate Rule API Error:', response.status, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Deactivate Rule Error:', error);
    throw error;
  }
};


// Delete an existing rule
// API: DELETE /triggers/rules/{ruleId}
export const deleteSochiotRule = async (ruleId) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/${ruleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, 20000);

    if (!response.ok) {
      let errorBody = {};
      try { errorBody = await response.json(); } catch (_) {}
      console.error('Delete Rule API Error:', response.status, errorBody);
      // Create a typed error so callers can check err.status directly
      const err = new Error(
        errorBody?.message || `API Error ${response.status}`
      );
      err.status = response.status;
      err.body = errorBody;
      throw err;
    }
    // API returns { status: "OK", data: null, message: "Setting is deleted successfully." }
    return await response.json();
  } catch (error) {
    console.error('Delete Rule Error:', error);
    throw error;
  }
};

// Update an existing rule
// API: PUT /triggers/rules/{ruleId}
export const updateSochiotRule = async (ruleId, payload) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, 30000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update Rule API Error:', response.status, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Update Rule Error:', error);
    throw error;
  }
};

// Create a new rule
// API: POST /triggers/rules
export const createSochiotRule = async (payload) => {
  const token = localStorage.getItem('sochiot_token');
  if (!token) return null;

  try {
    const response = await fetchWithTimeout(`https://app.sochiot.com/api/triggers/rules`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, 30000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create Rule API Error:', response.status, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Create Rule Error:', error);
    throw error;
  }
};
