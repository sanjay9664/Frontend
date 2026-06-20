import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Building2, Plus, Search, Edit2, Trash2, Save, X,
  AlertTriangle, CheckCircle2, RefreshCcw,
  Wifi, WifiOff, MapPin, Globe2, Hash, Clock,
  ChevronRight, Check, Loader2, Mail, Phone, User
} from 'lucide-react';
import { getSochiotUserMe } from '../../services/authService';


/* ─── Constants ────────────────────────────────────────── */
const ORG_TYPES  = ['Commercial','Industrial','Residential','Government','Hospital','Educational','Retail','Other'];
const TIMEZONES  = ['Asia/Kolkata','Asia/Dubai','Asia/Singapore','Asia/Tokyo','Europe/London','Europe/Paris','America/New_York','America/Los_Angeles','UTC'];
const INDIA_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh','Other'];

const BMS_SERVICES = [
  { id: 'water_management', label: 'Water Management' },
  { id: 'motors', label: 'Motors' },
  { id: 'dg_set', label: 'DG Set' },
  { id: 'lt_panel', label: 'LT Panel' },
  { id: 'transformer', label: 'Transformer' },
  { id: 'fire_pumps', label: 'Fire Pumps' },
  { id: 'energy_metering', label: 'Energy Metering' },
  { id: 'vrv', label: 'VRV' },
  { id: 'aqi_sensor', label: 'AQI Sensor' },
  { id: 'hvac', label: 'HVAC' },
  { id: 'ac', label: 'AC' }
];

const PALETTE = ['#38bdf8','#818cf8','#34d399','#fb923c','#f472b6','#a78bfa','#2dd4bf','#facc15'];
const avatar  = (name='', idx=0) => ({ bg: PALETTE[idx % PALETTE.length], initials: name.split(/[\s–\-]+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'??' });
const contactAvatar = (name = '') => {
  const initials = name.split(/[\s–\-]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return { bg: PALETTE[hash % PALETTE.length], initials };
};
const fmtDateTime = (d, tz = 'Asia/Kolkata') => {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: tz || 'Asia/Kolkata'
    }).format(new Date(d));
  } catch (e) {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(new Date(d));
  }
};

const getTzAbbrev = (tz) => {
  if (!tz) return 'IST';
  const abbrevs = {
    'Asia/Kolkata': 'IST',
    'Asia/Calcutta': 'IST',
    'Asia/Dubai': 'GST',
    'Asia/Singapore': 'SGT',
    'Asia/Tokyo': 'JST',
    'Europe/London': 'BST',
    'Europe/Paris': 'CET',
    'America/New_York': 'EST',
    'America/Los_Angeles': 'PST',
    'UTC': 'UTC'
  };
  return abbrevs[tz] || tz;
};

const EMPTY = { sochiotLocationId:'', organizationId:'', organizationType:'', name:'', address:'', city:'', state:'', timezone:'Asia/Kolkata', isActive:true, contacts:[], services:[] };

// No demo sites

/* ══════════════════════════════════════════════════════════
   CASCADING LOCATION PICKER
══════════════════════════════════════════════════════════ */
const mapOrgType = (orgType) => {
  if (!orgType) return 'Commercial';
  if (typeof orgType === 'string') return orgType;
  if (typeof orgType === 'object') {
    const val = orgType.displayName || orgType.name || 'Commercial';
    if (val.toUpperCase().includes('COMP')) return 'Commercial';
    if (val.toUpperCase().includes('IND')) return 'Industrial';
    if (val.toUpperCase().includes('RES')) return 'Residential';
    if (val.toUpperCase().includes('GOV')) return 'Government';
    if (val.toUpperCase().includes('HOSP')) return 'Hospital';
    if (val.toUpperCase().includes('EDU')) return 'Educational';
    if (val.toUpperCase().includes('RET')) return 'Retail';
    return val;
  }
  return 'Commercial';
};

const buildAdjacencyTree = (companyList) => {
  const tree = {};

  // 1. Root level: Companies
  tree['root'] = companyList.map(comp => ({
    id: `comp-${comp.id}`,
    name: comp.name,
    hasChildren: true,
    type: 'company'
  }));

  companyList.forEach(comp => {
    const consumers = comp.consumers || comp.customerVOS || comp.clients || [];
    
    // 2. Company level: Consumers/Clients
    tree[`comp-${comp.id}`] = consumers.map(client => ({
      id: `client-${client.id}`,
      name: client.name,
      hasChildren: true,
      type: 'client',
      companyId: comp.id,
      companyName: comp.name
    }));

    consumers.forEach(client => {
      const zones = client.zoneVOS || client.zones || [];
      
      // 3. Client level: Zones
      tree[`client-${client.id}`] = zones.map(zone => ({
        id: `zone-${zone.id}`,
        name: zone.name,
        hasChildren: true,
        type: 'zone',
        companyId: comp.id,
        companyName: comp.name,
        clientId: client.id,
        clientName: client.name
      }));

      zones.forEach(zone => {
        const subZones = zone.subZoneVOS || zone.subZoneVos || zone.subZones || [];
        const directLocations = zone.locationVOS || zone.locationVos || zone.locations || [];

        // Recursive helper to traverse subzones
        const traverseSubZone = (sz, parentKey, pathNames) => {
          const szSubZones = sz.subZoneVOS || sz.subZoneVos || sz.subZones || [];
          const szLocations = sz.locationVOS || sz.locationVos || sz.locations || [];

          const currentPath = [...pathNames, sz.name];

          // Add child subzones under parentKey
          if (szSubZones.length > 0) {
            tree[parentKey] = szSubZones.map(childSz => {
              const childSzLocations = childSz.locationVOS || childSz.locationVos || childSz.locations || [];
              const childSzSubZones = childSz.subZoneVOS || childSz.subZoneVos || childSz.subZones || [];
              
              return {
                id: `subzone-${childSz.id}`,
                name: childSz.name,
                hasChildren: (childSzLocations.length > 0 || childSzSubZones.length > 0),
                type: 'subzone',
                companyId: comp.id,
                clientId: client.id,
                zoneId: zone.id
              };
            });

            // Traverse each child subzone recursively
            szSubZones.forEach(childSz => {
              traverseSubZone(childSz, `subzone-${childSz.id}`, currentPath);
            });
          }

          // Add locations under parentKey
          if (szLocations.length > 0) {
            const mappedLocs = szLocations.map(loc => ({
              id: `loc-${loc.id}`,
              name: loc.name,
              hasChildren: false,
              type: 'location',
              sochiotLocationId: loc.id.toString(),
              organizationId: comp.id.toString(),
              organizationType: comp.name,
              address: [...currentPath, loc.name].join(' / '),
              city: zone.name,
              state: comp.state || 'Uttar Pradesh',
              timezone: 'Asia/Kolkata'
            }));

            if (!tree[parentKey]) {
              tree[parentKey] = [];
            }
            tree[parentKey] = [...tree[parentKey], ...mappedLocs];
          }
        };

        // 4. Zone level: Sub-zones AND direct locations
        const zoneChildren = [];

        subZones.forEach(sz => {
          const szLocations = sz.locationVOS || sz.locationVos || sz.locations || [];
          const szSubZones = sz.subZoneVOS || sz.subZoneVos || sz.subZones || [];

          zoneChildren.push({
            id: `subzone-${sz.id}`,
            name: sz.name,
            hasChildren: (szLocations.length > 0 || szSubZones.length > 0),
            type: 'subzone',
            companyId: comp.id,
            clientId: client.id,
            zoneId: zone.id
          });

          // Begin recursion for this top-level subzone
          traverseSubZone(sz, `subzone-${sz.id}`, [comp.name, client.name, zone.name]);
        });

        directLocations.forEach(loc => {
          zoneChildren.push({
            id: `loc-${loc.id}`,
            name: loc.name,
            hasChildren: false,
            type: 'location',
            sochiotLocationId: loc.id.toString(),
            organizationId: comp.id.toString(),
            organizationType: comp.name,
            address: `${comp.name} / ${client.name} / ${zone.name} / ${loc.name}`,
            city: zone.name,
            state: comp.state || 'Uttar Pradesh',
            timezone: 'Asia/Kolkata'
          });
        });

        tree[`zone-${zone.id}`] = zoneChildren;
      });
    });
  });

  return tree;
};

const CascadingLocationPicker = ({ onSelect }) => {
  const [open,       setOpen]       = useState(false);
  const [columns,    setColumns]    = useState([]);   // [{items, selectedId}]
  const [loading,    setLoading]    = useState(false);
  const [selected,   setSelected]   = useState(null); // final selected node
  const [searchQ,    setSearchQ]    = useState('');
  const [breadcrumb, setBreadcrumb] = useState([]);   // [{id, name}] path
  const [dynamicTree, setDynamicTree] = useState(null);
  const wrapRef = useRef(null);

  /* Fetch root level on open */
  useEffect(() => {
    if (open) {
      if (!dynamicTree) {
        loadDynamicHierarchy();
      } else {
        fetchLevel(null, 0);
      }
    }
  }, [open, dynamicTree]);

  const loadDynamicHierarchy = async () => {
    setLoading(true);
    try {
      let userData = await getSochiotUserMe();
      if (!userData) {
        localStorage.removeItem('sochiot_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return;
      }
      if (userData && userData.userZoneLocationVO?.companyList) {
        const tree = buildAdjacencyTree(userData.userZoneLocationVO.companyList);
        setDynamicTree(tree);
        const rootItems = tree['root'] || [];
        setColumns([{ items: rootItems, selectedId: null }]);
      } else {
        setColumns([{ items: [], selectedId: null }]);
      }
    } catch (err) {
      console.error("Error loading Sochiot hierarchy:", err);
      setColumns([{ items: [], selectedId: null }]);
    } finally {
      setLoading(false);
    }
  };

  /* Close on outside click */
  useEffect(() => {
    const handler = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchLevel = async (parentId, colIndex) => {
    if (dynamicTree) {
      const key = parentId || 'root';
      const items = dynamicTree[key] || [];
      setColumns(prev => {
        const next = prev.slice(0, colIndex);
        next[colIndex] = { items, selectedId: null };
        return next;
      });
    }
  };

  const handleNodeClick = (node, colIndex) => {
    /* Update breadcrumb — keep path up to this column, add current node */
    setBreadcrumb(prev => {
      const next = prev.slice(0, colIndex);
      next.push({ id: node.id, name: node.name });
      return next;
    });

    /* Mark selected in this column, clear deeper columns */
    setColumns(prev => prev.map((col, i) =>
      i === colIndex ? { ...col, selectedId: node.id } : col
    ));

    if (node.hasChildren !== false) {
      /* Load next column */
      fetchLevel(node.id, colIndex + 1);
      setTimeout(() => {
        const colsWrap = wrapRef.current?.querySelector('.clp-cols-wrap');
        if (colsWrap) {
          colsWrap.scrollTo({ left: colsWrap.scrollWidth, behavior: 'smooth' });
        }
      }, 100);
    } else {
      /* Leaf node → autofill */
      const filled = {
        sochiotLocationId : node.sochiotLocationId || node.id || '',
        organizationId    : node.organizationId    || '',
        organizationType  : node.organizationType  || '',
        name              : node.name              || '',
        address           : node.address           || '',
        city              : node.city              || '',
        state             : node.state             || '',
        timezone          : node.timezone          || 'Asia/Kolkata',
        isActive          : node.isActive !== undefined ? node.isActive : true
      };
      setSelected(node);
      onSelect(filled);
      setTimeout(() => setOpen(false), 180);
    }
  };

  /* Filter first column by search */
  const firstColFiltered = columns[0]?.items?.filter(n =>
    !searchQ || n.name?.toLowerCase().includes(searchQ.toLowerCase())
  ) || [];

  return (
    <div className="clp-wrap" ref={wrapRef}>
      {/* Trigger button */}
      <button type="button" className="clp-trigger" onClick={() => setOpen(o => !o)}>
        <MapPin size={14} className="clp-trigger-ico"/>
        <span className={selected ? 'clp-trigger-val' : 'clp-trigger-ph'}>
          {selected ? selected.name : 'Please select a location...'}
        </span>
        {selected && (
          <button type="button" className="clp-clear" onClick={e => { e.stopPropagation(); setSelected(null); onSelect(null); }}>
            <X size={13}/>
          </button>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="clp-dropdown">
          {/* Breadcrumb path */}
          <div className="clp-breadcrumb">
            <MapPin size={11} className="clp-bc-ico"/>
            {breadcrumb.length === 0 ? (
              <span className="clp-bc-ph">Select from the columns below</span>
            ) : (
              breadcrumb.map((crumb, i) => (
                <React.Fragment key={crumb.id}>
                  {i > 0 && <span className="clp-bc-sep">/</span>}
                  <span className="clp-bc-item">{crumb.name}</span>
                </React.Fragment>
              ))
            )}
          </div>

          {/* Search bar */}
          <div className="clp-search-row">
            <Search size={13} className="clp-s-ico"/>
            <input className="clp-s-inp" placeholder="Search location..." autoFocus
              value={searchQ} onChange={e => setSearchQ(e.target.value)}/>
            {searchQ && <button type="button" className="clp-s-clr" onClick={()=>setSearchQ('')}><X size={12}/></button>}
          </div>

          {/* Columns */}
          <div className="clp-cols-wrap">
            {loading && columns.length === 0 ? (
              <div className="clp-loading"><Loader2 size={20} className="clp-spinner"/><span>Loading locations...</span></div>
            ) : (
              columns.map((col, colIdx) => {
                const LEVEL_LABELS = ['Organisation','App / Zone','City / Area','Sub-Area','Location'];
                const label = LEVEL_LABELS[colIdx] || `Level ${colIdx + 1}`;
                const items = colIdx === 0 ? firstColFiltered : col.items;
                return (
                  <div key={colIdx} className="clp-col">
                    <div className="clp-col-hd">{label}</div>
                    {items.map(node => (
                      <button
                        type="button"
                        key={node.id}
                        className={`clp-item ${col.selectedId === node.id ? 'clp-item-active' : ''}`}
                        onClick={() => handleNodeClick(node, colIdx)}
                      >
                        <span className="clp-item-name" title={node.name}>{node.name}</span>
                        {node.hasChildren !== false
                          ? <ChevronRight size={13} className="clp-item-arrow"/>
                          : col.selectedId === node.id
                            ? <Check size={13} className="clp-item-check"/>
                            : <span className="clp-item-dot"/>
                        }
                      </button>
                    ))}
                    {colIdx === 0 && items.length === 0 && (
                      <div className="clp-no-results">No locations found</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
const SiteManagement = () => {
  const userRole = localStorage.getItem('userRole') || 'USER';
  if (userRole !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;

  const [sites,         setSites]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchTerm,    setSearchTerm]    = useState('');
  const [showModal,     setShowModal]     = useState(false);
  const [editingSite,   setEditingSite]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState(null);
  const [form,          setForm]          = useState(EMPTY);

  // Sorting and Pagination State
  const [sortField,     setSortField]     = useState('name');
  const [sortOrder,     setSortOrder]     = useState('asc');
  const [currentPage,   setCurrentPage]   = useState(1);
  const [itemsPerPage]                    = useState(5);

  // Contacts Popover State
  const [activePopoverSite, setActivePopoverSite] = useState(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });

  // Close popover when clicking outside
  useEffect(() => {
    if (!activePopoverSite) return;
    const handleOutsideClick = (e) => {
      if (e.target.closest('.sm2-view-all-link') || e.target.closest('.sm2-portal-popover')) {
        return;
      }
      setActivePopoverSite(null);
    };
    document.addEventListener('click', handleOutsideClick, true);
    return () => document.removeEventListener('click', handleOutsideClick, true);
  }, [activePopoverSite]);

  // Close popover when scrolling or resizing
  useEffect(() => {
    if (!activePopoverSite) return;
    const handleScrollOrResize = () => {
      setActivePopoverSite(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activePopoverSite]);

  // Reset page to 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handle Header Click to toggle Sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Render sorting arrow helpers next to table headers
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <span style={{ marginLeft: '4px', opacity: 0.35, fontSize: '0.7rem', display: 'inline-block' }}>↕</span>;
    }
    return sortOrder === 'asc' 
      ? <span style={{ marginLeft: '4px', color: 'var(--scada-accent)', fontSize: '0.7rem', display: 'inline-block' }}>▲</span>
      : <span style={{ marginLeft: '4px', color: 'var(--scada-accent)', fontSize: '0.7rem', display: 'inline-block' }}>▼</span>;
  };

  /* ── Auth Fetch Helper ───────────────────────────── */
  const fetchWithAuth = async (url, options = {}) => {
    let token = localStorage.getItem('sochiot_token');
    if (!token) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    let r = await fetch(url, { ...options, headers });
    if (r.status === 401) {
      localStorage.removeItem('sochiot_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return r;
  };

  /* ── Fetch ────────────────────────────────────────── */
  const fetchSites = async () => {
    setLoading(true);
    try {
      const r = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/`);
      if (r.ok) {
        const json = await r.json();
        const d = json.data;
        setSites(Array.isArray(d) ? d : []);
      } else {
        setSites([]);
      }
    } catch {
      setSites([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchSites(); }, []);

  /* ── Helpers ─────────────────────────────────────── */
  const showToast = (type, text) => { setToast({type,text}); setTimeout(()=>setToast(null),3200); };
  const setF      = (k, v)       => setForm(p => ({ ...p, [k]: v }));
  const openCreate = () => { setEditingSite(null); setForm(EMPTY); setShowModal(true); };
  const openEdit   = s  => {
    let contacts = [];
    if (s.contacts && s.contacts.length > 0) {
      contacts = s.contacts;
    } else if (s.email || s.phone) {
      const emails = s.email ? s.email.split(',').map(x => x.trim()) : [];
      const phones = s.phone ? s.phone.split(',').map(x => x.trim()) : [];
      const maxLength = Math.max(emails.length, phones.length);
      for (let i = 0; i < maxLength; i++) {
        contacts.push({
          email: emails[i] || '',
          phone: phones[i] || ''
        });
      }
    }
    // Extract selected service keys from featurePermissions (value === true)
    const featurePerms = s.featurePermissions || s.feature_permissions || [];
    const selectedServices = Array.isArray(featurePerms)
      ? featurePerms.filter(fp => fp.value === true).map(fp => fp.name)
      : [];
    setEditingSite(s);
    setForm({...EMPTY, ...s, contacts, services: selectedServices});
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false);  setEditingSite(null); setForm(EMPTY); };

  const handleViewAllClick = (e, site) => {
    e.stopPropagation();
    if (activePopoverSite && activePopoverSite.id === site.id) {
      setActivePopoverSite(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const popoverWidth = 260;
    const top = rect.top + window.scrollY;
    const left = rect.left + window.scrollX;
    
    let calculatedLeft = left + rect.width / 2 - popoverWidth / 2;
    if (calculatedLeft < 10) calculatedLeft = 10;
    if (calculatedLeft + popoverWidth > window.innerWidth - 10) {
      calculatedLeft = window.innerWidth - popoverWidth - 10;
    }
    
    setPopoverCoords({
      top: top - 8,
      left: calculatedLeft
    });
    setActivePopoverSite(site);
  };

  /* When location is selected from picker → autofill */
  const handleLocationSelect = (filled) => {
    if (!filled) { setForm(EMPTY); return; }
    setForm(prev => ({ ...prev, ...filled }));
  };

  /* ── Save ─────────────────────────────────────────── */
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const activeContacts = (form.contacts || []).filter(c => c.email?.trim() || c.phone?.trim());
    const selectedServices = form.services || [];
    // Convert selected service ids into featurePermissions [{name, value}] for all BMS services
    const featurePermissions = BMS_SERVICES.map(srv => ({
      name : srv.id,
      value: selectedServices.includes(srv.id)
    }));
    const payload = {
      sochiotLocationId : parseInt(form.sochiotLocationId, 10) || 0,
      organizationId    : parseInt(form.organizationId, 10) || 0,
      organizationType  : form.organizationType,
      name              : form.name,
      address           : form.address,
      city              : form.city,
      state             : form.state,
      timezone          : form.timezone,
      isActive          : form.isActive,
      contacts          : activeContacts,
      email             : activeContacts.map(c => c.email).filter(Boolean).join(', ') || null,
      phone             : activeContacts.map(c => c.phone).filter(Boolean).join(', ') || null,
      featurePermissions
    };
    try {
      const method = editingSite ? 'PATCH' : 'POST';
      const url    = editingSite ? `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${editingSite.id}` : `${import.meta.env.VITE_BACKEND_BMS_URL}/sites/`;
      const r = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        const json = await r.json();
        const savedSite = json.data;
        if (editingSite) {
          setSites(p => p.map(s => s.id === editingSite.id ? savedSite : s));
          showToast('success', `Site "${form.name}" updated successfully`);
        } else {
          setSites(p => [...p, savedSite]);
          showToast('success', `Site "${form.name}" created successfully`);
        }
        closeModal();
      } else {
        const errText = await r.text();
        console.error('Save failed:', errText);
        showToast('danger', `Failed to save site: ${errText || r.statusText}`);
      }
    } catch (err) {
      console.error(err);
      showToast('danger', 'Error connecting to local sites server.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ──────────────────────────────────────── */
  const handleDelete = async (site) => {
    try {
      const r = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${site.id}`, {
        method: 'DELETE'
      });
      if (r.ok) {
        setSites(p => p.filter(s => s.id !== site.id));
        showToast('success', `Site "${site.name}" deleted`);
      } else {
        const errText = await r.text();
        console.error('Delete failed:', errText);
        showToast('danger', `Failed to delete site: ${errText || r.statusText}`);
      }
    } catch (err) {
      console.error(err);
      showToast('danger', 'Error connecting to local sites server.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  /* ── Toggle Active ────────────────────────────────── */
  const handleToggleActive = async (site) => {
    try {
      const payload = {
        isActive: !site.isActive
      };
      const r = await fetchWithAuth(`${import.meta.env.VITE_BACKEND_BMS_URL}/sites/${site.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        const json = await r.json();
        const savedSite = json.data;
        setSites(p => p.map(s => s.id === site.id ? savedSite : s));
        showToast('success', `Site "${site.name}" status updated to ${savedSite.isActive ? 'Active' : 'Inactive'}`);
      } else {
        const errText = await r.text();
        console.error('Toggle status failed:', errText);
        showToast('danger', `Failed to toggle status: ${errText || r.statusText}`);
      }
    } catch (err) {
      console.error(err);
      showToast('danger', 'Error connecting to local sites server.');
    }
  };

  const filtered = sites.filter(s => 
    [s.name, s.city, s.state, s.organizationType, s.sochiotLocationId?.toString(), s.organizationId?.toString()]
      .some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const activeCount = sites.filter(s => s.isActive).length;

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal, bVal;
    if (sortField === 'name') {
      aVal = a.name || '';
      bVal = b.name || '';
    } else if (sortField === 'address') {
      aVal = [a.address, a.city, a.state].filter(Boolean).join(', ') || '';
      bVal = [b.address, b.city, b.state].filter(Boolean).join(', ') || '';
    } else if (sortField === 'sochiotLocationId') {
      aVal = a.sochiotLocationId || 0;
      bVal = b.sochiotLocationId || 0;
    } else if (sortField === 'organizationType') {
      aVal = a.organizationType || '';
      bVal = b.organizationType || '';
    } else if (sortField === 'contacts') {
      aVal = a.contacts?.length || 0;
      bVal = b.contacts?.length || 0;
    } else if (sortField === 'createdAt') {
      aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    } else {
      aVal = a[sortField] || '';
      bVal = b[sortField] || '';
    }

    if (typeof aVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else {
      return sortOrder === 'asc' 
        ? (aVal > bVal ? 1 : -1) 
        : (bVal > aVal ? 1 : -1);
    }
  });

  // Pagination
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedSites = sorted.slice(startIndex, startIndex + itemsPerPage);

  /* ── Render ──────────────────────────────────────── */
  return (
    <div className="sm2-wrap fade-in">

      {/* Redesigned Header to match screenshot */}
      <div className="sm2-page-header">
        <div className="sm2-hd-left">
          <div>
            <h2 className="sm2-hd-title" style={{ fontSize: '1.85rem', fontWeight: 800 }}>Sites</h2>
            <p className="sm2-hd-sub" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Manage all your sites, locations and organization details.</p>
          </div>
        </div>
        <div className="sm2-hd-right">
          <button className="sm2-primary-btn" onClick={openCreate}>
            <Plus size={15} strokeWidth={2.5}/> Add New Site
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className={`sm2-toast sm2-toast-${toast.type}`}><CheckCircle2 size={14}/> {toast.text}</div>}

      {/* Table Card */}
      <div className="sm2-card">
        <div className="sm2-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
          <div className="sm2-search">
            <Search size={14} className="sm2-srch-ico"/>
            <input className="sm2-srch-inp" placeholder="Search name, city, org type, location ID..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
            {searchTerm && <button className="sm2-srch-clr" onClick={()=>setSearchTerm('')}><X size={13}/></button>}
          </div>
          <span className="sm2-count" style={{ display: 'inline-block' }}>{filtered.length} site{filtered.length!==1?'s':''}</span>
        </div>

        {loading ? (
          <div className="sm2-center" style={{minHeight:260}}><div className="sm2-spinner"/><span className="sm2-txt-muted">Loading sites...</span></div>
        ) : filtered.length === 0 ? (
          <div className="sm2-center" style={{minHeight:260}}>
            <Building2 size={40} className="sm2-empty-ico"/>
            <p className="sm2-txt-muted">{searchTerm?'No sites match your search':'No sites yet — click Add New Site to get started'}</p>
            {!searchTerm && <button className="sm2-primary-btn" onClick={openCreate}><Plus size={15}/> Add New Site</button>}
          </div>
        ) : (
          <div className="sm2-table-wrap">
            <table className="sm2-table">
              <thead>
                <tr>
                  <th className="sm2-th" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('name')}>
                    Site Details {renderSortIcon('name')}
                  </th>
                  <th className="sm2-th" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('address')}>
                    Location & Created {renderSortIcon('address')}
                  </th>
                  <th className="sm2-th sm2-th-contacts" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('contacts')}>
                    Contacts {renderSortIcon('contacts')}
                  </th>
                  <th className="sm2-th sm2-th-services">
                    BMS Services
                  </th>
                  <th className="sm2-th sm2-th-center sm2-th-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSites.map((site, i) => {
                  const av = avatar(site.name, i);
                  return (
                    <tr key={site.id} className="sm2-tr">
                      {/* SITE DETAILS column (Name, Org Type, Loc/Org IDs) */}
                      <td className="sm2-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div className="sm2-av" style={{ background: `${av.bg}22`, color: av.bg, border: `1.5px solid ${av.bg}44` }}>
                            {av.initials}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span className="sm2-site-name" style={{ fontWeight: 700 }}>{site.name}</span>
                              <span 
                                style={{ 
                                  width: '6px', 
                                  height: '6px', 
                                  borderRadius: '50%', 
                                  backgroundColor: site.isActive ? '#22c55e' : '#64748b',
                                  display: 'inline-block',
                                  boxShadow: site.isActive ? '0 0 6px #22c55e' : 'none'
                                }}
                                title={site.isActive ? "Active" : "Inactive"}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {site.organizationType && (
                                <span style={{ fontSize: '0.68rem', background: 'rgba(129, 140, 248, 0.08)', color: '#a5b4fc', border: '1px solid rgba(129, 140, 248, 0.15)', borderRadius: '4px', padding: '0.1rem 0.4rem', whiteSpace: 'nowrap' }}>
                                  {site.organizationType}
                                </span>
                              )}
                              {site.sochiotLocationId && (
                                <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.08)', color: 'var(--scada-accent)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: '4px', padding: '0.1rem 0.4rem', whiteSpace: 'nowrap' }}>
                                  L:{site.sochiotLocationId}
                                </span>
                              )}
                              {site.organizationId && (
                                <span style={{ fontSize: '0.68rem', background: 'rgba(167, 139, 250, 0.08)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.15)', borderRadius: '4px', padding: '0.1rem 0.4rem', whiteSpace: 'nowrap' }}>
                                  O:{site.organizationId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* LOCATION & CREATED TIME column */}
                      <td className="sm2-td">
                        <div className="sm2-addr-row" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <MapPin size={14} style={{ color: 'var(--scada-accent)', flexShrink: 0 }} />
                          <span className="sm2-addr-txt" style={{ fontSize: '0.83rem', color: 'var(--scada-text-muted)' }}>
                            {[site.address, site.city, site.state].filter(Boolean).join(', ') || '—'}
                          </span>
                        </div>
                        <div className="sm2-tz-row" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '4px' }}>
                          <Clock size={13} style={{ color: 'var(--scada-text-muted)', flexShrink: 0 }}/>
                          <span style={{ fontSize: '0.72rem', color: 'var(--scada-text-muted)', whiteSpace: 'nowrap' }}>
                            {fmtDateTime(site.createdAt, site.timezone)} {getTzAbbrev(site.timezone)}
                          </span>
                        </div>
                      </td>

                      {/* CONTACTS column */}
                      <td className="sm2-td sm2-td-contacts" style={{ position: 'relative' }}>
                        <div className="sm2-contacts-column-cell" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', position: 'relative', width: '40px', height: '24px', flexShrink: 0 }}>
                            {site.contacts && site.contacts.length > 0 ? (
                              site.contacts.slice(0, 2).map((c, cIdx) => {
                                const cAv = contactAvatar(c.name || 'Contact');
                                return (
                                  <div 
                                    key={cIdx} 
                                    style={{ 
                                      background: cAv.bg, 
                                      color: '#0f172a', 
                                      border: '1.5px solid var(--scada-card)', 
                                      borderRadius: '50%',
                                      width: '24px',
                                      height: '24px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.64rem',
                                      fontWeight: 800,
                                      position: 'absolute',
                                      left: cIdx * 14,
                                      zIndex: 10 - cIdx,
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                    title={c.name}
                                  >
                                    {cAv.initials}
                                  </div>
                                );
                              })
                            ) : (site.email || site.phone) ? (
                              <div 
                                style={{ 
                                  background: 'rgba(255,255,255,0.05)', 
                                  color: 'var(--scada-text-muted)', 
                                  border: '1.5px solid var(--scada-card)', 
                                  borderRadius: '50%',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 700
                                }}
                              >
                                ?
                              </div>
                            ) : (
                              <div 
                                style={{ 
                                  background: 'rgba(255,255,255,0.02)', 
                                  color: 'var(--scada-text-muted)', 
                                  border: '1px solid var(--scada-border)', 
                                  borderRadius: '50%',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 700
                                }}
                              >
                                —
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--scada-text)', whiteSpace: 'nowrap' }}>
                              {site.contacts && site.contacts.length > 0 
                                ? `${site.contacts.length} Contact${site.contacts.length > 1 ? 's' : ''}`
                                : (site.email || site.phone) ? '1 Contact' : 'No Contacts'}
                            </div>
                            {((site.contacts && site.contacts.length > 0) || site.email || site.phone) && (
                              <button 
                                onClick={(e) => handleViewAllClick(e, site)}
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  color: 'var(--scada-accent)', 
                                  fontSize: '0.72rem', 
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: 0,
                                  marginTop: '2px',
                                  textAlign: 'left',
                                  display: 'block'
                                }}
                                className="sm2-view-all-link"
                              >
                                View all
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* BMS SERVICES column */}
                      <td className="sm2-td sm2-td-services">
                        <div className="sm2-services-wrap">
                          {(() => {
                            // Support both featurePermissions (new) and services (legacy)
                            const fp = site.featurePermissions || site.feature_permissions;
                            const activeIds = Array.isArray(fp)
                              ? fp.filter(p => p.value === true).map(p => p.name)
                              : (Array.isArray(site.services) ? site.services : []);
                            if (activeIds.length === 0) {
                              return <span style={{ color: 'var(--scada-text-muted)', fontSize: '0.75rem' }}>None</span>;
                            }
                            return activeIds.map(srvId => {
                              const srv = BMS_SERVICES.find(s => s.id === srvId);
                              return (
                                <span
                                  key={srvId}
                                  style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    background: 'rgba(52, 211, 153, 0.08)',
                                    color: '#34d399',
                                    border: '1px solid rgba(52, 211, 153, 0.18)',
                                    borderRadius: '4px',
                                    padding: '0.15rem 0.4rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {srv ? srv.label : srvId}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </td>

                      {/* ACTION column */}
                      <td className="sm2-td sm2-td-center sm2-td-action">
                        <div className="sm2-acts">
                          <label className="sm2-switch" title={site.isActive ? "Deactivate Site" : "Activate Site"}>
                            <input 
                              type="checkbox" 
                              checked={site.isActive} 
                              onChange={() => handleToggleActive(site)} 
                            />
                            <span className="sm2-slider round"></span>
                          </label>
                          <div className="sm2-divider-v" />
                          <button className="sm2-act sm2-act-edit" title="Edit"   onClick={()=>openEdit(site)}><Edit2 size={14}/></button>
                          <button className="sm2-act sm2-act-del"  title="Delete" onClick={()=>setDeleteConfirm(site)}><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Dynamic Pagination Footer matching design */}
        {!loading && sorted.length > 0 && (
          <div className="sm2-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--scada-border)', background: 'rgba(15, 23, 42, 0.15)' }}>
            <div className="sm2-footer-left" style={{ fontSize: '0.8rem', color: 'var(--scada-text-muted)' }}>
              Showing <strong>{startIndex + 1}–{Math.min(startIndex + itemsPerPage, sorted.length)}</strong> of <strong>{sorted.length}</strong> sites &nbsp;·&nbsp; <span style={{ color: '#4ade80', fontWeight: 600 }}>{activeCount} active</span>
            </div>
            
            <div className="sm2-pagination" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={activePage === 1}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--scada-border)',
                  color: activePage === 1 ? 'var(--scada-text-muted)' : 'var(--scada-text)',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  opacity: activePage === 1 ? 0.4 : 1,
                  transition: 'all 0.2s'
                }}
              >
                &lt;
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const isActive = pageNum === activePage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      background: isActive ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : 'rgba(255,255,255,0.03)',
                      border: isActive ? 'none' : '1px solid var(--scada-border)',
                      color: '#fff',
                      borderRadius: '6px',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={activePage === totalPages}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--scada-border)',
                  color: activePage === totalPages ? 'var(--scada-text-muted)' : 'var(--scada-text)',
                  borderRadius: '6px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: activePage === totalPages ? 0.4 : 1,
                  transition: 'all 0.2s'
                }}
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Create / Edit Modal ═══ */}
      {showModal && (
        <div className="sm2-overlay" onClick={closeModal}>
          <div className="sm2-modal" onClick={e=>e.stopPropagation()}>

            <div className="sm2-mhd">
              <div className="d-flex align-items-center gap-3">
                <div className="sm2-m-icon">{editingSite?<Edit2 size={18}/>:<Plus size={18}/>}</div>
                <div>
                  <h5 className="sm2-m-title">{editingSite?'Edit Site':'Add New Site'}</h5>
                  <p className="sm2-m-sub">{editingSite?editingSite.name:'Select a location to auto-fill details'}</p>
                </div>
              </div>
              <button className="sm2-m-close" onClick={closeModal}><X size={18}/></button>
            </div>

            <form onSubmit={handleSave}>
              <div className="sm2-m-body">

                {/* ── Location Picker (only for new site) ── */}
                {!editingSite && (
                  <div className="sm2-loc-section">
                    <div className="sm2-section-label"><MapPin size={13}/> Location</div>
                    <CascadingLocationPicker onSelect={handleLocationSelect}/>
                    <p className="sm2-loc-hint">Select a location from the hierarchy — fields below will auto-fill</p>
                  </div>
                )}

                {/* ── Site Info ── */}
                <div className="sm2-section-label" style={{marginTop: editingSite ? 0 : '1.25rem'}}><Building2 size={13}/> Site Details</div>
                <div className="sm2-fgrid">
                  <div className="sm2-fg sm2-col2">
                    <label className="sm2-lbl">Site Name <span className="sm2-req">*</span></label>
                    <input className="sm2-inp" placeholder="e.g. Site Alpha – Tower A"
                      value={form.name} onChange={e=>setF('name',e.target.value)} required/>
                  </div>
                  <div className="sm2-fg">
                    <label className="sm2-lbl">Sochiot Location ID</label>
                    <input className="sm2-inp" placeholder="Auto-filled from location" value={form.sochiotLocationId} onChange={e=>setF('sochiotLocationId',e.target.value)}/>
                  </div>
                  <div className="sm2-fg">
                    <label className="sm2-lbl">Organization ID</label>
                    <input className="sm2-inp" placeholder="Auto-filled from location" value={form.organizationId} onChange={e=>setF('organizationId',e.target.value)}/>
                  </div>
                  <div className="sm2-fg">
                    <label className="sm2-lbl">Organization Type</label>
                    <input className="sm2-inp" placeholder="Auto-filled · editable" value={form.organizationType} onChange={e=>setF('organizationType',e.target.value)}/>
                  </div>
                  <div className="sm2-fg">
                    <label className="sm2-lbl">Status</label>
                    <select className="sm2-inp sm2-sel" value={form.isActive?'true':'false'} onChange={e=>setF('isActive',e.target.value==='true')}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                  <div className="sm2-fg sm2-col2">
                    <label className="sm2-lbl">Address</label>
                    <input className="sm2-inp" placeholder="Auto-filled · editable" value={form.address} onChange={e=>setF('address',e.target.value)}/>
                  </div>
                  <div className="sm2-fg">
                    <label className="sm2-lbl">City</label>
                    <input className="sm2-inp" placeholder="Auto-filled · editable" value={form.city} onChange={e=>setF('city',e.target.value)}/>
                  </div>
                  <div className="sm2-fg">
                    <label className="sm2-lbl">State</label>
                    <select className="sm2-inp sm2-sel" value={form.state} onChange={e=>setF('state',e.target.value)}>
                      <option value="">— Select State —</option>
                      {INDIA_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="sm2-fg sm2-col2">
                    <label className="sm2-lbl">Timezone</label>
                    <select className="sm2-inp sm2-sel" value={form.timezone} onChange={e=>setF('timezone',e.target.value)}>
                      {TIMEZONES.map(tz=><option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                </div>

                {/* ── Contacts Section ── */}
                <div className="sm2-section-label" style={{marginTop: '1.5rem'}}><Building2 size={13}/> Contact Person(s)</div>
                <div className="sm2-contacts-list">
                  {(form.contacts || []).map((contact, idx) => (
                    <div key={idx} className="sm2-contact-row">
                      <div className="sm2-fg">
                        <label className="sm2-lbl">Contact Name</label>
                        <input 
                          type="text" 
                          className="sm2-inp" 
                          placeholder="e.g. John Doe" 
                          value={contact.name || ''} 
                          onChange={e => {
                            const newContacts = [...(form.contacts || [])];
                            newContacts[idx] = { ...newContacts[idx], name: e.target.value };
                            setF('contacts', newContacts);
                          }}
                        />
                      </div>
                      <div className="sm2-fg">
                        <label className="sm2-lbl">Email Address</label>
                        <input 
                          type="email" 
                          className="sm2-inp" 
                          placeholder="e.g. manager@site.com" 
                          value={contact.email || ''} 
                          onChange={e => {
                            const newContacts = [...(form.contacts || [])];
                            newContacts[idx] = { ...newContacts[idx], email: e.target.value };
                            setF('contacts', newContacts);
                          }}
                        />
                      </div>
                      <div className="sm2-fg">
                        <label className="sm2-lbl">Phone / Mobile</label>
                        <input 
                          type="text" 
                          className="sm2-inp" 
                          placeholder="e.g. +91 98765 43210" 
                          value={contact.phone || ''} 
                          onChange={e => {
                            const newContacts = [...(form.contacts || [])];
                            newContacts[idx] = { ...newContacts[idx], phone: e.target.value };
                            setF('contacts', newContacts);
                          }}
                        />
                      </div>
                      <button 
                        type="button" 
                        className="sm2-contact-remove" 
                        onClick={() => {
                          const newContacts = (form.contacts || []).filter((_, i) => i !== idx);
                          setF('contacts', newContacts);
                        }}
                        title="Remove Contact"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="sm2-btn-ghost sm2-add-contact-btn" 
                    onClick={() => {
                      const newContacts = [...(form.contacts || []), { name: '', email: '', phone: '' }];
                      setF('contacts', newContacts);
                    }}
                  >
                    <Plus size={14}/> Add Contact
                  </button>
                </div>

                {/* ── BMS Services Section ── */}
                <div className="sm2-section-label" style={{marginTop: '1.5rem'}}><Plus size={13}/> BMS Services</div>
                <div className="sm2-services-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '0.6rem',
                  marginTop: '0.5rem',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  padding: '1rem'
                }}>
                  {BMS_SERVICES.map(service => {
                    const isSelected = (form.services || []).includes(service.id);
                    return (
                      <div
                        key={service.id}
                        onClick={() => {
                          const current = form.services || [];
                          const next = isSelected 
                            ? current.filter(s => s !== service.id) 
                            : [...current, service.id];
                          setF('services', next);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid rgba(56,189,248,0.25)' : '1px solid rgba(255,255,255,0.04)',
                          background: isSelected ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.01)',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.2s'
                        }}
                        className="sm2-service-item"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          style={{ pointerEvents: 'none', accentColor: 'var(--scada-accent)' }}
                        />
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: isSelected ? 'var(--scada-accent)' : '#94a3b8'
                        }}>{service.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sm2-m-footer">
                <button type="button" className="sm2-btn-ghost" onClick={closeModal}>
                  <X size={14}/> Cancel
                </button>
                <button type="submit" className="sm2-btn-primary" disabled={saving}>
                  {saving ? (
                    <><span className="sm2-spin-sm"/> Saving...</>
                  ) : (
                    <><Save size={14}/> {editingSite ? 'Save Changes' : 'Create Site'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Delete Confirmation Modal ═══ */}
      {deleteConfirm && (
        <div className="sm2-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="sm2-modal sm2-del-modal" onClick={e => e.stopPropagation()}>
            <div className="sm2-del-wrap">
              <div className="sm2-del-icon">
                <AlertTriangle size={32}/>
              </div>
              <h5 className="sm2-m-title" style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: '.75rem' }}>
                Delete Site?
              </h5>
              <p className="sm2-del-msg">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? <br/>
                This action is permanent and will delete all associated data.
              </p>
              <div className="sm2-del-btns">
                <button type="button" className="sm2-btn-ghost" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button type="button" className="sm2-btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ═══ Contacts Details Popover (React Portal) ═══ */}
      {activePopoverSite && createPortal(
        <div 
          className="sm2-portal-popover"
          style={{
            position: 'absolute',
            top: `${popoverCoords.top}px`,
            left: `${popoverCoords.left}px`,
            width: '260px',
            transform: 'translateY(-100%)',
            zIndex: 99999,
            background: 'rgba(13, 19, 36, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.1)',
            padding: '12px 14px',
            color: '#fff',
            animation: 'popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            transformOrigin: 'bottom center',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--scada-accent)' }}>
              Contacts
            </span>
            <button 
              onClick={() => setActivePopoverSite(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--scada-text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={12} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {(() => {
              const displayContacts = activePopoverSite.contacts && activePopoverSite.contacts.length > 0
                ? activePopoverSite.contacts
                : (activePopoverSite.email || activePopoverSite.phone)
                  ? [{ email: activePopoverSite.email, phone: activePopoverSite.phone }]
                  : [];
                  
              if (displayContacts.length === 0) {
                return (
                  <div style={{ fontSize: '0.78rem', color: 'var(--scada-text-muted)', textAlign: 'center', padding: '8px 0' }}>
                    No contact details.
                  </div>
                );
              }
              
              return displayContacts.map((c, cIdx) => (
                <div 
                  key={cIdx} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '6px', 
                    paddingBottom: cIdx < displayContacts.length - 1 ? '10px' : '0',
                    borderBottom: cIdx < displayContacts.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
                  }}
                >
                  {c.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--scada-text)' }}>
                      <User size={12} style={{ color: '#818cf8', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    </div>
                  )}
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--scada-text-muted)' }}>
                      <Mail size={13} style={{ color: '#38bdf8', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--scada-text-muted)' }}>
                      <Phone size={13} style={{ color: '#34d399', flexShrink: 0 }} />
                      <span>{c.phone}</span>
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* CSS Stylesheet */}
      <style>{`
        /* ── Base ── */
        .sm2-wrap { 
          padding: .5rem 0; 
          color: var(--scada-text); 
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        /* ── Switch Toggle ── */
        .sm2-switch {
          position: relative;
          display: inline-block;
          width: 38px;
          height: 20px;
          margin: 0;
        }
        .sm2-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .sm2-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: rgba(148, 163, 184, 0.15);
          border: 1px solid var(--scada-border);
          transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 20px;
        }
        .sm2-slider:before {
          position: absolute;
          content: "";
          height: 14px;
          width: 14px;
          left: 2px;
          bottom: 2px;
          background-color: var(--scada-text-muted);
          transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        .sm2-switch input:checked + .sm2-slider {
          background-color: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.45);
        }
        .sm2-switch input:checked + .sm2-slider:before {
          transform: translateX(18px);
          background-color: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
        }
        .sm2-divider-v {
          width: 1px;
          height: 16px;
          background-color: var(--scada-border);
          margin: 0 0.25rem;
        }

        /* ── Header ── */
        .sm2-page-header { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          flex-wrap: wrap; 
          gap: 1.25rem; 
          margin-bottom: 1.5rem; 
          background: transparent; 
          border: none; 
          border-radius: 0; 
          padding: 0 0 1rem 0; 
          box-shadow: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }
        .sm2-hd-left { display: flex; align-items: center; gap: 1.1rem; }
        .sm2-hd-icon { 
          width: 52px; 
          height: 52px; 
          background: rgba(56, 189, 248, 0.1); 
          border: 1px solid rgba(56, 189, 248, 0.25); 
          border-radius: 14px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: var(--scada-accent);
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.15);
        }
        .sm2-hd-title { font-size: 1.35rem; font-weight: 850; margin: 0; color: var(--scada-text); letter-spacing: -0.02em; }
        .sm2-hd-sub { font-size: .82rem; color: var(--scada-text-muted); margin: .25rem 0 0; }
        .sm2-hd-right { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
        
        .sm2-pill { 
          display: inline-flex; 
          align-items: center; 
          gap: .4rem; 
          font-size: .78rem; 
          font-weight: 700; 
          padding: .4rem .9rem; 
          border-radius: 30px; 
          border: 1px solid; 
        }
        .sm2-pill-active { background: rgba(34, 197, 94, .12); border-color: rgba(34, 197, 94, .3); color: #4ade80; box-shadow: 0 0 10px rgba(34, 197, 94, 0.1); }
        .sm2-pill-total { background: rgba(56, 189, 248, .12); border-color: rgba(56, 189, 248, .3); color: var(--scada-accent); box-shadow: 0 0 10px rgba(56, 189, 248, 0.1); }
        
        .sm2-icon-btn { 
          background: rgba(255, 255, 255, .05); 
          border: 1px solid var(--scada-border); 
          color: var(--scada-text-muted); 
          border-radius: 10px; 
          padding: .55rem .7rem; 
          cursor: pointer; 
          transition: all .25s ease; 
          display: flex; 
          align-items: center; 
        }
        .sm2-icon-btn:hover { 
          color: var(--scada-accent); 
          border-color: var(--scada-accent); 
          background: rgba(56, 189, 248, 0.08); 
          transform: translateY(-1px);
        }
        .sm2-primary-btn { 
          display: inline-flex; 
          align-items: center; 
          gap: .45rem; 
          background: linear-gradient(135deg, #0ea5e9, #2563eb); 
          color: #fff; 
          border: none; 
          border-radius: 10px; 
          padding: .6rem 1.25rem; 
          font-size: .83rem; 
          font-weight: 750; 
          cursor: pointer; 
          transition: all .25s cubic-bezier(0.4, 0, 0.2, 1); 
          box-shadow: 0 4px 15px rgba(14, 165, 233, .3); 
        }
        .sm2-primary-btn:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 8px 25px rgba(14, 165, 233, .5); 
          filter: brightness(1.1);
        }

        /* ── Toast ── */
        .sm2-toast { 
          display: inline-flex; 
          align-items: center; 
          gap: .5rem; 
          font-size: .83rem; 
          font-weight: 600; 
          padding: .7rem 1.25rem; 
          border-radius: 10px; 
          margin-bottom: 1.25rem; 
          border: 1px solid; 
          animation: sm2FadeIn .3s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .sm2-toast-success { background: rgba(34, 197, 94, .12); border-color: rgba(34, 197, 94, .3); color: #4ade80; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.15); }
        .sm2-toast-danger { background: rgba(239, 68, 68, .12); border-color: rgba(239, 68, 68, .3); color: #f87171; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.15); }

        /* ── Table Card ── */
        .sm2-card { 
          background: var(--scada-card); 
          border: 1px solid var(--scada-border); 
          border-radius: 16px; 
          overflow: hidden; 
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4); 
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
        }
        .sm2-toolbar { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 1.1rem 1.5rem; 
          border-bottom: 1px solid var(--scada-border); 
          background: rgba(15, 23, 42, 0.15);
        }
        .sm2-search { 
          display: flex; 
          align-items: center; 
          gap: .5rem; 
          background: rgba(255, 255, 255, 0.03); 
          border: 1px solid var(--scada-border); 
          border-radius: 10px; 
          padding: .5rem 1rem; 
          transition: all .25s ease; 
          min-width: 320px; 
        }
        .sm2-search:focus-within { 
          border-color: var(--scada-accent); 
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.15); 
          background: rgba(56, 189, 248, 0.02);
        }
        .sm2-srch-ico { color: var(--scada-text-muted); flex-shrink: 0; }
        .sm2-srch-inp { 
          background: transparent; 
          border: none; 
          outline: none; 
          color: var(--scada-text); 
          font-size: .85rem; 
          flex: 1; 
          font-family: inherit; 
        }
        .sm2-srch-inp::placeholder { color: var(--scada-text-muted); }
        .sm2-srch-clr { background: none; border: none; color: var(--scada-text-muted); cursor: pointer; padding: 0; transition: color .2s; }
        .sm2-srch-clr:hover { color: #f87171; }
        .sm2-count { 
          font-size: .78rem; 
          color: var(--scada-text-muted); 
          background: rgba(255, 255, 255, 0.04); 
          border: 1px solid var(--scada-border); 
          border-radius: 8px; 
          padding: .35rem .9rem; 
          font-weight: 600; 
        }

        /* Table Grid */
        .sm2-table-wrap { overflow-x: auto; }
        .sm2-table { width: 100%; border-collapse: collapse; text-align: left; }
        .sm2-th { 
          color: var(--scada-text-muted); 
          font-size: .72rem; 
          font-weight: 800; 
          text-transform: uppercase; 
          letter-spacing: .12em; 
          padding: 0.6rem 0.7rem; 
          border-bottom: 1px solid var(--scada-border); 
          border-right: 1px solid rgba(255, 255, 255, 0.035);
          white-space: nowrap; 
          background: rgba(255, 255, 255, 0.015); 
        }
        .sm2-th:last-child {
          border-right: none;
        }
        .sm2-th-center { text-align: center; }
        .sm2-tr { 
          border-bottom: 1px solid rgba(255, 255, 255, 0.04); 
          transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .sm2-tr:last-child { border-bottom: none; }
        .sm2-tr:hover { background-color: rgba(56, 189, 248, 0.05); }
        .sm2-td { 
          padding: 0.6rem 0.7rem; 
          vertical-align: middle; 
          border-right: 1px solid rgba(255, 255, 255, 0.035);
        }
        .sm2-td:last-child {
          border-right: none;
        }
        .sm2-td-center { text-align: center; }
        
        /* Default column styles (Large screens) */
        .sm2-th-contacts, .sm2-td-contacts {
          width: 170px;
        }
        .sm2-th-services, .sm2-td-services {
          width: 240px;
        }
        .sm2-services-wrap {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
          max-width: 240px;
        }
        .sm2-th-action, .sm2-td-action {
          width: 130px;
        }
        
        .sm2-av { 
          width: 38px; 
          height: 38px; 
          border-radius: 10px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: .8rem; 
          font-weight: 850; 
          letter-spacing: .02em; 
          flex-shrink: 0; 
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .sm2-site-name { display: block; font-weight: 750; font-size: .92rem; color: var(--scada-text); }
        .sm2-site-date { display: block; font-size: .72rem; color: var(--scada-text-muted); margin-top: 3px; }
        
        .sm2-id-row { display: flex; align-items: center; gap: .4rem; margin-bottom: 4px; }
        .sm2-id-lbl { 
          font-size: .62rem; 
          font-weight: 900; 
          background: rgba(56, 189, 248, 0.1); 
          color: var(--scada-accent); 
          border: 1px solid rgba(56, 189, 248, 0.2); 
          border-radius: 4px; 
          padding: .1rem .4rem; 
          letter-spacing: .06em; 
          flex-shrink: 0; 
        }
        .sm2-id-val { font-size: .78rem; color: var(--scada-text-muted); font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-weight: 600; }
        
        .sm2-addr-row, .sm2-tz-row { display: flex; align-items: flex-start; gap: .45rem; }
        .sm2-addr-ico { color: var(--scada-accent); flex-shrink: 0; margin-top: 2px; opacity: .8; }
        .sm2-addr-txt, .sm2-tz-txt { font-size: .83rem; color: var(--scada-text-muted); line-height: 1.45; }
        .sm2-type-badge { 
          display: inline-block;
          white-space: nowrap;
          font-size: .74rem; 
          font-weight: 700; 
          padding: .28rem .8rem; 
          border-radius: 20px; 
          background: rgba(129, 140, 248, 0.12); 
          border: 1px solid rgba(129, 140, 248, 0.25); 
          color: #a5b4fc; 
          box-shadow: 0 0 10px rgba(129, 140, 248, 0.05);
        }
        
        .sm2-badge { 
          display: inline-flex; 
          align-items: center; 
          gap: .35rem; 
          font-size: .74rem; 
          font-weight: 800; 
          padding: .3rem .8rem; 
          border-radius: 20px; 
          border: 1px solid; 
        }
        .sm2-badge-on { background: rgba(34, 197, 94, .12); border-color: rgba(34, 197, 94, .25); color: #4ade80; }
        .sm2-badge-off { background: rgba(148, 163, 184, .08); border-color: rgba(148, 163, 184, .2); color: var(--scada-text-muted); }
        
        .sm2-acts { display: flex; align-items: center; justify-content: center; gap: .5rem; }
        .sm2-act { 
          background: transparent; 
          border: none; 
          padding: .45rem; 
          border-radius: 8px; 
          cursor: pointer; 
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
          display: flex; 
        }
        .sm2-act-edit { color: var(--scada-accent); } 
        .sm2-act-edit:hover { background: rgba(56, 189, 248, 0.15); transform: scale(1.08); }
        .sm2-act-del { color: #f87171; }             
        .sm2-act-del:hover { background: rgba(239, 68, 68, 0.15); transform: scale(1.08); }
        
        .sm2-card-footer { padding: .9rem 1.5rem; border-top: 1px solid var(--scada-border); font-size: .8rem; color: var(--scada-text-muted); background: rgba(15, 23, 42, 0.1); }
        .sm2-active-count { color: #4ade80; font-weight: 700; }
        
        .sm2-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .9rem; }
        .sm2-spinner { width: 34px; height: 34px; border: 3px solid rgba(255, 255, 255, 0.08); border-top-color: var(--scada-accent); border-radius: 50%; animation: sm2Spin .7s linear infinite; }
        .sm2-spin { animation: sm2Spin .7s linear infinite; }
        .sm2-spin-sm { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: sm2Spin .7s linear infinite; }
        .sm2-txt-muted { color: var(--scada-text-muted); font-size: .875rem; text-align: center; }
        .sm2-empty-ico { color: var(--scada-text-muted); opacity: .3; margin-bottom: .5rem; }

        /* ── Modal Overlay ── */
        .sm2-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(2, 6, 23, 0.85); 
          backdrop-filter: blur(8px); 
          -webkit-backdrop-filter: blur(8px);
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 9999; 
          padding: 1.5rem; 
          animation: sm2FadeIn .25s ease; 
        }
        .sm2-modal { 
          background: var(--scada-card); 
          border: 1px solid var(--scada-border); 
          border-radius: 20px; 
          width: 100%; 
          max-width: 800px; 
          max-height: 90vh; 
          overflow-y: auto; 
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.7), 0 0 50px rgba(56, 189, 248, 0.05); 
          animation: sm2SlideUp .3s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .sm2-del-modal { max-width: 420px; }
        .sm2-mhd { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 1.25rem 1.75rem; 
          border-bottom: 1px solid var(--scada-border); 
          background: rgba(15, 23, 42, 0.4);
        }
        .sm2-m-icon { 
          width: 44px; 
          height: 44px; 
          background: rgba(56, 189, 248, 0.12); 
          border: 1px solid rgba(56, 189, 248, 0.25); 
          border-radius: 12px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: var(--scada-accent); 
          flex-shrink: 0; 
        }
        .sm2-m-title { font-size: 1.05rem; font-weight: 850; color: var(--scada-text); margin: 0; }
        .sm2-m-sub { font-size: .8rem; color: var(--scada-text-muted); margin: .25rem 0 0; }
        .sm2-m-close { 
          background: rgba(255, 255, 255, .05); 
          border: 1px solid var(--scada-border); 
          color: var(--scada-text-muted); 
          border-radius: 8px; 
          padding: .45rem; 
          cursor: pointer; 
          transition: all .2s; 
          display: flex; 
        }
        .sm2-m-close:hover { 
          color: #f87171; 
          border-color: rgba(239, 68, 68, .3); 
          background: rgba(239, 68, 68, .08); 
        }
        .sm2-m-body { padding: 1.5rem 1.75rem; }

        /* Location Dropdown Picker */
        .sm2-loc-section { margin-bottom: .25rem; }
        .sm2-loc-hint { font-size: .76rem; color: var(--scada-text-muted); margin: .5rem 0 0; font-style: italic; }

        .sm2-section-label { 
          display: flex; 
          align-items: center; 
          gap: .5rem; 
          font-size: .72rem; 
          font-weight: 800; 
          color: var(--scada-accent); 
          text-transform: uppercase; 
          letter-spacing: .12em; 
          margin-bottom: 1rem; 
        }
        .sm2-fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .sm2-col2 { grid-column: 1 / -1; }
        .sm2-fg { display: flex; flex-direction: column; gap: .4rem; }
        .sm2-lbl { font-size: .78rem; font-weight: 700; color: var(--scada-text-muted); }
        .sm2-req { color: #f87171; }
        .sm2-inp { 
          background: rgba(255, 255, 255, .03); 
          border: 1px solid var(--scada-border); 
          color: var(--scada-text); 
          border-radius: 10px; 
          padding: .65rem 1rem; 
          font-size: .88rem; 
          font-family: inherit; 
          outline: none; 
          transition: all .25s ease; 
          width: 100%; 
        }
        .sm2-inp:focus { 
          border-color: var(--scada-accent); 
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.2); 
          background: rgba(56, 189, 248, 0.02); 
        }
        .sm2-inp::placeholder { color: var(--scada-text-muted); }
        .sm2-sel option { background: var(--scada-sidebar); color: var(--scada-text); }
        .sm2-m-footer { 
          display: flex; 
          justify-content: flex-end; 
          gap: .75rem; 
          padding: 1.1rem 1.75rem; 
          border-top: 1px solid var(--scada-border); 
          background: rgba(15, 23, 42, 0.25);
        }
        .sm2-btn-ghost { 
          display: inline-flex; 
          align-items: center; 
          gap: .4rem; 
          background: rgba(255, 255, 255, .04); 
          border: 1px solid var(--scada-border); 
          color: var(--scada-text-muted); 
          border-radius: 10px; 
          padding: .62rem 1.25rem; 
          font-size: .83rem; 
          font-weight: 700; 
          cursor: pointer; 
          transition: all .2s; 
        }
        .sm2-btn-ghost:hover { color: var(--scada-text); background: rgba(255, 255, 255, .08); border-color: rgba(255, 255, 255, 0.15); }
        .sm2-btn-primary { 
          display: inline-flex; 
          align-items: center; 
          gap: .4rem; 
          background: linear-gradient(135deg, #0ea5e9, #2563eb); 
          border: none; 
          color: #fff; 
          border-radius: 10px; 
          padding: .62rem 1.5rem; 
          font-size: .83rem; 
          font-weight: 800; 
          cursor: pointer; 
          transition: all .2s; 
          box-shadow: 0 4px 14px rgba(14, 165, 233, .25); 
        }
        .sm2-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(14, 165, 233, .4); }
        .sm2-btn-primary:disabled { opacity: .55; cursor: not-allowed; }
        
        .sm2-del-wrap { padding: 2rem 1.5rem; text-align: center; }
        .sm2-del-icon { 
          width: 62px; 
          height: 62px; 
          background: rgba(239, 68, 68, .1); 
          border: 1px solid rgba(239, 68, 68, .25); 
          border-radius: 16px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #f87171; 
          margin: 0 auto 1.25rem; 
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
        }
        .sm2-del-msg { font-size: .9rem; color: var(--scada-text-muted); line-height: 1.75; margin-bottom: 1.75rem; }
        .sm2-del-msg strong { color: var(--scada-text); text-shadow: 0 0 10px rgba(255, 255, 255, 0.15); }
        .sm2-del-btns { display: flex; gap: .75rem; justify-content: center; }
        .sm2-btn-danger { 
          display: inline-flex; 
          align-items: center; 
          gap: .4rem; 
          background: linear-gradient(135deg, #ef4444, #dc2626); 
          border: none; 
          color: #fff; 
          border-radius: 10px; 
          padding: .62rem 1.5rem; 
          font-size: .83rem; 
          font-weight: 800; 
          cursor: pointer; 
          transition: all .2s; 
          box-shadow: 0 4px 14px rgba(239, 68, 68, .25); 
        }
        .sm2-btn-danger:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(239, 68, 68, .4); }

        .sm2-contacts-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: rgba(15, 23, 42, 0.2);
          border: 1px solid var(--scada-border);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.5rem;
        }
        .sm2-contact-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 0.75rem;
          align-items: flex-end;
          padding: 0.85rem 1rem;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 10px;
        }
        .sm2-contact-row:hover {
          border-color: rgba(56, 189, 248, 0.15);
          background: rgba(255, 255, 255, 0.03);
        }
        .sm2-contact-remove {
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 0.65rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sm2-contact-remove:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          transform: scale(1.05);
        }
        .sm2-add-contact-btn {
          width: fit-content;
          align-self: flex-start;
          margin-top: 0.25rem;
        }

        /* ── Table Contacts Column ── */
        .sm2-contacts-cell {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 200px;
        }
        .sm2-contact-card {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%);
          border: 1px solid rgba(56, 189, 248, 0.12);
          border-radius: 10px;
          padding: 0.5rem 0.65rem;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sm2-contact-card:hover {
          border-color: rgba(56, 189, 248, 0.35);
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }
        .sm2-contact-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.68rem;
          font-weight: 850;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .sm2-contact-card-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex-grow: 1;
          min-width: 0;
        }
        .sm2-contact-name {
          font-size: 0.76rem;
          font-weight: 750;
          color: var(--scada-text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sm2-contact-info-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
        }
        .sm2-contact-icon-user {
          color: #818cf8;
          opacity: 0.8;
          flex-shrink: 0;
        }
        .sm2-contact-icon-mail {
          color: var(--scada-accent);
          opacity: 0.8;
          flex-shrink: 0;
        }
        .sm2-contact-icon-phone {
          color: #34d399;
          opacity: 0.8;
          flex-shrink: 0;
        }
        .sm2-contact-info-text {
          color: var(--scada-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 150px;
        }

        /* ════ CASCADING PICKER ════ */
        .clp-wrap { position: relative; }

        /* Trigger */
        .clp-trigger { 
          width: 100%; 
          display: flex; 
          align-items: center; 
          gap: .5rem; 
          background: rgba(255, 255, 255, .03); 
          border: 1px solid var(--scada-border); 
          color: var(--scada-text); 
          border-radius: 10px; 
          padding: .65rem 1rem; 
          font-size: .88rem; 
          font-family: inherit; 
          cursor: pointer; 
          transition: all .25s ease; 
          text-align: left; 
        }
        .clp-trigger:hover, .clp-trigger:focus { 
          border-color: var(--scada-accent); 
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.2); 
          background: rgba(56, 189, 248, 0.02); 
        }
        .clp-trigger-ico { color: var(--scada-accent); opacity: .9; flex-shrink: 0; }
        .clp-trigger-ph { color: var(--scada-text-muted); flex: 1; font-size: .85rem; }
        .clp-trigger-val { color: var(--scada-text); flex: 1; font-weight: 700; font-size: .85rem; }
        .clp-clear { background: none; border: none; color: var(--scada-text-muted); cursor: pointer; padding: .1rem; display: flex; margin-left: auto; transition: color .2s; flex-shrink: 0; }
        .clp-clear:hover { color: #f87171; }

        /* Dropdown Picker Body */
        .clp-dropdown { 
          position: absolute; 
          top: calc(100% + 8px); 
          left: 0; 
          z-index: 10000;
          background: rgba(10, 15, 30, 0.95); 
          backdrop-filter: blur(20px); 
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(56, 189, 248, 0.25); 
          border-radius: 14px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(56, 189, 248, 0.08); 
          overflow: hidden; 
          animation: sm2FadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          width: 100%; 
        }

        /* Breadcrumb path */
        .clp-breadcrumb { 
          display: flex; 
          align-items: center; 
          flex-wrap: wrap; 
          gap: .3rem; 
          padding: .75rem 1.25rem;
          border-bottom: 1px solid rgba(56, 189, 248, 0.15); 
          background: rgba(56, 189, 248, 0.05);
          font-size: .78rem; 
          min-height: 40px; 
        }
        .clp-bc-ico { color: var(--scada-accent); flex-shrink: 0; opacity: 1; }
        .clp-bc-ph { color: var(--scada-text-muted); font-style: italic; }
        .clp-bc-item { color: var(--scada-text); font-weight: 700; text-shadow: 0 0 10px rgba(56, 189, 248, 0.2); }
        .clp-bc-sep { color: var(--scada-text-muted); margin: 0 .15rem; }

        /* Search in dropdown */
        .clp-search-row { 
          display: flex; 
          align-items: center; 
          gap: .5rem; 
          padding: .75rem 1.25rem; 
          border-bottom: 1px solid var(--scada-border); 
          background: rgba(255, 255, 255, 0.01); 
          transition: all 0.2s;
        }
        .clp-search-row:focus-within {
          background: rgba(56, 189, 248, 0.03);
          border-bottom-color: rgba(56, 189, 248, 0.4);
        }
        .clp-s-ico { color: var(--scada-text-muted); flex-shrink: 0; }
        .clp-s-inp { 
          flex: 1; 
          background: transparent; 
          border: none; 
          outline: none; 
          color: var(--scada-text); 
          font-size: .85rem; 
          font-family: inherit; 
        }
        .clp-s-inp::placeholder { color: var(--scada-text-muted); }
        .clp-s-clr { background: none; border: none; color: var(--scada-text-muted); cursor: pointer; padding: 0; transition: color .2s; display: flex; }
        .clp-s-clr:hover { color: #f87171; }

        /* Columns */
        .clp-cols-wrap { display: flex; overflow-x: auto; max-height: 350px; }
        .clp-cols-wrap::-webkit-scrollbar { height: 6px; }
        .clp-cols-wrap::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
        .clp-cols-wrap::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.25); border-radius: 10px; }
        .clp-cols-wrap::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.5); }

        /* Column */
        .clp-col { 
          flex: 1 1 180px;
          min-width: 150px; 
          max-width: 260px;
          border-right: 1px solid var(--scada-border); 
          overflow-y: auto; 
          flex-shrink: 0; 
          position: relative;
        }
        .clp-col:last-child { border-right: none; }
        .clp-col::-webkit-scrollbar { width: 4px; }
        .clp-col::-webkit-scrollbar-track { background: transparent; }
        .clp-col::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 10px; }
        .clp-col::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.3); }

        /* Column Header */
        .clp-col-hd { 
          padding: .6rem 0.8rem; 
          font-size: .65rem; 
          font-weight: 800; 
          text-transform: uppercase;
          letter-spacing: .15em; 
          color: var(--scada-accent); 
          border-bottom: 1px solid rgba(56, 189, 248, 0.2);
          background: rgba(10, 15, 30, 0.98); 
          position: sticky;
          top: 0;
          z-index: 10;
        }

        /* Item */
        .clp-item { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          gap: .45rem; 
          width: 100%; 
          background: transparent; 
          border: none;
          padding: .6rem 0.8rem; 
          color: var(--scada-text-muted); 
          font-size: .78rem; 
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
          text-align: left; 
          border-bottom: 1px solid rgba(255, 255, 255, 0.02); 
        }
        .clp-item:hover { 
          background: rgba(56, 189, 248, 0.08); 
          color: var(--scada-text); 
          padding-left: .95rem;
        }
        .clp-item-active { 
          background: linear-gradient(90deg, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.03) 100%) !important;
          color: var(--scada-accent) !important; 
          font-weight: 800;
          border-left: 3px solid var(--scada-accent) !important; 
          padding-left: calc(0.8rem - 3px) !important; 
        }
        .clp-item-active:hover {
          padding-left: calc(.95rem - 3px) !important;
        }
        .clp-item-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .clp-item-arrow { color: var(--scada-text-muted); flex-shrink: 0; opacity: .6; transition: all 0.2s; }
        .clp-item:hover .clp-item-arrow { opacity: 1; color: var(--scada-accent); transform: translateX(3px); }
        .clp-item-check { color: #34d399; flex-shrink: 0; animation: clpScaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .clp-item-dot { width: 14px; height: 14px; flex-shrink: 0; }
        .clp-no-results { padding: 1.75rem 1rem; font-size: .8rem; color: var(--scada-text-muted); text-align: center; }

        /* Loader inside picker */
        .clp-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .6rem; padding: 2.5rem; color: var(--scada-text-muted); font-size: .85rem; width: 220px; }
        .clp-spinner { animation: sm2Spin .7s linear infinite; color: var(--scada-accent); }

        /* Scrollbars */
        .sm2-modal::-webkit-scrollbar { width: 6px; }
        .sm2-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .sm2-modal::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.3); }

        @keyframes clpScaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes sm2Spin { to { transform: rotate(360deg); } }
        @keyframes sm2FadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sm2SlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Portal Popover Animation ── */
        .sm2-portal-popover {
          pointer-events: auto;
        }
        @keyframes popoverFadeIn {
          from { opacity: 0; transform: translateY(-90%) scale(0.95); }
          to { opacity: 1; transform: translateY(-100%) scale(1); }
        }

        @media (max-width: 1200px) {
          .sm2-th-contacts, .sm2-td-contacts {
            width: 110px;
          }
          .sm2-th-services, .sm2-td-services {
            width: 135px;
          }
          .sm2-services-wrap {
            max-width: 135px;
          }
          .sm2-th-action, .sm2-td-action {
            width: 95px;
          }
        }

        @media (max-width: 640px) {
          .sm2-fgrid { grid-template-columns: 1fr; }
          .sm2-hd-right { gap: .5rem; }
          .clp-col { min-width: 260px; }
        }
      `}</style>
    </div>
  );
};

export default SiteManagement;
