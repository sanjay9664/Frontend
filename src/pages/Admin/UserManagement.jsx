import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Modal, Form } from 'react-bootstrap';
import {
  UserPlus, Trash2, Save,
  Search, LayoutDashboard, Droplets, Activity, Database, Bell, Zap,
  ShieldAlert, ClipboardList, PenTool, History, Gauge, User, X,
  CheckCircle, Key, Settings, RefreshCw, Wind
} from 'lucide-react';


/* ─────────────────────── module map ─────────────────────── */
const moduleDetails = {
  showDashboard        : { label: 'Dashboard',      icon: <LayoutDashboard size={15} /> },
  showWaterManagement  : { label: 'Water Mgmt',     icon: <Droplets        size={15} /> },
  showMotors           : { label: 'Motors',          icon: <Activity        size={15} /> },
  showDGSet            : { label: 'DG Set',          icon: <Database        size={15} /> },
  showSettingTemplates : { label: 'Templates',       icon: <Settings        size={15} /> },
  showAlarms           : { label: 'Alarms',          icon: <Bell            size={15} /> },
  showLTPanel          : { label: 'LT Panel',        icon: <LayoutDashboard size={15} /> },
  showTransformers     : { label: 'Transformer',     icon: <Zap             size={15} /> },
  showFirePumps        : { label: 'Fire',            icon: <ShieldAlert     size={15} /> },
  showTicketing        : { label: 'Ticketing',       icon: <ClipboardList   size={15} /> },
  showMaintenance      : { label: 'Maintenance',     icon: <PenTool         size={15} /> },
  showServiceHistory   : { label: 'Service History', icon: <History         size={15} /> },
  showDailyDPR         : { label: 'Daily DPR',       icon: <Gauge           size={15} /> },
  showEnergyMetering   : { label: 'Energy Meter',    icon: <Zap             size={15} /> },
  showVRV              : { label: 'VRV',             icon: <Wind            size={15} /> },
  showAQISensor        : { label: 'AQI Sensor',      icon: <Wind            size={15} /> },
  showHVAC             : { label: 'HVAC',            icon: <Settings        size={15} /> },
  showAC               : { label: 'AC',              icon: <Wind            size={15} /> },
};

const buildDefaultConfig = () => {
  const cfg = {};
  Object.keys(moduleDetails).forEach(k => {
    cfg[`${k}_read`] = true;
    cfg[`${k}_write`] = false;
    cfg[k] = true;
  });
  return cfg;
};

/* ─────────────────────── avatar helper ─────────────────── */
const PALETTE = ['#fb923c','#f59e0b','#e05e00','#ef4444','#ec4899','#d946ef','#f43f5e','#ea580c'];
const getAvatarBg = (name = '') => {
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[h % PALETTE.length];
};

/* ─────────────────────── custom select component ─────────────────── */
const CustomSelect = ({ value, onChange, options, placeholder = '— Select —', className = '', style = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => String(opt.value) === String(value));

  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  return (
    <div className={`um-custom-select-container ${className}`} style={{ ...style }} onClick={e => e.stopPropagation()}>
      <div 
        className={`um-custom-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="um-custom-select-arrow" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
      </div>
      {isOpen && (
        <div className="um-custom-select-dropdown">
          {options.map(opt => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div 
                key={opt.value} 
                className={`um-custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════ COMPONENT ════════════════════════ */
const UserManagement = () => {
  /* ── list state ── */
  const [users,              setUsers]              = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [apiError,           setApiError]           = useState(null);
  const [pagination,         setPagination]         = useState({ page:1, pageSize:20, total:0, totalPages:1 });
  const [searchTerm,         setSearchTerm]         = useState('');
  const [saveMsg,            setSaveMsg]            = useState(null);
  const [showSochiotAdmins,  setShowSochiotAdmins]  = useState(false);
  const [filterRole,         setFilterRole]         = useState('');
  const [filterStatus,       setFilterStatus]       = useState('');
  const [filterSync,         setFilterSync]         = useState('');

  /* ── modal / form state ── */
  const [showModal,    setShowModal]    = useState(false);
  const [formData,     setFormData]     = useState({ id:'', name:'', email:'', roleId:'', role:'', siteId:'' });
  const [formConfig,   setFormConfig]   = useState(buildDefaultConfig());
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState(null);

  /* ── roles / sites ── */
  const [roles,        setRoles]        = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [sites,        setSites]        = useState([]);
  const [syncingStates,setSyncingStates]= useState({});

  /* ── auth fetch helper ── */
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

  /* ── data fetchers ── */
  const fetchUsers = async (page = 1, forceSochiot = showSochiotAdmins) => {
    setLoading(true); setApiError(null);
    try {
      const endpoint = forceSochiot
        ? `${import.meta.env.VITE_BACKEND_BMS_URL}/users/all?page=${page}&pageSize=${pagination.pageSize}`
        : `${import.meta.env.VITE_BACKEND_BMS_URL}/users?page=${page}&pageSize=${pagination.pageSize}`;
      const res  = await fetchWithAuth(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        if (forceSochiot) {
          setUsers(json.data.list || []);
          setPagination({ page: json.data.page, pageSize: json.data.pageSize, total: json.data.total, totalPages: json.data.totalPages });
        } else {
          setUsers(json.data || []);
          const meta = json.meta || {};
          setPagination({
            page: meta.page || 1,
            pageSize: meta.pageSize || pagination.pageSize,
            total: meta.total || 0,
            totalPages: meta.totalPages || 1
          });
        }
      } else setUsers([]);
    } catch (e) {
      console.error(e);
      setApiError('Could not load users. Make sure the backend is running.');
      setUsers([]);
    } finally { setLoading(false); }
  };

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const res  = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/users/roles`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setRoles(json.data);
    } catch (e) { console.error('Roles fetch failed:', e); }
    finally { setRolesLoading(false); }
  };

  const fetchSites = async () => {
    try {
      const res  = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/`);
      if (res.ok) { const j = await res.json(); setSites(j.data || []); }
    } catch (e) { console.error('Sites fetch failed:', e); }
  };

  useEffect(() => { fetchUsers(1); fetchRoles(); fetchSites(); }, []);

  /* ── open modal ── */
  const openCreateModal = () => {
    setFormData({ id:'', name:'', email:'', roleId:'', role:'', siteId: sites.length > 0 ? String(sites[0].id) : '' });
    setFormConfig(buildDefaultConfig());
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    const fp = user.featurePermissions || {};
    const cfg = {};
    Object.keys(moduleDetails).forEach(k => {
      const readVal = fp[`${k}_read`] !== undefined ? !!fp[`${k}_read`] : (fp[k] !== undefined ? !!fp[k] : true);
      const writeVal = fp[`${k}_write`] !== undefined ? !!fp[`${k}_write`] : false;
      cfg[`${k}_read`] = readVal;
      cfg[`${k}_write`] = writeVal;
      cfg[k] = readVal;
    });

    const matchedRole = roles.find(r => String(r.id) === String(user.roleId || user.role?.id));
    const roleIdVal = user.role?.id || user.roleId || matchedRole?.id || '';
    const roleNameVal = user.role?.name || user.roleName || matchedRole?.name || '';

    setFormData({
      id    : user.id,
      name  : user.name  || '',
      email : user.email || '',
      roleId: roleIdVal ? String(roleIdVal) : '',
      role  : roleNameVal,
      siteId: user.siteId ? String(user.siteId) : (sites.length > 0 ? String(sites[0].id) : ''),
    });
    setFormConfig(cfg);
    setSaveError(null);
    setShowModal(true);
  };

  /* ── delete ── */
  const handleDeleteUser = async (userId, name, userSiteId) => {
    if (!window.confirm(`Are you sure you want to delete operator "${name}"?`)) return;
    const siteId = userSiteId || (sites.length > 0 ? sites[0].id : 1);
    try {
      const res  = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/users/${userId}?siteId=${siteId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ Operator "${name}" deleted successfully!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchUsers(pagination.page);
      } else {
        alert(`Failed to delete operator: ${json.message || json.error || `Error ${res.status}`}`);
      }
    } catch (e) { console.error(e); alert('Network error. Failed to delete operator.'); }
  };

  /* ── status toggle ── */
  const handleToggleStatus = async (userId, name, currentStatus, userSiteId) => {
    const newStatus = !currentStatus;
    setUsers(p => p.map(u => u.id === userId ? { ...u, enabled: newStatus } : u));
    const siteId = userSiteId || (sites.length > 0 ? sites[0].id : 1);
    try {
      const res  = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/users/${userId}`, {
        method : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ enabled: newStatus, siteId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ "${name}" ${newStatus ? 'enabled' : 'disabled'} successfully!`);
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        alert(`Failed to update status: ${json.message || `Error ${res.status}`}`);
        setUsers(p => p.map(u => u.id === userId ? { ...u, enabled: currentStatus } : u));
      }
    } catch (e) {
      console.error(e);
      setUsers(p => p.map(u => u.id === userId ? { ...u, enabled: currentStatus } : u));
    }
  };

  /* ── sync ── */
  const handleSyncUser = async (userId, name) => {
    setSyncingStates(p => ({ ...p, [userId]: true }));
    try {
      const res  = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/users/${userId}/sync`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setSaveMsg(`✓ "${name}" synced to BMS!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchUsers(pagination.page);
      } else { alert(`Failed to sync: ${json.message || `Error ${res.status}`}`); }
    } catch (e) { console.error(e); alert('Network error.'); }
    finally { setSyncingStates(p => ({ ...p, [userId]: false })); }
  };

  /* ── submit (create / edit) ── */
  const handleSubmitUser = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError(null);
    const featurePermissions = {};
    Object.keys(moduleDetails).forEach(k => {
      const readVal = !!formConfig[`${k}_read`];
      const writeVal = !!formConfig[`${k}_write`];
      featurePermissions[`${k}_read`] = readVal;
      featurePermissions[`${k}_write`] = writeVal;
      featurePermissions[k] = readVal;
    });
    const siteId  = formData.siteId ? parseInt(formData.siteId, 10) : (sites.length > 0 ? sites[0].id : 1);
    const isEdit  = !!formData.id;

    // Resolve original user's siteId to check if it has changed
    const origUser = users.find(u => String(u.id) === String(formData.id));
    const origSiteId = origUser ? origUser.siteId : null;

    if (isEdit && origSiteId && parseInt(origSiteId, 10) !== siteId) {
      try {
        // 1. Delete user from old site
        const deleteRes = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/users/${formData.id}?siteId=${origSiteId}`, { method: 'DELETE' });
        if (!deleteRes.ok) {
          const json = await deleteRes.json().catch(() => ({}));
          throw new Error(json.message || json.error || `Failed to remove user from old site`);
        }

        // 2. Re-create user with the new siteId and updated details
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          roleId: parseInt(formData.roleId, 10),
          enabled: true,
          featurePermissions,
          siteId
        };
        const createRes = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await createRes.json().catch(() => ({}));
        if (createRes.ok && json.success !== false) {
          setShowModal(false);
          setSaveMsg(`✓ "${formData.name}" transferred to new site successfully!`);
          setTimeout(() => setSaveMsg(null), 4000);
          fetchUsers(pagination.page);
        } else {
          throw new Error(json.message || json.error || `Failed to create user on new site`);
        }
      } catch (err) {
        console.error(err);
        setSaveError(err.message || 'Error occurred during site transfer');
      } finally {
        setSaving(false);
      }
      return;
    }

    const payload = { name: formData.name.trim(), email: formData.email.trim(), roleId: parseInt(formData.roleId, 10), enabled: true, featurePermissions, siteId };
    try {
      const res  = await fetchWithAuth(
        isEdit ? `${import.meta.env.VITE_BACKEND_BMS_URL}/users/${formData.id}` : `${import.meta.env.VITE_BACKEND_BMS_URL}/users`,
        { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success !== false) {
        setShowModal(false);
        setSaveMsg(isEdit ? `✓ "${formData.name}" updated!` : `✓ "${formData.name}" registered!`);
        setTimeout(() => setSaveMsg(null), 4000);
        fetchUsers(pagination.page);
      } else { setSaveError(json.message || json.error || `Error ${res.status}`); }
    } catch (e) { console.error(e); setSaveError('Network error.'); }
    finally { setSaving(false); }
  };

  /* ── filtered list ── */
  const filteredUsers = useMemo(() =>
    users.filter(u => {
      const matchesSearch =
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.roleName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchedRole = roles.find(r => String(r.id) === String(u.roleId || u.role?.id));
      const roleIdStr = String(u.role?.id || u.roleId || matchedRole?.id || '');
      const matchesRole = filterRole ? roleIdStr === filterRole : true;

      const isActive = u.enabled !== false;
      const matchesStatus = filterStatus
        ? (filterStatus === 'active' ? isActive : !isActive)
        : true;

      const matchesSync = filterSync
        ? (filterSync === 'synced' ? u.syncedToBMS : !u.syncedToBMS)
        : true;

      return matchesSearch && matchesRole && matchesStatus && matchesSync;
    }), [users, searchTerm, filterRole, filterStatus, filterSync, roles]);

  const enabledCount = Object.keys(moduleDetails).filter(k => formConfig[`${k}_read`] !== false).length;
  const totalMods    = Object.keys(moduleDetails).length;
  const colors       = ["#8C3B06", "#2A1206", "#0c0502", "#4a1c02"];

  /* ═══════════════════════ RENDER ════════════════════════ */
  return (
    <div className="um-wrap" style={{
      background: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 30%, ${colors[2]} 65%, ${colors[3]} 100%)`,
      minHeight: '100vh',
      margin: '-1.5rem -1.5rem -3.5rem -1.5rem',
      padding: '1.5rem 1.5rem 3.5rem 1.5rem',
    }}>

      {/* ── Page header ── */}
      <div className="um-page-header mb-4">
        <h2 className="um-page-title">Operator Management</h2>
        <p className="um-page-sub">Control access levels, operator accounts and module visibility controls.</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="um-toolbar mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap justify-content-between">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="um-search-box">
              <Search size={15} className="um-search-icon" />
              <input
                type="text"
                placeholder="Search operators by name or email..."
                className="um-search-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <CustomSelect
              value={filterRole}
              onChange={val => setFilterRole(val)}
              options={[
                { value: '', label: 'All Roles' },
                ...roles.map(r => ({ value: String(r.id), label: r.name }))
              ]}
              placeholder="All Roles"
            />

            {/* Active Status Filter */}
            <CustomSelect
              value={filterStatus}
              onChange={val => setFilterStatus(val)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'disabled', label: 'Disabled' }
              ]}
              placeholder="All Statuses"
            />

            {/* Sync Status Filter */}
            <CustomSelect
              value={filterSync}
              onChange={val => setFilterSync(val)}
              options={[
                { value: '', label: 'All Sync States' },
                { value: 'synced', label: 'Synced to BMS' },
                { value: 'unsynced', label: 'Sync Now' }
              ]}
              placeholder="All Sync States"
            />

            <button
              onClick={() => {
                const nextState = !showSochiotAdmins;
                setShowSochiotAdmins(nextState);
                fetchUsers(1, nextState);
              }}
              className={showSochiotAdmins ? "um-btn-primary" : "um-btn-secondary"}
              style={{
                borderRadius: '10px',
                padding: '0 1rem',
                fontSize: '0.82rem',
                height: '38px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 800,
                border: showSochiotAdmins ? 'none' : '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'umSpin 1.5s linear infinite' : 'none' }} />
              {showSochiotAdmins ? 'Show Local Operators' : 'Show Sochiot Admins'}
            </button>
          </div>
          <div className="d-flex align-items-center gap-3">
            {saveMsg && (
              <span className="um-save-badge">
                <CheckCircle size={13} className="me-1" /> {saveMsg}
              </span>
            )}
            <span className="um-count-badge">
              <User size={13} className="me-1" />
              {filteredUsers.length} Operator{filteredUsers.length !== 1 ? 's' : ''}
            </span>
            <button className="um-btn-primary" onClick={openCreateModal}>
              <UserPlus size={16} className="me-2" />
              Add New Operator
            </button>
          </div>
        </div>
      </div>

      {/* ── Users Table ── */}
      <Card className="um-card border-0">
        <Card.Body className="p-0">
          {loading ? (
            <div className="um-empty-state">
              <div className="um-spinner" />
              <p className="mt-3" style={{ color: '#64748b', fontSize: '0.85rem' }}>Loading users...</p>
            </div>
          ) : apiError ? (
            <div className="um-empty-state">
              <div className="um-empty-icon" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                <User size={28} />
              </div>
              <p className="mt-3" style={{ color: '#f87171', fontSize: '0.85rem' }}>{apiError}</p>
              <button className="um-btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => fetchUsers(pagination.page)}>Retry</button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="um-empty-state">
              <div className="um-empty-icon"><User size={28} /></div>
              <p className="mt-3" style={{ color: '#64748b', fontSize: '0.85rem' }}>
                {searchTerm ? 'No users match your search.' : 'No users found.'}
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="um-table w-100">
                  <thead>
                    <tr>
                      <th>OPERATOR</th>
                      <th>EMAIL</th>
                      <th>ROLE</th>
                      <th>SITE</th>
                      <th>STATUS</th>
                      <th>SYNCED TO BMS</th>
                      <th className="text-center" style={{ width: '110px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const matchedRole = roles.find(r => String(r.id) === String(user.roleId || user.role?.id));
                      const roleName  = user.role?.name || user.roleName || matchedRole?.name || '—';
                      const roleType  = user.role?.roleType || matchedRole?.roleType || '';
                      const avatarBg  = getAvatarBg(user.name || '');
                      const initial   = user.name?.charAt(0)?.toUpperCase() || 'U';
                      const isActive  = user.enabled !== false;
                      const matchedSite = sites.find(s => String(s.id) === String(user.siteId));
                      const siteName  = matchedSite ? matchedSite.name : '—';

                      return (
                        <tr key={user.id} className="um-tr">

                          {/* OPERATOR */}
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div className="um-avatar" style={{ background: `${avatarBg}22`, border: `1.5px solid ${avatarBg}55`, color: avatarBg }}>
                                {user.imageUrl
                                  ? <img src={user.imageUrl} alt={user.name} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} onError={e => { e.target.style.display='none'; }} />
                                  : initial}
                              </div>
                              <div>
                                <div className="um-user-name">{user.name}</div>
                                <div style={{ fontSize:'0.7rem', color:'#475569' }}>ID: {user.id}</div>
                              </div>
                            </div>
                          </td>

                          {/* EMAIL */}
                          <td><span className="um-email">{user.email}</span></td>

                          {/* ROLE */}
                          <td>
                            <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                              <span className="um-role-badge" style={{
                                background: roleType === 'SYSTEM' ? '#d97706' : roleType === 'INSTALLATION' ? '#7c3aed' : '#e05e00',
                                color:  '#ffffff',
                                padding: '0.28rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                              }}>{roleName}</span>
                              {roleType && <span style={{ fontSize:'0.62rem', color:'#475569' }}>{roleType}</span>}
                            </div>
                          </td>

                          {/* SITE */}
                          <td>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{siteName}</span>
                          </td>

                          {/* STATUS TOGGLE */}
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                onClick={() => handleToggleStatus(user.id, user.name, isActive, user.siteId)}
                                style={{
                                  width:'38px', height:'22px', borderRadius:'11px',
                                  background: isActive ? 'rgba(224, 94, 0, 0.18)' : 'rgba(255,255,255,0.06)',
                                  border: `1.5px solid ${isActive ? '#e05e00' : 'rgba(255,255,255,0.12)'}`,
                                  position:'relative', cursor:'pointer', transition:'all 0.25s',
                                  flexShrink: 0,
                                }}
                              >
                                <div style={{
                                  width:'15px', height:'15px', borderRadius:'50%',
                                  background: isActive ? '#e05e00' : '#64748b',
                                  position:'absolute', top:'2.5px',
                                  left: isActive ? '19px' : '2.5px',
                                  transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                                  boxShadow: isActive ? '0 0 8px rgba(224, 94, 0, 0.6)' : 'none',
                                }} />
                              </div>
                              <span style={{ fontSize:'0.72rem', color: isActive ? '#e05e00' : '#64748b', fontWeight:700, minWidth:'46px' }}>
                                {isActive ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                          </td>

                          {/* SYNCED TO BMS */}
                          <td>
                            {syncingStates[user.id] ? (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'0.7rem', fontWeight:700,
                                padding:'0.2rem 0.65rem', borderRadius:'20px', background:'rgba(255,255,255,0.03)',
                                border:'1px solid rgba(255,255,255,0.08)', color:'#94a3b8' }}>
                                <span style={{ display:'inline-block', width:'10px', height:'10px',
                                  border:'1.5px solid rgba(255,255,255,0.3)', borderTopColor:'#fff',
                                  borderRadius:'50%', animation:'umSpin 0.7s linear infinite' }} />
                                Syncing...
                              </span>
                            ) : (
                              <button onClick={() => handleSyncUser(user.id, user.name)} className="um-sync-btn"
                                style={{
                                  background: user.syncedToBMS ? '#10b981' : '#e11d48',
                                  border: 'none',
                                  color: '#ffffff',
                                  display:'inline-flex', alignItems:'center', gap:'5px',
                                  fontSize:'0.7rem', fontWeight:800, padding:'0.28rem 0.8rem',
                                  borderRadius:'20px', cursor:'pointer', transition:'all 0.2s', outline:'none',
                                  boxShadow: user.syncedToBMS ? '0 2px 8px rgba(16,185,129,0.25)' : '0 2px 8px rgba(225,29,72,0.25)',
                                }}>
                                {user.syncedToBMS ? '✓ Synced' : '✗ Sync Now'}
                              </button>
                            )}
                          </td>

                          {/* ACTIONS */}
                          <td>
                            <div className="d-flex justify-content-center gap-2">
                              <button className="um-action-btn settings" title="Edit / Permissions" onClick={() => openEditModal(user)}>
                                <Key size={14} />
                              </button>
                              <button className="um-action-btn delete" title="Delete" onClick={() => handleDeleteUser(user.id, user.name, user.siteId)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'0.85rem 1.25rem', borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(15,23,42,0.12)' }}>
                  <span style={{ fontSize:'0.75rem', color:'#64748b' }}>
                    Showing <strong style={{ color:'#94a3b8' }}>{((pagination.page-1)*pagination.pageSize)+1}–{Math.min(pagination.page*pagination.pageSize, pagination.total)}</strong> of <strong style={{ color:'#94a3b8' }}>{pagination.total}</strong> users
                  </span>
                  <div style={{ display:'flex', gap:'0.3rem', alignItems:'center' }}>
                    <button onClick={() => fetchUsers(pagination.page-1)} disabled={pagination.page<=1}
                      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
                        color: pagination.page<=1 ? '#334155' : '#94a3b8',
                        borderRadius:'7px', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center',
                        cursor: pagination.page<=1 ? 'not-allowed' : 'pointer', fontSize:'0.75rem' }}>&lt;</button>
                    {Array.from({ length: pagination.totalPages }).map((_, i) => {
                      const pg = i+1; const isAct = pg === pagination.page;
                      return (
                        <button key={pg} onClick={() => fetchUsers(pg)}
                          style={{ background: isAct ? 'linear-gradient(135deg,#e05e00,#8c3b06)' : 'rgba(255,255,255,0.03)',
                            border: isAct ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            color:'#fff', borderRadius:'7px', width:'28px', height:'28px',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontWeight: isAct ? 800 : 500, cursor:'pointer', fontSize:'0.75rem' }}>{pg}</button>
                      );
                    })}
                    <button onClick={() => fetchUsers(pagination.page+1)} disabled={pagination.page>=pagination.totalPages}
                      style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
                        color: pagination.page>=pagination.totalPages ? '#334155' : '#94a3b8',
                        borderRadius:'7px', width:'28px', height:'28px', display:'flex', alignItems:'center', justifyContent:'center',
                        cursor: pagination.page>=pagination.totalPages ? 'not-allowed' : 'pointer', fontSize:'0.75rem' }}>&gt;</button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* ══════════════ REGISTER / EDIT MODAL ══════════════ */}
      <Modal show={showModal} onHide={() => { setShowModal(false); setSaveError(null); }} centered size="lg" className="um-modal">
        <Modal.Header closeButton className="border-0 pb-2">
          <Modal.Title className="d-flex align-items-center gap-3" style={{ color:'#fff', fontWeight:800, fontSize:'1.15rem' }}>
            <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'rgba(224,94,0,0.1)',
              border:'1px solid rgba(224,94,0,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#e05e00' }}>
              <UserPlus size={20} />
            </div>
            {formData.id ? 'Edit Operator & Permissions' : 'Register New Operator'}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmitUser}>
          <Modal.Body className="pt-2 pb-3" style={{ paddingLeft:'1.5rem', paddingRight:'1.5rem' }}>

            {/* ── Basic Info Row ── */}
            <Row className="g-3 mb-4">
              <Col md={6}>
                <label className="um-form-label">Full Name</label>
                <input type="text" className="um-form-input" placeholder="e.g. Sanjay Gupta"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </Col>
              <Col md={6}>
                <label className="um-form-label">Email Address</label>
                <input type="email" className="um-form-input" placeholder="e.g. sochiot@gmail.com"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </Col>
              <Col md={6}>
                <label className="um-form-label">Role</label>
                <CustomSelect
                  value={formData.roleId || ''}
                  onChange={val => {
                    const sel = roles.find(r => String(r.id) === val);
                    setFormData({ ...formData, roleId: val, role: sel?.name || '' });
                  }}
                  options={roles.map(r => ({ value: String(r.id), label: `${r.name}${r.roleType ? ` (${r.roleType})` : ''}` }))}
                  placeholder="— Select Role —"
                  className="w-100"
                />
              </Col>
              <Col md={6}>
                <label className="um-form-label">Site</label>
                <CustomSelect
                  value={formData.siteId || ''}
                  onChange={val => setFormData({ ...formData, siteId: val })}
                  options={sites.map(s => ({ value: String(s.id), label: s.name }))}
                  placeholder="— Select Site —"
                  className="w-100"
                />
              </Col>
            </Row>

            {/* ── Module Permissions ── */}
            <div className="um-perm-section">
              {/* Header */}
              <div className="um-perm-header">
                <div className="d-flex align-items-center gap-2">
                  <span style={{ color:'#a78bfa', display:'flex' }}><Key size={16} /></span>
                  <span className="um-perm-title">MODULE PERMISSIONS</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="um-perm-count">{enabledCount}/{totalMods} enabled</span>
                  <button type="button" className="um-perm-all on"
                    onClick={() => {
                      const c = { ...formConfig };
                      Object.keys(moduleDetails).forEach(k => {
                        c[`${k}_read`] = true;
                        c[`${k}_write`] = true;
                      });
                      setFormConfig(c);
                    }}>
                    ALL ON
                  </button>
                  <button type="button" className="um-perm-all off"
                    onClick={() => {
                      const c = { ...formConfig };
                      Object.keys(moduleDetails).forEach(k => {
                        c[`${k}_read`] = false;
                        c[`${k}_write`] = false;
                      });
                      setFormConfig(c);
                    }}>
                    ALL OFF
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="um-perm-grid">
                {Object.entries(moduleDetails).map(([key, mod]) => {
                  const onRead = formConfig[`${key}_read`] !== false;
                  const onWrite = !!formConfig[`${key}_write`];
                  return (
                    <div key={key} className={`um-perm-card ${onRead ? 'on' : 'off'}`} style={{ cursor: 'default' }}>
                      <span className="um-perm-card-icon">{mod.icon}</span>
                      <span className="um-perm-card-label" style={{ fontSize: '0.78rem' }}>{mod.label}</span>
                      
                      <div className="d-flex align-items-center gap-2" style={{ marginLeft: 'auto' }}>
                        {/* Read Toggle */}
                        <div className="d-flex align-items-center gap-1" style={{ cursor: 'pointer' }} onClick={() => {
                          const nextRead = !onRead;
                          setFormConfig({
                            ...formConfig,
                            [`${key}_read`]: nextRead,
                            [`${key}_write`]: nextRead ? onWrite : false
                          });
                        }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: onRead ? '#a78bfa' : '#475569' }}>R</span>
                          <div style={{
                            width:'26px', height:'14px', borderRadius:'7px',
                            background: onRead ? 'rgba(224,94,0,0.2)' : 'rgba(255,255,255,0.06)',
                            border: `1.2px solid ${onRead ? 'rgba(224,94,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            position:'relative', transition:'all 0.2s',
                          }}>
                            <div style={{
                              width:'8px', height:'8px', borderRadius:'50%',
                              background: onRead ? '#e05e00' : '#475569',
                              position:'absolute', top:'1.8px',
                              left: onRead ? '14px' : '1.8px',
                              transition:'all 0.2s',
                              boxShadow: onRead ? '0 0 6px rgba(224,94,0,0.7)' : 'none',
                            }} />
                          </div>
                        </div>

                        {/* Write Toggle */}
                        <div className={`d-flex align-items-center gap-1 ${!onRead ? 'disabled' : ''}`} style={{ cursor: onRead ? 'pointer' : 'not-allowed', opacity: onRead ? 1 : 0.35 }} onClick={() => {
                          if (!onRead) return;
                          setFormConfig({
                            ...formConfig,
                            [`${key}_write`]: !onWrite
                          });
                        }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: onWrite ? '#a78bfa' : '#475569' }}>W</span>
                          <div style={{
                            width:'26px', height:'14px', borderRadius:'7px',
                            background: onWrite ? 'rgba(224,94,0,0.2)' : 'rgba(255,255,255,0.06)',
                            border: `1.2px solid ${onWrite ? 'rgba(224,94,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            position:'relative', transition:'all 0.2s',
                          }}>
                            <div style={{
                              width:'8px', height:'8px', borderRadius:'50%',
                              background: onWrite ? '#e05e00' : '#475569',
                              position:'absolute', top:'1.8px',
                              left: onWrite ? '14px' : '1.8px',
                              transition:'all 0.2s',
                              boxShadow: onWrite ? '0 0 6px rgba(224,94,0,0.7)' : 'none',
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </Modal.Body>

          <Modal.Footer className="border-0 pt-0" style={{ padding:'0.75rem 1.5rem 1.25rem', flexDirection:'column', alignItems:'stretch', gap:'0.65rem' }}>
            {saveError && (
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.65rem 1rem',
                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)',
                borderRadius:'10px', color:'#f87171', fontSize:'0.82rem', fontWeight:600 }}>
                <X size={15} style={{ flexShrink:0 }} /> {saveError}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.75rem' }}>
              <button type="button" className="um-btn-secondary" onClick={() => { setShowModal(false); setSaveError(null); }}>
                Cancel
              </button>
              <button type="submit" className="um-btn-primary" disabled={saving} style={{ minWidth:'160px', justifyContent:'center' }}>
                {saving ? (
                  <>
                    <span style={{ display:'inline-block', width:'14px', height:'14px',
                      border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff',
                      borderRadius:'50%', animation:'umSpin 0.7s linear infinite', marginRight:'8px' }} />
                    Registering...
                  </>
                ) : (
                  <>
                    <Save size={15} className="me-2" />
                    {formData.id ? 'Save Changes' : 'Register Operator'}
                  </>
                )}
              </button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ═══════════════════════ CSS ════════════════════════ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes umSpin { to { transform: rotate(360deg); } }

        .um-wrap {
          background: linear-gradient(180deg, #8C3B06 0%, #2A1206 30%, #0c0502 65%, #4a1c02 100%);
          min-height: 100vh;
          margin: -1.5rem -1.5rem -3.5rem -1.5rem;
          padding: 1.5rem 1.5rem 3.5rem 1.5rem;
          font-family: 'Poppins', system-ui, -apple-system, sans-serif;
        }

        /* ── page header ── */
        .um-page-header { }
        .um-page-title  { font-size: 1.6rem; font-weight: 800; color: #f1f5f9; margin-bottom: 0.25rem; }
        .um-page-sub    { font-size: 0.82rem; color: rgba(255, 255, 255, 0.7); margin-bottom: 0; }

        /* ── toolbar ── */
        .um-toolbar {
          background: rgba(14, 7, 3, 0.55);
          border: 1px solid rgba(224, 94, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 0.9rem 1.2rem;
          box-shadow: 0 15px 35px -10px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .um-search-box   { position:relative; display:flex; align-items:center; min-width:260px; }
        .um-search-icon  { position:absolute; left:12px; color:#475569; pointer-events:none; }
        .um-search-input {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; color: #e2e8f0; font-size: 0.85rem;
          padding: 0.5rem 1rem 0.5rem 2.2rem; outline: none; transition: all 0.25s; width: 100%; font-family:inherit;
        }
        .um-search-input:focus  { border-color: #8c3b06; box-shadow: 0 0 10px rgba(140,59,6,0.18); }
        .um-search-input::placeholder { color: #475569; }

        .um-filter-select {
          background: rgba(255,255,255,0.03) url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e") no-repeat right 0.75rem center/8px 10px;
          border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
          color: #94a3b8; font-size: 0.82rem; font-weight: 700;
          padding: 0.5rem 2rem 0.5rem 0.75rem; outline: none; transition: all 0.2s;
          cursor: pointer; appearance: none; height: 38px;
        }
        .um-filter-select:focus { border-color: #8c3b06; color: #e2e8f0; }
        .um-filter-select option { background: #1a0b04; color: #e2e8f0; }

        .um-count-badge {
          display:inline-flex; align-items:center; font-size:0.72rem; font-weight:700; color:#94a3b8;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
          border-radius:20px; padding:0.32rem 0.8rem;
        }
        .um-save-badge {
          display:inline-flex; align-items:center; font-size:0.72rem; font-weight:700;
          color:#4ade80; background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.2);
          border-radius:20px; padding:0.32rem 0.8rem;
          animation: umFadeIn 0.3s ease;
        }
        @keyframes umFadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }

        /* ── buttons ── */
        .um-btn-primary {
          display:inline-flex; align-items:center;
          background: linear-gradient(135deg, #e05e00, #8c3b06);
          border:none; border-radius:25px; color:#fff; font-size:0.8rem; font-weight:800;
          padding:0.58rem 1.3rem; cursor:pointer; transition:all 0.25s; letter-spacing:0.01em;
        }
        .um-btn-primary:hover { filter:brightness(1.12); transform:translateY(-1px); box-shadow:0 6px 20px rgba(224, 94, 0, 0.35); }
        .um-btn-primary:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .um-btn-secondary {
          display:inline-flex; align-items:center;
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
          border-radius:25px; color:#94a3b8; font-size:0.8rem; font-weight:700;
          padding:0.58rem 1.3rem; cursor:pointer; transition:all 0.25s;
        }
        .um-btn-secondary:hover { background:rgba(255,255,255,0.08); color:#e2e8f0; }

        /* ── card / table ── */
        .um-card {
          background: rgba(14, 7, 3, 0.75) !important;
          border: 1px solid rgba(224, 94, 0, 0.25) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
          border-left: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 16px !important; overflow:hidden;
          backdrop-filter: blur(16px);
          box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px, inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .um-table { border-collapse:collapse; }
        .um-table th {
          padding:0.85rem 1.2rem; font-size:0.65rem; font-weight:800; letter-spacing:0.09em;
          text-transform:uppercase; color:#8c7b70;
          background:rgba(255,255,255,0.015);
          border-bottom:1px solid rgba(224, 94, 0, 0.1); white-space:nowrap;
        }
        .um-tr { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.2s; }
        .um-tr:last-child { border-bottom:none; }
        .um-tr:hover { background:rgba(224, 94, 0, 0.04); }
        .um-table td { padding:0.85rem 1.2rem; vertical-align:middle; }

        /* ── cells ── */
        .um-avatar {
          width:36px; height:36px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:0.8rem; font-weight:800; flex-shrink:0;
        }
        .um-user-name { font-size:0.87rem; font-weight:700; color:#e2e8f0; }
        .um-email     { font-size:0.8rem;  color:#64748b; }
        .um-role-badge {
          display:inline-block; font-size:0.66rem; font-weight:800;
          letter-spacing:0.07em; text-transform:uppercase;
          padding:0.22rem 0.7rem; border-radius:20px;
        }

        /* ── action buttons ── */
        .um-action-btn {
          background:transparent; border:1px solid rgba(255,255,255,0.07); border-radius:8px;
          padding:0.38rem 0.48rem; cursor:pointer; display:inline-flex; align-items:center; transition:all 0.2s;
        }
        .um-action-btn.settings { color:#e05e00; }
        .um-action-btn.settings:hover { background:rgba(224, 94, 0, 0.12); border-color:rgba(224, 94, 0, 0.3); transform:translateY(-1px); }
        .um-action-btn.delete   { color:#f87171; }
        .um-action-btn.delete:hover   { background:rgba(248,113,113,0.12); border-color:rgba(248,113,113,0.3); transform:translateY(-1px); }

        .um-sync-btn:hover { filter:brightness(1.2); transform:translateY(-0.5px); }

        /* ── empty state ── */
        .um-empty-state {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:4rem 2rem; text-align:center;
        }
        .um-empty-icon {
          width:56px; height:56px; border-radius:14px;
          background:rgba(224, 94, 0, 0.08); border:1px solid rgba(224, 94, 0, 0.15);
          display:flex; align-items:center; justify-content:center; color:#e05e00;
        }
        .um-spinner {
          width:32px; height:32px; border:3px solid rgba(255,255,255,0.06);
          border-top-color:#e05e00; border-radius:50%; animation:umSpin 0.7s linear infinite;
        }

        /* ── modal ── */
        .um-modal .modal-content {
          background: #120a05;
          border: 1px solid rgba(224, 94, 0, 0.25);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 18px; color: #e2e8f0;
          box-shadow: 0 35px 70px -10px rgba(0,0,0,0.9), 0 0 60px rgba(224, 94, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.1);
          font-family: 'Poppins', system-ui, -apple-system, sans-serif;
        }
        .um-modal .modal-header { padding: 1.25rem 1.5rem 0.75rem; }
        .um-modal .btn-close    { filter: invert(1) opacity(0.45); }

        /* ── form inputs ── */
        .um-form-label {
          display:block; font-size:0.72rem; font-weight:700; color:#8c7b70;
          margin-bottom:0.4rem; letter-spacing:0.03em; text-transform:uppercase;
        }
        .um-form-input {
          width:100%; background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.1); border-radius:10px;
          color:#e2e8f0; font-size:0.88rem; padding:0.62rem 1rem;
          outline:none; transition:all 0.25s; font-family:inherit;
          appearance: none;
        }
        .um-form-input:focus     { border-color:#e05e00; box-shadow:0 0 0 3px rgba(224, 94, 0, 0.18); }
        .um-form-input::placeholder { color:#475569; }
        .um-form-input option    { background:#1a0b04; color:#e2e8f0; }

        /* ── permissions section ── */
        .um-perm-section {
          background: rgba(255,255,255,0.018);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 1rem 1.1rem 1.2rem;
        }
        .um-perm-header {
          display:flex; align-items:center; justify-content:space-between;
          margin-bottom: 1rem;
        }
        .um-perm-title {
          font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em;
          color: #a78bfa;
        }
        .um-perm-count {
          font-size: 0.72rem; font-weight: 700; color: #94a3b8;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 0.22rem 0.65rem;
        }
        .um-perm-all {
          font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em;
          border-radius: 6px; padding: 0.25rem 0.65rem; cursor: pointer;
          border: 1px solid; transition: all 0.2s;
        }
        .um-perm-all.on  { background:rgba(74,222,128,0.1); border-color:rgba(74,222,128,0.3); color:#4ade80; }
        .um-perm-all.off { background:rgba(248,113,113,0.1); border-color:rgba(248,113,113,0.3); color:#f87171; }
        .um-perm-all:hover { filter: brightness(1.15); }

        /* ── perm grid ── */
        .um-perm-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.6rem;
        }
        .um-perm-card {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.65rem 0.9rem; border-radius: 10px; cursor: pointer;
          transition: all 0.2s; border: 1px solid;
          user-select: none;
        }
        .um-perm-card.on  {
          background: rgba(224, 94, 0, 0.06);
          border-color: rgba(224, 94, 0, 0.2);
        }
        .um-perm-card.off {
          background: rgba(255,255,255,0.02);
          border-color: rgba(255,255,255,0.06);
        }
        .um-perm-card:hover { transform: translateY(-1px); filter: brightness(1.1); }
        .um-perm-card-icon  {
          display: flex; align-items: center; flex-shrink: 0;
        }
        .um-perm-card.on  .um-perm-card-icon { color: #e05e00; }
        .um-perm-card.off .um-perm-card-icon { color: #475569; }
        .um-perm-card-label {
          flex: 1; font-size: 0.8rem; font-weight: 600;
        }
        .um-perm-card.on  .um-perm-card-label { color: #e2e8f0; }
        .um-perm-card.off .um-perm-card-label { color: #475569; }
        .um-mini-toggle { margin-left: auto; flex-shrink: 0; }

        /* ── custom select dropdown ── */
        .um-custom-select-container {
          min-width: 160px;
          position: relative;
        }
        .um-custom-select-trigger {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: #94a3b8;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 0.5rem 1rem;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }
        .um-custom-select-trigger:hover {
          border-color: rgba(224, 94, 0, 0.4);
          color: #e2e8f0;
        }
        .um-custom-select-trigger.active {
          border-color: #e05e00;
          color: #e2e8f0;
          box-shadow: 0 0 0 3px rgba(224, 94, 0, 0.18);
        }
        .um-custom-select-arrow {
          font-size: 0.6rem;
          margin-left: 0.75rem;
          color: #64748b;
          transition: transform 0.2s;
        }
        .um-custom-select-dropdown {
          position: absolute;
          top: calc(100% + 5px);
          left: 0;
          right: 0;
          background: #1a0b04;
          border: 1px solid rgba(224, 94, 0, 0.25);
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.6);
          z-index: 1050;
          max-height: 200px;
          overflow-y: auto;
          padding: 0.3rem;
        }
        .um-custom-select-option {
          padding: 0.52rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #94a3b8;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
          user-select: none;
          text-align: left;
        }
        .um-custom-select-option:hover {
          background: rgba(224, 94, 0, 0.12);
          color: #e2e8f0;
        }
        .um-custom-select-option.selected {
          background: #e05e00;
          color: #ffffff;
        }

        /* Modal specific overrides for trigger */
        .um-modal .um-custom-select-trigger {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #e2e8f0;
          font-size: 0.88rem;
          font-weight: 500;
          padding: 0.62rem 1rem;
          height: 42px;
        }
        .um-modal .um-custom-select-trigger:hover {
          border-color: rgba(224, 94, 0, 0.4);
        }
        .um-modal .um-custom-select-trigger.active {
          border-color: #e05e00;
          box-shadow: 0 0 0 3px rgba(224, 94, 0, 0.18);
        }
      `}} />
    </div>
  );
};

export default UserManagement;
