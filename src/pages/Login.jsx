import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Shield, ArrowRight, Key, Mail, Cpu, Globe, Eye, EyeOff } from 'lucide-react';
import logo from "../assets/logo.png";
import heroImg from "./scada_hero.png";

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [loginMode, setLoginMode] = useState('admin'); 
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://app.sochiot.com/api/auth-engine/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: credentials.username, 
          password: credentials.password 
        })
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.token;
        localStorage.setItem('token', token);
        localStorage.setItem('sochiot_token', token);

        // Fetch User Me details with robust fallback logic
        let meData = {};
        let profileSuccess = false;

        // Try local backend first
        try {
          const meResponse = await fetch(`${import.meta.env.VITE_BACKEND_BMS_URL}/users/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (meResponse.ok) {
            const meDataJson = await meResponse.json();
            meData = meDataJson.data || meDataJson || {};
            profileSuccess = true;
          }
        } catch (localErr) {
          console.warn('Failed to fetch profile from local backend:', localErr);
        }

        // If local backend fails, fall back to Sochiot user me endpoint
        if (!profileSuccess) {
          try {
            const meResponse = await fetch('https://app.sochiot.com/api/auth-engine/user/me', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (meResponse.ok) {
              const meDataJson = await meResponse.json();
              meData = meDataJson.data || meDataJson || {};
              profileSuccess = true;
            }
          } catch (sochiotErr) {
            console.error('Failed to fetch profile from Sochiot auth:', sochiotErr);
          }
        }

        // Determine user role based on /me authorities, roles, isRootUser, or credentials
        let role = 'USER';
        const emailLower = credentials.username.toLowerCase();
        
        const isSuper = (
          meData.isRootUser === true ||
          (meData.roles && meData.roles.includes('SUPER_ADMIN')) ||
          (meData.authorities && (meData.authorities.includes('PERM_SUPER_ADMIN') || meData.authorities.includes('PERM_MANAGE_ALL'))) ||
          emailLower === 'superadmin@sochiot.com' ||
          emailLower === 'sa@ismartaccess.com' ||
          emailLower.startsWith('superadmin@')
        );

        const isAdmin = (
          (meData.roles && meData.roles.includes('ADMIN')) ||
          (meData.authorities && meData.authorities.includes('PERM_MANAGE_ADMINISTRATORS'))
        );

        if (isSuper) {
          role = 'SUPER_ADMIN';
        } else if (isAdmin) {
          role = 'ADMIN';
        } else if (meData.roles && meData.roles.length > 0) {
          role = meData.roles[0];
        } else if (meData.role) {
          role = (typeof meData.role === 'object' ? meData.role?.name : meData.role) || 'USER';
        }

        const userObj = {
          id: meData.id || meData._id || 'temp-id',
          name: meData.name || meData.username || 'Super Admin',
          email: meData.email || credentials.username,
          role: role,
          organizationId: meData.organizationId || null
        };

        localStorage.setItem('userRole', role);
        localStorage.setItem('userData', JSON.stringify(userObj));
        localStorage.setItem('isAuthenticated', 'true');

        const localFp = meData.featurePermissions || {};
        const isSuperRole = role === 'SUPER_ADMIN';
        const sidebarMapping = {
          "Dashboard": isSuperRole ? true : (localFp.showDashboard ?? true),
          "Water Management": isSuperRole ? true : (localFp.showWaterManagement ?? true),
          "Motors": isSuperRole ? true : (localFp.showMotors ?? true),
          "DG Set": isSuperRole ? true : (localFp.showDGSet ?? true),
          "Setting Templates": isSuperRole ? true : (localFp.showSettingTemplates ?? true),
          "Alarm System": isSuperRole ? true : (localFp.showAlarms ?? true),
          "LT Panel": isSuperRole ? true : (localFp.showLTPanel ?? true),
          "Transformer": isSuperRole ? true : (localFp.showTransformers ?? true),
          "Fire": isSuperRole ? true : (localFp.showFirePumps ?? true),
          "Ticketing": isSuperRole ? true : (localFp.showTicketing ?? true),
          "Maintenance": isSuperRole ? true : (localFp.showMaintenance ?? true),
          "Service History": isSuperRole ? true : (localFp.showServiceHistory ?? true),
          "Daily DPR": isSuperRole ? true : (localFp.showDailyDPR ?? true),
          "Energy Metering": isSuperRole ? true : (localFp.showEnergyMetering ?? true)
        };
        localStorage.setItem('scada_modules_config', JSON.stringify(sidebarMapping));
        localStorage.setItem('scada_submodules_config', JSON.stringify(localFp.submoduleVisibility || {}));
        
        window.dispatchEvent(new Event('storage-update'));
        
        // Trigger splash screen FIRST, then navigate after one frame
        if (onLoginSuccess) onLoginSuccess();

        // Small delay so React can mount SplashScreen before route changes
        setTimeout(() => {
          if (role === 'SUPER_ADMIN') {
            navigate('/super-admin');
          } else {
            navigate('/dashboard');
          }
        }, 80);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split-wrapper min-vh-100 d-flex overflow-hidden bg-black">
      {/* LEFT SIDE: POWERFUL VISUALS & SALES PITCH */}
      <div className="login-hero-side d-none d-lg-flex position-relative flex-column justify-content-between p-5">
        <div className="hero-grid-overlay"></div>
        <img src={heroImg} alt="SCADA AI" className="hero-bg-img" />
        
        <div className="position-relative z-10 w-100">
          <div className="d-flex align-items-center gap-3 mb-5">
             <div className="bg-white bg-opacity-10 p-2 rounded-3 border border-white border-opacity-10 backdrop-blur">
                <img src={logo} alt="Sochiot" style={{ height: 40 }} />
             </div>
             <div className="h-line-scada flex-grow-1 opacity-25"></div>
          </div>

          <div className="hero-main-text">
            <h1 className="display-4 fw-black text-white mb-3 tracking-tighter">
                THE FUTURE OF <span className="text-info-scada">AUTOMATION</span>
            </h1>
            <p className="fs-5 text-white text-opacity-75 fw-bold max-w-sm">
                Unifying industrial intelligence with next-gen HMI visualization. Real-time, Secure, and Scalable.
            </p>
          </div>
        </div>

        <div className="position-relative z-10">
            <div className="d-flex gap-4 mb-5">
                {[
                    {icon: <Cpu size={20} />, label: 'Edge Core v2'},
                    {icon: <Globe size={20} />, label: 'Global Sync'},
                    {icon: <Shield size={20} />, label: 'End-to-End Encryption'}
                ].map((feat, i) => (
                    <div key={i} className="d-flex align-items-center gap-2 bg-black bg-opacity-40 p-2 px-3 rounded-pill border border-white border-opacity-10 backdrop-blur">
                        <div className="text-info-scada">{feat.icon}</div>
                        <small className="text-white fw-bold fs-13 uppercase">{feat.label}</small>
                    </div>
                ))}
            </div>
            <div className="text-white text-opacity-25 fs-13 fw-bold tracking-widest uppercase">
                © 2026 SOCHIOT AUTOMATION PVT. LTD. ALL NODES ENCRYPTED.
            </div>
        </div>
      </div>

      {/* RIGHT SIDE: AUTHENTICATION GATEWAY */}
      <div className="login-form-side flex-grow-1 d-flex align-items-center justify-content-center p-4">
          <div className="login-form-container w-100" style={{ maxWidth: '440px' }}>
            <div className="text-center mb-5">
                 <img src={logo} alt="Sochiot" className="mb-4" style={{ height: 60 }} />
            </div>

            {error && (
                <Alert variant="danger" className="text-center border-0 bg-danger bg-opacity-10 text-danger fs-12 uppercase fw-bold mb-4 rounded-3 p-3">
                <Shield size={16} className="me-2" /> {error}
                </Alert>
            )}

            <Form onSubmit={handleLogin}>
                <div className="fade-in">
                    <Form.Group className="mb-4 position-relative">
                    <div className="input-icon-v3"><Mail size={18} /></div>
                    <Form.Control 
                        type="email" 
                        placeholder={loginMode === 'admin' ? "admin@sochiot.com" : "user@sochiot.com"}
                        className={`scada-input-v3 ${loginMode === 'user' ? 'border-user-v3' : ''}`}
                        value={credentials.username}
                        onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                        required
                    />
                    </Form.Group>
                    <Form.Group className="mb-5 position-relative">
                    <div className="input-icon-v3"><Key size={18} /></div>
                    <Form.Control 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className={`scada-input-v3 ${loginMode === 'user' ? 'border-user-v3' : ''}`}
                        value={credentials.password}
                        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                        required
                        style={{ paddingRight: '50px' }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="position-absolute end-0 top-50 translate-middle-y border-0 bg-transparent text-muted px-3"
                        style={{ zIndex: 10, cursor: 'pointer' }}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    </Form.Group>
                </div>

                <Button 
                disabled={loading}
                type="submit" 
                className={`w-100 py-3 rounded-3 fw-black uppercase tracking-widest transition-all border-0 shadow-lg d-flex align-items-center justify-content-center gap-3 ${loginMode === 'admin' ? 'login-btn-admin-v3' : 'login-btn-user-v3'}`}
                >
                {loading ? (
                    <div className="d-flex align-items-center gap-3">
                    <span className="spinner-border spinner-border-sm"></span> INTEGRATING
                    </div>
                ) : (
                    <> {loginMode === 'admin' ? 'INITIALIZE ENGINE' : 'REMOTELY ACCESS'} <ArrowRight size={20} /> </>
                )}
                </Button>
            </Form>
          </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-split-wrapper {
          width: 100vw;
          min-height: 100vh;
        }

        /* HERO SIDE */
        .login-hero-side {
          width: 55%;
          background-color: #020617;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }
        .hero-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.8;
          mix-blend-mode: normal;
        }
        .hero-grid-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(14, 165, 233, 0.1) 1.5px, transparent 1.5px), 
                            linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1.5px, transparent 1.5px);
          background-size: 60px 60px;
          opacity: 0.3;
          z-index: 2;
        }
        .backdrop-blur { backdrop-filter: blur(10px); }
        .h-line-scada { height: 1px; background: white; }
        .h-line-scada-short { width: 60px; height: 3px; background: #0ea5e9; border-radius: 2px; }
        .text-info-scada { color: #0ea5e9; }
        .max-w-sm { max-width: 450px; }

        /* FORM SIDE */
        .login-form-side {
          background-color: #05070a;
          position: relative;
        }
        .z-10 { z-index: 10; }

        /* ROLE TOGGLE */
        .role-selector-container { height: 52px; background-color: #0f172a; }
        .role-slider {
          position: absolute;
          top: 3px;
          left: 3px;
          width: calc(50% - 3px);
          height: calc(100% - 6px);
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          border-radius: 50px;
          transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
          z-index: 1;
        }
        .slide-right {
          transform: translateX(100%);
          background: linear-gradient(135deg, #059669, #10b981) !important;
        }
        .role-btn {
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 900;
          font-size: 0.72rem;
          letter-spacing: 2px;
          z-index: 2;
          transition: 0.3s ease;
        }
        .role-btn.active { color: white; }

        /* INPUTS V3 */
        .scada-input-v3 {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 12px !important;
          padding: 16px 16px 16px 52px !important;
          color: white !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          transition: 0.3s !important;
        }
        .scada-input-v3:focus { border-color: #0ea5e9 !important; background: rgba(14, 165, 233, 0.05) !important; outline: none; box-shadow: 0 0 15px rgba(14, 165, 233, 0.1); }
        .border-user-v3:focus { border-color: #10b981 !important; background: rgba(16, 185, 129, 0.05) !important; }
        .scada-input-v3::placeholder { color: rgba(255, 255, 255, 0.4) !important; font-weight: 500; }
        .input-icon-v3 {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.4);
          z-index: 10;
        }

        /* BUTTONS V3 */
        .login-btn-admin-v3 {
          background: #0ea5e9;
          color: #020617;
          box-shadow: 0 10px 25px rgba(14, 165, 233, 0.2);
        }
        .login-btn-user-v3 {
          background: #10b981;
          color: #020617;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.2);
        }
        .login-btn-admin-v3:hover, .login-btn-user-v3:hover { transform: translateY(-2px); filter: brightness(1.15); }

        .fw-black { font-weight: 950 !important; }
        .fs-13 { font-size: 0.65rem !important; }
        .fs-11 { font-size: 0.82rem !important; }
        .tracking-widest { letter-spacing: 4px !important; }
        .uppercase { text-transform: uppercase !important; }
        .fade-in { animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}} />
    </div>
  );
};

export default Login;
