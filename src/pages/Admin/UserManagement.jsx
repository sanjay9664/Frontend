import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Modal, Form } from 'react-bootstrap';
import {
  UserPlus, Trash2, Save,
  Search, LayoutDashboard, Droplets, Activity, Database, Bell, Zap,
  ShieldAlert, ClipboardList, PenTool, History, Gauge, User, X,
  CheckCircle, Key, Settings, RefreshCw
} from 'lucide-react';
import { loginToSochiot } from '../../services/authService';

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
};

const buildDefaultConfig = () => {
  const cfg = {};
  Object.keys(moduleDetails).forEach(k => { cfg[k] = true; });
  return cfg;
};

/* ─────────────────────── avatar helper ─────────────────── */
const PALETTE = ['#38bdf8','#818cf8','#34d399','#fb923c','#f472b6','#a78bfa','#2dd4bf','#facc15'];
const getAvatarBg = (name = '') => {
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[h % PALETTE.length];
};

/* ═══════════════════════ COMPONENT ════════════════════════ */
const UserManagement = () => {
  /* ── list state ── */
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [apiError,     setApiError]     = useState(null);
  const [pagination,   setPagination]   = useState({ page:1, pageSize:20, total:0, totalPages:1 });
  const [searchTerm,   setSearchTerm]   = useState('');
  const [saveMsg,      setSaveMsg]      = useState(null);

  /* ── modal / form state ── */
  const [showModal,    setShowModal]    = useState(false);
  const [formData,     setFormData]     = useState({ id:'', name:'', email:'', roleId:'', role:'' });
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
      try { await loginToSochiot('sa@ismartaccess.com', 'I0t3ch'); token = localStorage.getItem('sochiot_token'); }
      catch (e) { console.error('Login failed:', e); }
    }
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let r = await fetch(url, { ...options, headers });
    if (r.status === 401) {
      try { await loginToSochiot('sa@ismartaccess.com', 'I0t3ch'); token = localStorage.getItem('sochiot_token'); }
      catch (e) { console.error('Refresh failed:', e); }
      r = await fetch(url, { ...options, headers: { ...headers, Authorization: `Bearer ${token}` } });
    }
    return r;
  };

  /* ── data fetchers ── */
  const fetchUsers = async (page = 1) => {
    setLoading(true); setApiError(null);
    try {
      const res  = await fetchWithAuth(`http://localhost:3001/api/v1/users/all?page=${page}&pageSize=${pagination.pageSize}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setUsers(json.data.list || []);
        setPagination({ page: json.data.page, pageSize: json.data.pageSize, total: json.data.total, totalPages: json.data.totalPages });
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
      const res  = await fetchWithAuth('http://localhost:3001/api/v1/users/roles');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setRoles(json.data);
    } catch (e) { console.error('Roles fetch failed:', e); }
    finally { setRolesLoading(false); }
  };

  const fetchSites = async () => {
    try {
      const res  = await fetchWithAuth('http://localhost:3001/api/v1/sites/');
      if (res.ok) { const j = await res.json(); setSites(j.data || []); }
    } catch (e) { console.error('Sites fetch failed:', e); }
  };

  useEffect(() => { fetchUsers(1); fetchRoles(); fetchSites(); }, []);

  /* ── open modal ── */
  const openCreateModal = () => {
    setFormData({ id:'', name:'', email:'', roleId:'', role:'' });
    setFormConfig(buildDefaultConfig());
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    const fp = user.featurePermissions || {};
    const cfg = buildDefaultConfig();
    Object.keys(moduleDetails).forEach(k => { if (fp[k] !== undefined) cfg[k] = fp[k] !== false; });
    setFormData({
      id    : user.id,
      name  : user.name  || '',
      email : user.email || '',
      roleId: user.role?.id ? String(user.role.id) : '',
      role  : user.role?.name || '',
    });
    setFormConfig(cfg);
    setSaveError(null);
    setShowModal(true);
  };

  /* ── delete ── */
  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete operator "${name}"?`)) return;
    const siteId = sites.length > 0 ? sites[0].id : 1;
    try {
      const res  = await fetchWithAuth(`http://localhost:3001/api/v1/users/${userId}?siteId=${siteId}`, { method: 'DELETE' });
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
  const handleToggleStatus = async (userId, name, currentStatus) => {
    const newStatus = !currentStatus;
    setUsers(p => p.map(u => u.id === userId ? { ...u, enabled: newStatus } : u));
    const siteId = sites.length > 0 ? sites[0].id : 1;
    try {
      const res  = await fetchWithAuth(`http://localhost:3001/api/v1/users/${userId}`, {
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
      const res  = await fetchWithAuth(`http://localhost:3001/api/v1/users/${userId}/sync`, { method: 'POST' });
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
    Object.keys(moduleDetails).forEach(k => { featurePermissions[k] = formConfig[k] !== false; });
    const siteId  = sites.length > 0 ? sites[0].id : 1;
    const isEdit  = !!formData.id;
    const payload = { name: formData.name.trim(), email: formData.email.trim(), roleId: parseInt(formData.roleId, 10), enabled: true, featurePermissions, siteId };
    try {
      const res  = await fetchWithAuth(
        isEdit ? `http://localhost:3001/api/v1/users/${formData.id}` : 'http://localhost:3001/api/v1/users',
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
    users.filter(u =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

  const enabledCount = Object.keys(moduleDetails).filter(k => formConfig[k] !== false).length;
  const totalMods    = Object.keys(moduleDetails).length;

  /* ═══════════════════════ RENDER ════════════════════════ */
  return (
    <div className="um-wrap">

      {/* ── Page header ── */}
      <div className="um-page-header mb-4">
        <h2 className="um-page-title">Operator Management</h2>
        <p className="um-page-sub">Control access levels, operator accounts and module visibility controls.</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="um-toolbar mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap justify-content-between">
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
                      <th>STATUS</th>
                      <th>SYNCED TO BMS</th>
                      <th className="text-center" style={{ width: '110px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const roleName  = user.role?.name || '—';
                      const roleType  = user.role?.roleType || '';
                      const avatarBg  = getAvatarBg(user.name || '');
                      const initial   = user.name?.charAt(0)?.toUpperCase() || 'U';
                      const isActive  = user.enabled !== false;

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
                                background: roleType === 'SYSTEM' ? 'rgba(251,191,36,0.1)' : roleType === 'INSTALLATION' ? 'rgba(167,139,250,0.1)' : 'rgba(56,189,248,0.1)',
                                border: `1px solid ${roleType === 'SYSTEM' ? 'rgba(251,191,36,0.25)' : roleType === 'INSTALLATION' ? 'rgba(167,139,250,0.25)' : 'rgba(56,189,248,0.25)'}`,
                                color:  roleType === 'SYSTEM' ? '#fbbf24' : roleType === 'INSTALLATION' ? '#c4b5fd' : '#38bdf8',
                              }}>{roleName}</span>
                              {roleType && <span style={{ fontSize:'0.62rem', color:'#475569' }}>{roleType}</span>}
                            </div>
                          </td>

                          {/* STATUS TOGGLE */}
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                onClick={() => handleToggleStatus(user.id, user.name, isActive)}
                                style={{
                                  width:'38px', height:'22px', borderRadius:'11px',
                                  background: isActive ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)',
                                  border: `1.5px solid ${isActive ? '#4ade80' : 'rgba(255,255,255,0.12)'}`,
                                  position:'relative', cursor:'pointer', transition:'all 0.25s',
                                  flexShrink: 0,
                                }}
                              >
                                <div style={{
                                  width:'15px', height:'15px', borderRadius:'50%',
                                  background: isActive ? '#4ade80' : '#64748b',
                                  position:'absolute', top:'2.5px',
                                  left: isActive ? '19px' : '2.5px',
                                  transition:'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                                  boxShadow: isActive ? '0 0 8px rgba(74,222,128,0.6)' : 'none',
                                }} />
                              </div>
                              <span style={{ fontSize:'0.72rem', color: isActive ? '#4ade80' : '#64748b', fontWeight:700, minWidth:'46px' }}>
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
                                  background: user.syncedToBMS ? 'rgba(56,189,248,0.08)' : 'rgba(244,63,94,0.08)',
                                  border: `1px solid ${user.syncedToBMS ? 'rgba(56,189,248,0.22)' : 'rgba(244,63,94,0.22)'}`,
                                  color: user.syncedToBMS ? '#38bdf8' : '#f43f5e',
                                  display:'inline-flex', alignItems:'center', gap:'5px',
                                  fontSize:'0.7rem', fontWeight:700, padding:'0.22rem 0.65rem',
                                  borderRadius:'20px', cursor:'pointer', transition:'all 0.2s', outline:'none',
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
                              <button className="um-action-btn delete" title="Delete" onClick={() => handleDeleteUser(user.id, user.name)}>
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
                          style={{ background: isAct ? 'linear-gradient(135deg,#0ea5e9,#2563eb)' : 'rgba(255,255,255,0.03)',
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
            <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'rgba(56,189,248,0.1)',
              border:'1px solid rgba(56,189,248,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#38bdf8' }}>
              <UserPlus size={20} />
            </div>
            {formData.id ? 'Edit Operator & Permissions' : 'Register New Operator'}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmitUser}>
          <Modal.Body className="pt-2 pb-3" style={{ paddingLeft:'1.5rem', paddingRight:'1.5rem' }}>

            {/* ── Basic Info Row ── */}
            <Row className="g-3 mb-4">
              <Col md={4}>
                <label className="um-form-label">Full Name</label>
                <input type="text" className="um-form-input" placeholder="e.g. Sanjay Gupta"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </Col>
              <Col md={4}>
                <label className="um-form-label">Email Address</label>
                <input type="email" className="um-form-input" placeholder="e.g. sochiot@gmail.com"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </Col>
              <Col md={4}>
                <label className="um-form-label">Role</label>
                <select className="um-form-input" value={formData.roleId || ''}
                  onChange={e => {
                    const sel = roles.find(r => String(r.id) === e.target.value);
                    setFormData({ ...formData, roleId: e.target.value, role: sel?.name || '' });
                  }} required>
                  <option value="" disabled>{rolesLoading ? 'Loading roles...' : '— Select Role —'}</option>
                  {roles.map(r => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name}{r.roleType ? ` (${r.roleType})` : ''}
                    </option>
                  ))}
                </select>
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
                    onClick={() => { const c = { ...formConfig }; Object.keys(moduleDetails).forEach(k => { c[k] = true; }); setFormConfig(c); }}>
                    ALL ON
                  </button>
                  <button type="button" className="um-perm-all off"
                    onClick={() => { const c = { ...formConfig }; Object.keys(moduleDetails).forEach(k => { c[k] = false; }); setFormConfig(c); }}>
                    ALL OFF
                  </button>
                </div>
              </div>

              {/* Grid */}
              <div className="um-perm-grid">
                {Object.entries(moduleDetails).map(([key, mod]) => {
                  const on = formConfig[key] !== false;
                  return (
                    <div key={key} className={`um-perm-card ${on ? 'on' : 'off'}`}
                      onClick={() => setFormConfig({ ...formConfig, [key]: !on })}>
                      <span className="um-perm-card-icon">{mod.icon}</span>
                      <span className="um-perm-card-label">{mod.label}</span>
                      {/* mini toggle */}
                      <div className="um-mini-toggle">
                        <div style={{
                          width:'32px', height:'18px', borderRadius:'9px',
                          background: on ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                          border: `1.5px solid ${on ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)'}`,
                          position:'relative', transition:'all 0.2s',
                        }}>
                          <div style={{
                            width:'12px', height:'12px', borderRadius:'50%',
                            background: on ? '#38bdf8' : '#475569',
                            position:'absolute', top:'2px',
                            left: on ? '16px' : '2px',
                            transition:'all 0.2s',
                            boxShadow: on ? '0 0 6px rgba(56,189,248,0.7)' : 'none',
                          }} />
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

        /* ── page header ── */
        .um-page-header { }
        .um-page-title  { font-size: 1.6rem; font-weight: 800; color: #f1f5f9; margin-bottom: 0.25rem; }
        .um-page-sub    { font-size: 0.82rem; color: #64748b; margin-bottom: 0; }

        /* ── toolbar ── */
        .um-toolbar {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 0.9rem 1.2rem;
        }
        .um-search-box   { position:relative; display:flex; align-items:center; min-width:260px; }
        .um-search-icon  { position:absolute; left:12px; color:#475569; pointer-events:none; }
        .um-search-input {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; color: #e2e8f0; font-size: 0.85rem;
          padding: 0.5rem 1rem 0.5rem 2.2rem; outline: none; transition: all 0.25s; width: 100%; font-family:inherit;
        }
        .um-search-input:focus  { border-color: #38bdf8; box-shadow: 0 0 10px rgba(56,189,248,0.12); }
        .um-search-input::placeholder { color: #475569; }

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
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          border:none; border-radius:25px; color:#fff; font-size:0.8rem; font-weight:800;
          padding:0.58rem 1.3rem; cursor:pointer; transition:all 0.25s; letter-spacing:0.01em;
        }
        .um-btn-primary:hover { filter:brightness(1.12); transform:translateY(-1px); box-shadow:0 6px 20px rgba(14,165,233,0.35); }
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
          background: rgba(15,23,42,0.6) !important;
          border: 1px solid rgba(255,255,255,0.07) !important;
          border-radius: 16px !important; overflow:hidden;
          backdrop-filter: blur(12px);
        }
        .um-table { border-collapse:collapse; }
        .um-table th {
          padding:0.85rem 1.2rem; font-size:0.65rem; font-weight:800; letter-spacing:0.09em;
          text-transform:uppercase; color:#475569;
          background:rgba(255,255,255,0.015);
          border-bottom:1px solid rgba(255,255,255,0.06); white-space:nowrap;
        }
        .um-tr { border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.2s; }
        .um-tr:last-child { border-bottom:none; }
        .um-tr:hover { background:rgba(56,189,248,0.03); }
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
        .um-action-btn.settings { color:#38bdf8; }
        .um-action-btn.settings:hover { background:rgba(56,189,248,0.12); border-color:rgba(56,189,248,0.3); transform:translateY(-1px); }
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
          background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.15);
          display:flex; align-items:center; justify-content:center; color:#38bdf8;
        }
        .um-spinner {
          width:32px; height:32px; border:3px solid rgba(255,255,255,0.06);
          border-top-color:#38bdf8; border-radius:50%; animation:umSpin 0.7s linear infinite;
        }

        /* ── modal ── */
        .um-modal .modal-content {
          background: #070d1e;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 18px; color: #e2e8f0;
        }
        .um-modal .modal-header { padding: 1.25rem 1.5rem 0.75rem; }
        .um-modal .btn-close    { filter: invert(1) opacity(0.45); }

        /* ── form inputs ── */
        .um-form-label {
          display:block; font-size:0.72rem; font-weight:700; color:#64748b;
          margin-bottom:0.4rem; letter-spacing:0.03em; text-transform:uppercase;
        }
        .um-form-input {
          width:100%; background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.1); border-radius:10px;
          color:#e2e8f0; font-size:0.88rem; padding:0.62rem 1rem;
          outline:none; transition:all 0.25s; font-family:inherit;
          appearance: none;
        }
        .um-form-input:focus     { border-color:#38bdf8; box-shadow:0 0 0 3px rgba(56,189,248,0.12); }
        .um-form-input::placeholder { color:#475569; }
        .um-form-input option    { background:#0f172a; color:#e2e8f0; }

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
          background: rgba(56,189,248,0.06);
          border-color: rgba(56,189,248,0.2);
        }
        .um-perm-card.off {
          background: rgba(255,255,255,0.02);
          border-color: rgba(255,255,255,0.06);
        }
        .um-perm-card:hover { transform: translateY(-1px); filter: brightness(1.1); }
        .um-perm-card-icon  {
          display: flex; align-items: center; flex-shrink: 0;
        }
        .um-perm-card.on  .um-perm-card-icon { color: #38bdf8; }
        .um-perm-card.off .um-perm-card-icon { color: #475569; }
        .um-perm-card-label {
          flex: 1; font-size: 0.8rem; font-weight: 600;
        }
        .um-perm-card.on  .um-perm-card-label { color: #e2e8f0; }
        .um-perm-card.off .um-perm-card-label { color: #475569; }
        .um-mini-toggle { margin-left: auto; flex-shrink: 0; }
      `}} />
    </div>
  );
};

export default UserManagement;
