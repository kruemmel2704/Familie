import React, { useState, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "./authConfig";
import MysteryBox from './components/MysteryBox';
import Admin from './components/Admin';

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5295' : window.location.origin;

function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [currentTab, setCurrentTab] = useState('box'); // 'box' or 'admin'
  const [currentUser, setCurrentUser] = useState(null);
  const [showMothersDay, setShowMothersDay] = useState(false);

  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      const account = accounts[0];
      const name = account.idTokenClaims?.name || account.name || 'Microsoft User';
      const email = account.idTokenClaims?.preferred_username || account.username || '';
      setCurrentUser({ name, email });
    } else {
      setCurrentUser(null);
    }
  }, [isAuthenticated, accounts]);

  useEffect(() => {
    if (currentUser && currentUser.email.toLowerCase() === 'amyloreenbluem@gmail.com') {
      setShowMothersDay(true);
    } else {
      setShowMothersDay(false);
    }
  }, [currentUser]);

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(e => {
      console.error(e);
    });
  };

  const handleLogout = () => {
    instance.logoutRedirect().catch(e => {
      console.error(e);
    });
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="login-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1f1f1f 0%, #111 100%)',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          textAlign: 'center',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h1 style={{ marginBottom: '10px', fontSize: '2rem', background: 'linear-gradient(45deg, #ff7b00, #ffae00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <i className="fa-solid fa-star"></i> Familien-Abenteuer
          </h1>
          <p style={{ color: '#aaa', marginBottom: '30px' }}>Bitte melde dich an, um fortzufahren.</p>
          <button 
            onClick={handleLogin}
            style={{
              background: '#0078d4',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'background 0.2s',
              boxShadow: '0 4px 12px rgba(0,120,212,0.4)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#005a9e'}
            onMouseOut={(e) => e.currentTarget.style.background = '#0078d4'}
          >
            <i className="fa-brands fa-microsoft"></i> Mit Microsoft anmelden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setCurrentTab('box')}>
          <i className="fa-solid fa-star"></i> Familien-Abenteuer
        </div>
        <div className="nav-links">
          <button 
            className={`nav-btn ${currentTab === 'box' ? 'active' : ''}`}
            onClick={() => setCurrentTab('box')}
          >
            <i className="fa-solid fa-ticket"></i> Mystery Box
          </button>
          <button 
            className={`nav-btn ${currentTab === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentTab('admin')}
          >
            <i className="fa-solid fa-gear"></i> Admin
          </button>
        </div>
      </nav>

      {/* User Info & Logout */}
      <div style={{
        padding: '5px 20px', 
        background: 'rgba(0,0,0,0.3)', 
        fontSize: '0.8rem', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Angemeldet als: <strong>{currentUser.name}</strong> ({currentUser.email})</span>
        <button 
          onClick={handleLogout}
          style={{
            background: 'transparent',
            color: '#ff4d4d',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 5px',
            fontSize: '0.8rem'
          }}
        >
          Abmelden
        </button>
      </div>

      <main className="container">
        {currentTab === 'box' ? (
          <MysteryBox 
            apiBaseUrl={API_BASE_URL} 
            showMothersDay={showMothersDay}
            onCloseMothersDay={() => setShowMothersDay(false)}
          />
        ) : (
          <Admin apiBaseUrl={API_BASE_URL} />
        )}
      </main>
    </div>
  );
}

export default App;
export { API_BASE_URL };
