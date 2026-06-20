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
          emailLower === 'superadmin@trueisense.com' ||
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
                <img src={logo} alt="TRUEiSENSE" style={{ height: 40 }} />
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
                © 2026 TRUEiSENSE AUTOMATION PVT. LTD. ALL NODES ENCRYPTED.
            </div>
        </div>
      </div>

      {/* RIGHT SIDE: AUTHENTICATION GATEWAY */}
      <div className="login-form-side flex-grow-1 d-flex align-items-center justify-content-center p-4">
          <div className="login-form-container w-100" style={{ maxWidth: '440px' }}>
            <div className="text-center mb-5">
                 <img src={logo} alt="TRUEiSENSE" className="mb-4" style={{ height: 60 }} />
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
                        placeholder={loginMode === 'admin' ? "admin@trueisense.com" : "user@trueisense.com"}
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
          background-color: #120A05;
          border-right: 1px solid rgba(224, 94, 0, 0.1);
        }
        .hero-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.55;
          mix-blend-mode: luminosity;
        }
        .hero-grid-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(224, 94, 0, 0.08) 1.5px, transparent 1.5px), 
                            linear-gradient(90deg, rgba(224, 94, 0, 0.08) 1.5px, transparent 1.5px);
          background-size: 60px 60px;
          opacity: 0.25;
          z-index: 2;
        }
        .backdrop-blur { backdrop-filter: blur(10px); }
        .h-line-scada { height: 1px; background: white; }
        .h-line-scada-short { width: 60px; height: 3px; background: #e05e00; border-radius: 2px; }
        .text-info-scada { color: #e05e00; }
        .max-w-sm { max-width: 450px; }

        /* FORM SIDE */
        .login-form-side {
          background: linear-gradient(180deg, #8C3B06 0%, #2A1206 40%, #120A05 70%, #000000 100%) !important;
          position: relative;
        }
        .login-form-side::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(224, 94, 0, 0.1) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 1;
        }
        .z-10 { z-index: 10; }

        /* GLASSMORPHIC CONTAINER */
        .login-form-container {
          position: relative;
          z-index: 2;
          background: linear-gradient(135deg, rgba(28, 16, 8, 0.35) 0%, rgba(10, 5, 2, 0.55) 100%) !important;
          border: 1px solid rgba(224, 94, 0, 0.2) !important;
          border-radius: 24px !important;
          padding: 3rem 2.5rem !important;
          box-shadow: 
            0 30px 60px rgba(0, 0, 0, 0.8),
            0 0 50px rgba(224, 94, 0, 0.12),
            inset 0 1px 1px rgba(255, 255, 255, 0.06) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          transition: all 0.4s ease;
        }
        .login-form-container:hover {
          border-color: rgba(224, 94, 0, 0.3) !important;
          box-shadow: 
            0 30px 70px rgba(0, 0, 0, 0.9),
            0 0 60px rgba(224, 94, 0, 0.18),
            inset 0 1px 1px rgba(255, 255, 255, 0.08) !important;
        }

        /* INPUTS V3 */
        .scada-input-v3 {
          background: rgba(0, 0, 0, 0.4) !important;
          border: 1px solid rgba(224, 94, 0, 0.18) !important;
          border-radius: 12px !important;
          padding: 16px 16px 16px 52px !important;
          color: white !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          transition: all 0.3s ease !important;
        }
        .scada-input-v3:focus {
          border-color: #e05e00 !important;
          background: rgba(224, 94, 0, 0.05) !important;
          outline: none !important;
          box-shadow: 0 0 18px rgba(224, 94, 0, 0.2) !important;
        }
        .scada-input-v3::placeholder {
          color: rgba(255, 255, 255, 0.3) !important;
          font-weight: 500;
        }
        .input-icon-v3 {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(224, 94, 0, 0.6);
          z-index: 10;
        }

        /* BUTTONS V3 */
        .login-btn-admin-v3, .login-btn-user-v3 {
          background: linear-gradient(135deg, #e05e00, #8C3B06) !important;
          color: white !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 25px rgba(224, 94, 0, 0.22) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .login-btn-admin-v3:hover, .login-btn-user-v3:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 30px rgba(224, 94, 0, 0.35) !important;
          filter: brightness(1.1);
        }

        .fw-black { font-weight: 950 !important; }
        .fs-13 { font-size: 0.65rem !important; }
        .fs-11 { font-size: 0.82rem !important; }
        .tracking-widest { letter-spacing: 4px !important; }
        .uppercase { text-transform: uppercase !important; }
        .fade-in { animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
};

export default Login;
