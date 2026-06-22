import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus, Users, Shield, Building, Trash2, Lock,
  ChevronLeft, ChevronRight, ArrowLeft, ChevronDown,
  ChevronRight as ChevRight, Eye, Plus, Search,
  CheckSquare, Square, Settings, Globe, Star, X, Edit
} from 'lucide-react';

/* ══════════════════════════════════════════════
   MOCK DATA
══════════════════════════════════════════════ */

const ROLE_HIERARCHY = [
  { key: 'super_admin', label: 'Administrator User', searchTerms: ['superadmin', 'super admin', 'super', 'administrator'] },
  { key: 'org_admin', label: 'Oragnization Admin', searchTerms: ['org admin', 'organization admin', 'organisation admin', 'org'] },
  { key: 'zone_manager', label: 'Zone Manager', searchTerms: ['zone manager', 'zone'] },
  { key: 'area_manager', label: 'Area Manager', searchTerms: ['area manager', 'area'] },
  { key: 'location_manager', label: 'Location Manager', searchTerms: ['location manager', 'location'] },
  { key: 'unit_head', label: 'Unit Head', searchTerms: ['unit head', 'unit'] },
  { key: 'operator', label: 'Operator Role', searchTerms: ['operator'] }
];

const STANDARD_ROLES = ROLE_HIERARCHY;

const getCurrentUserRoleIndex = () => {
  const role = localStorage.getItem('userRole') || 'USER';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const roleName = (userData.roleName || role).toLowerCase();

  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || roleName.includes('super')) {
    return 0;
  }

  for (let i = 0; i < ROLE_HIERARCHY.length; i++) {
    const rh = ROLE_HIERARCHY[i];
    for (const term of rh.searchTerms) {
      if (roleName.includes(term)) {
        return i;
      }
    }
  }
  return 0;
};

const findBestMatchingRole = (standardRole, apiRoles) => {
  if (!apiRoles || apiRoles.length === 0) return null;
  for (const term of standardRole.searchTerms) {
    const found = apiRoles.find(r => r.name.toLowerCase().includes(term.toLowerCase()));
    if (found) return found;
  }
  if (standardRole.key === 'super_admin') {
    const adminRole = apiRoles.find(r => r.name.toLowerCase().includes('admin'));
    if (adminRole) return adminRole;
  }
  if (standardRole.key === 'org_admin') {
    const adminRole = apiRoles.find(r => r.name.toLowerCase().includes('admin') || r.name.toLowerCase().includes('manager'));
    if (adminRole) return adminRole;
  }
  return null;
};

const getStandardRoleKey = (roleName) => {
  if (!roleName) return 'operator';
  const nameLower = roleName.toLowerCase();
  for (const sr of STANDARD_ROLES) {
    for (const term of sr.searchTerms) {
      if (nameLower.includes(term)) {
        return sr.key;
      }
    }
  }
  return 'operator';
};

const displayRoleName = (u) => {
  const rName = u.roleName || u.role?.name || '';
  if (!rName) return 'No Role';
  const rNameLower = rName.toLowerCase();
  for (const sr of STANDARD_ROLES) {
    for (const term of sr.searchTerms) {
      if (rNameLower.includes(term)) {
        return sr.label;
      }
    }
  }
  return rName;
};

const MOCK_INSTALLATION_ROLES = {};
const ALL_ROLES = [];

const INSTALL_PERMISSIONS = [
  'Manage Installation Users', 'Manage Installation Roles',
  'Manage Gateways',           'Manage Devices',
  'Manage Device Templates',   'Manage Updates',
  'Manage Launchpads',         'Manage Modules',
  'Manage Module Templates',   'Manage Network Templates',
  'Manage System Events',      'Manage Module Type',
  'Manage Module Groups',      'Manage Audit Trail',
  'Manage Reports And Analytics', 'Manage Command Template',
];

const LOCATION_TREE = [
  { id: 'ag-power', label: 'AG Power', children: [
    { id: 'ag-power-dg', label: 'AG_POWER_DG', children: [
      { id: 'ag-power-main', label: 'AG POWER', children: [
        { id: 'mar-2025',   label: 'Mar-2025' },
        { id: 'jan-25',     label: 'Jan_25' },
        { id: 'lot-2',      label: 'Lot-2' },
        { id: 'lot-1',      label: 'Lot-1' },
        { id: 'april-24',   label: 'April-24' },
        { id: 'scheduling', label: 'Scheduling' },
        { id: 'lot-3',      label: 'Lot-3' },
        { id: 'lot-4',      label: 'Lot-4' },
      ]}
    ]}
  ]}
];

const PAGE_SIZE = 8;
const PALETTE = ['#fb923c','#e05e00','#7c3aed','#0284c7','#ec4899','#10b981','#f59e0b','#ef4444'];
const getAvatarColor = (name = '') => {
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[h % PALETTE.length];
};
const TYPE_COLORS = {
  Administrator: { bg: 'rgba(224,94,0,0.12)', color: '#e05e00', border: 'rgba(224,94,0,0.3)' },
  Installation:  { bg: 'rgba(124,58,237,0.12)', color: '#7c3aed', border: 'rgba(124,58,237,0.3)' },
  Organisation:  { bg: 'rgba(2,132,199,0.12)', color: '#0284c7', border: 'rgba(2,132,199,0.3)' },
};

/* ══════════════════════════════════════════════
   SHARED: Location Tree
══════════════════════════════════════════════ */
const TreeNode = ({ node, level = 0, checked, onToggle, expanded, onExpand, isAllowedCheck, hideChildrenLevel }) => {
  const hasChildren = node.children?.length > 0 && !(hideChildrenLevel !== undefined && level >= hideChildrenLevel);
  const isExpanded  = expanded[node.id];
  const isAllowed = isAllowedCheck ? isAllowedCheck(node.rawId, node.type) : true;
  return (
    <div className="su-tree-node" style={{ opacity: isAllowed ? 1 : 0.5 }}>
      <div className="su-tree-row" style={{ paddingLeft: level * 12 }}>
        {hasChildren ? (
          <span className="su-tree-arrow" onClick={(e) => { e.stopPropagation(); onExpand(node.id); }}>
            {isExpanded ? <ChevronDown size={13} /> : <ChevRight size={13} />}
          </span>
        ) : (
          <span className="su-tree-arrow-placeholder" />
        )}
        <span 
          className={`su-tree-check-wrap ${!isAllowed ? 'disabled' : ''}`}
          onClick={() => { if (isAllowed) onToggle(node.id); }}
          style={!isAllowed ? { cursor: 'not-allowed' } : {}}
        >
          {checked[node.id] ? (
            <CheckSquare size={14} className="su-tree-checkbox checked" style={!isAllowed ? { color: '#64748b' } : {}} />
          ) : (
            <Square size={14} className="su-tree-checkbox" />
          )}
        </span>
        <span 
          className="su-tree-label" 
          onClick={() => { if (isAllowed) onToggle(node.id); }}
          style={!isAllowed ? { cursor: 'not-allowed' } : {}}
        >
          {node.label}
        </span>
      </div>
      {hasChildren && isExpanded && node.children.map(c => (
        <TreeNode 
          key={c.id} 
          node={c} 
          level={level + 1} 
          checked={checked} 
          onToggle={onToggle} 
          expanded={expanded} 
          onExpand={onExpand} 
          isAllowedCheck={isAllowedCheck}
          hideChildrenLevel={hideChildrenLevel}
        />
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════
   TAB 1: ADMINISTRATOR USER
══════════════════════════════════════════════ */
const OPERATOR_MODULES = [
  { key: 'showDashboard', label: 'Dashboard' },
  { key: 'showWaterManagement', label: 'Water Mgmt' },
  { key: 'showMotors', label: 'Motors' },
  { key: 'showDGSet', label: 'DG Set' },
  { key: 'showSettingTemplates', label: 'Templates' },
  { key: 'showAlarms', label: 'Alarms' },
  { key: 'showLTPanel', label: 'LT Panel' },
  { key: 'showTransformers', label: 'Transformer' },
  { key: 'showFirePumps', label: 'Fire' },
  { key: 'showTicketing', label: 'Ticketing' },
  { key: 'showMaintenance', label: 'Maintenance' },
  { key: 'showServiceHistory', label: 'Service History' },
  { key: 'showDailyDPR', label: 'Daily DPR' },
  { key: 'showEnergyMetering', label: 'Energy Meter' }
];

const AdministratorUserTab = () => {
  const [view, setView] = useState('list'); // 'list' | 'add'
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({ id: '', name: '', email: '', organizationId: '', userType: 'SYSTEM', roleId: '', roleKey: '', enabled: true });
  const [expanded, setExpanded] = useState({});
  const [checked, setChecked] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [apiError, setApiError] = useState(null);

  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null);
  const [showOperatorPermsModal, setShowOperatorPermsModal] = useState(false);
  const [operatorPerms, setOperatorPerms] = useState({});

  const [selectedZoneUser, setSelectedZoneUser] = useState(null);
  const [selectedAreaUser, setSelectedAreaUser] = useState(null);
  const [selectedLocUser, setSelectedLocUser] = useState(null);
  const [selectedUnitHeadUser, setSelectedUnitHeadUser] = useState(null);

  const isParentSelected = useMemo(() => {
    if (form.roleKey === 'area_manager') return !!selectedZoneUser;
    if (form.roleKey === 'location_manager') return !!selectedAreaUser;
    if (form.roleKey === 'unit_head') return !!selectedLocUser;
    if (form.roleKey === 'operator') return !!selectedUnitHeadUser;
    return false;
  }, [form.roleKey, selectedZoneUser, selectedAreaUser, selectedLocUser, selectedUnitHeadUser]);

  const isNodeAllowedToSelect = (nodeId, nodeType) => {
    if (currentUserRoleIndex <= 1) return true;
    const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const currentUserFromList = users.find(usr => usr.id === loggedInUser.id || usr.email === loggedInUser.email);
    const myLocations = currentUserFromList?.zoneLocations || [];
    if (myLocations.length === 0) return false;

    return myLocations.some(myloc => {
      const myPrefix = myloc.zoneNodeType === 'ZONE' ? 'zone' : myloc.zoneNodeType === 'LOCATION' ? 'loc' : 'org';
      const myFullId = `${myPrefix}-${myloc.zoneNodeId}`;

      const nodePrefix = nodeType === 'ZONE' ? 'zone' : nodeType === 'LOCATION' ? 'loc' : 'org';
      const nodeFullId = `${nodePrefix}-${nodeId}`;

      if (myFullId === nodeFullId) return true;
      return isChildNodeOf(nodeFullId, myFullId, orgTree);
    });
  };

  const handleCancel = () => {
    setView('list');
    setForm({ id: '', name: '', email: '', organizationId: '', userType: 'SYSTEM', roleId: '', roleKey: '', enabled: true });
    setChecked({});
    setSelectedOrgDetails(null);
    setOperatorPerms({});
    setSaveError(null);
  };

  const handleEditUser = async (u) => {
    // Set form fields
    const orgIdVal = u.organizationId || u.organization?.id || '';
    const userTypeVal = u.userType || u.role?.roleType || 'SYSTEM';
    const resolvedRoleKey = getStandardRoleKey(u.roleName || u.role?.name);
    
    setForm({
      id: u.id || '',
      name: u.name || '',
      email: u.email || '',
      organizationId: orgIdVal,
      userType: userTypeVal,
      roleId: u.roleId || u.role?.id || '',
      roleKey: resolvedRoleKey,
      enabled: u.enabled !== false
    });

    // Populate checked nodes for the location tree
    const initialChecked = {};
    if (Array.isArray(u.zoneLocations)) {
      u.zoneLocations.forEach(loc => {
        let typePrefix = 'org';
        if (loc.zoneNodeType === 'ZONE') typePrefix = 'zone';
        else if (loc.zoneNodeType === 'LOCATION') typePrefix = 'loc';
        else if (loc.zoneNodeType === 'COMPANY' || loc.zoneNodeType === 'CLIENT' || loc.zoneNodeType === 'ROOT') typePrefix = 'org';
        
        initialChecked[`${typePrefix}-${loc.zoneNodeId}`] = true;
      });
    }
    setChecked(initialChecked);

    // Fetch org details to load the location tree
    if (orgIdVal) {
      setSelectedOrgDetails(null);
      if (organizations.length === 0) {
        await fetchOrgs();
      }
      try {
        const token = localStorage.getItem('sochiot_token');
        const url = `https://app.sochiot.com/api/location-engine/organization/${orgIdVal}`;
        console.log(`[Edit User] Fetching organization details: ${url}`);
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedOrgDetails(data);
        }
      } catch (err) {
        console.error('Failed to fetch organization details during edit:', err);
      }
      
      // Fetch roles for org
      await fetchRolesForOrg(orgIdVal, userTypeVal);
    }

    // Set operator permissions if operator role is set
    const fp = u.featurePermissions || {};
    setOperatorPerms(fp);

    setView('add'); // Show the form view
  };

  const buildLocationTreeFromOrg = (org) => {
    if (!org) return [];

    const parseLocation = (loc) => ({
      id: `loc-${loc.id}`,
      rawId: loc.id,
      label: loc.name,
      type: 'LOCATION',
      children: []
    });

    const parseZone = (zone) => {
      const children = [];
      if (Array.isArray(zone.subZones)) {
        zone.subZones.forEach(sub => {
          children.push(parseZone(sub));
        });
      }
      if (Array.isArray(zone.locations)) {
        zone.locations.forEach(loc => {
          children.push(parseLocation(loc));
        });
      }
      return {
        id: `zone-${zone.id}`,
        rawId: zone.id,
        label: zone.name,
        type: 'ZONE',
        children
      };
    };

    const parseConsumer = (consumer) => {
      const children = [];
      if (Array.isArray(consumer.consumers)) {
        consumer.consumers.forEach(childConsumer => {
          children.push(parseConsumer(childConsumer));
        });
      }
      if (Array.isArray(consumer.zoneVOS)) {
        consumer.zoneVOS.forEach(zone => {
          children.push(parseZone(zone));
        });
      }
      return {
        id: `org-${consumer.id}`,
        rawId: consumer.id,
        label: consumer.name,
        type: consumer.organizationType?.name || 'CLIENT',
        children
      };
    };

    const children = [];
    if (Array.isArray(org.consumers)) {
      org.consumers.forEach(consumer => {
        children.push(parseConsumer(consumer));
      });
    }
    if (Array.isArray(org.zoneVOS)) {
      org.zoneVOS.forEach(zone => {
        children.push(parseZone(zone));
      });
    }

    return [{
      id: `org-${org.id}`,
      rawId: org.id,
      label: org.name,
      type: org.organizationType?.name === 'SAAS' ? 'ROOT' : (org.organizationType?.name || 'COMPANY'),
      children
    }];
  };

  const orgTree = useMemo(() => {
    return buildLocationTreeFromOrg(selectedOrgDetails);
  }, [selectedOrgDetails]);

  const getSelectedNodes = (tree, checkedState) => {
    let selectedMap = {};
    const traverse = (nodes, parentChecked = false) => {
      nodes.forEach(node => {
        const isCurrentChecked = !!checkedState[node.id];
        if (isCurrentChecked && !parentChecked) {
          const type = node.type === 'ROOT' ? 'ROOT' : node.type;
          selectedMap[`${type}-${node.rawId}`] = {
            zoneNodeType: type,
            zoneNodeId: String(node.rawId)
          };
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children, parentChecked || isCurrentChecked);
        }
      });
    };
    traverse(tree);
    return Object.values(selectedMap);
  };

  // Auto-expand tree nodes leading to checked locations when editing
  useEffect(() => {
    if (orgTree && orgTree.length > 0 && Object.keys(checked).length > 0) {
      const initialExpanded = {};
      const traverseAndExpand = (nodes) => {
        let hasCheckedChild = false;
        nodes.forEach(node => {
          let nodeHasCheckedChild = false;
          if (checked[node.id]) {
            nodeHasCheckedChild = true;
          }
          if (node.children && node.children.length > 0) {
            const childrenHasChecked = traverseAndExpand(node.children);
            if (childrenHasChecked) {
              nodeHasCheckedChild = true;
            }
          }
          if (nodeHasCheckedChild) {
            initialExpanded[node.id] = true;
            hasCheckedChild = true;
          }
        });
        return hasCheckedChild;
      };
      traverseAndExpand(orgTree);
      setExpanded(prev => ({ ...prev, ...initialExpanded }));
    }
  }, [orgTree, checked]);

  const fetchWithAuth = async (url, options = {}) => {
    let token = localStorage.getItem('sochiot_token');
    if (!token) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let r = await fetch(url, { ...options, headers });
    if (r.status === 401) {
      localStorage.removeItem('sochiot_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return r;
  };

  const fetchUsers = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/users?pageSize=1000`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const filtered = json.data.filter(u => u.userType === 'SYSTEM' || u.role?.roleType === 'SYSTEM');
          setUsers(filtered);

          const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
          const myEmail = loggedInUser.email || '';
          if (myEmail) {
            const me = filtered.find(u => u.email === myEmail);
            if (me && me.organizationId && !loggedInUser.organizationId) {
              loggedInUser.organizationId = me.organizationId;
              localStorage.setItem('userData', JSON.stringify(loggedInUser));
              initOrgDetails(me.organizationId);
            }
          }
        } else {
          setUsers([]);
        }
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
      setApiError('Could not load users. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/`);
      if (res.ok) {
        const j = await res.json();
        setSites(j.data || []);
      }
    } catch (e) {
      console.error('Sites fetch failed:', e);
    }
  };

  const fetchOrgs = async () => {
    try {
      const token = localStorage.getItem('sochiot_token');
      const res = await fetch('https://app.sochiot.com/api/location-engine/organization/getAll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.list || [];
        setOrganizations(list);
        
        // Keep location tree collapsed by default
        setExpanded({});
      }
    } catch (e) {
      console.error('Failed to fetch organizations:', e);
    }
  };

  const fetchRolesForOrg = async (orgId, userType = 'SYSTEM') => {
    if (!orgId) return;
    try {
      const token = localStorage.getItem('sochiot_token');
      const url = `https://app.sochiot.com/api/auth-engine/role/${userType}/orgId/${orgId}`;
      let res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      let list = [];
      if (res.ok) {
        const data = await res.json();
        list = Array.isArray(data) ? data : (data.list || []);
      }

      // If list is empty or API failed (like 403 for Location Manager), try local backend which has hardware key bypass
      if (!res.ok || list.length === 0) {
        const fallbackUrl = `${import.meta.env.VITE_BACKEND_BMS_URL}/users/roles`;
        const fbRes = await fetch(fallbackUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          const fbList = Array.isArray(fbData) ? fbData : (fbData.data || fbData.list || []);
          list = fbList.filter(r => r.organizationId == orgId);
        }
      }

      // Final Resort: Extract roles dynamically from current users state
      if (list.length === 0 && users && users.length > 0) {
        const extracted = [];
        users.forEach(u => {
          const rId = u.roleId || u.role?.id;
          const rName = u.roleName || u.role?.name;
          if (rId && rName && !extracted.find(x => x.id === rId)) {
            extracted.push({ id: rId, name: rName });
          }
        });
        if (extracted.length > 0) {
          list = extracted;
        }
      }

      setRoles(list);
    } catch (e) {
      console.error('Failed to fetch roles:', e);
    }
  };

  const initOrgDetails = async (forceOrgId = null) => {
    const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const orgId = forceOrgId || loggedInUser.organizationId;
    if (orgId) {
      try {
        const token = localStorage.getItem('sochiot_token');
        const url = `https://app.sochiot.com/api/location-engine/organization/${orgId}`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedOrgDetails(data);
          
          setOrganizations(prev => {
            if (prev.length === 0 && data) {
              return [{ id: data.id || orgId, name: data.name || 'Organization' }];
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Failed to pre-fetch organization details:', err);
      }
      await fetchRolesForOrg(orgId, 'SYSTEM');
      
      setForm(prev => ({ ...prev, organizationId: orgId }));
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSites();
    fetchOrgs();
    initOrgDetails();
  }, []);

  const handleOrgChange = async (e) => {
    const orgId = e.target.value;
    setForm(prev => ({ 
      ...prev, 
      organizationId: orgId, 
      roleId: '', 
      roleKey: '' 
    }));
    setSelectedOrgDetails(null);
    setChecked({});
    
    if (orgId) {
      try {
        const token = localStorage.getItem('sochiot_token');
        const url = `https://app.sochiot.com/api/location-engine/organization/${orgId}`;
        console.log(`[API Call] Fetching organization details: ${url}`);
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedOrgDetails(data);
          
          // Keep all nodes collapsed by default so the user can open them manually
          setExpanded({});
        }
      } catch (err) {
        console.error('Failed to fetch organization details:', err);
      }
      fetchRolesForOrg(orgId, form.userType);
    } else {
      setRoles([]);
    }
  };

  const handleUserTypeChange = (e) => {
    const type = e.target.value;
    setForm(prev => ({ ...prev, userType: type, roleId: '', roleKey: '' }));
    if (form.organizationId) {
      fetchRolesForOrg(form.organizationId, type);
    }
  };

  const handleRoleChange = (e) => {
    const selectedRoleId = e.target.value;
    const selectedRole = roles.find(r => String(r.id) === String(selectedRoleId));
    const resolvedKey = selectedRole ? getStandardRoleKey(selectedRole.name) : '';
    setForm(prev => ({
      ...prev,
      roleId: selectedRoleId,
      roleKey: resolvedKey
    }));

    if (resolvedKey === 'operator') {
      const initial = {};
      OPERATOR_MODULES.forEach(m => {
        initial[`${m.key}_read`] = true;
        initial[`${m.key}_write`] = false;
      });
      setOperatorPerms(initial);
      setShowOperatorPermsModal(true);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this administrator?')) return;
    try {
      const u = users.find(x => x.id === userId);
      const siteIdParam = u?.siteId || (sites.length > 0 ? sites[0].id : 1);
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/users/${userId}?siteId=${siteIdParam}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert('Failed to delete user: ' + (err.message || err.error));
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to delete user.');
    }
  };

  const handleToggleLock = async (u) => {
    const newStatus = !u.enabled;
    try {
      const siteIdParam = u.siteId || (sites.length > 0 ? sites[0].id : 1);
      const res = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus, siteId: siteIdParam, user_type: u.role?.roleType || 'SYSTEM' })
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert('Failed to update user status: ' + (err.message || err.error));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const finalRoleId = Number(form.roleId) || '';

    if (!form.name || !form.email || !form.organizationId || !finalRoleId) {
      setSaveError('Please fill out all required fields.');
      return;
    }
    setSaving(true);
    setSaveError(null);

    const selectedLocations = getSelectedNodes(orgTree, checked);

    const matchedSite = sites.find(s => Number(s.organizationId) === Number(form.organizationId));
    const siteIdParam = matchedSite ? matchedSite.id : (sites[0]?.id || 1);

    const isOperator = form.roleKey === 'operator';

    const finalFeaturePermissions = {};
    if (isOperator) {
      OPERATOR_MODULES.forEach(m => {
        const readVal = !!operatorPerms[`${m.key}_read`];
        const writeVal = !!operatorPerms[`${m.key}_write`];
        finalFeaturePermissions[`${m.key}_read`] = readVal;
        finalFeaturePermissions[`${m.key}_write`] = writeVal;
        finalFeaturePermissions[m.key] = readVal; // legacy visibility support
      });
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      roleId: Number(finalRoleId),
      enabled: form.enabled,
      siteId: siteIdParam,
      user_type: 'SYSTEM',
      zoneLocations: selectedLocations,
      featurePermissions: finalFeaturePermissions
    };

    try {
      const url = form.id 
        ? `${import.meta.env.VITE_BACKEND_BMS_URL}/users/${form.id}`
        : `${import.meta.env.VITE_BACKEND_BMS_URL}/users`;
      const method = form.id ? 'PATCH' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        handleCancel();
        fetchUsers();
      } else {
        setSaveError(json.message || json.error || 'Failed to save user');
      }
    } catch (err) {
      console.error(err);
      setSaveError('Network error. Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const isChildNodeOf = (childId, parentId, tree) => {
    if (!tree || !childId || !parentId) return false;
    
    const cleanId = (id) => String(id).replace(/^(org|zone|loc)-/, '');
    const cId = cleanId(childId);
    const pId = cleanId(parentId);
    
    if (cId === pId) return true;

    const findNode = (nodes, targetId) => {
      for (const node of nodes) {
        if (cleanId(node.id) === targetId) return node;
        if (node.children) {
          const found = findNode(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const parentNode = findNode(tree, pId);
    if (!parentNode) return false;

    const hasChild = (node, targetId) => {
      if (cleanId(node.id) === targetId) return true;
      if (node.children) {
        for (const child of node.children) {
          if (hasChild(child, targetId)) return true;
        }
      }
      return false;
    };

    if (parentNode.children) {
      for (const child of parentNode.children) {
        if (hasChild(child, cId)) return true;
      }
    }
    return false;
  };

  const resolveLocationNames = (userNodeList, tree) => {
    if (!userNodeList || userNodeList.length === 0) return 'Global Scope';
    
    const cleanId = (id) => String(id).replace(/^(org|zone|loc)-/, '');
    
    const findNodeLabel = (nodes, nodeId) => {
      for (const node of nodes) {
        if (cleanId(node.id) === cleanId(nodeId)) return node.label;
        if (node.children) {
          const found = findNodeLabel(node.children, nodeId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const names = userNodeList.map(node => findNodeLabel(tree, node.zoneNodeId) || `Node #${node.zoneNodeId}`);
    return names.join(', ');
  };

  const currentUserRoleIndex = getCurrentUserRoleIndex();

  const isUserOfRole = (u, roleKey) => {
    const rName = (u.roleName || u.role?.name || '').toLowerCase();
    const config = ROLE_HIERARCHY.find(r => r.key === roleKey);
    if (!config) return false;
    return config.searchTerms.some(term => rName.includes(term));
  };

  const superAdminUsers = users.filter(u => isUserOfRole(u, 'super_admin'));
  const orgAdminUsers   = users.filter(u => isUserOfRole(u, 'org_admin'));
  
  const zoneUsers = useMemo(() => {
    let raw = users.filter(u => isUserOfRole(u, 'zone_manager'));
    if (currentUserRoleIndex > 1) {
      const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
      const currentUserFromList = users.find(usr => usr.id === loggedInUser.id || usr.email === loggedInUser.email);
      const myLocations = currentUserFromList?.zoneLocations || [];
      raw = raw.filter(u => 
        u.zoneLocations?.some(uloc => 
          myLocations.some(myloc => 
            isChildNodeOf(uloc.zoneNodeId, myloc.zoneNodeId, orgTree) || isChildNodeOf(myloc.zoneNodeId, uloc.zoneNodeId, orgTree)
          )
        )
      );
    }
    return raw;
  }, [users, orgTree, currentUserRoleIndex]);
  
  const areaUsers = useMemo(() => {
    let raw = users.filter(u => isUserOfRole(u, 'area_manager'));
    if (currentUserRoleIndex > 1) {
      const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
      const currentUserFromList = users.find(usr => usr.id === loggedInUser.id || usr.email === loggedInUser.email);
      const myLocations = currentUserFromList?.zoneLocations || [];
      raw = raw.filter(u => 
        u.zoneLocations?.some(uloc => 
          myLocations.some(myloc => 
            isChildNodeOf(uloc.zoneNodeId, myloc.zoneNodeId, orgTree) || isChildNodeOf(myloc.zoneNodeId, uloc.zoneNodeId, orgTree)
          )
        )
      );
    }
    if (!selectedZoneUser) return raw;
    return raw.filter(au => 
      au.zoneLocations?.some(aloc => 
        selectedZoneUser.zoneLocations?.some(zloc => 
          isChildNodeOf(aloc.zoneNodeId, zloc.zoneNodeId, orgTree)
        )
      )
    );
  }, [users, selectedZoneUser, orgTree, currentUserRoleIndex]);

  const locUsers = useMemo(() => {
    let raw = users.filter(u => isUserOfRole(u, 'location_manager'));
    if (currentUserRoleIndex > 1) {
      const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
      const currentUserFromList = users.find(usr => usr.id === loggedInUser.id || usr.email === loggedInUser.email);
      const myLocations = currentUserFromList?.zoneLocations || [];
      raw = raw.filter(u => 
        u.zoneLocations?.some(uloc => 
          myLocations.some(myloc => 
            isChildNodeOf(uloc.zoneNodeId, myloc.zoneNodeId, orgTree) || isChildNodeOf(myloc.zoneNodeId, uloc.zoneNodeId, orgTree)
          )
        )
      );
    }
    if (!selectedAreaUser) {
      if (!selectedZoneUser) return raw;
      return raw.filter(lu => 
        lu.zoneLocations?.some(lloc => 
          selectedZoneUser.zoneLocations?.some(zloc => 
            isChildNodeOf(lloc.zoneNodeId, zloc.zoneNodeId, orgTree)
          )
        )
      );
    }
    return raw.filter(lu => 
      lu.zoneLocations?.some(lloc => 
        selectedAreaUser.zoneLocations?.some(aloc => 
          isChildNodeOf(lloc.zoneNodeId, aloc.zoneNodeId, orgTree)
        )
      )
    );
  }, [users, selectedAreaUser, selectedZoneUser, orgTree, currentUserRoleIndex]);

  const unitHeadUsers = useMemo(() => {
    let raw = users.filter(u => isUserOfRole(u, 'unit_head'));
    if (currentUserRoleIndex > 1) {
      const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
      const currentUserFromList = users.find(usr => usr.id === loggedInUser.id || usr.email === loggedInUser.email);
      const myLocations = currentUserFromList?.zoneLocations || [];
      raw = raw.filter(u => 
        u.zoneLocations?.some(uloc => 
          myLocations.some(myloc => 
            isChildNodeOf(uloc.zoneNodeId, myloc.zoneNodeId, orgTree) || isChildNodeOf(myloc.zoneNodeId, uloc.zoneNodeId, orgTree)
          )
        )
      );
    }
    if (!selectedLocUser) {
      if (!selectedAreaUser) return raw;
      return raw.filter(uh => 
        uh.zoneLocations?.some(uloc => 
          selectedAreaUser.zoneLocations?.some(aloc => 
            isChildNodeOf(uloc.zoneNodeId, aloc.zoneNodeId, orgTree)
          )
        )
      );
    }
    return raw.filter(uh => 
      uh.zoneLocations?.some(uloc => 
        selectedLocUser.zoneLocations?.some(lloc => 
          isChildNodeOf(uloc.zoneNodeId, lloc.zoneNodeId, orgTree)
        )
      )
    );
  }, [users, selectedLocUser, selectedAreaUser, orgTree, currentUserRoleIndex]);

  const operatorUsers = useMemo(() => {
    let raw = users.filter(u => isUserOfRole(u, 'operator'));
    if (currentUserRoleIndex > 1) {
      const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
      const currentUserFromList = users.find(usr => usr.id === loggedInUser.id || usr.email === loggedInUser.email);
      const myLocations = currentUserFromList?.zoneLocations || [];
      raw = raw.filter(u => 
        u.zoneLocations?.some(oloc => 
          myLocations.some(myloc => 
            isChildNodeOf(oloc.zoneNodeId, myloc.zoneNodeId, orgTree) || isChildNodeOf(myloc.zoneNodeId, oloc.zoneNodeId, orgTree)
          )
        )
      );
    }
    if (!selectedUnitHeadUser) {
      if (!selectedLocUser) return raw;
      return raw.filter(op => 
        op.zoneLocations?.some(oloc => 
          selectedLocUser.zoneLocations?.some(lloc => 
            isChildNodeOf(oloc.zoneNodeId, lloc.zoneNodeId, orgTree)
          )
        )
      );
    }
    return raw.filter(op => 
      op.zoneLocations?.some(oloc => 
        selectedUnitHeadUser.zoneLocations?.some(uloc => 
          isChildNodeOf(oloc.zoneNodeId, uloc.zoneNodeId, orgTree)
        )
      )
    );
  }, [users, selectedUnitHeadUser, selectedLocUser, orgTree, currentUserRoleIndex]);

  const handleAddUserOfRole = async (roleKey) => {
    const standardRole = ROLE_HIERARCHY.find(r => r.key === roleKey);
    
    let initialChecked = {};
    if (roleKey === 'area_manager' && selectedZoneUser) {
      selectedZoneUser.zoneLocations?.forEach(loc => {
        let prefix = loc.zoneNodeType === 'ZONE' ? 'zone' : loc.zoneNodeType === 'LOCATION' ? 'loc' : 'org';
        initialChecked[`${prefix}-${loc.zoneNodeId}`] = true;
      });
    } else if (roleKey === 'location_manager' && selectedAreaUser) {
      selectedAreaUser.zoneLocations?.forEach(loc => {
        let prefix = loc.zoneNodeType === 'ZONE' ? 'zone' : loc.zoneNodeType === 'LOCATION' ? 'loc' : 'org';
        initialChecked[`${prefix}-${loc.zoneNodeId}`] = true;
      });
    } else if (roleKey === 'unit_head' && selectedLocUser) {
      selectedLocUser.zoneLocations?.forEach(loc => {
        let prefix = loc.zoneNodeType === 'ZONE' ? 'zone' : loc.zoneNodeType === 'LOCATION' ? 'loc' : 'org';
        initialChecked[`${prefix}-${loc.zoneNodeId}`] = true;
      });
    } else if (roleKey === 'operator' && selectedUnitHeadUser) {
      selectedUnitHeadUser.zoneLocations?.forEach(loc => {
        let prefix = loc.zoneNodeType === 'ZONE' ? 'zone' : loc.zoneNodeType === 'LOCATION' ? 'loc' : 'org';
        initialChecked[`${prefix}-${loc.zoneNodeId}`] = true;
      });
    }

    const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');

    // Ensure organizations list is loaded FIRST
    let orgList = [...organizations];
    if (orgList.length === 0) {
      try {
        const token = localStorage.getItem('sochiot_token');
        const res = await fetch('https://app.sochiot.com/api/location-engine/organization/getAll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({})
        });
        if (res.ok) {
          const data = await res.json();
          orgList = data.list || [];
          if (orgList.length > 0) setOrganizations(orgList);
        }
      } catch (e) { console.error('Failed to fetch orgs:', e); }
    }

    const fallbackOrgId = form.organizationId || (orgList[0]?.id || '') || (loggedInUser.organizationId || '');

    // Fetch org details and roles
    if (fallbackOrgId) {
      try {
        const token = localStorage.getItem('sochiot_token');
        const [orgRes, roleRes] = await Promise.all([
          fetch(`https://app.sochiot.com/api/location-engine/organization/${fallbackOrgId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`https://app.sochiot.com/api/auth-engine/role/SYSTEM/orgId/${fallbackOrgId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setSelectedOrgDetails(orgData);
          
          // If orgList is still empty, add this org as the only option
          if (orgList.length === 0 && orgData) {
            const orgEntry = { id: orgData.id || fallbackOrgId, name: orgData.name || 'Organization' };
            orgList = [orgEntry];
            setOrganizations(orgList);
          }
        }
        
        let freshRoles = roles;
        if (roleRes.ok) {
          const roleData = await roleRes.json();
          freshRoles = Array.isArray(roleData) ? roleData : (roleData.list || []);
          setRoles(freshRoles);
        }
        
        const matched = findBestMatchingRole(standardRole, freshRoles);
        setForm({
          id: '', name: '', email: '',
          organizationId: fallbackOrgId,
          userType: 'SYSTEM',
          roleId: matched ? matched.id : '',
          roleKey: roleKey,
          enabled: true
        });
      } catch (err) {
        console.error('Failed to fetch org/roles:', err);
        const matched = findBestMatchingRole(standardRole, roles);
        setForm({
          id: '', name: '', email: '',
          organizationId: fallbackOrgId,
          userType: 'SYSTEM',
          roleId: matched ? matched.id : '',
          roleKey: roleKey,
          enabled: true
        });
      }
    } else {
      setForm({
        id: '', name: '', email: '',
        organizationId: '',
        userType: 'SYSTEM',
        roleId: '',
        roleKey: roleKey,
        enabled: true
      });
    }
    
    setChecked(initialChecked);
    setView('add');
  };

  if (view === 'add') return (
    <div className="su-subview fade-in">
      <div className="su-subview-header">
        <button className="su-back-btn" type="button" onClick={handleCancel}>
          <ArrowLeft size={14}/> {form.id ? `Edit ${ROLE_HIERARCHY.find(r => r.key === form.roleKey)?.label || 'User'}` : `Add ${ROLE_HIERARCHY.find(r => r.key === form.roleKey)?.label || 'User'}`}
        </button>
      </div>
      <form className="su-form-body" onSubmit={handleSaveUser}>
        <div className="su-form-fields">
          <div className="su-form-row">
            <div className="su-form-group">
              <label className="su-form-label">Name <span className="su-req">*</span></label>
              <input className="su-form-input" placeholder="e.g. Sanjay Gupta" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
            </div>
            <div className="su-form-group">
              <label className="su-form-label">Email <span className="su-req">*</span></label>
              <input className="su-form-input" type="email" placeholder="e.g. gupta@gmail.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
            </div>
          </div>
          <div className="su-form-row">
            <div className="su-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="su-form-label">Organization <span className="su-req">*</span></label>
              <select 
                className="su-form-select" 
                value={form.organizationId} 
                onChange={handleOrgChange}
                onFocus={() => { if (organizations.length === 0) fetchOrgs(); }}
                required
                disabled={!!form.id}
              >
                <option value="">Select Organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="su-form-row su-form-row-mixed">
            <div className="su-form-group" style={{flex:1}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="su-form-label">Role <span className="su-req">*</span></label>
                {form.roleKey === 'operator' && (
                  <button 
                    type="button" 
                    onClick={() => setShowOperatorPermsModal(true)} 
                    style={{
                      background: 'transparent', 
                      border: 'none', 
                      color: '#7c3aed', 
                      fontSize: '0.74rem', 
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <Settings size={12}/> Edit Perms
                  </button>
                )}
              </div>
              <select 
                className="su-form-select su-role-select" 
                value={form.roleId} 
                onChange={handleRoleChange} 
                required
              >
                <option value="">— Select Role —</option>
                {roles.filter(r => {
                  const key = getStandardRoleKey(r.name);
                  const rank = ROLE_HIERARCHY.findIndex(rh => rh.key === key);
                  // Allow if rank > currentUserRoleIndex OR if this role exactly matches the role they clicked to add
                  return rank > currentUserRoleIndex || key === form.roleKey || r.id === form.roleId;
                }).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="su-form-group" style={{alignItems:'flex-start'}}>
              <label className="su-form-label">Enabled</label>
              <div className={`su-toggle ${form.enabled?'on':''}`} onClick={()=>setForm({...form,enabled:!form.enabled})}>
                <div className="su-toggle-knob"/>
              </div>
            </div>
          </div>

          {saveError && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>
              {saveError}
            </div>
          )}

          <div className="su-form-actions">
            <button type="button" className="su-btn-cancel" onClick={handleCancel}>Cancel</button>
            <button type="submit" className="su-btn-save" disabled={saving}>
              {saving ? 'Saving...' : (form.id ? 'Save Changes' : 'Save User')}
            </button>
          </div>
        </div>
        <div className="su-location-panel">
          <div className="su-location-title">Location</div>
          <div className="su-tree">
            {orgTree.length === 0 ? (
              <div style={{ color: 'var(--scada-text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                Select organization to load location tree
              </div>
            ) : (
              orgTree.map(n => {
                let hideChildrenLevel = undefined;
                if (form.roleKey === 'zone_manager') {
                  hideChildrenLevel = 1;
                } else if (form.roleKey === 'area_manager') {
                  hideChildrenLevel = 2;
                }
                return (
                  <TreeNode 
                    key={n.id} 
                    node={n} 
                    level={0} 
                    checked={checked} 
                    onToggle={id => {
                      const nodeType = id.startsWith('zone-') ? 'ZONE' : id.startsWith('loc-') ? 'LOCATION' : 'org';
                      const rawId = id.replace(/^(org|zone|loc)-/, '');
                      if (isNodeAllowedToSelect(rawId, nodeType)) {
                        setChecked(p => ({ ...p, [id]: !p[id] }));
                      }
                    }} 
                    expanded={expanded} 
                    onExpand={id => setExpanded(p => ({ ...p, [id]: !p[id] }))}
                    isAllowedCheck={isNodeAllowedToSelect}
                    hideChildrenLevel={hideChildrenLevel}
                  />
                );
              })
            )}
          </div>
        </div>
      </form>
      {showOperatorPermsModal && (
        <div className="su-modal-overlay">
          <div className="su-modal-container">
            <div className="su-modal-header">
              <h4 className="su-modal-title">Operator Module Permissions</h4>
              <button type="button" className="su-modal-close" onClick={() => setShowOperatorPermsModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="su-modal-body">
              <p className="su-modal-subtitle">
                Configure module access levels (Read/Write) for this operator.
              </p>
              
              <div className="su-modal-actions-row">
                <button 
                  type="button" 
                  className="su-modal-action-btn"
                  onClick={() => {
                    const allOn = {};
                    OPERATOR_MODULES.forEach(m => {
                      allOn[`${m.key}_read`] = true;
                      allOn[`${m.key}_write`] = true;
                    });
                    setOperatorPerms(allOn);
                  }}
                >
                  ALL ON
                </button>
                <button 
                  type="button" 
                  className="su-modal-action-btn"
                  onClick={() => {
                    const allOff = {};
                    OPERATOR_MODULES.forEach(m => {
                      allOff[`${m.key}_read`] = false;
                      allOff[`${m.key}_write`] = false;
                    });
                    setOperatorPerms(allOff);
                  }}
                >
                  ALL OFF
                </button>
              </div>

              <div className="su-modal-table-wrap">
                <table className="su-modal-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th style={{ textAlign: 'center', width: '80px' }}>Read</th>
                      <th style={{ textAlign: 'center', width: '80px' }}>Write</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OPERATOR_MODULES.map(m => {
                      const isRead = !!operatorPerms[`${m.key}_read`];
                      const isWrite = !!operatorPerms[`${m.key}_write`];
                      return (
                        <tr key={m.key}>
                          <td>{m.label}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span 
                              className="su-modal-check-wrap"
                              onClick={() => {
                                setOperatorPerms(prev => {
                                  const nextRead = !prev[`${m.key}_read`];
                                  return {
                                    ...prev,
                                    [`${m.key}_read`]: nextRead,
                                    [`${m.key}_write`]: nextRead ? prev[`${m.key}_write`] : false
                                  };
                                });
                              }}
                            >
                              {isRead ? (
                                <CheckSquare size={16} style={{ color: '#7c3aed' }} />
                              ) : (
                                <Square size={16} />
                              )}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span 
                              className={`su-modal-check-wrap ${!isRead ? 'disabled' : ''}`}
                              onClick={() => {
                                if (!isRead) return;
                                setOperatorPerms(prev => ({
                                  ...prev,
                                  [`${m.key}_write`]: !prev[`${m.key}_write`]
                                }));
                              }}
                            >
                              {isWrite ? (
                                <CheckSquare size={16} style={{ color: '#7c3aed' }} />
                              ) : (
                                <Square size={16} />
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="su-modal-footer">
              <button 
                type="button" 
                className="su-btn-save" 
                style={{ width: '100%', padding: '0.65rem' }}
                onClick={() => setShowOperatorPermsModal(false)}
              >
                Apply & Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fade-in">
      {/* 1. Global Admins Section */}
      <div className="su-globals-section">
        <div className="su-globals-header">
          <h4 className="su-globals-title">Global Administrators</h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {currentUserRoleIndex === 0 && (
              <button 
                className="su-add-btn" 
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.74rem' }}
                onClick={() => handleAddUserOfRole('super_admin')}
              >
                <UserPlus size={12}/> Add Super Admin
              </button>
            )}
            {currentUserRoleIndex <= 0 && (
              <button 
                className="su-add-btn" 
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.74rem', background: 'rgba(2,132,199,0.1)', borderColor: 'rgba(2,132,199,0.28)', color: '#0284c7' }}
                onClick={() => handleAddUserOfRole('org_admin')}
              >
                <UserPlus size={12}/> Add Org Admin
              </button>
            )}
          </div>
        </div>
        <div className="su-globals-grid">
          {superAdminUsers.concat(orgAdminUsers).map(u => {
            const isSuper = isUserOfRole(u, 'super_admin');
            const rankIndex = isSuper ? 0 : 1;
            const isDisabled = rankIndex < currentUserRoleIndex;
            const c = getAvatarColor(u.name);
            return (
              <div 
                key={u.id} 
                className="su-column-item" 
                style={{ 
                  opacity: isDisabled ? 0.5 : 1,
                  background: isSuper ? 'rgba(224,94,0,0.02)' : 'rgba(2,132,199,0.02)',
                  borderColor: isSuper ? 'rgba(224,94,0,0.15)' : 'rgba(2,132,199,0.15)'
                }}
              >
                <div className="su-column-item-header">
                  <div className="su-column-item-avatar" style={{ background: `${c}22`, border: `1.5px solid ${c}55`, color: c }}>
                    {u.name[0]}
                  </div>
                  <div className="su-column-item-info">
                    <span className="su-column-item-name">{u.name}</span>
                    <span className="su-column-item-email">{u.email}</span>
                  </div>
                  <span 
                    className="su-type-pill" 
                    style={{ 
                      fontSize: '0.62rem', 
                      background: isSuper ? 'rgba(224,94,0,0.12)' : 'rgba(2,132,199,0.12)', 
                      color: isSuper ? '#e05e00' : '#0284c7' 
                    }}
                  >
                    {isSuper ? 'Super Admin' : 'Org Admin'}
                  </span>
                </div>
                <div className="su-column-item-actions">
                  <button className={`su-column-item-btn ${isDisabled ? 'disabled' : ''}`} title="Edit" onClick={() => { if (!isDisabled) handleEditUser(u); }}>
                    <Edit size={12}/>
                  </button>
                  <button className={`su-column-item-btn delete ${isDisabled ? 'disabled' : ''}`} title="Delete" onClick={() => { if (!isDisabled) handleDeleteUser(u.id); }}>
                    <Trash2 size={12}/>
                  </button>
                  <button 
                    className={`su-column-item-btn ${isDisabled ? 'disabled' : ''}`} 
                    title={u.enabled ? "Lock" : "Unlock"} 
                    style={!u.enabled ? { borderColor: '#ef4444', color: '#ef4444' } : {}}
                    onClick={() => { if (!isDisabled) handleToggleLock(u); }}
                  >
                    <Lock size={12}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Hierarchical Column View */}
      <div className="su-columns-container">
        {/* Column 1: Zone Manager */}
        {(() => {
          const rank = 2;
          const isDisabled = rank < currentUserRoleIndex;
          return (
            <div className={`su-column ${isDisabled ? 'disabled' : ''}`}>
              <div className="su-column-header">
                <h5 className="su-column-title">Zone Manager</h5>
                <button className="su-column-add-btn" title="Add Zone Manager" disabled={currentUserRoleIndex > 1} onClick={() => handleAddUserOfRole('zone_manager')} style={currentUserRoleIndex > 1 ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
                  <Plus size={13} />
                </button>
              </div>
              <div className="su-column-list">
                {zoneUsers.map(u => {
                  const isActive = selectedZoneUser?.id === u.id;
                  const c = getAvatarColor(u.name);
                  return (
                    <div 
                      key={u.id} 
                      className={`su-column-item ${isActive ? 'active' : ''}`} 
                      onClick={() => {
                        setSelectedZoneUser(isActive ? null : u);
                        setSelectedAreaUser(null);
                        setSelectedLocUser(null);
                        setSelectedUnitHeadUser(null);
                      }}
                    >
                      <div className="su-column-item-header">
                        <div className="su-column-item-avatar" style={{ background: `${c}22`, border: `1.5px solid ${c}55`, color: c }}>
                          {u.name[0]}
                        </div>
                        <div className="su-column-item-info">
                          <span className="su-column-item-name">{u.name}</span>
                          <span className="su-column-item-email">{u.email}</span>
                        </div>
                      </div>
                      <div className="su-column-item-locations">
                        {resolveLocationNames(u.zoneLocations, orgTree)}
                      </div>
                      <div className="su-column-item-actions">
                        {currentUserRoleIndex < 2 && (
                          <>
                            <button className="su-column-item-btn" title="Edit" onClick={(e) => { e.stopPropagation(); handleEditUser(u); }}>
                              <Edit size={12}/>
                            </button>
                            <button className="su-column-item-btn delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}>
                              <Trash2 size={12}/>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Column 2: Area Manager */}
        {(() => {
          const rank = 3;
          const isDisabled = rank < currentUserRoleIndex;
          return (
            <div className={`su-column ${isDisabled ? 'disabled' : ''}`}>
              <div className="su-column-header">
                <h5 className="su-column-title">Area Manager</h5>
                <button className="su-column-add-btn" title="Add Area Manager" disabled={currentUserRoleIndex > 2} onClick={() => handleAddUserOfRole('area_manager')} style={currentUserRoleIndex > 2 ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
                  <Plus size={13} />
                </button>
              </div>
              <div className="su-column-list">
                {areaUsers.map(u => {
                  const isActive = selectedAreaUser?.id === u.id;
                  const c = getAvatarColor(u.name);
                  return (
                    <div 
                      key={u.id} 
                      className={`su-column-item ${isActive ? 'active' : ''}`} 
                      onClick={() => {
                        setSelectedAreaUser(isActive ? null : u);
                        setSelectedLocUser(null);
                        setSelectedUnitHeadUser(null);
                      }}
                    >
                      <div className="su-column-item-header">
                        <div className="su-column-item-avatar" style={{ background: `${c}22`, border: `1.5px solid ${c}55`, color: c }}>
                          {u.name[0]}
                        </div>
                        <div className="su-column-item-info">
                          <span className="su-column-item-name">{u.name}</span>
                          <span className="su-column-item-email">{u.email}</span>
                        </div>
                      </div>
                      <div className="su-column-item-locations">
                        {resolveLocationNames(u.zoneLocations, orgTree)}
                      </div>
                      <div className="su-column-item-actions">
                        {currentUserRoleIndex < 3 && (
                          <>
                            <button className="su-column-item-btn" title="Edit" onClick={(e) => { e.stopPropagation(); handleEditUser(u); }}>
                              <Edit size={12}/>
                            </button>
                            <button className="su-column-item-btn delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}>
                              <Trash2 size={12}/>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Column 3: Location Manager */}
        {(() => {
          const rank = 4;
          const isDisabled = rank < currentUserRoleIndex;
          return (
            <div className={`su-column ${isDisabled ? 'disabled' : ''}`}>
              <div className="su-column-header">
                <h5 className="su-column-title">Location Manager</h5>
                <button className="su-column-add-btn" title="Add Location Manager" disabled={currentUserRoleIndex > 3} onClick={() => handleAddUserOfRole('location_manager')} style={currentUserRoleIndex > 3 ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
                  <Plus size={13} />
                </button>
              </div>
              <div className="su-column-list">
                {locUsers.map(u => {
                  const isActive = selectedLocUser?.id === u.id;
                  const c = getAvatarColor(u.name);
                  return (
                    <div 
                      key={u.id} 
                      className={`su-column-item ${isActive ? 'active' : ''}`} 
                      onClick={() => {
                        setSelectedLocUser(isActive ? null : u);
                        setSelectedUnitHeadUser(null);
                      }}
                    >
                      <div className="su-column-item-header">
                        <div className="su-column-item-avatar" style={{ background: `${c}22`, border: `1.5px solid ${c}55`, color: c }}>
                          {u.name[0]}
                        </div>
                        <div className="su-column-item-info">
                          <span className="su-column-item-name">{u.name}</span>
                          <span className="su-column-item-email">{u.email}</span>
                        </div>
                      </div>
                      <div className="su-column-item-locations">
                        {resolveLocationNames(u.zoneLocations, orgTree)}
                      </div>
                      <div className="su-column-item-actions">
                        {currentUserRoleIndex < 4 && (
                          <>
                            <button className="su-column-item-btn" title="Edit" onClick={(e) => { e.stopPropagation(); handleEditUser(u); }}>
                              <Edit size={12}/>
                            </button>
                            <button className="su-column-item-btn delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}>
                              <Trash2 size={12}/>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Column 4: Unit Head */}
        {(() => {
          const rank = 5;
          const isDisabled = rank < currentUserRoleIndex;
          return (
            <div className={`su-column ${isDisabled ? 'disabled' : ''}`}>
              <div className="su-column-header">
                <h5 className="su-column-title">Unit Head</h5>
                <button className="su-column-add-btn" title="Add Unit Head" disabled={currentUserRoleIndex > 4} onClick={() => handleAddUserOfRole('unit_head')} style={currentUserRoleIndex > 4 ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
                  <Plus size={13} />
                </button>
              </div>
              <div className="su-column-list">
                {unitHeadUsers.map(u => {
                  const isActive = selectedUnitHeadUser?.id === u.id;
                  const c = getAvatarColor(u.name);
                  return (
                    <div 
                      key={u.id} 
                      className={`su-column-item ${isActive ? 'active' : ''}`} 
                      onClick={() => {
                        setSelectedUnitHeadUser(isActive ? null : u);
                      }}
                    >
                      <div className="su-column-item-header">
                        <div className="su-column-item-avatar" style={{ background: `${c}22`, border: `1.5px solid ${c}55`, color: c }}>
                          {u.name[0]}
                        </div>
                        <div className="su-column-item-info">
                          <span className="su-column-item-name">{u.name}</span>
                          <span className="su-column-item-email">{u.email}</span>
                        </div>
                      </div>
                      <div className="su-column-item-locations">
                        {resolveLocationNames(u.zoneLocations, orgTree)}
                      </div>
                      <div className="su-column-item-actions">
                        {currentUserRoleIndex < 5 && (
                          <>
                            <button className="su-column-item-btn" title="Edit" onClick={(e) => { e.stopPropagation(); handleEditUser(u); }}>
                              <Edit size={12}/>
                            </button>
                            <button className="su-column-item-btn delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}>
                              <Trash2 size={12}/>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Column 5: Operator Role */}
        {(() => {
          const rank = 6;
          const isDisabled = rank < currentUserRoleIndex;
          return (
            <div className={`su-column ${isDisabled ? 'disabled' : ''}`}>
              <div className="su-column-header">
                <h5 className="su-column-title">Operator Role</h5>
                <button className="su-column-add-btn" title="Add Operator" disabled={currentUserRoleIndex > 5} onClick={() => handleAddUserOfRole('operator')} style={currentUserRoleIndex > 5 ? { opacity: 0.3, pointerEvents: 'none' } : {}}>
                  <Plus size={13} />
                </button>
              </div>
              <div className="su-column-list">
                {operatorUsers.map(u => {
                  const c = getAvatarColor(u.name);
                  return (
                    <div key={u.id} className="su-column-item" style={{ cursor: 'default' }}>
                      <div className="su-column-item-header">
                        <div className="su-column-item-avatar" style={{ background: `${c}22`, border: `1.5px solid ${c}55`, color: c }}>
                          {u.name[0]}
                        </div>
                        <div className="su-column-item-info">
                          <span className="su-column-item-name">{u.name}</span>
                          <span className="su-column-item-email">{u.email}</span>
                        </div>
                      </div>
                      <div className="su-column-item-locations">
                        {resolveLocationNames(u.zoneLocations, orgTree)}
                      </div>
                      <div className="su-column-item-actions">
                        {currentUserRoleIndex < 6 && (
                          <>
                            <button className="su-column-item-btn" title="Edit" onClick={(e) => { e.stopPropagation(); handleEditUser(u); }}>
                              <Edit size={12}/>
                            </button>
                            <button className="su-column-item-btn delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDeleteUser(u.id); }}>
                              <Trash2 size={12}/>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN SHELL
   ══════════════════════════════════════════════ */

const SystemUsers = () => {
  return (
    <div className="fade-in su-wrap">
      {/* Page Header */}
      <div className="su-page-header">
        <h2 className="su-page-title">System Users</h2>
        <button className="su-manage-btn"><Users size={15}/> Manage Users</button>
      </div>

      {/* Tab Content */}
      <AdministratorUserTab />

      <ScopedStyles/>
    </div>
  );
};

/* ══════════════════════════════════════════════
   CSS
══════════════════════════════════════════════ */
const ScopedStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .su-wrap { padding: 0.25rem 0; }

    /* Page header */
    .su-page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
    .su-page-title  { font-size:1.45rem; font-weight:700; color:var(--scada-text); margin:0; }
    .su-manage-btn  { display:inline-flex; align-items:center; gap:8px; padding:0.5rem 1.1rem; border-radius:10px; background:rgba(224,94,0,0.08); border:1.5px solid rgba(224,94,0,0.3); color:#e05e00; font-size:0.82rem; font-weight:700; cursor:pointer; transition:all 0.2s; }
    .su-manage-btn:hover { background:rgba(224,94,0,0.16); transform:translateY(-1px); }

    /* Main tabs */
    .su-tabs-row { display:flex; border-bottom:2px solid var(--scada-border); margin-bottom:1.5rem; flex-wrap:wrap; }
    .su-tab { background:transparent; border:none; padding:0.65rem 1.25rem; font-size:0.82rem; font-weight:600; color:var(--scada-text-muted); cursor:pointer; position:relative; transition:color 0.2s; white-space:nowrap; }
    .su-tab::after { content:''; position:absolute; bottom:-2px; left:0; right:0; height:2px; background:transparent; transition:background 0.2s; }
    .su-tab.active { color:var(--tab-accent,#e05e00); }
    .su-tab.active::after { background:var(--tab-accent,#e05e00); }
    .su-tab:hover:not(.active) { color:var(--scada-text); }

    /* Role sub-tabs — secondary nav, visually distinct from main tabs */
    .su-role-tabs-row { display:flex; flex-wrap:wrap; gap:0; margin-bottom:1rem; border-bottom: 1px solid var(--scada-border); }
    .su-role-tab { background:transparent; border:none; padding:0.5rem 1rem; font-size:0.78rem; font-weight:600; color:var(--scada-text-muted); cursor:pointer; position:relative; transition:color 0.2s; white-space:nowrap; letter-spacing:0.01em; }
    .su-role-tab::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:2px; background:transparent; border-radius:2px 2px 0 0; transition:background 0.2s; }
    .su-role-tab.active { color:#7c3aed; }
    .su-role-tab.active::after { background:#7c3aed; }
    .su-role-tab:hover:not(.active) { color:var(--scada-text); }

    /* Card */
    .su-card { background:var(--scada-card); border:1px solid var(--scada-border); border-radius:14px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.12); }
    .su-card-header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem; border-bottom:1px solid var(--scada-border); flex-wrap:wrap; gap:0.75rem; }
    .su-card-title { font-size:0.92rem; font-weight:700; color:var(--scada-text); }
    .su-add-btn { display:inline-flex; align-items:center; gap:7px; padding:0.45rem 1rem; border-radius:8px; background:rgba(224,94,0,0.1); border:1px solid rgba(224,94,0,0.28); color:#e05e00; font-size:0.78rem; font-weight:700; cursor:pointer; transition:all 0.2s; }
    .su-add-btn:hover { background:rgba(224,94,0,0.2); transform:translateY(-1px); }

    /* Table */
    .su-table-wrap { overflow-x:auto; }
    .su-table { width:100%; border-collapse:collapse; }
    .su-table thead th { background:rgba(255,255,255,0.03); color:var(--scada-text-muted); font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:11px 20px; border-bottom:1px solid var(--scada-border); }
    body.light-mode .su-table thead th { background:rgba(0,0,0,0.03); }
    .su-sort-icon { margin-left:4px; opacity:0.4; font-size:0.65rem; }
    .su-action-col { text-align:center; width:100px; }
    .su-tr { transition:background 0.15s; }
    .su-tr:hover td { background:rgba(224,94,0,0.03) !important; }
    .su-table tbody td { padding:13px 20px; border-bottom:1px solid var(--scada-border); vertical-align:middle; background:transparent; }
    .su-tr:last-child td { border-bottom:none; }
    .su-empty { padding:2.5rem; text-align:center; color:var(--scada-text-muted); font-size:0.84rem; }

    /* User cell */
    .su-user-cell { display:flex; align-items:center; gap:10px; }
    .su-avatar { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.72rem; font-weight:800; flex-shrink:0; }
    .su-user-name { font-size:0.82rem; font-weight:600; color:#e05e00; }
    .su-email { font-size:0.8rem; color:var(--scada-text-muted); }
    .su-actions { display:flex; align-items:center; justify-content:center; gap:8px; }
    .su-action-btn { background:transparent; border:1px solid var(--scada-border); border-radius:7px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; color:var(--scada-text-muted); cursor:pointer; transition:all 0.18s; }
    .su-action-btn:hover { background:rgba(224,94,0,0.1); border-color:rgba(224,94,0,0.3); color:#e05e00; transform:scale(1.08); }
    .su-delete-btn:hover { background:rgba(239,68,68,0.1) !important; border-color:rgba(239,68,68,0.3) !important; color:#ef4444 !important; }
    .su-role-name-btn { background:transparent; border:none; color:#7c3aed; font-size:0.82rem; font-weight:600; cursor:pointer; padding:0; }
    .su-role-name-btn:hover { text-decoration:underline; }

    /* Pagination */
    .su-pagination { display:flex; align-items:center; justify-content:center; gap:5px; padding:1rem; border-top:1px solid var(--scada-border); flex-wrap:wrap; }
    .su-page-btn { width:30px; height:30px; border-radius:7px; border:1px solid var(--scada-border); background:transparent; color:var(--scada-text-muted); font-size:0.78rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.18s; }
    .su-page-btn:hover:not(:disabled):not(.active) { background:rgba(224,94,0,0.08); border-color:rgba(224,94,0,0.3); color:#e05e00; }
    .su-page-btn.active { background:linear-gradient(135deg,#e05e00,#8c3b06); border:none; color:#fff; font-weight:800; box-shadow:0 2px 8px rgba(224,94,0,0.35); }
    .su-page-btn.nav:disabled { opacity:0.3; cursor:not-allowed; }

    /* Sub-view */
    .su-subview { padding:0; }
    .su-subview-header { margin-bottom:1.25rem; }
    .su-back-btn { display:inline-flex; align-items:center; gap:7px; background:transparent; border:none; color:var(--scada-text); font-size:0.9rem; font-weight:700; cursor:pointer; padding:0; transition:color 0.2s; }
    .su-back-btn:hover { color:#e05e00; }

    /* Form layout */
    .su-form-body { display:flex; gap:1.5rem; align-items:flex-start; flex-wrap:wrap; }
    .su-form-fields { flex: 1.1; min-width: 320px; background:var(--scada-card); border:1px solid var(--scada-border); border-radius:14px; padding:1.5rem; box-shadow:0 4px 16px rgba(0,0,0,0.12); }
    .su-form-row { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem; }
    .su-form-row-mixed { grid-template-columns:1fr auto; align-items:end; }
    .su-form-group { display:flex; flex-direction:column; gap:6px; }
    .su-form-label { font-size:0.78rem; font-weight:700; color:var(--scada-text-muted); letter-spacing:0.02em; }
    .su-req { color:#ef4444; margin-left:2px; }
    .su-form-input, .su-form-select {
      background:rgba(255,255,255,0.04) !important; border:1.5px solid var(--scada-border) !important;
      border-radius:8px; padding:0.55rem 0.85rem; font-size:0.84rem; color:var(--scada-text) !important;
      outline:none; transition:border-color 0.2s; width:100%; font-family:inherit;
      -webkit-appearance:none; appearance:none;
    }
    body.light-mode .su-form-input, body.light-mode .su-form-select { background:#f1f5f9 !important; color:#1e293b !important; border-color:rgba(0,0,0,0.12) !important; }
    .su-form-input:focus, .su-form-select:focus { border-color:rgba(224,94,0,0.55) !important; box-shadow:0 0 0 3px rgba(224,94,0,0.1) !important; }
    .su-form-input::placeholder { color:var(--scada-text-muted); opacity:0.6; }
    .su-textarea { resize:vertical; min-height:90px; }
    .su-form-select {
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23e05e00' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") !important;
      background-repeat:no-repeat !important; background-position:right 10px center !important; padding-right:2rem !important; cursor:pointer;
    }
    .su-role-select { color:#7c3aed !important; font-weight:700; }
    .su-form-actions { display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem; }
    .su-btn-cancel { padding:0.5rem 1.2rem; border-radius:8px; background:transparent; border:1px solid var(--scada-border); color:var(--scada-text-muted); font-size:0.82rem; font-weight:600; cursor:pointer; transition:all 0.2s; }
    .su-btn-cancel:hover { border-color:rgba(224,94,0,0.3); color:#e05e00; }
    .su-btn-save { padding:0.5rem 1.4rem; border-radius:8px; background:linear-gradient(135deg,#e05e00,#8c3b06); border:none; color:#fff; font-size:0.82rem; font-weight:700; cursor:pointer; transition:all 0.2s; box-shadow:0 3px 12px rgba(224,94,0,0.3); }
    .su-btn-save:hover { transform:translateY(-1px); box-shadow:0 5px 16px rgba(224,94,0,0.4); }

    /* Toggle */
    .su-toggle { width:44px; height:24px; border-radius:12px; background:rgba(255,255,255,0.1); border:1.5px solid rgba(255,255,255,0.15); position:relative; cursor:pointer; transition:all 0.25s; }
    body.light-mode .su-toggle { background:#cbd5e1; border-color:#94a3b8; }
    .su-toggle.on { background:rgba(224,94,0,0.2); border-color:rgba(224,94,0,0.5); }
    .su-toggle-knob { width:18px; height:18px; border-radius:50%; background:#64748b; position:absolute; top:2px; left:2px; transition:all 0.25s; }
    .su-toggle.on .su-toggle-knob { background:#e05e00; left:22px; box-shadow:0 0 8px rgba(224,94,0,0.5); }

    /* Location panel */
    .su-location-panel { flex: 0.9; min-width: 320px; background: var(--scada-card); border: 1px solid var(--scada-border); border-radius: 14px; padding: 1.25rem; box-shadow: 0 4px 16px rgba(0,0,0,0.12); display: flex; flex-direction: column; }
    .su-location-title { font-size: 0.85rem; font-weight: 700; color: #e05e00; margin-bottom: 1rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--scada-border); }
    .su-tree { font-size: 0.8rem; max-height: 480px; overflow-x: auto; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 2px; }
    .su-tree::-webkit-scrollbar { width: 6px; height: 6px; }
    .su-tree::-webkit-scrollbar-track { background: transparent; }
    .su-tree::-webkit-scrollbar-thumb { background: rgba(224,94,0,0.15); border-radius: 3px; }
    .su-tree::-webkit-scrollbar-thumb:hover { background: rgba(224,94,0,0.35); }
    .su-tree-node { display: flex; flex-direction: column; }
    .su-tree-row { display: flex; align-items: center; gap: 6px; padding: 6px 4px; cursor: pointer; border-radius: 6px; transition: background 0.15s, color 0.15s; white-space: nowrap; width: fit-content; min-width: 100%; }
    .su-tree-row:hover { background: rgba(224,94,0,0.05); }
    .su-tree-arrow { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; color: var(--scada-text-muted); cursor: pointer; flex-shrink: 0; transition: color 0.15s; }
    .su-tree-arrow:hover { color: #e05e00; }
    .su-tree-arrow-placeholder { width: 18px; flex-shrink: 0; }
    .su-tree-check-wrap { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; cursor: pointer; color: var(--scada-text-muted); flex-shrink: 0; transition: color 0.15s; }
    .su-tree-checkbox.checked { color: #e05e00; }
    .su-tree-label { color: var(--scada-text); cursor: pointer; user-select: none; font-size: 0.78rem; transition: color 0.15s; }
    .su-tree-label:hover { color: #e05e00; }

    /* VIEW ROLE */
    .su-view-role-card { padding:0; }
    .su-view-role-grid { display:grid; grid-template-columns:220px 200px 1fr; gap:2rem; padding:2rem; }
    .su-vr-label { font-size:0.75rem; font-weight:700; color:var(--scada-text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; }
    .su-vr-value { font-size:0.92rem; font-weight:600; color:var(--scada-text); }
    .su-vr-name { color:#7c3aed; font-weight:700; font-size:1rem; }
    .su-vr-desc { font-size:0.82rem; color:var(--scada-text-muted); line-height:1.5; }
    .su-perm-tags { display:flex; flex-wrap:wrap; gap:6px; }
    .su-perm-tag { padding:0.28rem 0.75rem; border-radius:20px; background:rgba(224,94,0,0.1); border:1px solid rgba(224,94,0,0.25); color:#e05e00; font-size:0.72rem; font-weight:600; }

    /* ADD ROLE */
    .su-add-role-layout { display:flex; gap:1.5rem; flex-wrap:wrap; align-items:flex-start; }
    .su-add-role-fields { flex:0 0 420px; }
    .su-add-role-perms { flex:1; min-width:320px; }
    .su-perm-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem; }
    .su-perm-quick { display:flex; gap:0.5rem; }
    .su-perm-quick-btn { padding:0.3rem 0.75rem; border-radius:6px; border:1px solid var(--scada-border); background:transparent; color:var(--scada-text-muted); font-size:0.72rem; font-weight:600; cursor:pointer; transition:all 0.2s; }
    .su-perm-quick-btn:hover { border-color:rgba(124,58,237,0.3); color:#7c3aed; }
    .su-perm-grid-2col { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .su-perm-check-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px; border:1.5px solid var(--scada-border); cursor:pointer; transition:all 0.18s; user-select:none; }
    .su-perm-check-item:hover { border-color:rgba(124,58,237,0.3); background:rgba(124,58,237,0.04); }
    .su-perm-check-item.checked { border-color:rgba(124,58,237,0.45); background:rgba(124,58,237,0.08); }
    .su-perm-checkbox { width:16px; height:16px; border-radius:4px; border:1.5px solid var(--scada-border); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.65rem; font-weight:900; color:#7c3aed; transition:all 0.18s; }
    .su-perm-check-item.checked .su-perm-checkbox { background:rgba(124,58,237,0.15); border-color:#7c3aed; }
    .su-perm-check-label { font-size:0.75rem; font-weight:500; color:var(--scada-text); }
    .su-perm-check-item.checked .su-perm-check-label { color:#7c3aed; font-weight:600; }

    /* ORG TAB */
    .su-org-stats-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem; margin-bottom:1.5rem; }
    .su-org-stat-card { background:var(--scada-card); border:1px solid var(--scada-border); border-radius:12px; padding:1rem 1.25rem; display:flex; align-items:center; gap:0.85rem; }
    .su-org-stat-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .su-org-stat-val { font-size:1.4rem; font-weight:800; color:var(--scada-text); line-height:1; }
    .su-org-stat-label { font-size:0.72rem; color:var(--scada-text-muted); margin-top:3px; font-weight:500; }
    .su-badge-num { background:rgba(255,255,255,0.06); border:1px solid var(--scada-border); border-radius:6px; padding:0.2rem 0.6rem; font-size:0.75rem; font-weight:700; color:var(--scada-text); }
    body.light-mode .su-badge-num { background:rgba(0,0,0,0.05); }
    .su-status-pill { padding:0.25rem 0.7rem; border-radius:20px; font-size:0.7rem; font-weight:700; }

    /* ALL USERS TAB */
    .su-total-badge { padding:0.2rem 0.65rem; border-radius:20px; background:rgba(224,94,0,0.1); border:1px solid rgba(224,94,0,0.2); color:#e05e00; font-size:0.72rem; font-weight:700; }
    .su-type-pill { padding:0.22rem 0.7rem; border-radius:20px; font-size:0.7rem; font-weight:700; }
    .su-search-box { display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.04); border:1px solid var(--scada-border); border-radius:8px; padding:0 0.75rem; height:34px; min-width:220px; }
    body.light-mode .su-search-box { background:#f1f5f9; }
    .su-search-icon { color:var(--scada-text-muted); flex-shrink:0; }
    .su-search-input { background:transparent; border:none; outline:none; color:var(--scada-text); font-size:0.8rem; width:100%; }
    .su-search-input::placeholder { color:var(--scada-text-muted); opacity:0.6; }
    .su-filter-select { height:34px; padding:0 2rem 0 0.75rem; border-radius:8px; border:1px solid var(--scada-border); background:rgba(255,255,255,0.04); color:var(--scada-text); font-size:0.8rem; cursor:pointer; -webkit-appearance:none; outline:none; }
    body.light-mode .su-filter-select { background:#f1f5f9 !important; color:#1e293b !important; }

    /* Modal styles */
    .su-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: suFadeIn 0.25s ease-out;
    }
    .su-modal-container {
      background: var(--scada-card, #0f172a);
      border: 1px solid var(--scada-border, rgba(255,255,255,0.08));
      border-radius: 16px;
      width: 100%;
      max-width: 460px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      animation: suScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .su-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem 0.75rem 1.5rem;
      border-bottom: 1px solid var(--scada-border, rgba(255,255,255,0.08));
    }
    .su-modal-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #7c3aed;
      margin: 0;
    }
    .su-modal-close {
      background: transparent;
      border: none;
      color: var(--scada-text-muted, #94a3b8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;
    }
    .su-modal-close:hover {
      background: rgba(255,255,255,0.05);
      color: var(--scada-text, #fff);
    }
    .su-modal-body {
      padding: 1rem 1.5rem;
      overflow-y: auto;
      flex: 1;
    }
    .su-modal-subtitle {
      font-size: 0.78rem;
      color: var(--scada-text-muted, #94a3b8);
      margin-bottom: 1rem;
    }
    .su-modal-actions-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .su-modal-action-btn {
      flex: 1;
      padding: 0.4rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--scada-border, rgba(255,255,255,0.08));
      border-radius: 6px;
      color: var(--scada-text, #fff);
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .su-modal-action-btn:hover {
      background: rgba(124,58,237,0.1);
      border-color: rgba(124,58,237,0.3);
      color: #7c3aed;
    }
    .su-modal-table-wrap {
      border: 1px solid var(--scada-border, rgba(255,255,255,0.08));
      border-radius: 10px;
      overflow: hidden;
    }
    .su-modal-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }
    .su-modal-table th {
      background: rgba(255,255,255,0.02);
      color: var(--scada-text-muted, #94a3b8);
      font-weight: 700;
      padding: 8px 12px;
      border-bottom: 1px solid var(--scada-border, rgba(255,255,255,0.08));
      text-transform: uppercase;
      font-size: 0.68rem;
      letter-spacing: 0.05em;
    }
    .su-modal-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--scada-border, rgba(255,255,255,0.08));
      color: var(--scada-text, #fff);
    }
    .su-modal-table tr:last-child td {
      border-bottom: none;
    }
    .su-modal-check-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--scada-text-muted, #94a3b8);
      transition: color 0.15s;
    }
    .su-modal-check-wrap:hover:not(.disabled) {
      color: #7c3aed;
    }
    .su-modal-check-wrap.disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .su-modal-footer {
      padding: 1rem 1.5rem 1.25rem 1.5rem;
      border-top: 1px solid var(--scada-border, rgba(255,255,255,0.08));
    }
    @keyframes suFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes suScaleUp {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    /* Globals Section */
    .su-globals-section {
      background: var(--scada-card);
      border: 1px solid var(--scada-border);
      border-radius: 14px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    }
    .su-globals-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .su-globals-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--scada-text);
      margin: 0;
    }
    .su-globals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    /* Columns Container Layout */
    .su-columns-container {
      display: flex;
      gap: 1.25rem;
      overflow-x: auto;
      padding: 0.5rem 0.25rem;
      margin-bottom: 1.5rem;
    }
    .su-columns-container::-webkit-scrollbar {
      height: 8px;
    }
    .su-columns-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .su-columns-container::-webkit-scrollbar-thumb {
      background: rgba(224,94,0,0.15);
      border-radius: 4px;
    }
    .su-columns-container::-webkit-scrollbar-thumb:hover {
      background: rgba(224,94,0,0.35);
    }

    /* Column Styles */
    .su-column {
      flex: 0 0 290px;
      display: flex;
      flex-direction: column;
      background: var(--scada-card);
      border: 1px solid var(--scada-border);
      border-radius: 12px;
      height: 520px;
      overflow: hidden;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .su-column.disabled {
      opacity: 0.45;
      pointer-events: none;
    }

    /* Column Header */
    .su-column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--scada-border);
      background: rgba(255, 255, 255, 0.02);
    }
    .su-column-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--scada-text);
      margin: 0;
    }
    .su-column-add-btn {
      background: transparent;
      border: 1.5px solid var(--scada-border);
      border-radius: 6px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--scada-text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    .su-column-add-btn:hover {
      background: rgba(224,94,0,0.12);
      border-color: rgba(224,94,0,0.35);
      color: #e05e00;
      transform: scale(1.08);
    }

    /* Column Scrollable List */
    .su-column-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .su-column-list::-webkit-scrollbar {
      width: 5px;
    }
    .su-column-list::-webkit-scrollbar-track {
      background: transparent;
    }
    .su-column-list::-webkit-scrollbar-thumb {
      background: rgba(224,94,0,0.1);
      border-radius: 3px;
    }
    .su-column-list::-webkit-scrollbar-thumb:hover {
      background: rgba(224,94,0,0.25);
    }

    /* User item card inside column */
    .su-column-item {
      background: rgba(255,255,255,0.015);
      border: 1.5px solid var(--scada-border);
      border-radius: 10px;
      padding: 0.75rem;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .su-column-item:hover {
      transform: translateY(-2px);
      border-color: rgba(224,94,0,0.3);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      background: rgba(255,255,255,0.03);
    }
    .su-column-item.active {
      border-color: #fb923c !important;
      background: rgba(251, 146, 60, 0.05) !important;
      box-shadow: 0 0 12px rgba(251, 146, 60, 0.25) !important;
    }

    /* User item card components */
    .su-column-item-header {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .su-column-item-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 800;
      flex-shrink: 0;
    }
    .su-column-item-info {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      min-width: 0;
    }
    .su-column-item-name {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--scada-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .su-column-item-email {
      font-size: 0.72rem;
      color: var(--scada-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .su-column-item-locations {
      font-size: 0.7rem;
      color: var(--scada-text-muted);
      background: rgba(0,0,0,0.12);
      padding: 3px 6px;
      border-radius: 5px;
      font-style: italic;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 4px;
    }
    body.light-mode .su-column-item-locations {
      background: rgba(0,0,0,0.04);
    }
    .su-column-item-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
      margin-top: 2px;
    }
    .su-column-item-btn {
      background: transparent;
      border: 1px solid var(--scada-border);
      border-radius: 6px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--scada-text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    .su-column-item-btn:hover {
      background: rgba(224,94,0,0.1);
      border-color: rgba(224,94,0,0.3);
      color: #e05e00;
    }
    .su-column-item-btn.delete:hover {
      background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.3);
      color: #ef4444;
    }
    .su-column-item-btn.disabled {
      opacity: 0.3;
      pointer-events: none;
      cursor: not-allowed;
    }

    @media (max-width:768px) {
      .su-form-row { grid-template-columns:1fr; }
      .su-view-role-grid { grid-template-columns:1fr; }
      .su-add-role-layout { flex-direction:column; }
      .su-add-role-fields { flex:unset; width:100%; }
      .su-perm-grid-2col { grid-template-columns:1fr; }
      .su-location-panel { width:100%; }
      .su-form-body { flex-direction:column; }
      .su-columns-container { flex-direction:column; }
      .su-column { flex:unset; width:100%; height:auto; max-height:400px; }
    }
  `}} />
);

export default SystemUsers;
