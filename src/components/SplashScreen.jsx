import React, { useEffect, useState } from 'react';
import brandLogo from '../assets/trueisense.jpeg';

/* ──────────────────────────────────────────────────────────────
   TRUEiSENSE Premium Splash Screen (Figma / Apple Grade UI)
   ────────────────────────────────────────────────────────────── */
const SplashScreen = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Pre-load the brand image locally to ensure it is cached and ready in memory
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
    };
    img.onerror = () => {
      // Fallback immediately so splash screen does not hang if load fails
      setImageLoaded(true);
    };
    img.src = brandLogo;

    // Handle cached images immediately
    if (img.complete) {
      setImageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!imageLoaded) return;

    // Start screen fade-out at 1.4s
    const tFadeOut = setTimeout(() => setFadeOut(true), 1400);

    // Complete transition at 1.9s
    const tComplete = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1900);

    return () => {
      clearTimeout(tFadeOut);
      clearTimeout(tComplete);
    };
  }, [onComplete, imageLoaded]);

  // ── Inline Styles ──────────────────────────────────────────
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #8C3B06 0%, #2A1206 40%, #120A05 70%, #000000 100%)',
    overflow: 'hidden',
    opacity: fadeOut ? 0 : 1,
    transition: 'opacity 0.75s cubic-bezier(0.25, 1, 0.5, 1)',
    pointerEvents: fadeOut ? 'none' : 'all',
  };

  // Cinematic Dome Light (Top)
  const domeLightStyle = {
    position: 'absolute',
    top: '-40%',
    width: '140vw',
    height: '140vw',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(224, 94, 0, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
    pointerEvents: 'none',
    zIndex: 1,
  };

  // Slow Breathing Glow behind the card
  const breathingGlowStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 'min(700px, 95vw)',
    height: 'min(700px, 95vw)',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(224, 94, 0, 0.12) 0%, rgba(224, 94, 0, 0.03) 50%, transparent 70%)',
    pointerEvents: 'none',
    zIndex: 1,
    animation: 'breatheGlow 4s ease-in-out infinite',
  };

  // Glassmorphism Logo Card Container
  const logoContainerStyle = {
    position: 'relative',
    zIndex: 2,
    width: 'clamp(280px, 45vw, 360px)',
    height: 'calc(clamp(280px, 45vw, 360px) * 1.45)',
    overflow: 'hidden',
    borderRadius: '32px',
    background: 'linear-gradient(135deg, rgba(28, 16, 8, 0.3) 0%, rgba(10, 5, 2, 0.5) 100%)',
    border: '1px solid rgba(224, 94, 0, 0.2)',
    boxShadow: `
      0 30px 70px rgba(0, 0, 0, 0.9),
      0 0 50px rgba(224, 94, 0, 0.14),
      inset 0 1px 1px rgba(255, 255, 255, 0.08)
    `,
    animation: 'splashEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    userSelect: 'none',
  };

  const logoImgStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center 42%',
    opacity: 0.95,
    zIndex: 1,
  };

  // Cinematic Subtitle with wide letter spacing
  const subtitleStyle = {
    position: 'absolute',
    bottom: 'clamp(40px, 8vh, 70px)',
    zIndex: 2,
    color: 'rgba(235, 184, 155, 0.85)', // Premium warm gray
    fontSize: 'clamp(10px, 1.6vw, 13px)',
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
    animation: 'splashTextReveal 0.8s cubic-bezier(0.25, 1, 0.5, 1) 0.3s forwards',
    opacity: 0,
  };

  // Keep screen blank gradient while image is pre-loading to prevent unstyled layout flash
  if (!imageLoaded) {
    return <div style={overlayStyle} />;
  }

  return (
    <div style={overlayStyle}>
      <style>{`
        @keyframes splashEntrance {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes splashTextReveal {
          0% {
            opacity: 0;
            letter-spacing: 0.3em;
            transform: translateY(8px);
          }
          100% {
            opacity: 0.85;
            letter-spacing: 0.48em;
            transform: translateY(0);
          }
        }
        @keyframes breatheGlow {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.95;
          }
        }
        @keyframes glossSweep {
          0% {
            transform: translateX(-150%) rotate(25deg);
          }
          100% {
            transform: translateX(150%) rotate(25deg);
          }
        }
      `}</style>

      {/* Cinematic Ambient Background Lights */}
      <div style={domeLightStyle} />
      <div style={breathingGlowStyle} />

      {/* Glassmorphic Logo Card */}
      <div style={logoContainerStyle}>
        {/* Sweeping Gloss/Light reflection */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255, 110, 0, 0.05) 30%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 110, 0, 0.05) 70%, transparent)',
          transform: 'skewX(-25deg)',
          animation: 'glossSweep 2.8s cubic-bezier(0.25, 1, 0.5, 1) 0.6s infinite',
          pointerEvents: 'none',
          zIndex: 3,
        }} />

        {/* Brand Image inside Card (Centered on Brand Elements) */}
        <img
          src={brandLogo}
          alt="TRUEiSENSE"
          style={logoImgStyle}
        />
      </div>

      {/* Subtitle */}
      <div style={subtitleStyle}>
        Intelligent Lighting Control System
      </div>
    </div>
  );
};

export default SplashScreen;
