import React, { useState, useEffect } from 'react';
import { Menu, Search, User, Bell, LayoutGrid, Sun } from 'lucide-react';
import { Button, Form, InputGroup, Dropdown } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const Header = ({ collapsed, toggleSidebar }) => {
  const { isDark, toggleTheme } = useTheme();

  const [userData, setUserData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}');
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setUserData(JSON.parse(localStorage.getItem('userData') || '{}'));
      } catch (e) {}
    };
    window.addEventListener('storage-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('storage-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return (
    <header className={`scada-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="header-left d-flex align-items-center">
        <Button 
          variant="link" 
          className="text-white p-0 me-3" 
          onClick={toggleSidebar}
        >
          <Menu size={24} />
        </Button>
        <h5 className="mb-0 fw-bold tracking-tight d-none d-md-block">
           TRUEiSENSE Smart Monitoring System
        </h5>
      </div>

      <div className="header-center d-none d-lg-block">
        <InputGroup className="header-search border-0">
          <InputGroup.Text className="bg-transparent border-secondary border-opacity-25 text-muted">
            <Search size={18} />
          </InputGroup.Text>
          <Form.Control
            placeholder="Search systems..."
            className="bg-transparent border-secondary border-opacity-25 text-white"
          />
        </InputGroup>
      </div>

      <div className="header-right d-flex align-items-center">
        {/* Toggle Theme Button */}
        <Button 
          variant={isDark ? 'outline-light' : 'outline-dark'} 
          size="sm" 
          onClick={toggleTheme} 
          className="fw-bold fs-12 d-flex align-items-center gap-2 me-3" 
          style={{ borderRadius: '20px', padding: '6px 16px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', backdropFilter: 'blur(10px)', border: '1px solid var(--scada-border)' }}
        >
          {isDark ? <Sun size={14}/> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>}
          {isDark ? 'LIGHT MODE' : 'DARK MODE'}
        </Button>
        
        <Button variant="link" className="text-muted p-2 me-2 position-relative">
          <Bell size={20} />
          <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" style={{ marginTop: '8px', marginLeft: '-8px' }}></span>
        </Button>
        <Button variant="link" className="text-muted p-2 me-3">
          <LayoutGrid size={20} />
        </Button>
        
        <Dropdown align="end">
          <Dropdown.Toggle variant="link" className="d-flex align-items-center text-white text-decoration-none p-0 border-0 custom-toggle">
            <div className="user-avatar bg-info rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '24px', height: '24px' }}>
              <User size={14} className="text-dark" />
            </div>
            <div className="user-info d-none d-sm-block text-start">
              <p className="mb-0 text-white fw-bold text-capitalize" style={{ fontSize: '11px', lineHeight: '1.1' }}>
                {userData.name || 'User'}
              </p>
              <p className="mb-0 text-muted uppercase tracking-tighter" style={{ fontSize: '9px', lineHeight: '1.1' }}>
                {userData.roleName || (() => {
                  const role = localStorage.getItem('userRole') || 'USER';
                  if (role === 'SUPER_ADMIN') return 'Super Admin';
                  if (role === 'ADMIN') return 'Administrator';
                  return role.replace(/_/g, ' ');
                })()}
              </p>
            </div>
          </Dropdown.Toggle>

          <Dropdown.Menu className="bg-dark border-secondary mt-2 shadow">
            <Dropdown.Item className="text-white hover-bg-secondary">Profile</Dropdown.Item>
            <Dropdown.Item className="text-white hover-bg-secondary">Logs</Dropdown.Item>
            <Dropdown.Divider className="bg-secondary" />
            <Dropdown.Item 
              className="text-danger hover-bg-secondary fw-bold"
              onClick={() => {
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userData');
                localStorage.removeItem('token');
                localStorage.removeItem('sochiot_token');
                localStorage.removeItem('scada_modules_config');
                localStorage.removeItem('scada_submodules_config');
                localStorage.removeItem('scada_feature_permissions');
                window.location.href = '/login';
              }}
            >
              Sign Out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .header-search {
          width: 400px;
        }
        .header-search .form-control:focus {
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: var(--scada-accent) !important;
          box-shadow: none;
          color: white;
        }
        .leading-tight { line-height: 1.1; }
        .fs-8 { font-size: 0.62rem; }
        .fs-7 { font-size: 0.72rem; }
        .custom-toggle::after { display: none; }
        .hover-bg-secondary:hover { background-color: rgba(255, 255, 255, 0.1); }
      `}} />
    </header>
  );
};

export default Header;
