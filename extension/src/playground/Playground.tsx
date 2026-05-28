import React, { useState, useEffect } from 'react';
import Sidebar from '../sidebar/Sidebar';
import MockJobForm, { JOB_PROFILES, JobProfile } from './MockJobForm';
import { setupChromeMock } from './chromeMock';

// Initialize Chrome extension API mocks on window
setupChromeMock();

// Dynamically import the real content script so it registers its chrome.runtime message listener
import '../content/index';

export default function Playground() {
  const [currentProfile, setCurrentProfile] = useState<JobProfile>(JOB_PROFILES[0]);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [checkingBackend, setCheckingBackend] = useState<boolean>(true);

  // Check FastAPI backend health status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/health');
        if (res.ok) {
          setBackendOnline(true);
        } else {
          setBackendOnline(false);
        }
      } catch (err) {
        setBackendOnline(false);
      } finally {
        setCheckingBackend(false);
      }
    };
    checkHealth();
    // Re-check every 10 seconds
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleProfileChange = (newProfile: JobProfile) => {
    setCurrentProfile(newProfile);
    
    // Simulate navigation by triggering a mock scan state reset
    // In our emulated chrome runtime, changing pages resets scanning. We can notify the sidebar by simulating standard chrome behavior.
    console.log(`[Playground] Navigated to ${newProfile.company}`);
  };

  // Construct a mock URL for the Greenhouse page
  const mockUrl = `https://boards.greenhouse.io/${currentProfile.company.toLowerCase().replace(/\s+/g, '')}/jobs/${currentProfile.id}`;

  return (
    <div className="playground-layout">
      {/* Header Bar */}
      <header className="playground-header">
        <div className="header-brand">
          <div className="logo-icon" style={{ boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)' }}>A</div>
          <div>
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
              ApplyPilot AI
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--sim-muted)', marginLeft: '8px' }}>
              Simulator & Dev Playground
            </span>
          </div>
          <span className="header-badge">Standalone Sandbox</span>
        </div>

        {/* Backend Status indicator */}
        <div className="header-status">
          <span className={`status-dot ${backendOnline ? '' : 'offline'}`}></span>
          <span style={{ fontWeight: 500 }}>
            {checkingBackend 
              ? '检测后端状态...' 
              : backendOnline 
                ? 'FastAPI 后端: 已连接 (直连 Gemini)' 
                : 'FastAPI 后端: 未连接 (本地降级模拟)'
            }
          </span>
        </div>
      </header>

      {/* Main Sandbox Viewport */}
      <div className="playground-viewport">
        {/* Left Side: Chrome Web Browser simulation */}
        <div className="browser-window-frame">
          <div className="browser-chrome-bar">
            {/* Dots */}
            <div className="browser-window-dots">
              <span className="browser-window-dot dot-red"></span>
              <span className="browser-window-dot dot-yellow"></span>
              <span className="browser-window-dot dot-green"></span>
            </div>
            
            {/* Secure indicator & URL Bar */}
            <div className="browser-address-bar">
              <span className="address-secure-icon">🔒</span>
              <span>{mockUrl}</span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--sim-muted)', fontWeight: 600 }}>
              模拟标签页
            </div>
          </div>

          {/* Browser viewport hosting Greenhouse form */}
          <div className="browser-page-content">
            <MockJobForm 
              currentProfile={currentProfile}
              onProfileChange={handleProfileChange}
            />
          </div>
        </div>

        {/* Right Side: Chrome Sidebar Extension Simulation */}
        <div className="sidebar-simulation-panel">
          <div style={{ 
            background: 'rgba(25, 18, 38, 0.95)', 
            borderBottom: '1px solid var(--sim-border)', 
            padding: '12px 20px', 
            fontSize: '0.85rem', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--sim-text)'
          }}>
            <span style={{ color: 'var(--sim-primary)' }}>⚡</span>
            <span>ApplyPilot Chrome Panel</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
