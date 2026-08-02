import React, { useState, useEffect } from 'react';
import MysteryBox from './components/MysteryBox';
import Admin from './components/Admin';

const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:5295' : window.location.origin;

function App() {
  const [currentTab, setCurrentTab] = useState('box'); // 'box' or 'admin'
  const [currentUser, setCurrentUser] = useState({
    name: 'Local Admin',
    email: 'local@dev.local'
  });
  const [showMothersDay, setShowMothersDay] = useState(false);

  useEffect(() => {
    // Check if user is Amy to show Muttertag special
    if (currentUser.email.toLowerCase() === 'amyloreenbluem@gmail.com') {
      setShowMothersDay(true);
    } else {
      setShowMothersDay(false);
    }
  }, [currentUser]);

  // Simulate user switching for development/testing
  const handleUserChange = (email, name) => {
    setCurrentUser({ email, name });
  };

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

      {/* User Switcher for Local Demo/Testing */}
      <div style={{
        padding: '5px 20px', 
        background: 'rgba(0,0,0,0.3)', 
        fontSize: '0.8rem', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Angemeldet als: <strong>{currentUser.name}</strong> ({currentUser.email})</span>
        <select 
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'amy') handleUserChange('amyloreenbluem@gmail.com', 'Amy');
            else handleUserChange('local@dev.local', 'Local Admin');
          }}
          style={{ background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '3px', padding: '2px' }}
        >
          <option value="admin">User: Local Admin</option>
          <option value="amy">User: Amy (Muttertag Special)</option>
        </select>
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
